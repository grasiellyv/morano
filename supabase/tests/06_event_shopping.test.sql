-- pgTAP: vínculo evento ↔ itens de compras (shopping_items.event_id, add_shopping_item, gatilho de exclusão).
-- Usuários: A = owner da casa A · M = member da casa A SEM permissão de Compras · B = dono da casa B.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

do $$
begin
  perform set_config('t.a', tests.create_user('a6@morano.test')::text, true);
  perform set_config('t.b', tests.create_user('b6@morano.test')::text, true);
  perform set_config('t.m', tests.create_user('m6@morano.test')::text, true);

  perform set_config('t.home_a', gen_random_uuid()::text, true);
  perform set_config('t.home_b', gen_random_uuid()::text, true);
  perform set_config('t.ev1', gen_random_uuid()::text, true);
  perform set_config('t.ev2', gen_random_uuid()::text, true);
  perform set_config('t.ev_b', gen_random_uuid()::text, true);

  insert into public.homes (id, name, created_by) values
    (current_setting('t.home_a')::uuid, 'Casa A6', current_setting('t.a')::uuid),
    (current_setting('t.home_b')::uuid, 'Casa B6', current_setting('t.b')::uuid);
  insert into public.home_members (home_id, user_id, role)
  values (current_setting('t.home_a')::uuid, current_setting('t.m')::uuid, 'member');
  insert into public.home_member_permissions (home_id, user_id, can_manage_shopping, can_manage_events)
  values (current_setting('t.home_a')::uuid, current_setting('t.m')::uuid, false, true)
  on conflict (home_id, user_id) do update set can_manage_shopping = false, can_manage_events = true;

  insert into public.events (id, home_id, title, start_date, created_by) values
    (current_setting('t.ev1')::uuid, current_setting('t.home_a')::uuid, 'Visita Teste', '2026-12-01', current_setting('t.a')::uuid),
    (current_setting('t.ev2')::uuid, current_setting('t.home_a')::uuid, 'Jantar', '2026-12-02', current_setting('t.a')::uuid),
    (current_setting('t.ev_b')::uuid, current_setting('t.home_b')::uuid, 'Evento B', '2026-12-03', current_setting('t.b')::uuid);
end $$;

-- Estrutura -------------------------------------------------------------------
select is(
  (select count(*)::int from pg_catalog.pg_proc
   where proname = 'add_shopping_item' and pronamespace = 'public'::regnamespace),
  1,
  'só existe uma função add_shopping_item (sem sobrecarga ambígua)'
);
select ok(
  not has_function_privilege('authenticated', 'public.delete_event_pending_items()', 'EXECUTE'),
  'função do gatilho não é chamável por authenticated'
);

-- Dono adiciona itens ----------------------------------------------------------
select tests.authenticate_as(current_setting('t.a')::uuid);

select is(
  (select public.add_shopping_item(current_setting('t.home_a')::uuid, 'Leite A6', null, 1, 'un', null, null, 'ocasioes', 'normal', current_setting('t.ev1')::uuid)->>'result'),
  'inserted',
  'item de evento é inserido'
);
select is(
  (select event_id from public.shopping_items where home_id = current_setting('t.home_a')::uuid and name = 'Leite A6'),
  current_setting('t.ev1')::uuid,
  'item inserido fica vinculado ao evento'
);

-- Item que já existia (sem evento) é somado e NÃO é vinculado (D1)
select public.add_shopping_item(current_setting('t.home_a')::uuid, 'Pão A6', null, 1, 'un', null, null, null, 'normal', null);
select is(
  (select public.add_shopping_item(current_setting('t.home_a')::uuid, 'Pão A6', null, 2, 'un', null, null, 'ocasioes', 'normal', current_setting('t.ev1')::uuid)->>'result'),
  'merged',
  'item já existente é somado'
);
select is(
  (select event_id from public.shopping_items where home_id = current_setting('t.home_a')::uuid and name = 'Pão A6'),
  null::uuid,
  'soma não vincula o item existente ao evento'
);

-- Evento de outra casa é ignorado
select public.add_shopping_item(current_setting('t.home_a')::uuid, 'Café A6', null, 1, 'un', null, null, null, 'normal', current_setting('t.ev_b')::uuid);
select is(
  (select event_id from public.shopping_items where home_id = current_setting('t.home_a')::uuid and name = 'Café A6'),
  null::uuid,
  'evento de outra casa vira sem vínculo'
);

-- Retrocompatibilidade: chamada antiga, 9 argumentos nomeados, sem p_event_id
select is(
  (select public.add_shopping_item(
     p_home_id => current_setting('t.home_a')::uuid, p_name => 'Chá A6', p_category_id => null,
     p_quantity => 1, p_unit => 'un', p_notes => null, p_room_id => null,
     p_mission => null, p_priority => 'normal')->>'result'),
  'inserted',
  'chamada com os 9 argumentos antigos continua funcionando'
);
select is(
  (select event_id from public.shopping_items where home_id = current_setting('t.home_a')::uuid and name = 'Chá A6'),
  null::uuid,
  'chamada antiga insere sem vínculo'
);

-- Exclusão do evento por quem NÃO gerencia Compras -------------------------------
select tests.clear_authentication();
reset role;
insert into public.shopping_items (home_id, name, is_purchased, event_id) values
  (current_setting('t.home_a')::uuid, 'Vinho pendente A6', false, current_setting('t.ev2')::uuid),
  (current_setting('t.home_a')::uuid, 'Vinho comprado A6', true, current_setting('t.ev2')::uuid);

select tests.authenticate_as(current_setting('t.m')::uuid);
select lives_ok(
  format('delete from public.events where id = %L', current_setting('t.ev2')),
  'membro sem permissão de Compras consegue excluir o evento'
);
select tests.clear_authentication();
reset role;

select is(
  (select count(*)::int from public.shopping_items where name = 'Vinho pendente A6'),
  0,
  'item pendente do evento sai da lista'
);
select is(
  (select count(*)::int from public.shopping_items where name = 'Vinho comprado A6'),
  1,
  'item comprado continua no histórico'
);
select is(
  (select event_id from public.shopping_items where name = 'Vinho comprado A6'),
  null::uuid,
  'item comprado perde o vínculo'
);

select * from finish();
rollback;
