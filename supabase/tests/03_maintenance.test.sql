-- pgTAP: manutenção (appliances, maintenance_records, home_issues, issue_events).
-- Usuários: A = owner da casa A e da casa A2 · M = member da casa A
--           B = estranho (dono da casa B).
-- Memberships e casas são criadas como postgres (o cliente não insere em
-- home_members). Para voltar a postgres: `select tests.clear_authentication(); reset role;`
begin;
create extension if not exists pgtap with schema extensions;

select plan(107);

-- -----------------------------------------------------------------------------
-- Setup (postgres)
-- -----------------------------------------------------------------------------
do $$
begin
  perform set_config('t.a', tests.create_user('a@morano.test')::text, true);
  perform set_config('t.b', tests.create_user('b@morano.test')::text, true);
  perform set_config('t.m', tests.create_user('m@morano.test')::text, true);

  perform set_config('t.home_a', gen_random_uuid()::text, true);
  perform set_config('t.home_a2', gen_random_uuid()::text, true);
  perform set_config('t.home_b', gen_random_uuid()::text, true);

  insert into public.homes (id, name, created_by) values
    (current_setting('t.home_a')::uuid, 'Casa A', current_setting('t.a')::uuid),
    (current_setting('t.home_a2')::uuid, 'Casa A2', current_setting('t.a')::uuid),
    (current_setting('t.home_b')::uuid, 'Casa B', current_setting('t.b')::uuid);
  insert into public.home_members (home_id, user_id, role)
  values (current_setting('t.home_a')::uuid, current_setting('t.m')::uuid, 'member');

  -- Dados da casa B (isolamento e FKs cruzadas)
  perform set_config('t.room_b', gen_random_uuid()::text, true);
  perform set_config('t.app_b', gen_random_uuid()::text, true);
  perform set_config('t.issue_b', gen_random_uuid()::text, true);
  perform set_config('t.maint_b', gen_random_uuid()::text, true);
  insert into public.rooms (id, home_id, name, room_type)
  values (current_setting('t.room_b')::uuid, current_setting('t.home_b')::uuid, 'Cozinha B', 'cozinha');
  insert into public.appliances (id, home_id, room_id, name, category)
  values (current_setting('t.app_b')::uuid, current_setting('t.home_b')::uuid,
          current_setting('t.room_b')::uuid, 'Geladeira B', 'geladeira');
  insert into public.home_issues (id, home_id, title)
  values (current_setting('t.issue_b')::uuid, current_setting('t.home_b')::uuid, 'Problema B');
  insert into public.maintenance_records (id, home_id, appliance_id, title)
  values (current_setting('t.maint_b')::uuid, current_setting('t.home_b')::uuid,
          current_setting('t.app_b')::uuid, 'Manutenção B');

  -- Uma casa A2 com cômodo, equipamento e problema (visíveis para A, mas de outra casa)
  perform set_config('t.room_a2', gen_random_uuid()::text, true);
  perform set_config('t.app_a2', gen_random_uuid()::text, true);
  perform set_config('t.issue_a2', gen_random_uuid()::text, true);
  insert into public.rooms (id, home_id, name) values
    (current_setting('t.room_a2')::uuid, current_setting('t.home_a2')::uuid, 'Sala A2');
  insert into public.appliances (id, home_id, name) values
    (current_setting('t.app_a2')::uuid, current_setting('t.home_a2')::uuid, 'Forno A2');
  insert into public.home_issues (id, home_id, title) values
    (current_setting('t.issue_a2')::uuid, current_setting('t.home_a2')::uuid, 'Problema A2');
end $$;

