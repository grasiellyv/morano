-- =============================================================================
-- MORANO — Manutenção: equipamentos, manutenções, problemas e histórico
-- =============================================================================
-- Segue os padrões da fundação e da rotina: RLS por membro da casa, GRANT por
-- coluna (id, home_id, created_by, created_at e colunas derivadas por trigger
-- nunca são graváveis pelo cliente) e consistência de FKs entre casas por trigger.
-- Também fecha a pendência da migration de rotina: FK tasks.appliance_id e
-- checagem de mesma casa para ele.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.appliance_category as enum
  ('geladeira', 'maquina_lavar', 'ar_condicionado', 'micro_ondas', 'fogao', 'televisao', 'lava_loucas', 'outro');
create type public.maintenance_status as enum ('scheduled', 'completed', 'cancelled');
create type public.issue_status as enum ('open', 'in_progress', 'resolved');
create type public.issue_event_type as enum ('created', 'status_changed', 'note', 'maintenance_linked');

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table public.appliances (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category public.appliance_category not null default 'outro',
  brand text check (char_length(brand) <= 80),
  model text check (char_length(model) <= 80),
  serial_number text check (char_length(serial_number) <= 80),
  purchase_date date,
  warranty_until date,
  notes text check (char_length(notes) <= 2000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agora que appliances existe, a FK pendente de tasks.appliance_id.
alter table public.tasks
  add constraint tasks_appliance_id_fkey
  foreign key (appliance_id) references public.appliances (id) on delete set null;

create table public.home_issues (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  appliance_id uuid references public.appliances (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 2000),
  status public.issue_status not null default 'open',
  reported_at date not null default current_date,
  -- Mantido por trigger (status vira/deixa de ser resolved); não é do cliente.
  resolved_at timestamptz,
  -- Só faz sentido para imóvel alugado (spec §15); a UI decide quando mostrar.
  notify_landlord boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  -- null = manutenção geral da casa.
  appliance_id uuid references public.appliances (id) on delete set null,
  room_id uuid references public.rooms (id) on delete set null,
  issue_id uuid references public.home_issues (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 2000),
  status public.maintenance_status not null default 'scheduled',
  scheduled_for date,
  completed_at timestamptz,
  cost_cents integer check (cost_cents >= 0),
  provider_name text check (char_length(provider_name) <= 120),
  notes text check (char_length(notes) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Histórico append-only. home_id denormalizado (RLS/índices), validado contra o
-- problema por trigger.
create table public.issue_events (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.home_issues (id) on delete cascade,
  home_id uuid not null references public.homes (id) on delete cascade,
  event_type public.issue_event_type not null,
  from_status public.issue_status,
  to_status public.issue_status,
  note text check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (event_type <> 'status_changed' or to_status is not null)
);

create index appliances_home_id_idx on public.appliances (home_id);
create index appliances_room_id_idx on public.appliances (room_id);
create index home_issues_home_id_idx on public.home_issues (home_id);
create index home_issues_room_id_idx on public.home_issues (room_id);
create index home_issues_appliance_id_idx on public.home_issues (appliance_id);
create index home_issues_created_by_idx on public.home_issues (created_by);
create index maintenance_records_home_id_idx on public.maintenance_records (home_id);
create index maintenance_records_appliance_id_idx on public.maintenance_records (appliance_id);
create index maintenance_records_room_id_idx on public.maintenance_records (room_id);
create index maintenance_records_issue_id_idx on public.maintenance_records (issue_id);
create index maintenance_records_created_by_idx on public.maintenance_records (created_by);
create index issue_events_issue_created_idx on public.issue_events (issue_id, created_at);
create index issue_events_home_id_idx on public.issue_events (home_id);
create index issue_events_created_by_idx on public.issue_events (created_by);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.appliances
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.home_issues
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_records
  for each row execute function public.set_updated_at();

-- Consistência de casa. ensure_same_home é security invoker: uma linha de outra
-- casa é invisível pela RLS e também cai em cross_home_reference. Os triggers
-- rodam também no UPDATE de home_id para valer sem RLS/GRANTs (service role).

-- tasks: substitui a função/trigger da migration de rotina (room_id) para
-- cobrir também appliance_id.
drop trigger check_same_home on public.tasks;
create or replace function public.tasks_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.rooms', new.room_id);
  perform public.ensure_same_home(new.home_id, 'public.appliances', new.appliance_id);
  return new;
end;
$$;
create trigger check_same_home before insert or update of home_id, room_id, appliance_id on public.tasks
  for each row execute function public.tasks_check_same_home();

create function public.appliances_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.rooms', new.room_id);
  return new;
end;
$$;
create trigger check_same_home before insert or update of home_id, room_id on public.appliances
  for each row execute function public.appliances_check_same_home();

create function public.home_issues_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.rooms', new.room_id);
  perform public.ensure_same_home(new.home_id, 'public.appliances', new.appliance_id);
  return new;
end;
$$;
create trigger check_same_home before insert or update of home_id, room_id, appliance_id on public.home_issues
  for each row execute function public.home_issues_check_same_home();

create function public.maintenance_records_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.appliances', new.appliance_id);
  perform public.ensure_same_home(new.home_id, 'public.rooms', new.room_id);
  perform public.ensure_same_home(new.home_id, 'public.home_issues', new.issue_id);
  return new;
end;
$$;
create trigger check_same_home
  before insert or update of home_id, appliance_id, room_id, issue_id on public.maintenance_records
  for each row execute function public.maintenance_records_check_same_home();

create function public.issue_events_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.home_issues', new.issue_id);
  return new;
end;
$$;
create trigger check_same_home before insert or update of home_id, issue_id on public.issue_events
  for each row execute function public.issue_events_check_same_home();

-- resolved_at acompanha o status: preenchido ao virar resolved, limpo ao reabrir.
-- (Não depende de GRANT: o cliente não escreve resolved_at.)
create function public.home_issues_set_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.resolved_at := case when new.status = 'resolved' then now() end;
  elsif new.status is distinct from old.status then
    new.resolved_at := case when new.status = 'resolved' then now() end;
  end if;
  return new;
end;
$$;
create trigger set_resolved_at before insert or update of status on public.home_issues
  for each row execute function public.home_issues_set_resolved_at();

-- Eventos automáticos (created / status_changed). SECURITY DEFINER de propósito:
-- o cliente só pode inserir notas e vínculos (policy + GRANT por coluna sem
-- from_status/to_status), então não consegue forjar mudanças de status. Só este
-- trigger — que o cliente não executa diretamente — grava esses eventos. O
-- autor continua sendo quem fez a mudança: created_by usa o default auth.uid(),
-- que lê o JWT da sessão mesmo dentro de função definer. home_id vem da própria
-- linha do problema, então não há como apontar para outra casa.
create function public.home_issues_write_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.issue_events (issue_id, home_id, event_type, to_status)
    values (new.id, new.home_id, 'created', new.status);
  else
    insert into public.issue_events (issue_id, home_id, event_type, from_status, to_status)
    values (new.id, new.home_id, 'status_changed', old.status, new.status);
  end if;
  return null;
end;
$$;
create trigger write_event_on_insert after insert on public.home_issues
  for each row execute function public.home_issues_write_event();
create trigger write_event_on_status_change after update of status on public.home_issues
  for each row when (old.status is distinct from new.status)
  execute function public.home_issues_write_event();

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.appliances, public.home_issues, public.maintenance_records, public.issue_events from anon;
revoke all on public.appliances, public.home_issues, public.maintenance_records, public.issue_events from authenticated;

grant select, delete on public.appliances, public.home_issues, public.maintenance_records to authenticated;
-- issue_events: append-only — só select e insert (sem update/delete).
grant select on public.issue_events to authenticated;

grant insert (home_id, room_id, name, category, brand, model, serial_number,
              purchase_date, warranty_until, notes, archived_at)
  on public.appliances to authenticated;
grant update (room_id, name, category, brand, model, serial_number,
              purchase_date, warranty_until, notes, archived_at)
  on public.appliances to authenticated;

-- resolved_at e created_by ficam de fora (trigger / default auth.uid()).
grant insert (home_id, room_id, appliance_id, title, description, status, reported_at, notify_landlord)
  on public.home_issues to authenticated;
grant update (room_id, appliance_id, title, description, status, reported_at, notify_landlord)
  on public.home_issues to authenticated;

grant insert (home_id, appliance_id, room_id, issue_id, title, description, status,
              scheduled_for, completed_at, cost_cents, provider_name, notes)
  on public.maintenance_records to authenticated;
grant update (appliance_id, room_id, issue_id, title, description, status,
              scheduled_for, completed_at, cost_cents, provider_name, notes)
  on public.maintenance_records to authenticated;

-- Sem from_status/to_status, created_by e created_at: o cliente só escreve notas.
grant insert (issue_id, home_id, event_type, note) on public.issue_events to authenticated;

revoke execute on function public.appliances_check_same_home() from public, anon, authenticated;
revoke execute on function public.home_issues_check_same_home() from public, anon, authenticated;
revoke execute on function public.maintenance_records_check_same_home() from public, anon, authenticated;
revoke execute on function public.issue_events_check_same_home() from public, anon, authenticated;
revoke execute on function public.home_issues_set_resolved_at() from public, anon, authenticated;
revoke execute on function public.home_issues_write_event() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.appliances enable row level security;
alter table public.home_issues enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.issue_events enable row level security;

-- appliances
create policy appliances_select_member on public.appliances
  for select to authenticated using (public.is_home_member(home_id));
create policy appliances_insert_member on public.appliances
  for insert to authenticated with check (public.is_home_member(home_id));
create policy appliances_update_member on public.appliances
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy appliances_delete_member on public.appliances
  for delete to authenticated using (public.is_home_member(home_id));

-- home_issues
create policy home_issues_select_member on public.home_issues
  for select to authenticated using (public.is_home_member(home_id));
create policy home_issues_insert_member on public.home_issues
  for insert to authenticated with check (public.is_home_member(home_id));
create policy home_issues_update_member on public.home_issues
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy home_issues_delete_member on public.home_issues
  for delete to authenticated using (public.is_home_member(home_id));

-- maintenance_records
create policy maintenance_records_select_member on public.maintenance_records
  for select to authenticated using (public.is_home_member(home_id));
create policy maintenance_records_insert_member on public.maintenance_records
  for insert to authenticated with check (public.is_home_member(home_id));
create policy maintenance_records_update_member on public.maintenance_records
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy maintenance_records_delete_member on public.maintenance_records
  for delete to authenticated using (public.is_home_member(home_id));

-- issue_events: select e insert apenas; sem policy de update/delete (append-only).
-- O insert do cliente é restrito a notas e vínculos; created/status_changed são
-- gravados pelo trigger.
create policy issue_events_select_member on public.issue_events
  for select to authenticated using (public.is_home_member(home_id));
create policy issue_events_insert_member on public.issue_events
  for insert to authenticated
  with check (public.is_home_member(home_id) and event_type in ('note', 'maintenance_linked'));
