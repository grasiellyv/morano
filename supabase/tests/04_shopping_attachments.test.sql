-- pgTAP: compras, anexos e Storage (shopping_items, attachments, bucket home-files).
-- Usuários: A = owner da casa A · M = member da casa A · B = estranho (dono da casa B).
-- Memberships e casas são criadas como postgres. Objetos de Storage são inseridos
-- direto em storage.objects como `authenticated` (as policies são as mesmas que a
-- API do Storage aplica). Delete direto exige storage.allow_delete_query (o Storage
-- bloqueia delete em SQL por padrão); só é ligado nos testes de delete.
begin;
create extension if not exists pgtap with schema extensions;

select plan(94);

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

  perform set_config('t.app_a', gen_random_uuid()::text, true);
  perform set_config('t.app_a2', gen_random_uuid()::text, true);
  perform set_config('t.app_b', gen_random_uuid()::text, true);
  perform set_config('t.issue_a', gen_random_uuid()::text, true);
  perform set_config('t.issue_b', gen_random_uuid()::text, true);
  perform set_config('t.maint_a', gen_random_uuid()::text, true);
  insert into public.appliances (id, home_id, name) values
    (current_setting('t.app_a')::uuid, current_setting('t.home_a')::uuid, 'Geladeira A'),
    (current_setting('t.app_a2')::uuid, current_setting('t.home_a2')::uuid, 'Forno A2'),
    (current_setting('t.app_b')::uuid, current_setting('t.home_b')::uuid, 'Geladeira B');
  insert into public.home_issues (id, home_id, title) values
    (current_setting('t.issue_a')::uuid, current_setting('t.home_a')::uuid, 'Problema A'),
    (current_setting('t.issue_b')::uuid, current_setting('t.home_b')::uuid, 'Problema B');
  insert into public.maintenance_records (id, home_id, title)
  values (current_setting('t.maint_a')::uuid, current_setting('t.home_a')::uuid, 'Manutenção A');

  -- Objeto e anexo da casa B (isolamento)
  perform set_config('t.att_b', gen_random_uuid()::text, true);
  insert into storage.objects (bucket_id, name, owner_id)
  values ('home-files', current_setting('t.home_b') || '/obj/b.pdf', current_setting('t.b'));
  insert into public.attachments (id, home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
  values (current_setting('t.att_b')::uuid, current_setting('t.home_b')::uuid,
          current_setting('t.app_b')::uuid, 'document',
          current_setting('t.home_b') || '/obj/b.pdf', 'b.pdf', 'application/pdf', 1000);
end $$;

-- -----------------------------------------------------------------------------
-- Estrutura
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_catalog.pg_tables
   where schemaname = 'public' and rowsecurity and tablename in ('shopping_items', 'attachments')),
  2,
  'shopping_items and attachments have rls'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.shopping_category'::regtype),
  array['limpeza', 'higiene', 'cozinha', 'lavanderia', 'alimentacao', 'outros'],
  'shopping_category labels'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.shopping_unit'::regtype),
  array['un', 'kg', 'g', 'l', 'ml', 'pacote', 'caixa'],
  'shopping_unit labels'
);
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
   from pg_catalog.pg_enum e where e.enumtypid = 'public.attachment_kind'::regtype),
  array['photo', 'document'],
  'attachment_kind labels'
);
select is(
  (select count(*)::int from pg_catalog.pg_trigger
   where tgname = 'check_same_home' and not tgisinternal
     and tgrelid in ('public.shopping_items'::regclass, 'public.attachments'::regclass)),
  2,
  'same-home triggers on shopping_items and attachments'
);
select is(
  (select count(*)::int from pg_catalog.pg_trigger
   where tgname = 'set_updated_at' and tgrelid = 'public.shopping_items'::regclass),
  1,
  'updated_at trigger on shopping_items'
);
select is(
  (select count(*)::int from pg_catalog.pg_constraint
   where conrelid = 'public.attachments'::regclass and contype = 'f'
     and confrelid in ('public.appliances'::regclass, 'public.maintenance_records'::regclass,
                       'public.home_issues'::regclass)
     and confdeltype = 'c'),
  3,
  'attachments FKs to appliance/maintenance/issue cascade'
);
select ok(
  exists (select 1 from pg_catalog.pg_indexes
          where tablename = 'shopping_items' and indexdef like '%(home_id, is_purchased, created_at DESC)%'),
  'shopping_items index (home_id, is_purchased, created_at desc)'
);
select ok(
  not has_table_privilege('authenticated', 'public.attachments', 'UPDATE')
  and has_column_privilege('authenticated', 'public.attachments', 'file_name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.attachments', 'file_path', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.attachments', 'home_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.attachments', 'uploaded_by', 'INSERT'),
  'attachments: file_path/home_id/uploaded_by are not client-writable after insert'
);
select ok(
  not has_column_privilege('authenticated', 'public.shopping_items', 'purchased_by', 'INSERT')
  and not has_column_privilege('authenticated', 'public.shopping_items', 'purchased_at', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.shopping_items', 'home_id', 'UPDATE'),
  'shopping_items: purchased_by/purchased_at/home_id are not client-writable'
);

-- bucket
select is(
  (select public from storage.buckets where id = 'home-files'),
  false,
  'bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'home-files'),
  10485760::bigint,
  'bucket has 10 MiB limit'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'home-files'),
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
  'bucket allows only the five mime types'
);
select is(
  (select count(*)::int from pg_catalog.pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname like 'home_files_%'),
  4,
  'four home-files policies on storage.objects'
);

-- storage_home_id
select is(public.storage_home_id(current_setting('t.home_a') || '/x/y.pdf'), current_setting('t.home_a')::uuid,
  'storage_home_id parses a valid prefix');
select is(public.storage_home_id('lixo/x.pdf'), null, 'storage_home_id: malformed -> null');
select is(public.storage_home_id(''), null, 'storage_home_id: empty -> null');
select is(public.storage_home_id(null), null, 'storage_home_id: null -> null');
select is(public.storage_home_id(upper(current_setting('t.home_a')) || '/x.pdf'), null,
  'storage_home_id: uppercase uuid -> null');
select is(public.storage_home_id(' ' || current_setting('t.home_a') || '/x.pdf'), null,
  'storage_home_id: leading space -> null');
select is(public.storage_home_id('{' || current_setting('t.home_a') || '}/x.pdf'), null,
  'storage_home_id: braces -> null');
select is(public.storage_home_id(replace(current_setting('t.home_a'), '-', '') || '/x.pdf'), null,
  'storage_home_id: uuid without dashes -> null');
select is(public.storage_home_id(current_setting('t.home_a')), null,
  'storage_home_id: no slash (no object) -> null');
select is(public.storage_home_id(current_setting('t.home_a') || '/../' || current_setting('t.home_b') || '/x.pdf'), null,
  'storage_home_id: path traversal -> null');
select is(public.storage_home_id(current_setting('t.home_a') || '/./x.pdf'), null,
  'storage_home_id: dot segment -> null');
select is(public.storage_home_id(current_setting('t.home_a') || '//x.pdf'), null,
  'storage_home_id: empty segment -> null');
select is(public.storage_home_id(current_setting('t.home_a') || E'/x\\..\\y.pdf'), null,
  'storage_home_id: backslash -> null');
select is(public.storage_home_id('/' || current_setting('t.home_a') || '/x.pdf'), null,
  'storage_home_id: leading slash -> null');

-- anon
select tests.clear_authentication();
select is(
  (select count(*)::int from storage.objects), 0, 'anon sees no storage objects');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('home-files', %L) $$,
         current_setting('t.home_a') || '/anon.pdf'),
  '42501', null, 'anon cannot insert storage objects');
