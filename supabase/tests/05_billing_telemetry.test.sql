-- pgTAP: limites de plano, telemetria própria, push e log de exclusão.
-- Usuários: A = owner das casas A e A2 · M = member da casa A (PRO) · B = estranho (PRO)
--           F = usuário free que cria casas · P = dono da casa P (downgrade com excesso).
-- O plano é trocado como postgres, atualizando subscriptions.
begin;
create extension if not exists pgtap with schema extensions;

select plan(79);

-- -----------------------------------------------------------------------------
-- Setup (postgres). Todos nascem PRO (beta).
-- -----------------------------------------------------------------------------
do $$
begin
  perform set_config('t.a', tests.create_user('a@morano.test')::text, true);
  perform set_config('t.b', tests.create_user('b@morano.test')::text, true);
  perform set_config('t.m', tests.create_user('m@morano.test')::text, true);
  perform set_config('t.f', tests.create_user('f@morano.test')::text, true);
  perform set_config('t.p', tests.create_user('p@morano.test')::text, true);

  perform set_config('t.home_a', gen_random_uuid()::text, true);
  perform set_config('t.home_a2', gen_random_uuid()::text, true);
  perform set_config('t.home_b', gen_random_uuid()::text, true);
  perform set_config('t.home_p', gen_random_uuid()::text, true);

  insert into public.homes (id, name, created_by) values
    (current_setting('t.home_a')::uuid, 'Casa A', current_setting('t.a')::uuid),
    (current_setting('t.home_a2')::uuid, 'Casa A2', current_setting('t.a')::uuid),
    (current_setting('t.home_b')::uuid, 'Casa B', current_setting('t.b')::uuid),
    (current_setting('t.home_p')::uuid, 'Casa P', current_setting('t.p')::uuid);
  insert into public.home_members (home_id, user_id, role)
  values (current_setting('t.home_a')::uuid, current_setting('t.m')::uuid, 'member');

  -- PRO ainda: 40 tarefas ativas na casa A, 5 equipamentos na A2,
  -- 8 equipamentos e 42 tarefas ativas na P.
  insert into public.tasks (home_id, title)
  select current_setting('t.home_a')::uuid, 'Tarefa ' || g from generate_series(1, 40) g;
  insert into public.appliances (home_id, name)
  select current_setting('t.home_a2')::uuid, 'Equip ' || g from generate_series(1, 5) g;
  insert into public.appliances (home_id, name)
  select current_setting('t.home_p')::uuid, 'Equip P ' || g from generate_series(1, 8) g;
  insert into public.tasks (home_id, title)
  select current_setting('t.home_p')::uuid, 'Tarefa P ' || g from generate_series(1, 42) g;

  perform set_config('t.app_a', gen_random_uuid()::text, true);
  insert into public.appliances (id, home_id, name, archived_at)
  values (current_setting('t.app_a')::uuid, current_setting('t.home_a')::uuid, 'Geladeira A', now());
end $$;

-- -----------------------------------------------------------------------------
-- Estrutura
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_catalog.pg_tables
   where schemaname = 'public' and rowsecurity
     and tablename in ('push_subscriptions', 'product_events', 'pro_interest', 'account_deletion_log')),
  4,
  'telemetry/push/log tables have rls'
);
select is(
  (select count(*)::int from pg_catalog.pg_policies
   where schemaname = 'public' and tablename = 'account_deletion_log'),
  0,
  'account_deletion_log has no policies'
);
select is(
  (select count(*)::int from pg_catalog.pg_trigger
   where tgname = 'plan_limit' and not tgisinternal
     and tgrelid in ('public.homes'::regclass, 'public.tasks'::regclass,
                     'public.appliances'::regclass, 'public.attachments'::regclass)),
  4,
  'plan_limit triggers on homes, tasks, appliances and attachments'
);
select ok(
  not has_function_privilege('authenticated', 'public.home_owner_plan(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.home_owner_plan(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.plan_of_user(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.plan_of_user(uuid)', 'EXECUTE'),
  'plan oracles are not executable by clients'
);

