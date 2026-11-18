-- pgTAP: rotina (rooms, tasks, routines, task_occurrences).
-- Usuários: A = owner da casa A e da casa A2 · M = member da casa A
--           B = estranho (dono da casa B).
-- Memberships e casas são criadas como postgres (o cliente não insere em
-- home_members). Para voltar a postgres: `select tests.clear_authentication(); reset role;`
begin;
create extension if not exists pgtap with schema extensions;

select plan(73);

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

  -- Dados da casa B (para provar isolamento e FKs cruzadas)
  perform set_config('t.room_b', gen_random_uuid()::text, true);
  perform set_config('t.task_b', gen_random_uuid()::text, true);
  insert into public.rooms (id, home_id, name, room_type)
  values (current_setting('t.room_b')::uuid, current_setting('t.home_b')::uuid, 'Cozinha B', 'cozinha');
  insert into public.tasks (id, home_id, room_id, title)
  values (current_setting('t.task_b')::uuid, current_setting('t.home_b')::uuid,
          current_setting('t.room_b')::uuid, 'Tarefa B');
  insert into public.routines (task_id, home_id, frequency_type, start_date)
  values (current_setting('t.task_b')::uuid, current_setting('t.home_b')::uuid, 'daily', '2026-01-01');
  insert into public.task_occurrences (task_id, home_id, original_date, scheduled_for)
  values (current_setting('t.task_b')::uuid, current_setting('t.home_b')::uuid, '2026-01-01', '2026-01-01');
end $$;

-- -----------------------------------------------------------------------------
-- Estrutura
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_catalog.pg_tables
   where schemaname = 'public' and rowsecurity
     and tablename in ('rooms', 'tasks', 'routines', 'task_occurrences')),
  4,
  'rooms, tasks, routines and task_occurrences have rls'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.frequency_type'::regtype),
  array['once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'],
  'frequency_type labels'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.occurrence_status'::regtype),
  array['pending', 'completed', 'skipped', 'missed'],
  'occurrence_status labels'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.room_type'::regtype),
  array['sala', 'cozinha', 'quarto', 'banheiro', 'lavanderia', 'escritorio', 'varanda', 'garagem', 'outro'],
  'room_type labels'
);
select is(
  (select format_type(atttypid, atttypmod) from pg_catalog.pg_attribute
   where attrelid = 'public.tasks'::regclass and attname = 'appliance_id'),
  'uuid',
  'tasks.appliance_id exists as plain uuid (FK arrives with appliances)'
);
select is(
  (select count(*)::int from pg_catalog.pg_indexes
   where schemaname = 'public' and tablename = 'task_occurrences'
     and indexname in ('task_occurrences_home_scheduled_status_idx', 'task_occurrences_task_scheduled_idx')),
  2,
  'occurrence indexes exist'
);
select is(
  (select count(*)::int from pg_catalog.pg_trigger
   where tgname = 'set_updated_at'
     and tgrelid in ('public.rooms'::regclass, 'public.tasks'::regclass,
                     'public.routines'::regclass, 'public.task_occurrences'::regclass)),
  4,
  'updated_at triggers on the four tables'
);

-- anon
select tests.clear_authentication();
select throws_ok($$ select * from public.rooms $$, '42501', null, 'anon has no access to rooms');
select throws_ok($$ select * from public.tasks $$, '42501', null, 'anon has no access to tasks');
select throws_ok($$ select * from public.routines $$, '42501', null, 'anon has no access to routines');
select throws_ok($$ select * from public.task_occurrences $$, '42501', null, 'anon has no access to occurrences');
reset role;

-- -----------------------------------------------------------------------------
-- A: CRUD de membro em rooms e tasks
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);

select lives_ok(
  format($$ insert into public.rooms (home_id, name, room_type, position) values (%L, 'Sala', 'sala', 1) $$,
         current_setting('t.home_a')),
  'member can insert a room'
);
do $$
begin
  perform set_config('t.room_a', (select id from public.rooms where name = 'Sala')::text, true);
end $$;

select lives_ok(
  format($$ insert into public.tasks (home_id, room_id, title, priority) values (%L, %L, 'Varrer', 'alta') $$,
         current_setting('t.home_a'), current_setting('t.room_a')),
  'member can insert a task in an own room'
);
do $$
begin
  perform set_config('t.task_a', (select id from public.tasks where title = 'Varrer')::text, true);