select throws_ok(
  $$ select * from public.shopping_items $$, '42501', null, 'anon cannot read shopping_items');
select throws_ok(
  $$ select * from public.attachments $$, '42501', null, 'anon cannot read attachments');
reset role;

-- -----------------------------------------------------------------------------
-- shopping_items
-- -----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);

select lives_ok(
  format($$ insert into public.shopping_items (home_id, name) values (%L, 'Detergente') $$,
         current_setting('t.home_a')),
  'member can insert a shopping item with defaults'
);
select results_eq(
  $$ select quantity, unit::text, category::text, is_purchased, purchased_at is null,
            purchased_by is null, created_by = (select auth.uid()) from public.shopping_items
     where name = 'Detergente' $$,
  $$ values (1.00::numeric, 'un', 'outros', false, true, true, true) $$,
  'defaults: quantity 1, unit un, category outros, not purchased, created_by = auth.uid()'
);
select lives_ok(
  format($$ insert into public.shopping_items (home_id, name, category, quantity, unit, issue_id)
            values (%L, 'Arroz', 'alimentacao', 2.5, 'kg', %L) $$,
         current_setting('t.home_a'), current_setting('t.issue_a')),
  'member can insert an item with category, unit and issue'
);
select throws_ok(
  format($$ insert into public.shopping_items (home_id, name, quantity) values (%L, 'Zero', 0) $$,
         current_setting('t.home_a')),
  '23514', null, 'quantity must be > 0'
);
select throws_ok(
  format($$ insert into public.shopping_items (home_id, name) values (%L, '   ') $$,
         current_setting('t.home_a')),
  '23514', null, 'blank name rejected'
);
select throws_ok(
  format($$ insert into public.shopping_items (home_id, name, purchased_by) values (%L, 'X', %L) $$,
         current_setting('t.home_a'), current_setting('t.a')),
  '42501', null, 'client cannot set purchased_by'
);
select throws_ok(
  format($$ insert into public.shopping_items (home_id, name) values (%L, 'Intruso') $$,
         current_setting('t.home_b')),
  '42501', null, 'cannot insert an item into a foreign home'
);
select throws_ok(
  format($$ insert into public.shopping_items (home_id, name, issue_id) values (%L, 'Cruzado', %L) $$,
         current_setting('t.home_a'), current_setting('t.issue_b')),
  'P0001', 'cross_home_reference', 'cross-home FK rejected: issue_id from another home'
);
select throws_ok(
  format($$ insert into public.shopping_items (home_id, name, issue_id) values (%L, 'Cruzado', %L) $$,
         current_setting('t.home_a'), gen_random_uuid()),
  'P0001', 'cross_home_reference', 'nonexistent issue_id rejected'
);

