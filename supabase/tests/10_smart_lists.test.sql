-- pgTAP: listas inteligentes — create_shopping_list (atômica, com itens) e apply_shopping_list (1 chamada).
-- A = dono · M = membro sem permissão de Compras · X = de fora.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

do $$
declare
  v_a uuid := tests.create_user('a10@morano.test');
  v_m uuid := tests.create_user('m10@morano.test');
  v_x uuid := tests.create_user('x10@morano.test');
  v_home uuid := gen_random_uuid();
  v_other_home uuid := gen_random_uuid();
begin
  perform set_config('t.a', v_a::text, true);
  perform set_config('t.m', v_m::text, true);
  perform set_config('t.x', v_x::text, true);
  perform set_config('t.home', v_home::text, true);
  insert into public.homes (id, name, created_by) values (v_home, 'Casa A10', v_a), (v_other_home, 'Casa X10', v_x);
  insert into public.home_members (home_id, user_id, role) values (v_home, v_m, 'member');
  insert into public.home_member_permissions (home_id, user_id, can_manage_shopping)
  values (v_home, v_m, false)
  on conflict (home_id, user_id) do update set can_manage_shopping = false;
  -- categorias de cada casa (criadas pelo gatilho de nova casa)
  perform set_config('t.cat', (select id::text from public.shopping_categories where home_id = v_home order by sort_order limit 1), true);
  perform set_config('t.cat_other', (select id::text from public.shopping_categories where home_id = v_other_home order by sort_order limit 1), true);
end $$;

select tests.authenticate_as(current_setting('t.a')::uuid);

-- criar com itens
select lives_ok(
  format($f$select public.create_shopping_list(%L::uuid, '  Churrasco ', 'ocasioes', %L::uuid,
     '[{"name":" Carvão ","quantity":2,"unit":"kg","category_id":null},{"name":"Cerveja","quantity":12,"unit":"un","category_id":"%s"}]'::jsonb)$f$,
     current_setting('t.home'), current_setting('t.cat'), current_setting('t.cat_other')),
  'cria a lista com itens'
);
select is(
  (select name || '|' || mission || '|' || (category_id = current_setting('t.cat')::uuid)::text
   from public.shopping_lists where home_id = current_setting('t.home')::uuid),
  'Churrasco|ocasioes|true',
  'nome sem espaços, missão e categoria gravados'
);
select is(
  (select array_agg(i.name order by i.name) from public.shopping_list_items i join public.shopping_lists l on l.id = i.list_id where l.home_id = current_setting('t.home')::uuid),
  array['Carvão', 'Cerveja'],
  'itens gravados (nomes aparados)'
);
select is(
  (select category_id from public.shopping_list_items where name = 'Cerveja'),
  null::uuid,
  'categoria de outra casa no item vira sem categoria'
);

-- categoria de outra casa na lista também é descartada
select public.create_shopping_list(current_setting('t.home')::uuid, 'Limpeza', null, current_setting('t.cat_other')::uuid, '[]'::jsonb);
select is(
  (select category_id from public.shopping_lists where name = 'Limpeza' and home_id = current_setting('t.home')::uuid),
  null::uuid,
  'categoria de outra casa na lista vira nula'
);

-- aplicar
select is(
  (select public.apply_shopping_list((select id from public.shopping_lists where name = 'Churrasco' and home_id = current_setting('t.home')::uuid))),
  jsonb_build_object('result', 'applied', 'inserted', 2, 'merged', 0, 'conflict', 0),
  'aplicar joga os 2 itens para a lista ativa'
);
select is(
  (select count(*)::int from public.shopping_items where home_id = current_setting('t.home')::uuid and mission = 'ocasioes'),
  2,
  'os itens entram com a missão da lista'
);
select is(
  (select category_id from public.shopping_items where name = 'Cerveja' and home_id = current_setting('t.home')::uuid),
  current_setting('t.cat')::uuid,
  'item sem categoria herda a categoria da lista'
);
select is(
  (select public.apply_shopping_list((select id from public.shopping_lists where name = 'Churrasco' and home_id = current_setting('t.home')::uuid))),
  jsonb_build_object('result', 'applied', 'inserted', 0, 'merged', 2, 'conflict', 0),
  'aplicar de novo soma, não duplica'
);
select is(
  (select public.apply_shopping_list((select id from public.shopping_lists where name = 'Limpeza' and home_id = current_setting('t.home')::uuid))->>'result'),
  'empty',
  'lista vazia'
);

-- quem não gerencia compras
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m')::uuid);
select throws_ok(
  format($f$select public.create_shopping_list(%L::uuid, 'X', null, null, '[]'::jsonb)$f$, current_setting('t.home')),
  '42501',
  'forbidden',
  'membro sem permissão de Compras não cria lista'
);

-- de fora
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.x')::uuid);
select is(
  (select public.apply_shopping_list((select id from public.shopping_lists where name = 'Churrasco' and home_id = current_setting('t.home')::uuid))->>'result'),
  'not_found',
  'quem é de fora nem enxerga a lista (a RLS esconde)'
);

select tests.clear_authentication(); reset role;
select * from finish();
rollback;
