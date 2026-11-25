-- supabase/migrations/20261127000001_notifications.sql

create type notification_type as enum (
  'shopping_item_added',
  'shopping_item_purchased',
  'maintenance_registered',
  'task_due_today'
);

create table notifications (
  id          uuid              primary key default gen_random_uuid(),
  home_id     uuid              not null references homes(id) on delete cascade,
  actor_id    uuid              references profiles(id) on delete set null,
  type        notification_type not null,
  entity_id   uuid              not null,
  target_user_id uuid           references profiles(id) on delete cascade,
  title       text              not null check (char_length(title) between 1 and 200),
  meta        text,
  occurs_on   date, -- só preenchido para task_due_today; usado na constraint abaixo
  created_at  timestamptz       not null default now()
);

-- Evita duplicar o backfill idempotente de task_due_today (corrida entre moradores
-- abrindo a tela ao mesmo tempo).
create unique index notifications_due_today_once
  on notifications (home_id, entity_id, occurs_on)
  where type = 'task_due_today';

create index notifications_home_created_idx on notifications (home_id, created_at desc);

alter table notifications enable row level security;

create policy notifications_select on notifications
  for select to authenticated
  using (
    home_id = (select current_home_id from profiles where id = auth.uid())
    and (target_user_id is null or target_user_id = auth.uid())
  );

create policy notifications_insert on notifications
  for insert to authenticated
  with check (
    home_id = (select current_home_id from profiles where id = auth.uid())
    and (actor_id = auth.uid() or actor_id is null)
  );

-- Só para consolidação: o autor pode atualizar a própria notificação recente.
create policy notifications_update_own on notifications
  for update to authenticated
  using (actor_id = auth.uid())
  with check (actor_id = auth.uid());

grant select, insert, update on notifications to authenticated;

create table notification_reads (
  user_id      uuid        not null references profiles(id) on delete cascade,
  home_id      uuid        not null references homes(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, home_id)
);

alter table notification_reads enable row level security;

create policy notification_reads_own on notification_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on notification_reads to authenticated;

create table notification_preferences (
  user_id uuid              not null references profiles(id) on delete cascade,
  type    notification_type not null,
  enabled boolean           not null default true,
  primary key (user_id, type)
);

alter table notification_preferences enable row level security;

create policy notification_preferences_own on notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on notification_preferences to authenticated;