-- -----------------------------------------------------------------------------
-- plan_limits / home_owner_plan
-- -----------------------------------------------------------------------------
select results_eq(
  $$ select max_homes, max_active_tasks, max_appliances, attachments_allowed from public.plan_limits('free') $$,
  $$ values (1, 40, 5, false) $$,
  'plan_limits(free) = 1/40/5/false'
);
select results_eq(
  $$ select max_homes, max_active_tasks, max_appliances, attachments_allowed from public.plan_limits('pro') $$,
  $$ values (null::int, null::int, null::int, true) $$,
  'plan_limits(pro) = null/null/null/true'
);
select is(public.home_owner_plan(current_setting('t.home_a')::uuid), 'pro'::public.subscription_plan,
  'home_owner_plan: creator is pro (beta)');
select is(public.home_owner_plan(gen_random_uuid()), 'free'::public.subscription_plan,
  'home_owner_plan: unknown home -> free');

-- -----------------------------------------------------------------------------
-- pro (beta): limites não se aplicam
-- -----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select lives_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Tarefa 41 pro') $$, current_setting('t.home_a')),
  'pro (beta): 41st active task allowed'
);
select lives_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, 'Equip 6 pro') $$, current_setting('t.home_a2')),
  'pro (beta): 6th appliance allowed'
);
select lives_ok(
  $$ insert into public.homes (name) values ('Casa A3') $$,
  'pro (beta): 2nd home allowed'
);
select lives_ok(
  format($$ insert into public.attachments (id, home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, %L, 'document', %L, 'nota.pdf', 'application/pdf', 1000) $$,
         '11111111-1111-4111-8111-111111111111', current_setting('t.home_a'), current_setting('t.app_a'),
         current_setting('t.home_a') || '/11111111-1111-4111-8111-111111111111/nota.pdf'),
  'pro (beta): attachment allowed'
);

-- -----------------------------------------------------------------------------
-- Downgrade do owner da casa A para free
-- -----------------------------------------------------------------------------
select tests.clear_authentication();
reset role;
update public.subscriptions set plan = 'free', provider = 'none' where user_id = current_setting('t.a')::uuid;

select is(public.home_owner_plan(current_setting('t.home_a')::uuid), 'free'::public.subscription_plan,
  'home_owner_plan: creator downgraded -> free');

-- homes: A já tem 3 casas (excesso) -> 4ª rejeitada; casas existentes seguem legíveis
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select throws_ok(
  $$ insert into public.homes (name) values ('Casa A4') $$,
  'P0001', 'plan_limit_homes', 'free: extra home rejected'
);
select is((select count(*)::int from public.homes where created_by = current_setting('t.a')::uuid), 3,
  'downgrade keeps all 3 homes selectable');

-- tasks: A está com 41 ativas na casa A
select throws_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Tarefa 42') $$, current_setting('t.home_a')),
  'P0001', 'plan_limit_tasks', 'free: extra active task rejected'
);
select lives_ok(
  format($$ insert into public.tasks (home_id, title, status) values (%L, 'Pausada', 'paused') $$, current_setting('t.home_a')),
  'free: paused task not counted (insert ok)'
);
select lives_ok(
  format($$ insert into public.tasks (home_id, title, status) values (%L, 'Arquivada', 'archived') $$, current_setting('t.home_a')),
  'free: archived task not counted (insert ok)'
);
select throws_ok(
  format($$ update public.tasks set status = 'active' where home_id = %L and title = 'Pausada' $$, current_setting('t.home_a')),
  'P0001', 'plan_limit_tasks', 'free: reactivating a paused task at limit rejected (no bypass via paused)'
);
select throws_ok(
  format($$ update public.tasks set status = 'active' where home_id = %L and title = 'Arquivada' $$, current_setting('t.home_a')),
  'P0001', 'plan_limit_tasks', 'free: unarchiving a task at limit rejected'
);
select is(
  tests.affected_rows(format($$ update public.tasks set title = 'Tarefa 1 editada' where home_id = %L and title = 'Tarefa 1' $$, current_setting('t.home_a'))),
  1, 'downgrade: over-limit active task still updatable'
);
select is(
  tests.affected_rows(format($$ update public.tasks set status = 'active', description = 'x' where home_id = %L and title = 'Tarefa 2' $$, current_setting('t.home_a'))),
  1, 'free: updating an already-active task (active -> active) is not a new slot'
);
select is((select count(*)::int from public.tasks where home_id = current_setting('t.home_a')::uuid and status = 'active'), 41,
  'downgrade keeps all 41 active tasks selectable');