end $$;
select is(
  (select created_by from public.tasks where id = current_setting('t.task_a')::uuid),
  current_setting('t.a')::uuid,
  'tasks.created_by defaults to the caller'
);
select is(
  (select format('%s/%s/%s', status, source, priority) from public.tasks where id = current_setting('t.task_a')::uuid),
  'active/manual/alta',
  'task defaults'
);
select throws_ok(
  format($$ insert into public.tasks (home_id, title, created_by) values (%L, 'Falsa', %L) $$,
         current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'tasks.created_by is not client-insertable'
);
select is(
  tests.affected_rows(format($$ update public.rooms set name = 'Sala de estar' where id = %L $$, current_setting('t.room_a'))),
  1,
  'member can update a room'
);
select is(
  tests.affected_rows(format($$ update public.tasks set title = 'Varrer a sala', status = 'paused' where id = %L $$, current_setting('t.task_a'))),
  1,
  'member can update a task'
);
select throws_ok(
  format($$ update public.tasks set home_id = %L where id = %L $$, current_setting('t.home_a2'), current_setting('t.task_a')),
  '42501', null,
  'tasks.home_id is not updatable'
);
select throws_ok(
  format($$ update public.rooms set home_id = %L where id = %L $$, current_setting('t.home_a2'), current_setting('t.room_a')),
  '42501', null,
  'rooms.home_id is not updatable'
);
select throws_ok(
  format($$ update public.tasks set created_by = %L where id = %L $$, current_setting('t.m'), current_setting('t.task_a')),
  '42501', null,
  'tasks.created_by is not updatable'
);
select throws_ok(
  format($$ insert into public.rooms (id, home_id, name) values (gen_random_uuid(), %L, 'Com id') $$, current_setting('t.home_a')),
  '42501', null,
  'rooms.id is not client-insertable'
);
select throws_ok(
  format($$ insert into public.rooms (home_id, name) values (%L, '   ') $$, current_setting('t.home_a')),
  '23514', null,
  'blank room name rejected'
);

-- rotina e ocorrências do próprio A
select lives_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, interval_value, weekdays, start_date)
           values (%L, %L, 'weekly', 1, '{1,3}', '2026-03-01') $$,
         current_setting('t.task_a'), current_setting('t.home_a')),
  'member can insert a routine'
);
select lives_ok(
  format($$ insert into public.task_occurrences (task_id, home_id, original_date, scheduled_for)
           values (%L, %L, '2026-03-02', '2026-03-02'), (%L, %L, '2026-03-04', '2026-03-04') $$,
         current_setting('t.task_a'), current_setting('t.home_a'),
         current_setting('t.task_a'), current_setting('t.home_a')),
  'member can insert occurrences'
);
select is(
  tests.affected_rows(format($$ update public.routines set interval_value = 2, is_active = false where task_id = %L $$, current_setting('t.task_a'))),
  1,
  'member can update a routine'
);
select is(
  tests.affected_rows(format(
    $$ update public.task_occurrences set status = 'completed', completed_at = now(), completed_by = %L, notes = 'ok'
       where task_id = %L and original_date = '2026-03-02' $$,
    current_setting('t.a'), current_setting('t.task_a'))),
  1,
  'member can complete an occurrence'
);
select is(
  tests.affected_rows(format($$ update public.task_occurrences set scheduled_for = '2026-03-05' where task_id = %L and original_date = '2026-03-04' $$,
                             current_setting('t.task_a'))),
  1,
  'member can postpone an occurrence'
);

-- integridade de colunas imutáveis
select throws_ok(
  format($$ update public.task_occurrences set task_id = %L $$, current_setting('t.task_b')),
  '42501', null,
  'task_occurrences.task_id is not updatable'
);
select throws_ok(
  format($$ update public.task_occurrences set home_id = %L $$, current_setting('t.home_a2')),
  '42501', null,
  'task_occurrences.home_id is not updatable'
);
select throws_ok(
  format($$ update public.task_occurrences set original_date = '2030-01-01' where task_id = %L $$, current_setting('t.task_a')),
  '42501', null,
  'task_occurrences.original_date is not updatable'
);
select throws_ok(
  format($$ update public.routines set task_id = %L where task_id = %L $$, current_setting('t.task_b'), current_setting('t.task_a')),
  '42501', null,
  'routines.task_id is not updatable'
);
select throws_ok(
  format($$ update public.routines set home_id = %L where task_id = %L $$, current_setting('t.home_a2'), current_setting('t.task_a')),
  '42501', null,
  'routines.home_id is not updatable'
);

