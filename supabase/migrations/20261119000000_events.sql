-- enum
create type public.event_type as enum (
  'aniversario','viagem','jantar','consulta_medica','visita','manutencao','feriado','outros'
);

-- tabela
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  home_id     uuid not null references public.homes(id) on delete cascade,
  title       text not null,
  event_type  public.event_type not null default 'outros',
  start_date  date not null,
  end_date    date,
  start_time  time,
  end_time    time,
  description text,
  created_by  uuid not null references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint  events_dates_check check (end_date is null or end_date >= start_date)
);

-- índices
create index events_home_date_idx on public.events (home_id, start_date);

-- RLS
alter table public.events enable row level security;

revoke all on public.events from anon, authenticated;
grant select, insert, update, delete on public.events to authenticated;

grant insert (title, event_type, start_date, end_date, start_time, end_time, description, home_id)
  on public.events to authenticated;
grant update (title, event_type, start_date, end_date, start_time, end_time, description)
  on public.events to authenticated;

-- policies
create policy events_select on public.events
  for select using (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
create policy events_insert on public.events
  for insert with check (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
create policy events_update on public.events
  for update using (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
create policy events_delete on public.events
  for delete using (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
