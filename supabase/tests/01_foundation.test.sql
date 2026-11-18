-- pgTAP: fundação (profiles, homes, home_members, subscriptions, helpers).
-- Para voltar a postgres: `select tests.clear_authentication(); reset role;`
-- (só `reset role` deixaria as claims do último usuário em auth.uid()).
-- Usuários: A = owner da casa A · M = member da casa A · C = admin da casa A
--           B = estranho (tem a própria casa B) · E = cadastro sem metadata.
begin;
create extension if not exists pgtap with schema extensions;

select plan(67);

-- -----------------------------------------------------------------------------
-- Setup (postgres)
-- -----------------------------------------------------------------------------
do $$
begin
  perform set_config('t.a', tests.create_user('a@morano.test')::text, true);
  perform set_config('t.b', tests.create_user('b@morano.test')::text, true);
  perform set_config('t.m', tests.create_user('m@morano.test')::text, true);
  perform set_config('t.c', tests.create_user('c@morano.test')::text, true);
  perform set_config('t.e', tests.create_user('e@morano.test', '{}'::jsonb)::text, true);
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_catalog.pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'rls enabled on all foundation tables'
);
select is(
  (select count(*)::int from pg_catalog.pg_tables
   where schemaname = 'public' and rowsecurity
     and tablename in ('profiles', 'homes', 'home_members', 'subscriptions')),
  4,
  'foundation tables exist with rls'
);

-- -----------------------------------------------------------------------------
-- Cadastro
-- -----------------------------------------------------------------------------
select is(
  (select full_name from public.profiles where id = current_setting('t.a')::uuid),
  'Pessoa Teste',
  'signup creates profile with full_name from metadata'
);
select ok(
  (select terms_accepted_at is not null from public.profiles where id = current_setting('t.a')::uuid),
  'signup records terms acceptance'
);
select ok(
  (select terms_accepted_at is null and full_name is null from public.profiles where id = current_setting('t.e')::uuid),
  'signup without metadata leaves full_name and terms_accepted_at null'
);
select is(
  (select format('%s/%s/%s/%s', plan, status, provider, coalesce(current_period_end::text, 'null'))
   from public.subscriptions where user_id = current_setting('t.a')::uuid),
  'pro/active/beta_grant/null',
  'signup creates beta subscription row'
);
select is(
  public.current_plan(current_setting('t.a')::uuid),
  'pro'::public.subscription_plan,
  'signup creates profile and beta subscription: current_plan = pro'
);
select is(
  (select timezone from public.profiles where id = current_setting('t.a')::uuid),
  'America/Sao_Paulo',
  'profile timezone defaults to America/Sao_Paulo'
);

-- -----------------------------------------------------------------------------
-- A cria a casa
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);

select lives_ok(
  $$ insert into public.homes (name) values ('Casa A') returning id $$,
  'user can insert a home (with returning)'
);
do $$
begin
  perform set_config('t.home_a', (select id from public.homes where name = 'Casa A')::text, true);
end $$;