select lives_ok(
  format($$ update public.tasks set status = 'paused' where home_id = %L and title in ('Tarefa 3', 'Tarefa 4') $$, current_setting('t.home_a')),
  'free: pausing tasks is always allowed (41 -> 39)'
);
select lives_ok(
  format($$ update public.tasks set status = 'active' where home_id = %L and title = 'Pausada' $$, current_setting('t.home_a')),
  'free: reactivating below the limit is allowed (39 -> 40)'
);
select throws_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Mais uma') $$, current_setting('t.home_a')),
  'P0001', 'plan_limit_tasks', 'free: 41st active task rejected again at 40'
);

-- member PRO não lava o limite: vale o plano do criador da casa
reset role;
select tests.authenticate_as(current_setting('t.m')::uuid);
select throws_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Do membro pro') $$, current_setting('t.home_a')),
  'P0001', 'plan_limit_tasks', 'free home: pro member cannot launder the creator plan'
);

-- appliances: casa A2 tem 6 não arquivados (excesso)
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select throws_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, 'Equip 7') $$, current_setting('t.home_a2')),
  'P0001', 'plan_limit_appliances', 'free: extra appliance rejected with plan_limit_appliances'
);
select lives_ok(
  format($$ insert into public.appliances (home_id, name, archived_at) values (%L, 'Já arquivado', now()) $$, current_setting('t.home_a2')),
  'free: inserting an already-archived appliance is allowed'
);
select throws_ok(
  format($$ update public.appliances set archived_at = null where home_id = %L and name = 'Já arquivado' $$, current_setting('t.home_a2')),
  'P0001', 'plan_limit_appliances', 'free: un-archiving at limit rejected'
);
select is(
  tests.affected_rows(format($$ update public.appliances set name = 'Equip 1 editado' where home_id = %L and name = 'Equip 1' $$, current_setting('t.home_a2'))),
  1, 'downgrade: over-limit appliance still updatable'
);
select is((select count(*)::int from public.appliances where home_id = current_setting('t.home_a2')::uuid and archived_at is null), 6,
  'downgrade keeps all 6 non-archived appliances selectable');
select lives_ok(
  format($$ update public.appliances set archived_at = now() where home_id = %L and name in ('Equip 1 editado', 'Equip 2') $$, current_setting('t.home_a2')),
  'free: archiving appliances is always allowed (6 -> 4)'
);
select lives_ok(
  format($$ update public.appliances set archived_at = null where home_id = %L and name = 'Já arquivado' $$, current_setting('t.home_a2')),
  'free: un-archiving below the limit allowed (4 -> 5)'
);
select throws_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, 'Equip 8') $$, current_setting('t.home_a2')),
  'P0001', 'plan_limit_appliances', 'free: 6th appliance rejected after refilling to 5'
);

-- attachments
select throws_ok(
  format($$ insert into public.attachments (id, home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, %L, 'document', %L, 'outra.pdf', 'application/pdf', 1000) $$,
         '22222222-2222-4222-8222-222222222222', current_setting('t.home_a'), current_setting('t.app_a'),
         current_setting('t.home_a') || '/22222222-2222-4222-8222-222222222222/outra.pdf'),
  'P0001', 'plan_limit_attachments', 'free: attachment rejected'
);
select is((select count(*)::int from public.attachments where home_id = current_setting('t.home_a')::uuid), 1,
  'downgrade keeps existing attachment selectable');
select is(
  tests.affected_rows(format($$ update public.attachments set file_name = 'renomeado.pdf' where id = %L $$, '11111111-1111-4111-8111-111111111111')),
  1, 'downgrade: existing attachment still updatable'
);
select is(
  tests.affected_rows(format($$ delete from public.attachments where id = %L $$, '11111111-1111-4111-8111-111111111111')),
  1, 'downgrade: existing attachment still deletable'
);