-- -----------------------------------------------------------------------------
-- Estrutura
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_catalog.pg_tables
   where schemaname = 'public' and rowsecurity
     and tablename in ('appliances', 'maintenance_records', 'home_issues', 'issue_events')),
  4,
  'appliances, maintenance_records, home_issues and issue_events have rls'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.appliance_category'::regtype),
  array['geladeira', 'maquina_lavar', 'ar_condicionado', 'micro_ondas', 'fogao', 'televisao', 'lava_loucas', 'outro'],
  'appliance_category labels'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.maintenance_status'::regtype),
  array['scheduled', 'completed', 'cancelled'],
  'maintenance_status labels'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.issue_status'::regtype),
  array['open', 'in_progress', 'resolved'],
  'issue_status labels'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.issue_event_type'::regtype),
  array['created', 'status_changed', 'note', 'maintenance_linked'],
  'issue_event_type labels'
);
select is(
  (select confdeltype::text from pg_catalog.pg_constraint
   where conrelid = 'public.tasks'::regclass and confrelid = 'public.appliances'::regclass and contype = 'f'),
  'n',
  'tasks.appliance_id references appliances on delete set null'
);
select is(
  (select count(*)::int from pg_catalog.pg_trigger
   where tgname = 'set_updated_at'
     and tgrelid in ('public.appliances'::regclass, 'public.maintenance_records'::regclass,
                     'public.home_issues'::regclass)),
  3,
  'updated_at triggers on the editable tables'
);
select is(
  (select count(*)::int from pg_catalog.pg_trigger
   where tgname = 'check_same_home' and not tgisinternal
     and tgrelid in ('public.tasks'::regclass, 'public.appliances'::regclass,
                     'public.maintenance_records'::regclass, 'public.home_issues'::regclass,
                     'public.issue_events'::regclass)),
  5,
  'same-home triggers on every table with cross-table FKs'
);
select is(
  (select count(*)::int from pg_catalog.pg_policies
   where schemaname = 'public' and tablename = 'issue_events'
     and cmd in ('UPDATE', 'DELETE', 'ALL')),
  0,
  'issue_events has no update/delete/all policy (append-only)'
);
select ok(
  not has_table_privilege('authenticated', 'public.issue_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.issue_events', 'DELETE'),
  'authenticated has no update/delete privilege on issue_events'
);

-- anon
select tests.clear_authentication();
select throws_ok($$ select * from public.appliances $$, '42501', null, 'anon has no access to appliances');
select throws_ok($$ select * from public.maintenance_records $$, '42501', null, 'anon has no access to maintenance_records');
select throws_ok($$ select * from public.home_issues $$, '42501', null, 'anon has no access to home_issues');
select throws_ok($$ select * from public.issue_events $$, '42501', null, 'anon has no access to issue_events');
reset role;

-- -----------------------------------------------------------------------------
-- A: CRUD de membro
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);

-- appliances
select lives_ok(
  format($$ insert into public.appliances (home_id, name, category, brand, purchase_date, warranty_until)
           values (%L, 'Geladeira', 'geladeira', 'Brastemp', '2025-01-10', '2027-01-10') $$,
         current_setting('t.home_a')),
  'member can insert an appliance'
);
do $$
begin
  perform set_config('t.app_a', (select id from public.appliances where name = 'Geladeira')::text, true);
end $$;
select is(
  (select category::text from public.appliances where id = current_setting('t.app_a')::uuid),
  'geladeira',
  'appliance category stored'
);
select is(
  tests.affected_rows(format($$ update public.appliances set model = 'BRM44', archived_at = now() where id = %L $$,
                             current_setting('t.app_a'))),
  1,
  'member can update and archive an appliance'
);
select throws_ok(
  format($$ update public.appliances set home_id = %L where id = %L $$, current_setting('t.home_a2'), current_setting('t.app_a')),
  '42501', null,
  'appliances.home_id is not updatable'
);
select throws_ok(
  format($$ insert into public.appliances (id, home_id, name) values (gen_random_uuid(), %L, 'Com id') $$, current_setting('t.home_a')),
  '42501', null,
  'appliances.id is not client-insertable'
);
select throws_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, '  ') $$, current_setting('t.home_a')),
  '23514', null,
  'blank appliance name rejected'
);
select lives_ok(
  format($$ insert into public.rooms (home_id, name) values (%L, 'Cozinha A') $$, current_setting('t.home_a')),
  'room for appliance setup'
);
do $$
begin
  perform set_config('t.room_a', (select id from public.rooms where name = 'Cozinha A')::text, true);