-- comprado: trigger preenche purchased_at/by e limpa ao desmarcar
select is(
  tests.affected_rows(format($$ update public.shopping_items set is_purchased = true
                               where name = 'Detergente' and home_id = %L $$, current_setting('t.home_a'))),
  1, 'member can mark an item purchased'
);
select results_eq(
  $$ select purchased_at is not null, purchased_by = (select auth.uid())
     from public.shopping_items where name = 'Detergente' $$,
  $$ values (true, true) $$,
  'purchase sets purchased_at and purchased_by'
);
select is(
  tests.affected_rows(format($$ update public.shopping_items set is_purchased = false
                               where name = 'Detergente' and home_id = %L $$, current_setting('t.home_a'))),
  1, 'member can unmark purchased'
);
select results_eq(
  $$ select purchased_at is null, purchased_by is null from public.shopping_items where name = 'Detergente' $$,
  $$ values (true, true) $$,
  'unmarking clears purchased_at and purchased_by'
);
select throws_ok(
  format($$ update public.shopping_items set home_id = %L where name = 'Arroz' $$, current_setting('t.home_a2')),
  '42501', null, 'home_id is not updatable'
);
select throws_ok(
  format($$ update public.shopping_items set issue_id = %L where name = 'Arroz' $$, current_setting('t.issue_b')),
  'P0001', 'cross_home_reference', 'cannot repoint issue_id to a foreign home'
);

reset role;
select tests.authenticate_as(current_setting('t.m')::uuid);
select is(
  (select count(*)::int from public.shopping_items), 2, 'second member sees the home items'
);
select is(
  tests.affected_rows(format($$ update public.shopping_items set quantity = 3 where name = 'Arroz' and home_id = %L $$,
                             current_setting('t.home_a'))),
  1, 'second member can update an item'
);
select is(
  tests.affected_rows($$ delete from public.shopping_items where name = 'Arroz' $$),
  1, 'member can delete an item'
);

reset role;
select tests.authenticate_as(current_setting('t.b')::uuid);
select is(
  (select count(*)::int from public.shopping_items), 0, 'outsider sees no foreign shopping items'
);
select is(
  tests.affected_rows($$ delete from public.shopping_items $$), 0, 'outsider cannot delete foreign items'
);

-- -----------------------------------------------------------------------------
-- attachments
-- -----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);