-- duplicidade
select is(
  tests.affected_rows(format(
    $$ insert into public.task_occurrences (task_id, home_id, original_date, scheduled_for)
       values (%L, %L, '2026-03-02', '2026-03-02') on conflict (task_id, original_date) do nothing $$,
    current_setting('t.task_a'), current_setting('t.home_a'))),
  0,
  'duplicate occurrence: on conflict do nothing inserts 0 rows'
);
select throws_ok(
  format($$ insert into public.task_occurrences (task_id, home_id, original_date, scheduled_for)
           values (%L, %L, '2026-03-02', '2026-03-02') $$,
         current_setting('t.task_a'), current_setting('t.home_a')),
  '23505', null,
  'duplicate occurrence rejected (unique task_id, original_date)'
);
select throws_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, start_date) values (%L, %L, 'daily', '2026-03-01') $$,
         current_setting('t.task_a'), current_setting('t.home_a')),
  '23505', null,
  'one routine per task'
);

-- checks da rotina (usa uma tarefa nova sem rotina)
select lives_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Sem rotina') $$, current_setting('t.home_a')),
  'task without routine'
);
do $$
begin
  perform set_config('t.task_c', (select id from public.tasks where title = 'Sem rotina')::text, true);
end $$;
select throws_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, interval_value, start_date) values (%L, %L, 'daily', 0, '2026-03-01') $$,
         current_setting('t.task_c'), current_setting('t.home_a')),
  '23514', null,
  'interval_value must be >= 1'
);
select throws_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, month_day, start_date) values (%L, %L, 'monthly', 32, '2026-03-01') $$,
         current_setting('t.task_c'), current_setting('t.home_a')),
  '23514', null,
  'month_day must be between 1 and 31'
);
select throws_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, weekdays, start_date) values (%L, %L, 'weekly', '{7}', '2026-03-01') $$,
         current_setting('t.task_c'), current_setting('t.home_a')),
  '23514', null,
  'weekdays must be within 0..6'
);
select throws_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, start_date, end_date) values (%L, %L, 'daily', '2026-03-10', '2026-03-01') $$,
         current_setting('t.task_c'), current_setting('t.home_a')),
  '23514', null,
  'end_date must not precede start_date'
);
select lives_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, month_day, start_date, end_date) values (%L, %L, 'monthly', 31, '2026-03-01', '2026-03-01') $$,
         current_setting('t.task_c'), current_setting('t.home_a')),
  'valid monthly routine (day 31, end = start) accepted'
);