end $$;
select lives_ok(
  format($$ update public.appliances set room_id = %L where id = %L $$, current_setting('t.room_a'), current_setting('t.app_a')),
  'appliance can be placed in an own room'
);

-- home_issues
select lives_ok(
  format($$ insert into public.home_issues (home_id, room_id, appliance_id, title, description)
           values (%L, %L, %L, 'Vazamento', 'Pinga na gaveta') $$,
         current_setting('t.home_a'), current_setting('t.room_a'), current_setting('t.app_a')),
  'member can insert an issue'
);
do $$
begin
  perform set_config('t.issue_a', (select id from public.home_issues where title = 'Vazamento')::text, true);
end $$;
select is(
  (select format('%s/%s/%s/%s', status, notify_landlord, resolved_at is null, created_by = current_setting('t.a')::uuid)
   from public.home_issues where id = current_setting('t.issue_a')::uuid),
  'open/f/t/t',
  'issue defaults: open, notify_landlord false, no resolved_at, created_by = caller'
);
select is(
  (select reported_at from public.home_issues where id = current_setting('t.issue_a')::uuid),
  current_date,
  'issue reported_at defaults to today'
);
select is(
  tests.affected_rows(format($$ update public.home_issues set notify_landlord = true, title = 'Vazamento na gaveta' where id = %L $$,
                             current_setting('t.issue_a'))),
  1,
  'member can update issue fields and notify_landlord'
);
select throws_ok(
  format($$ insert into public.home_issues (home_id, title, created_by) values (%L, 'Falso', %L) $$,
         current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'home_issues.created_by is not client-insertable'
);
select throws_ok(
  format($$ insert into public.home_issues (home_id, title, resolved_at) values (%L, 'Falso', now()) $$, current_setting('t.home_a')),
  '42501', null,
  'home_issues.resolved_at is not client-insertable'
);
select throws_ok(
  format($$ update public.home_issues set resolved_at = now() where id = %L $$, current_setting('t.issue_a')),
  '42501', null,
  'home_issues.resolved_at is not client-updatable'
);
select throws_ok(
  format($$ update public.home_issues set home_id = %L where id = %L $$, current_setting('t.home_a2'), current_setting('t.issue_a')),
  '42501', null,
  'home_issues.home_id is not updatable'
);

-- maintenance_records
select lives_ok(
  format($$ insert into public.maintenance_records (home_id, appliance_id, room_id, issue_id, title, status, scheduled_for, cost_cents, provider_name)
           values (%L, %L, %L, %L, 'Trocar borracha', 'scheduled', '2026-12-01', 15000, 'Zé Refrigeração') $$,
         current_setting('t.home_a'), current_setting('t.app_a'), current_setting('t.room_a'), current_setting('t.issue_a')),
  'member can insert a maintenance record'
);
do $$
begin
  perform set_config('t.maint_a', (select id from public.maintenance_records where title = 'Trocar borracha')::text, true);
end $$;
select is(
  (select created_by from public.maintenance_records where id = current_setting('t.maint_a')::uuid),
  current_setting('t.a')::uuid,
  'maintenance_records.created_by defaults to the caller'
);
select is(
  tests.affected_rows(format(
    $$ update public.maintenance_records set status = 'completed', completed_at = now(), cost_cents = 17500 where id = %L $$,
    current_setting('t.maint_a'))),
  1,
  'member can complete a maintenance record'
);
select lives_ok(
  format($$ insert into public.maintenance_records (home_id, title) values (%L, 'Dedetização geral') $$, current_setting('t.home_a')),
  'general home maintenance (no appliance) is allowed'
);
select throws_ok(
  format($$ insert into public.maintenance_records (home_id, title, cost_cents) values (%L, 'Negativa', -1) $$, current_setting('t.home_a')),
  '23514', null,
  'negative cost_cents rejected on insert'
);
select throws_ok(
  format($$ update public.maintenance_records set cost_cents = -100 where id = %L $$, current_setting('t.maint_a')),
  '23514', null,
  'negative cost_cents rejected on update'
);
select throws_ok(
  format($$ insert into public.maintenance_records (home_id, title, created_by) values (%L, 'Falsa', %L) $$,
         current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'maintenance_records.created_by is not client-insertable'
);
select throws_ok(
  format($$ update public.maintenance_records set created_by = %L where id = %L $$, current_setting('t.m'), current_setting('t.maint_a')),
  '42501', null,
  'maintenance_records.created_by is not updatable'
);
select throws_ok(
  format($$ update public.maintenance_records set home_id = %L where id = %L $$, current_setting('t.home_a2'), current_setting('t.maint_a')),
  '42501', null,
  'maintenance_records.home_id is not updatable (cannot move to another home)'
);

-- tasks.appliance_id
select lives_ok(
  format($$ insert into public.tasks (home_id, appliance_id, title) values (%L, %L, 'Limpar serpentina') $$,
         current_setting('t.home_a'), current_setting('t.app_a')),
  'task can reference an own appliance'
);
do $$
begin
  perform set_config('t.task_a', (select id from public.tasks where title = 'Limpar serpentina')::text, true);
end $$;

-- -----------------------------------------------------------------------------
-- Histórico do problema (issue_events)
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from public.issue_events
   where issue_id = current_setting('t.issue_a')::uuid and event_type = 'created'),
  1,
  'creating an issue writes a created event'
);
select is(
  (select created_by from public.issue_events
   where issue_id = current_setting('t.issue_a')::uuid and event_type = 'created'),
  current_setting('t.a')::uuid,
  'created event has created_by = caller'
);
select is(
  (select home_id from public.issue_events
   where issue_id = current_setting('t.issue_a')::uuid and event_type = 'created'),
  current_setting('t.home_a')::uuid,
  'created event carries the issue home_id'
);