select lives_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'nota.jpg', 'image/jpeg', 2048) $$,
         current_setting('t.home_a'), current_setting('t.app_a'),
         current_setting('t.home_a') || '/' || gen_random_uuid() || '/nota.jpg'),
  'attachment on an appliance'
);
select lives_ok(
  format($$ insert into public.attachments (home_id, maintenance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'document', %L, 'nf.pdf', 'application/pdf', 4096) $$,
         current_setting('t.home_a'), current_setting('t.maint_a'),
         current_setting('t.home_a') || '/' || gen_random_uuid() || '/nf.pdf'),
  'attachment on a maintenance record'
);
select lives_ok(
  format($$ insert into public.attachments (home_id, issue_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'mofo.webp', 'image/webp', 4096) $$,
         current_setting('t.home_a'), current_setting('t.issue_a'),
         current_setting('t.home_a') || '/' || gen_random_uuid() || '/mofo.webp'),
  'attachment on an issue'
);
select results_eq(
  $$ select uploaded_by = (select auth.uid()) from public.attachments where file_name = 'nota.jpg' $$,
  $$ values (true) $$,
  'uploaded_by defaults to auth.uid()'
);

-- exatamente um pai
select throws_ok(
  format($$ insert into public.attachments (home_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.home_a') || '/x/x.jpg'),
  '23514', null, 'attachment requires exactly one parent (none)'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, issue_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a'), current_setting('t.issue_a'),
         current_setting('t.home_a') || '/x/x.jpg'),
  '23514', null, 'attachment requires exactly one parent (two)'
);

-- mesma casa
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_b'), current_setting('t.home_a') || '/x/x.jpg'),
  'P0001', 'cross_home_reference', 'attachment parent must be same home (foreign home appliance)'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a2'), current_setting('t.home_a') || '/x/x.jpg'),
  'P0001', 'cross_home_reference', 'attachment parent must be same home (own other home appliance)'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, issue_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.issue_b'), current_setting('t.home_a') || '/x/x.jpg'),
  'P0001', 'cross_home_reference', 'attachment issue parent must be same home'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_b'), current_setting('t.app_b'), current_setting('t.home_b') || '/x/x.jpg'),
  'P0001', 'cross_home_reference', 'cannot attach into a foreign home (denied by the same-home trigger before RLS)'
);
select throws_ok(
  format($$ update public.attachments set appliance_id = %L, issue_id = null
            where file_name = 'mofo.webp' $$, current_setting('t.app_b')),
  'P0001', 'cross_home_reference', 're-parenting to a foreign appliance rejected'
);
select lives_ok(
  format($$ update public.attachments set appliance_id = %L, issue_id = null
            where file_name = 'mofo.webp' $$, current_setting('t.app_a')),
  're-parenting within the same home works'
);
select throws_ok(
  format($$ update public.attachments set file_path = %L where file_name = 'nota.jpg' $$,
         current_setting('t.home_a') || '/other.jpg'),
  '42501', null, 'file_path is not updatable'
);

-- path
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a'), current_setting('t.home_b') || '/x/x.jpg'),
  'P0001', 'invalid_file_path', 'attachment path must start with home_id (foreign prefix)'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', 'x/x.jpg', 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a')),
  'P0001', 'invalid_file_path', 'attachment path must start with home_id (no prefix)'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a'),
         current_setting('t.home_a') || '/../' || current_setting('t.home_b') || '/x.jpg'),
  'P0001', 'invalid_file_path', 'attachment path with traversal rejected'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a'), upper(current_setting('t.home_a')) || '/x.jpg'),
  'P0001', 'invalid_file_path', 'attachment path with uppercase uuid rejected'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'photo', %L, 'x.jpg', 'image/jpeg', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a'), current_setting('t.home_a') || '/'),
  'P0001', 'invalid_file_path', 'attachment path must have a file after the prefix'
);

-- mime / tamanho
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'document', %L, 'x.exe', 'application/x-msdownload', 10) $$,
         current_setting('t.home_a'), current_setting('t.app_a'), current_setting('t.home_a') || '/x/x.exe'),
  '23514', null, 'bad mime rejected'
);
select throws_ok(
  format($$ insert into public.attachments (home_id, appliance_id, kind, file_path, file_name, mime_type, size_bytes)
            values (%L, %L, 'document', %L, 'big.pdf', 'application/pdf', 10485761) $$,
         current_setting('t.home_a'), current_setting('t.app_a'), current_setting('t.home_a') || '/x/big.pdf'),
  '23514', null, 'size over 10 MiB rejected'
);

-- membro e isolamento
reset role;
select tests.authenticate_as(current_setting('t.m')::uuid);
select is(
  (select count(*)::int from public.attachments), 3, 'second member sees the home attachments'
);
select is(
  tests.affected_rows($$ delete from public.attachments where file_name = 'nf.pdf' $$),
  1, 'member can delete an attachment'
);

