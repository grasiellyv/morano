-- =============================================================================
-- MORANO — Rotina: cômodos, tarefas, recorrências e ocorrências
-- =============================================================================
-- Segue os padrões da fundação: RLS por membro da casa, GRANT por coluna
-- (id, home_id, task_id, created_by, created_at nunca são alteráveis pelo
-- cliente) e consistência de FKs entre casas por trigger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.room_type as enum
  ('sala', 'cozinha', 'quarto', 'banheiro', 'lavanderia', 'escritorio', 'varanda', 'garagem', 'outro');
create type public.task_priority as enum ('baixa', 'media', 'alta');
create type public.task_status as enum ('active', 'paused', 'archived');
create type public.task_source as enum ('manual', 'onboarding');
create type public.frequency_type as enum ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom');
create type public.interval_unit as enum ('day', 'week', 'month');
create type public.occurrence_status as enum ('pending', 'completed', 'skipped', 'missed');

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  room_type public.room_type not null default 'outro',
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  -- FK para appliances entra na migration de equipamentos.
  appliance_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 2000),
  priority public.task_priority not null default 'media',
  estimated_minutes integer check (estimated_minutes between 1 and 1440),
  status public.task_status not null default 'active',
  source public.task_source not null default 'manual',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- home_id denormalizado (RLS/índices), validado contra a tarefa por trigger.
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks (id) on delete cascade,
  home_id uuid not null references public.homes (id) on delete cascade,
  frequency_type public.frequency_type not null,
  interval_value integer not null default 1 check (interval_value >= 1),
  interval_unit public.interval_unit,
  weekdays smallint[] not null default '{}'
    check (weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]),
  month_day smallint check (month_day between 1 and 31),
  start_date date not null,
  end_date date,
  generated_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  home_id uuid not null references public.homes (id) on delete cascade,
  original_date date not null,
  scheduled_for date not null,
  status public.occurrence_status not null default 'pending',
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, original_date)
);

-- Índices de FK (routines.task_id e task_occurrences.task_id já são cobertos
-- pelos únicos / pelo índice (task_id, scheduled_for)).
create index rooms_home_id_idx on public.rooms (home_id);
create index tasks_home_id_idx on public.tasks (home_id);
create index tasks_room_id_idx on public.tasks (room_id);
create index tasks_appliance_id_idx on public.tasks (appliance_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index routines_home_id_idx on public.routines (home_id);
create index task_occurrences_home_scheduled_status_idx
  on public.task_occurrences (home_id, scheduled_for, status);
create index task_occurrences_task_scheduled_idx
  on public.task_occurrences (task_id, scheduled_for);
create index task_occurrences_completed_by_idx on public.task_occurrences (completed_by);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.routines
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.task_occurrences
  for each row execute function public.set_updated_at();

-- Cômodo da tarefa precisa ser da mesma casa. ensure_same_home é security
-- invoker: um cômodo de outra casa é invisível pela RLS e também cai em
-- cross_home_reference (linha inexistente/invisível = erro, nunca passa).
create function public.tasks_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.rooms', new.room_id);
  return new;
end;
$$;

create trigger check_same_home before insert or update of room_id on public.tasks
  for each row execute function public.tasks_check_same_home();

-- routines/task_occurrences: home_id tem de ser o da tarefa. task_id e home_id
-- não são atualizáveis pelo cliente, então a checagem só precisa do INSERT;
-- ainda assim roda no UPDATE dessas colunas para valer também sem RLS/GRANTs
-- (service role).
create function public.child_of_task_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.tasks', new.task_id);
  return new;
end;
$$;

create trigger check_same_home before insert or update of task_id, home_id on public.routines
  for each row execute function public.child_of_task_check_same_home();
create trigger check_same_home before insert or update of task_id, home_id on public.task_occurrences
  for each row execute function public.child_of_task_check_same_home();

-- completed_by: quem conclui só pode se registrar (não atribuir a outro
-- membro). Só vale para chamadas autenticadas; service role passa.
create function public.occurrence_check_completed_by()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is not null
     and new.completed_by is not null
     and new.completed_by is distinct from v_uid
     and (tg_op = 'INSERT' or new.completed_by is distinct from old.completed_by) then
    raise exception using errcode = '42501', message = 'completed_by_must_be_caller';
  end if;
  return new;
end;
$$;

create trigger check_completed_by before insert or update of completed_by on public.task_occurrences
  for each row execute function public.occurrence_check_completed_by();

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.rooms, public.tasks, public.routines, public.task_occurrences from anon;
revoke all on public.rooms, public.tasks, public.routines, public.task_occurrences from authenticated;

grant select, delete on public.rooms, public.tasks, public.routines, public.task_occurrences to authenticated;

-- created_by fica fora do INSERT: o default auth.uid() o preenche.
grant insert (home_id, name, room_type, position) on public.rooms to authenticated;
grant update (name, room_type, position) on public.rooms to authenticated;

grant insert (home_id, room_id, appliance_id, title, description, priority,
              estimated_minutes, status, source)
  on public.tasks to authenticated;
grant update (room_id, appliance_id, title, description, priority,
              estimated_minutes, status)
  on public.tasks to authenticated;

grant insert (task_id, home_id, frequency_type, interval_value, interval_unit, weekdays,
              month_day, start_date, end_date, generated_until, is_active)
  on public.routines to authenticated;
grant update (frequency_type, interval_value, interval_unit, weekdays, month_day,
              start_date, end_date, generated_until, is_active)
  on public.routines to authenticated;

-- original_date é a data gerada pela regra: imutável (adiar muda scheduled_for).
grant insert (task_id, home_id, original_date, scheduled_for, status, completed_at,
              completed_by, notes)
  on public.task_occurrences to authenticated;
grant update (scheduled_for, status, completed_at, completed_by, notes)
  on public.task_occurrences to authenticated;

revoke execute on function public.tasks_check_same_home() from public, anon, authenticated;
revoke execute on function public.child_of_task_check_same_home() from public, anon, authenticated;
revoke execute on function public.occurrence_check_completed_by() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.tasks enable row level security;
alter table public.routines enable row level security;
alter table public.task_occurrences enable row level security;

-- rooms
create policy rooms_select_member on public.rooms
  for select to authenticated using (public.is_home_member(home_id));
create policy rooms_insert_member on public.rooms
  for insert to authenticated with check (public.is_home_member(home_id));
create policy rooms_update_member on public.rooms
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy rooms_delete_member on public.rooms
  for delete to authenticated using (public.is_home_member(home_id));

-- tasks
create policy tasks_select_member on public.tasks
  for select to authenticated using (public.is_home_member(home_id));
create policy tasks_insert_member on public.tasks
  for insert to authenticated with check (public.is_home_member(home_id));
create policy tasks_update_member on public.tasks
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy tasks_delete_member on public.tasks
  for delete to authenticated using (public.is_home_member(home_id));

-- routines
create policy routines_select_member on public.routines
  for select to authenticated using (public.is_home_member(home_id));
create policy routines_insert_member on public.routines
  for insert to authenticated with check (public.is_home_member(home_id));
create policy routines_update_member on public.routines
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy routines_delete_member on public.routines
  for delete to authenticated using (public.is_home_member(home_id));

-- task_occurrences
create policy task_occurrences_select_member on public.task_occurrences
  for select to authenticated using (public.is_home_member(home_id));
create policy task_occurrences_insert_member on public.task_occurrences
  for insert to authenticated with check (public.is_home_member(home_id));
create policy task_occurrences_update_member on public.task_occurrences
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy task_occurrences_delete_member on public.task_occurrences
  for delete to authenticated using (public.is_home_member(home_id));