select lives_ok(
  format($$ update public.home_issues set status = 'in_progress' where id = %L $$, current_setting('t.issue_a')),
  'issue status open -> in_progress'
);
select is(
  (select format('%s>%s', from_status, to_status) from public.issue_events
   where issue_id = current_setting('t.issue_a')::uuid and event_type = 'status_changed'),
  'open>in_progress',
  'status change writes a status_changed event with from/to'
);
select is(
  (select resolved_at is null from public.home_issues where id = current_setting('t.issue_a')::uuid),
  true,
  'resolved_at stays null while not resolved'
);
select lives_ok(
  format($$ update public.home_issues set status = 'resolved' where id = %L $$, current_setting('t.issue_a')),
  'issue status in_progress -> resolved'
);
select is(
  (select resolved_at is not null from public.home_issues where id = current_setting('t.issue_a')::uuid),
  true,
  'resolved_at is set when the issue becomes resolved'
);
select lives_ok(
  format($$ update public.home_issues set status = 'open' where id = %L $$, current_setting('t.issue_a')),
  'issue reopened'
);
select is(
  (select resolved_at is null from public.home_issues where id = current_setting('t.issue_a')::uuid),
  true,
  'resolved_at is cleared when the issue is reopened'
);
select is(
  (select count(*)::int from public.issue_events
   where issue_id = current_setting('t.issue_a')::uuid and event_type = 'status_changed'),
  3,
  'three status_changed events so far'
);
select lives_ok(
  format($$ update public.home_issues set title = 'Vazamento (editado)', status = 'open' where id = %L $$, current_setting('t.issue_a')),
  'update that does not change the status'
);
select is(
  (select count(*)::int from public.issue_events
   where issue_id = current_setting('t.issue_a')::uuid and event_type = 'status_changed'),
  3,
  'no event when the status does not change'
);
select lives_ok(
  format($$ insert into public.home_issues (home_id, title, status) values (%L, 'Já resolvido', 'resolved') $$, current_setting('t.home_a')),
  'issue can be created directly as resolved'
);
select is(
  (select resolved_at is not null from public.home_issues where title = 'Já resolvido'),
  true,
  'resolved_at set on insert when created as resolved'
);