select is(
  (select role from public.home_members
   where home_id = current_setting('t.home_a')::uuid and user_id = current_setting('t.a')::uuid),
  'owner'::public.home_role,
  'creating a home makes creator owner'
);
select is(
  (select current_home_id from public.profiles where id = current_setting('t.a')::uuid),
  current_setting('t.home_a')::uuid,
  'creating a home sets current_home_id'
);
select is(
  (select timezone from public.homes where id = current_setting('t.home_a')::uuid),
  'America/Sao_Paulo',
  'home timezone defaults to America/Sao_Paulo'
);
select throws_ok(
  format($$ insert into public.homes (name, created_by) values ('Falsa', %L) $$, current_setting('t.b')),
  '42501', null,
  'cannot insert a home with created_by of someone else'
);
select throws_ok(
  format($$ update public.homes set created_by = %L where id = %L $$, current_setting('t.b'), current_setting('t.home_a')),
  '42501', null,
  'homes.created_by is not updatable'
);
select throws_ok(
  format($$ update public.homes set timezone = 'Mars/Phobos' where id = %L $$, current_setting('t.home_a')),
  '23514', 'invalid_timezone',
  'invalid timezone is rejected'
);
select is(
  tests.affected_rows(format($$ update public.homes set timezone = 'Europe/Lisbon' where id = %L $$, current_setting('t.home_a'))),
  1,
  'owner can update home (valid timezone accepted)'
);
select lives_ok(
  format($$ insert into public.home_members (home_id, user_id, role) values (%L, %L, 'member') $$,
         current_setting('t.home_a'), current_setting('t.m')),
  'owner adds a member'
);
select lives_ok(
  format($$ insert into public.home_members (home_id, user_id, role) values (%L, %L, 'admin') $$,
         current_setting('t.home_a'), current_setting('t.c')),
  'owner adds an admin'
);
select tests.clear_authentication();
reset role;

-- B cria a própria casa (postgres guarda ids para os testes)
select tests.authenticate_as(current_setting('t.b')::uuid);
select lives_ok($$ insert into public.homes (name) values ('Casa B') $$, 'second user creates own home');
select tests.clear_authentication();
reset role;
do $$
begin
  perform set_config('t.home_b', (select id from public.homes where name = 'Casa B')::text, true);
  perform set_config('t.mem_a_owner', (select id from public.home_members
    where home_id = current_setting('t.home_a')::uuid and user_id = current_setting('t.a')::uuid)::text, true);
  perform set_config('t.mem_b_owner', (select id from public.home_members
    where home_id = current_setting('t.home_b')::uuid and user_id = current_setting('t.b')::uuid)::text, true);
end $$;

-- -----------------------------------------------------------------------------
-- B (estranho) não vê nem mexe na casa A
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.b')::uuid);