-- homes: usuário free recém-criado (F): 1ª casa ok, 2ª rejeitada
select tests.clear_authentication();
reset role;
update public.subscriptions set plan = 'free', provider = 'none' where user_id = current_setting('t.f')::uuid;
reset role;
select tests.authenticate_as(current_setting('t.f')::uuid);
select lives_ok(
  $$ insert into public.homes (name) values ('Casa F1') $$,
  'free: 1st home allowed'
);
select throws_ok(
  $$ insert into public.homes (name) values ('Casa F2') $$,
  'P0001', 'plan_limit_homes', 'free: 2nd home rejected'
);
-- contexto service/postgres (auth.uid() nulo): conta por created_by
select tests.clear_authentication();
reset role;
select throws_ok(
  format($$ insert into public.homes (name, created_by) values ('Casa F3', %L) $$,
         current_setting('t.f')),
  'P0001', 'plan_limit_homes', 'free: limit also applies when auth.uid() is null (created_by used)'
);

-- Estranho não sonda contagem/plano de casa alheia: o erro é o da RLS, não o do limite
reset role;
select tests.authenticate_as(current_setting('t.b')::uuid);
select throws_ok(
  format($$ insert into public.tasks (home_id, title) values (%L, 'Invasão') $$, current_setting('t.home_a')),
  '42501', null, 'non-member probing a full free home gets the RLS error, not plan_limit_tasks'
);
select throws_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, 'Invasão') $$, current_setting('t.home_a2')),
  '42501', null, 'non-member probing appliances gets the RLS error'
);

-- -----------------------------------------------------------------------------
-- Downgrade com excesso (casa P: 8 equipamentos, 42 tarefas ativas)
-- -----------------------------------------------------------------------------
select tests.clear_authentication();
reset role;
update public.subscriptions set plan = 'free', provider = 'none' where user_id = current_setting('t.p')::uuid;
reset role;
select tests.authenticate_as(current_setting('t.p')::uuid);
select is((select count(*)::int from public.appliances where home_id = current_setting('t.home_p')::uuid), 8,
  'downgrade: all 8 appliances remain selectable');
select is((select count(*)::int from public.tasks where home_id = current_setting('t.home_p')::uuid and status = 'active'), 42,
  'downgrade: all 42 active tasks remain selectable');
select is(
  tests.affected_rows(format($$ update public.appliances set name = 'Renomeado', notes = 'ok' where home_id = %L $$, current_setting('t.home_p'))),
  8, 'downgrade: all 8 appliances remain updatable'
);
select is(
  tests.affected_rows(format($$ update public.tasks set priority = 'alta' where home_id = %L $$, current_setting('t.home_p'))),
  42, 'downgrade: all 42 tasks remain updatable'
);
select throws_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, 'Novo') $$, current_setting('t.home_p')),
  'P0001', 'plan_limit_appliances', 'downgrade: new appliance rejected'
);

-- Volta a PRO: limites somem
select tests.clear_authentication();
reset role;
update public.subscriptions set plan = 'pro', provider = 'beta_grant' where user_id = current_setting('t.p')::uuid;
reset role;
select tests.authenticate_as(current_setting('t.p')::uuid);
select lives_ok(
  format($$ insert into public.appliances (home_id, name) values (%L, 'Novo pro') $$, current_setting('t.home_p')),
  'back to pro: appliance allowed again'
);

-- -----------------------------------------------------------------------------
-- product_events
-- -----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select lives_ok(
  format($$ insert into public.product_events (home_id, event_name) values (%L, 'task_completed') $$, current_setting('t.home_a')),
  'product_events: insert own (member home) ok'
);
select lives_ok(
  $$ insert into public.product_events (event_name) values ('onboarding_completed') $$,
  'product_events: insert with null home ok'
);
select is((select count(*)::int from public.product_events), 0, 'product_events: select returns 0 rows (no select policy)');
select throws_ok(
  format($$ insert into public.product_events (home_id, event_name) values (%L, 'task_completed') $$, current_setting('t.home_b')),
  '42501', null, 'product_events: foreign home rejected'
);
select throws_ok(
  format($$ insert into public.product_events (user_id, event_name) values (%L, 'task_completed') $$, current_setting('t.b')),
  '42501', null, 'product_events: other user_id rejected'
);
select throws_ok(
  $$ insert into public.product_events (event_name) values ('Task-Completed') $$,
  '23514', null, 'product_events: event_name format enforced (uppercase/hyphen)'
);
select throws_ok(
  $$ insert into public.product_events (event_name) values ('ab') $$,
  '23514', null, 'product_events: event_name too short rejected'
);
select throws_ok(
  $$ update public.product_events set event_name = 'hacked' $$,
  '42501', null, 'product_events: not updatable'
);
select tests.clear_authentication();
select throws_ok(
  $$ insert into public.product_events (event_name) values ('task_completed') $$,
  '42501', null, 'product_events: anon cannot insert'
);
reset role;
select is((select count(*)::int from public.product_events), 2, 'product_events: rows exist for the owner (postgres) to read');