-- eventos manuais
select lives_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note) values (%L, %L, 'note', 'Chamei o técnico') $$,
         current_setting('t.issue_a'), current_setting('t.home_a')),
  'member can add a note event'
);
select is(
  (select created_by from public.issue_events where note = 'Chamei o técnico'),
  current_setting('t.a')::uuid,
  'note event created_by defaults to the caller'
);
select lives_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note) values (%L, %L, 'maintenance_linked', 'Manutenção agendada') $$,
         current_setting('t.issue_a'), current_setting('t.home_a')),
  'member can add a maintenance_linked event'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type) values (%L, %L, 'status_changed') $$,
         current_setting('t.issue_a'), current_setting('t.home_a')),
  '42501', null,
  'client cannot forge a status_changed event'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type) values (%L, %L, 'created') $$,
         current_setting('t.issue_a'), current_setting('t.home_a')),
  '42501', null,
  'client cannot forge a created event'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, from_status, to_status)
           values (%L, %L, 'note', 'open', 'resolved') $$,
         current_setting('t.issue_a'), current_setting('t.home_a')),
  '42501', null,
  'from_status/to_status are not client-insertable'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note, created_by) values (%L, %L, 'note', 'x', %L) $$,
         current_setting('t.issue_a'), current_setting('t.home_a'), current_setting('t.m')),
  '42501', null,
  'issue_events.created_by is not client-insertable'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note, created_at) values (%L, %L, 'note', 'x', '2000-01-01') $$,
         current_setting('t.issue_a'), current_setting('t.home_a')),
  '42501', null,
  'issue_events.created_at is not client-insertable'
);
select throws_ok(
  format($$ update public.issue_events set note = 'reescrito' where issue_id = %L $$, current_setting('t.issue_a')),
  '42501', null,
  'member cannot update issue_events'
);
select throws_ok(
  format($$ delete from public.issue_events where issue_id = %L $$, current_setting('t.issue_a')),
  '42501', null,
  'member cannot delete issue_events'
);
select throws_ok(
  format($$ update public.issue_events set issue_id = %L where issue_id = %L $$, current_setting('t.issue_a2'), current_setting('t.issue_a')),
  '42501', null,
  'issue_events.issue_id is not updatable'
);