select is(
  (select count(*)::int from public.homes where id = current_setting('t.home_a')::uuid),
  0,
  'user B cannot select user A''s home'
);
select is(
  tests.affected_rows(format($$ update public.homes set name = 'Invadida' where id = %L $$, current_setting('t.home_a'))),
  0,
  'user B cannot update user A''s home'
);
select is(
  tests.affected_rows(format($$ delete from public.homes where id = %L $$, current_setting('t.home_a'))),
  0,
  'user B cannot delete user A''s home'
);
select is(
  (select count(*)::int from public.home_members where home_id = current_setting('t.home_a')::uuid),
  0,
  'user B cannot select its members'
);
select throws_ok(
  format($$ insert into public.home_members (home_id, user_id, role) values (%L, %L, 'member') $$,
         current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'cannot self-join foreign home'
);
select throws_ok(
  format($$ insert into public.home_members (home_id, user_id, role) values (%L, %L, 'owner') $$,
         current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'cannot self-join foreign home as owner'
);
select is(
  (select count(*)::int from public.profiles where id = current_setting('t.a')::uuid),
  0,
  'profiles are private: B cannot select A''s profile'
);
select is(
  (select count(*)::int from public.profiles),
  1,
  'user sees only own profile'
);
select is(
  tests.affected_rows(format($$ update public.profiles set full_name = 'X' where id = %L $$, current_setting('t.a'))),
  0,
  'user B cannot update A''s profile'
);
select throws_ok(
  format($$ update public.profiles set current_home_id = %L where id = %L $$, current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'current_home_id cannot point to a foreign home'
);
select throws_ok(
  format($$ update public.profiles set terms_accepted_at = now() where id = %L $$, current_setting('t.b')),
  '42501', null,
  'terms_accepted_at is not client-updatable'
);
select is(
  tests.affected_rows(format($$ update public.profiles set full_name = 'Bruno', last_seen_at = now() where id = %L $$, current_setting('t.b'))),
  1,
  'user updates own profile'
);
select is(
  (select array_agg(user_id) from public.subscriptions),
  array[current_setting('t.b')::uuid],
  'user sees only own subscription'
);
select throws_ok(
  format($$ select public.current_plan(%L) $$, current_setting('t.a')),
  '42501', 'forbidden',
  'current_plan of an unrelated user is forbidden'
);
select throws_ok(
  format($$ select public.ensure_same_home(%L, 'public.home_members', %L) $$,
         current_setting('t.home_b'), current_setting('t.mem_a_owner')),
  'P0001', 'cross_home_reference',
  'ensure_same_home rejects a row the caller cannot see'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- M (member) — não escala papel
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.m')::uuid);

select is(
  (select count(*)::int from public.homes where id = current_setting('t.home_a')::uuid),
  1,
  'member can select own home'
);
select is(
  (select count(*)::int from public.home_members where home_id = current_setting('t.home_a')::uuid),
  3,
  'member sees members of own home'
);
select is(
  tests.affected_rows(format($$ update public.home_members set role = 'owner' where home_id = %L and user_id = %L $$,
                             current_setting('t.home_a'), current_setting('t.m'))),
  0,
  'member cannot escalate role'
);
select throws_ok(
  format($$ update public.home_members set user_id = %L where user_id = %L $$, current_setting('t.b'), current_setting('t.m')),
  '42501', null,
  'home_members.user_id is not updatable'
);
select throws_ok(
  format($$ update public.home_members set home_id = %L where user_id = %L $$, current_setting('t.home_b'), current_setting('t.m')),
  '42501', null,
  'home_members.home_id is not updatable'
);
select throws_ok(
  format($$ insert into public.home_members (home_id, user_id, role) values (%L, %L, 'member') $$,
         current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'member cannot add members'
);
select is(
  tests.affected_rows(format($$ update public.homes set name = 'Minha' where id = %L $$, current_setting('t.home_a'))),
  0,
  'member cannot update home'
);
select is(
  public.current_plan(current_setting('t.a')::uuid),
  'pro'::public.subscription_plan,
  'co-member can read the owner''s plan'
);
select is(
  tests.affected_rows(format($$ update public.profiles set current_home_id = %L where id = %L $$,
                             current_setting('t.home_a'), current_setting('t.m'))),
  1,
  'member can set current_home_id to a home they belong to'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- C (admin) — gerencia, mas não concede owner nem mexe no owner
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.c')::uuid);

select throws_ok(
  format($$ insert into public.home_members (home_id, user_id, role) values (%L, %L, 'owner') $$,
         current_setting('t.home_a'), current_setting('t.b')),
  '42501', null,
  'admin cannot grant owner on insert'
);
select throws_ok(
  format($$ update public.home_members set role = 'owner' where home_id = %L and user_id = %L $$,
         current_setting('t.home_a'), current_setting('t.m')),
  '42501', null,
  'admin cannot promote to owner'
);
select is(
  tests.affected_rows(format($$ update public.home_members set role = 'member' where home_id = %L and user_id = %L $$,
                             current_setting('t.home_a'), current_setting('t.a'))),
  0,
  'admin cannot demote the owner'
);
select is(
  tests.affected_rows(format($$ delete from public.home_members where home_id = %L and user_id = %L $$,
                             current_setting('t.home_a'), current_setting('t.a'))),
  0,
  'admin cannot remove the owner'
);
select is(
  tests.affected_rows(format($$ delete from public.homes where id = %L $$, current_setting('t.home_a'))),
  0,
  'only owner deletes home: admin delete affects 0 rows'
);
select is(
  tests.affected_rows(format($$ update public.homes set name = 'Casa A (admin)' where id = %L $$, current_setting('t.home_a'))),
  1,
  'admin can update home'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- Assinaturas: somente leitura para o usuário
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);

select throws_ok(
  format($$ update public.subscriptions set plan = 'pro', current_period_end = null where user_id = %L $$, current_setting('t.a')),
  '42501', null,
  'subscriptions are read-only for users: update fails'
);
select throws_ok(
  format($$ insert into public.subscriptions (user_id, plan) values (%L, 'pro') $$, current_setting('t.a')),
  '42501', null,
  'subscriptions are read-only for users: insert fails'
);
select throws_ok(
  format($$ delete from public.subscriptions where user_id = %L $$, current_setting('t.a')),
  '42501', null,
  'subscriptions are read-only for users: delete fails'
);
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- Pós-condições (postgres)
-- -----------------------------------------------------------------------------
select is(
  (select role from public.home_members
   where home_id = current_setting('t.home_a')::uuid and user_id = current_setting('t.m')::uuid),
  'member'::public.home_role,
  'member role unchanged after escalation attempts'
);

-- ensure_same_home
select throws_ok(
  format($$ select public.ensure_same_home(%L, 'public.home_members', %L) $$,
         current_setting('t.home_a'), current_setting('t.mem_b_owner')),
  'P0001', 'cross_home_reference',
  'ensure_same_home raises cross_home_reference'
);
select lives_ok(
  format($$ select public.ensure_same_home(%L, 'public.home_members', %L) $$,
         current_setting('t.home_a'), current_setting('t.mem_a_owner')),
  'ensure_same_home accepts a row of the same home'
);
select lives_ok(
  format($$ select public.ensure_same_home(%L, 'public.home_members', null) $$, current_setting('t.home_a')),
  'ensure_same_home ignores null ids'
);

-- current_plan
update public.subscriptions set current_period_end = now() - interval '1 day'
where user_id = current_setting('t.a')::uuid;
select is(
  public.current_plan(current_setting('t.a')::uuid),
  'free'::public.subscription_plan,
  'expired pro is free'
);
update public.subscriptions set current_period_end = now() + interval '30 days', status = 'canceled'
where user_id = current_setting('t.a')::uuid;
select is(
  public.current_plan(current_setting('t.a')::uuid),
  'free'::public.subscription_plan,
  'canceled pro is free'
);
delete from public.subscriptions where user_id = current_setting('t.e')::uuid;
select is(
  public.current_plan(current_setting('t.e')::uuid),
  'free'::public.subscription_plan,
  'missing subscription means free'
);

-- updated_at
select is(
  (select count(*)::int from pg_catalog.pg_trigger
   where tgname = 'set_updated_at'
     and tgrelid in ('public.profiles'::regclass, 'public.homes'::regclass, 'public.subscriptions'::regclass)),
  3,
  'updated_at triggers on profiles, homes and subscriptions'
);

-- anon
select tests.clear_authentication();
select throws_ok($$ select * from public.homes $$, '42501', null, 'anon has no access to homes');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon has no access to profiles');
select tests.clear_authentication();
reset role;

-- -----------------------------------------------------------------------------
-- Saída de membro e exclusão da casa pelo owner
-- -----------------------------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(
  tests.affected_rows(format($$ delete from public.home_members where home_id = %L and user_id = %L $$,
                             current_setting('t.home_a'), current_setting('t.m'))),
  1,
  'owner removes a member'
);
select is(
  tests.affected_rows(format($$ delete from public.homes where id = %L $$, current_setting('t.home_a'))),
  1,
  'owner deletes home'
);
select tests.clear_authentication();
reset role;

select is(
  (select current_home_id from public.profiles where id = current_setting('t.m')::uuid),
  null::uuid,
  'removed member loses current_home_id'
);
select is(
  (select count(*)::int from public.home_members where home_id = current_setting('t.home_a')::uuid),
  0,
  'home deletion cascades memberships'
);
select is(
  (select current_home_id from public.profiles where id = current_setting('t.a')::uuid),
  null::uuid,
  'home deletion clears owner current_home_id'
);

select * from finish();
rollback;