reset role;
select tests.authenticate_as(current_setting('t.b')::uuid);
select is(
  (select count(*)::int from public.attachments where home_id <> current_setting('t.home_b')::uuid),
  0, 'outsider sees no foreign attachments'
);
select is(
  tests.affected_rows(format($$ delete from public.attachments where home_id = %L $$, current_setting('t.home_a'))),
  0, 'outsider cannot delete foreign attachments'
);

-- cascata: apagar o equipamento apaga o anexo
select tests.clear_authentication();
reset role;
delete from public.appliances where id = current_setting('t.app_a')::uuid;
select is(
  (select count(*)::int from public.attachments where home_id = current_setting('t.home_a')::uuid),
  0,
  'deleting the parent cascades attachments'
);

-- -----------------------------------------------------------------------------
-- storage.objects
-- -----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);

select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('home-files', %L, %L) $$,
         current_setting('t.home_a') || '/att1/foto.jpg', current_setting('t.a')),
  'storage: member can insert object under own home prefix'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'home-files'
   and name = current_setting('t.home_a') || '/att1/foto.jpg'),
  1, 'storage: member can read own home object'
);
select is(
  (select count(*)::int from storage.objects where name like current_setting('t.home_b') || '/%'),
  0, 'storage: member cannot read foreign home objects'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('home-files', %L, %L) $$,
         current_setting('t.home_b') || '/intruso.jpg', current_setting('t.a')),
  '42501', null, 'storage: non-member cannot insert under foreign prefix'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('home-files', %L, %L) $$,
         current_setting('t.home_a') || '/../' || current_setting('t.home_b') || '/x.jpg', current_setting('t.a')),
  '42501', null, 'storage: path traversal into a foreign home denied'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('home-files', %L, %L) $$,
         upper(current_setting('t.home_a')) || '/up.jpg', current_setting('t.a')),
  '42501', null, 'storage: uppercase uuid prefix denied (not canonical)'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('home-files', %L, %L) $$,
         ' ' || current_setting('t.home_a') || '/sp.jpg', current_setting('t.a')),
  '42501', null, 'storage: whitespace-padded prefix denied'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('home-files', 'lixo/x.jpg', null) $$,
  '42501', null, 'storage: malformed prefix denied without error (plain RLS denial)'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('home-files', 'nao-e-uuid', null) $$,
  '42501', null, 'storage: object without prefix denied'
);
select is(
  (select count(*)::int from storage.objects where name = 'lixo/x.jpg'),
  0, 'storage: select with malformed names raises no error'
);

-- mover objeto via update de name
select throws_ok(
  format($$ update storage.objects set name = %L where name = %L $$,
         current_setting('t.home_b') || '/roubado.jpg',
         current_setting('t.home_a') || '/att1/foto.jpg'),
  '42501', null, 'storage: cannot move an object to a foreign home prefix'
);
select is(
  tests.affected_rows(format($$ update storage.objects set name = %L where name = %L $$,
                             current_setting('t.home_a') || '/att1/renomeada.jpg',
                             current_setting('t.home_a') || '/att1/foto.jpg')),
  1, 'storage: member can rename within own home'
);
select is(
  tests.affected_rows(format($$ update storage.objects set name = %L where name = %L $$,
                             'x.jpg', current_setting('t.home_b') || '/obj/b.pdf')),
  0, 'storage: cannot update a foreign home object'
);

-- delete (Storage bloqueia delete em SQL; liga a flag só para provar a policy)
select set_config('storage.allow_delete_query', 'true', true);
select is(
  tests.affected_rows(format($$ delete from storage.objects where name = %L $$,
                             current_setting('t.home_b') || '/obj/b.pdf')),
  0, 'storage: non-member cannot delete foreign object'
);

reset role;
select tests.authenticate_as(current_setting('t.m')::uuid);
select is(
  (select count(*)::int from storage.objects where name = current_setting('t.home_a') || '/att1/renomeada.jpg'),
  1, 'storage: second member can read the home object'
);
select is(
  tests.affected_rows(format($$ delete from storage.objects where name = %L $$,
                             current_setting('t.home_a') || '/att1/renomeada.jpg')),
  1, 'storage: member can delete a home object'
);

reset role;
select tests.authenticate_as(current_setting('t.b')::uuid);
select is(
  (select count(*)::int from storage.objects where name like current_setting('t.home_a') || '/%'),
  0, 'storage: outsider cannot read the home A prefix'
);

select tests.clear_authentication();
reset role;

select * from finish();
rollback;