-- -----------------------------------------------------------------------------
-- pro_interest
-- -----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select lives_ok($$ insert into public.pro_interest (price_option) values ('mensal') $$, 'pro_interest: insert own ok');
select throws_ok($$ insert into public.pro_interest (price_option) values ('mensal') $$,
  '23505', null, 'pro_interest: duplicate (user, option) rejected');
select throws_ok($$ insert into public.pro_interest (price_option) values ('trimestral') $$,
  '23514', null, 'pro_interest: invalid price_option rejected');
select throws_ok(
  format($$ insert into public.pro_interest (user_id, price_option) values (%L, 'anual') $$, current_setting('t.b')),
  '42501', null, 'pro_interest: other user_id rejected');
select is((select count(*)::int from public.pro_interest), 1, 'pro_interest: select own');
reset role;
select tests.authenticate_as(current_setting('t.b')::uuid);
select is((select count(*)::int from public.pro_interest), 0, 'pro_interest: other user sees nothing');
select throws_ok($$ delete from public.pro_interest $$, '42501', null, 'pro_interest: not deletable by client');

-- -----------------------------------------------------------------------------
-- push_subscriptions
-- -----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select lives_ok(
  $$ insert into public.push_subscriptions (endpoint, p256dh, auth, user_agent)
     values ('https://push.example/a', 'k1', 'a1', 'UA') $$,
  'push_subscriptions: insert own ok'
);
select throws_ok(
  $$ insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/a', 'k2', 'a2') $$,
  '23505', null, 'push_subscriptions: endpoint unique'
);
select throws_ok(
  format($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
            values (%L, 'https://push.example/x', 'k', 'a') $$, current_setting('t.b')),
  '42501', null, 'push_subscriptions: other user_id rejected'
);
select is(
  tests.affected_rows($$ update public.push_subscriptions set last_used_at = now(), p256dh = 'k9' where endpoint = 'https://push.example/a' $$),
  1, 'push_subscriptions: update own ok'
);
reset role;
select tests.authenticate_as(current_setting('t.b')::uuid);
select is((select count(*)::int from public.push_subscriptions), 0, 'push_subscriptions: other user sees nothing');
select is(tests.affected_rows($$ update public.push_subscriptions set p256dh = 'x' $$), 0, 'push_subscriptions: other user cannot update');
select is(tests.affected_rows($$ delete from public.push_subscriptions $$), 0, 'push_subscriptions: other user cannot delete');
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(tests.affected_rows($$ delete from public.push_subscriptions $$), 1, 'push_subscriptions: delete own ok');

-- -----------------------------------------------------------------------------
-- account_deletion_log
-- -----------------------------------------------------------------------------
select throws_ok($$ select * from public.account_deletion_log $$, '42501', null, 'account_deletion_log inaccessible to authenticated (select)');
select throws_ok($$ insert into public.account_deletion_log (anonymized_ref) values (gen_random_uuid()) $$,
  '42501', null, 'account_deletion_log inaccessible to authenticated (insert)');
select tests.clear_authentication();
select throws_ok($$ select * from public.account_deletion_log $$, '42501', null, 'account_deletion_log inaccessible to anon');
reset role;
select lives_ok($$ insert into public.account_deletion_log (anonymized_ref) values (gen_random_uuid()) $$,
  'account_deletion_log writable by service/postgres');

select * from finish();
rollback;