-- -----------------------------------------------------------------------------
-- FKs cruzadas entre casas
-- -----------------------------------------------------------------------------
-- tasks.appliance_id
select throws_ok(
  format($$ insert into public.tasks (home_id, appliance_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a'), current_setting('t.app_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: task with an appliance of home B (invisible by rls)'
);
select throws_ok(
  format($$ insert into public.tasks (home_id, appliance_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a'), current_setting('t.app_a2')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: task with an appliance of a visible but different home'
);
select throws_ok(
  format($$ update public.tasks set appliance_id = %L where id = %L $$, current_setting('t.app_b'), current_setting('t.task_a')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected on update of tasks.appliance_id'
);
select throws_ok(
  format($$ update public.tasks set room_id = %L where id = %L $$, current_setting('t.room_b'), current_setting('t.task_a')),
  'P0001', 'cross_home_reference',
  'tasks room_id check still works after replacing the trigger'
);
-- appliances.room_id
select throws_ok(
  format($$ insert into public.appliances (home_id, room_id, name) values (%L, %L, 'Invasor') $$,
         current_setting('t.home_a'), current_setting('t.room_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: appliance with a room of home B'
);
select throws_ok(
  format($$ update public.appliances set room_id = %L where id = %L $$, current_setting('t.room_a2'), current_setting('t.app_a')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected on update of appliances.room_id (visible other home)'
);
-- maintenance_records
select throws_ok(
  format($$ insert into public.maintenance_records (home_id, appliance_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a'), current_setting('t.app_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: maintenance with an appliance of home B'
);
select throws_ok(
  format($$ insert into public.maintenance_records (home_id, appliance_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a'), current_setting('t.app_a2')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: maintenance with an appliance of a visible but different home'
);
select throws_ok(
  format($$ insert into public.maintenance_records (home_id, room_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a'), current_setting('t.room_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: maintenance with a room of home B'
);
select throws_ok(
  format($$ insert into public.maintenance_records (home_id, issue_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a'), current_setting('t.issue_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: maintenance with an issue of home B'
);
select throws_ok(
  format($$ update public.maintenance_records set issue_id = %L where id = %L $$, current_setting('t.issue_a2'), current_setting('t.maint_a')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected on update of maintenance_records.issue_id'
);
-- home_issues
select throws_ok(
  format($$ insert into public.home_issues (home_id, room_id, title) values (%L, %L, 'Invasor') $$,
         current_setting('t.home_a'), current_setting('t.room_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: issue with a room of home B'
);
select throws_ok(
  format($$ insert into public.home_issues (home_id, appliance_id, title) values (%L, %L, 'Invasor') $$,
         current_setting('t.home_a'), current_setting('t.app_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: issue with an appliance of home B'
);
select throws_ok(
  format($$ update public.home_issues set appliance_id = %L where id = %L $$, current_setting('t.app_a2'), current_setting('t.issue_a')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected on update of home_issues.appliance_id (visible other home)'
);
-- issue_events
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note) values (%L, %L, 'note', 'spoof') $$,
         current_setting('t.issue_b'), current_setting('t.home_a')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: event on an issue of home B (home_id = A)'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note) values (%L, %L, 'note', 'spoof') $$,
         current_setting('t.issue_b'), current_setting('t.home_b')),
  'P0001', 'cross_home_reference',
  'event on an issue of home B (home_id = B) rejected: invisible issue'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note) values (%L, %L, 'note', 'spoof') $$,
         current_setting('t.issue_a'), current_setting('t.home_a2')),
  'P0001', 'cross_home_reference',
  'event home_id must match the issue home'
);
select lives_ok(
  format($$ update public.maintenance_records set appliance_id = null, room_id = null where id = %L $$, current_setting('t.maint_a')),
  'optional FKs can be cleared'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- M (member da casa A): vê e edita; trigger de eventos funciona para membro comum
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.m')::uuid);
select is(
  (select count(*)::int from public.appliances where home_id = current_setting('t.home_a')::uuid),
  1,
  'co-member sees appliances of the home'
);
select ok(
  (select count(*) from public.issue_events where issue_id = current_setting('t.issue_a')::uuid) >= 6,
  'co-member sees the issue history'
);
select lives_ok(
  format($$ update public.home_issues set status = 'resolved' where id = %L $$, current_setting('t.issue_a')),
  'co-member can change an issue status'
);
select is(
  (select count(*)::int from public.issue_events
   where issue_id = current_setting('t.issue_a')::uuid and event_type = 'status_changed'
     and created_by = current_setting('t.m')::uuid and to_status = 'resolved'),
  1,
  'status_changed event records the member who changed it'
);
select is(
  tests.affected_rows(format($$ update public.maintenance_records set notes = 'M editou' where id = %L $$, current_setting('t.maint_a'))),
  1,
  'co-member can edit a maintenance record'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- B (estranho): não vê nem escreve na casa A
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.b')::uuid);
select is(
  (select count(*)::int from public.appliances where home_id = current_setting('t.home_a')::uuid)
  + (select count(*)::int from public.maintenance_records where home_id = current_setting('t.home_a')::uuid)
  + (select count(*)::int from public.home_issues where home_id = current_setting('t.home_a')::uuid)
  + (select count(*)::int from public.issue_events where home_id = current_setting('t.home_a')::uuid),
  0,
  'non-member sees nothing of home A'
);
select is(
  (select count(*)::int from public.issue_events where home_id = current_setting('t.home_b')::uuid),
  1,
  'owner of B sees B history'
);
select throws_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, 'Invasor') $$, current_setting('t.home_a')),
  '42501', null,
  'non-member cannot insert an appliance into home A'
);
select throws_ok(
  format($$ insert into public.issue_events (issue_id, home_id, event_type, note) values (%L, %L, 'note', 'x') $$,
         current_setting('t.issue_a'), current_setting('t.home_a')),
  'P0001', 'cross_home_reference',
  'non-member cannot add events to a home A issue (invisible issue)'
);
select is(
  tests.affected_rows(format($$ update public.home_issues set title = 'Hackeado' where id = %L $$, current_setting('t.issue_a'))),
  0,
  'non-member update of a home A issue affects 0 rows'
);
select is(
  tests.affected_rows(format($$ delete from public.maintenance_records where id = %L $$, current_setting('t.maint_a'))),
  0,
  'non-member delete of a home A maintenance affects 0 rows'
);
select throws_ok(
  format($$ insert into public.maintenance_records (home_id, appliance_id, title) values (%L, %L, 'Mover') $$,
         current_setting('t.home_b'), current_setting('t.app_a')),
  'P0001', 'cross_home_reference',
  'B cannot attach a home A appliance to a home B maintenance'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- Exclusões: histórico preservado
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);
select lives_ok(
  format($$ update public.maintenance_records set appliance_id = %L where id = %L $$, current_setting('t.app_a'), current_setting('t.maint_a')),
  'relink maintenance to the appliance'
);
select lives_ok(
  format($$ update public.home_issues set appliance_id = %L where id = %L $$, current_setting('t.app_a'), current_setting('t.issue_a')),
  'link the issue to the appliance'
);
select is(
  tests.affected_rows(format($$ delete from public.appliances where id = %L $$, current_setting('t.app_a'))),
  1,
  'member can delete an appliance'
);
select is(
  (select format('%s/%s', count(*), count(appliance_id)) from public.maintenance_records where id = current_setting('t.maint_a')::uuid),
  '1/0',
  'deleting an appliance nulls maintenance.appliance_id and keeps the record'
);
select is(
  (select appliance_id is null from public.tasks where id = current_setting('t.task_a')::uuid),
  true,
  'deleting an appliance nulls tasks.appliance_id'
);
select is(
  (select appliance_id is null from public.home_issues where id = current_setting('t.issue_a')::uuid),
  true,
  'deleting an appliance nulls home_issues.appliance_id'
);
select is(
  tests.affected_rows(format($$ delete from public.rooms where id = %L $$, current_setting('t.room_a'))),
  1,
  'deleting a room works'
);
select is(
  (select room_id is null from public.home_issues where id = current_setting('t.issue_a')::uuid),
  true,
  'deleting a room nulls home_issues.room_id'
);
select is(
  tests.affected_rows(format($$ delete from public.home_issues where id = %L $$, current_setting('t.issue_a'))),
  1,
  'member can delete an issue'
);
select is(
  (select count(*)::int from public.issue_events where issue_id = current_setting('t.issue_a')::uuid),
  0,
  'deleting an issue cascades its events'
);
select is(
  (select issue_id is null from public.maintenance_records where id = current_setting('t.maint_a')::uuid),
  true,
  'deleting an issue nulls maintenance.issue_id and keeps the record'
);
select tests.clear_authentication();
reset role;

select * from finish();
rollback;