-- -----------------------------------------------------------------------------
-- FKs cruzadas entre casas
-- -----------------------------------------------------------------------------
select throws_ok(
  format($$ insert into public.tasks (home_id, room_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a'), current_setting('t.room_b')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: task in home A with a room of home B (invisible by rls)'
);
-- sala de A usada em tarefa da casa A2 (A enxerga as duas casas: a linha é visível, mas de outra casa)
select throws_ok(
  format($$ insert into public.tasks (home_id, room_id, title) values (%L, %L, 'Invasora') $$,
         current_setting('t.home_a2'), current_setting('t.room_a')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected: room of a visible but different home'
);
select throws_ok(
  format($$ update public.tasks set room_id = %L where id = %L $$, current_setting('t.room_b'), current_setting('t.task_a')),
  'P0001', 'cross_home_reference',
  'cross-home FK rejected on update of room_id'
);
select throws_ok(
  format($$ insert into public.tasks (home_id, room_id, title) values (%L, %L, 'Inexistente') $$,
         current_setting('t.home_a'), gen_random_uuid()),
  'P0001', 'cross_home_reference',
  'nonexistent room is rejected too'
);
select lives_ok(
  format($$ update public.tasks set room_id = null where id = %L $$, current_setting('t.task_c')),
  'room_id can be cleared (null)'
);

-- ocorrência: home_id precisa bater com a tarefa
select throws_ok(
  format($$ insert into public.task_occurrences (task_id, home_id, original_date, scheduled_for)
           values (%L, %L, '2026-04-01', '2026-04-01') $$,
         current_setting('t.task_a'), current_setting('t.home_a2')),
  'P0001', 'cross_home_reference',
  'occurrence home_id must match task (member of both homes)'
);
select throws_ok(
  format($$ insert into public.task_occurrences (task_id, home_id, original_date, scheduled_for)
           values (%L, %L, '2026-04-01', '2026-04-01') $$,
         current_setting('t.task_b'), current_setting('t.home_a')),
  'P0001', 'cross_home_reference',
  'occurrence cannot point to a task of another home (invisible task)'
);
select throws_ok(
  format($$ insert into public.task_occurrences (task_id, home_id, original_date, scheduled_for)
           values (%L, %L, '2026-04-01', '2026-04-01') $$,
         current_setting('t.task_b'), current_setting('t.home_b')),
  'P0001', 'cross_home_reference',
  'occurrence cannot be created in a foreign home even with matching ids'
);
select throws_ok(
  format($$ insert into public.routines (task_id, home_id, frequency_type, start_date) values (%L, %L, 'daily', '2026-03-01') $$,
         current_setting('t.task_c'), current_setting('t.home_a2')),
  'P0001', 'cross_home_reference',
  'routine home_id must match task'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- M (member da casa A): vê e edita o conteúdo; não finge ser outro em completed_by
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.m')::uuid);
select is(
  (select count(*)::int from public.tasks where home_id = current_setting('t.home_a')::uuid),
  2,
  'co-member sees tasks of the home'
);
select is(
  (select count(*)::int from public.task_occurrences where home_id = current_setting('t.home_a')::uuid),
  2,
  'co-member sees occurrences of the home'
);
select lives_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Da M') $$, current_setting('t.home_a')),
  'co-member can insert a task'
);
select throws_ok(
  format($$ update public.task_occurrences set status = 'completed', completed_at = now(), completed_by = %L
           where task_id = %L and original_date = '2026-03-04' $$,
         current_setting('t.a'), current_setting('t.task_a')),
  '42501', 'completed_by_must_be_caller',
  'completed_by cannot be set to someone else'
);
select is(
  tests.affected_rows(format(
    $$ update public.task_occurrences set status = 'completed', completed_at = now(), completed_by = %L
       where task_id = %L and original_date = '2026-03-04' $$,
    current_setting('t.m'), current_setting('t.task_a'))),
  1,
  'co-member completes an occurrence as themselves'
);
select is(
  tests.affected_rows(format($$ update public.task_occurrences set notes = 'editado por M' where task_id = %L and original_date = '2026-03-02' $$,
                             current_setting('t.task_a'))),
  1,
  'co-member may edit an occurrence completed by another member without touching completed_by'
);
select is(
  tests.affected_rows($$ delete from public.tasks where title = 'Da M' $$),
  1,
  'co-member can delete a task'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- B (estranho): não vê nem mexe em nada da casa A
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.b')::uuid);
select is((select count(*)::int from public.rooms where home_id = current_setting('t.home_a')::uuid), 0, 'non-member sees no rooms of A');
select is((select count(*)::int from public.tasks where home_id = current_setting('t.home_a')::uuid), 0, 'non-member sees no tasks of A');
select is((select count(*)::int from public.routines where home_id = current_setting('t.home_a')::uuid), 0, 'non-member sees no routines of A');
select is((select count(*)::int from public.task_occurrences where home_id = current_setting('t.home_a')::uuid), 0, 'non-member sees no occurrences of A');
select is((select count(*)::int from public.tasks), 1, 'non-member sees only own home tasks');
select is(
  tests.affected_rows(format($$ update public.tasks set title = 'Invadida' where id = %L $$, current_setting('t.task_a'))),
  0,
  'non-member cannot update a task of A'
);
select is(
  tests.affected_rows(format($$ delete from public.rooms where id = %L $$, current_setting('t.room_a'))),
  0,
  'non-member cannot delete a room of A'
);
select is(
  tests.affected_rows(format($$ update public.task_occurrences set status = 'skipped' where task_id = %L $$, current_setting('t.task_a'))),
  0,
  'non-member cannot update occurrences of A'
);
select throws_ok(
  format($$ insert into public.rooms (home_id, name) values (%L, 'Invasora') $$, current_setting('t.home_a')),
  '42501', null,
  'non-member cannot insert a room in home A'
);
select throws_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Invasora') $$, current_setting('t.home_a')),
  '42501', null,
  'non-member cannot insert a task in home A'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- Exclusões (postgres confere os efeitos em cascata / set null)
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(
  tests.affected_rows(format($$ delete from public.rooms where id = %L $$, current_setting('t.room_a'))),
  1,
  'member deletes a room'
);
select is(
  (select room_id from public.tasks where id = current_setting('t.task_a')::uuid),
  null::uuid,
  'deleting room nulls task.room_id (task survives)'
);
select is(
  tests.affected_rows(format($$ delete from public.tasks where id = %L $$, current_setting('t.task_a'))),
  1,
  'member deletes a task'
);
select tests.clear_authentication();
reset role;

select is(
  (select count(*)::int from public.routines where task_id = current_setting('t.task_a')::uuid)
  + (select count(*)::int from public.task_occurrences where task_id = current_setting('t.task_a')::uuid),
  0,
  'deleting task cascades routine and occurrences'
);
select is(
  (select count(*)::int from public.tasks where id = current_setting('t.task_b')::uuid),
  1,
  'other homes are untouched'
);

select * from finish();
rollback;
