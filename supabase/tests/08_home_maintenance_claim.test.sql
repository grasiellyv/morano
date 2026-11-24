-- pgTAP: claim_home_maintenance — quem roda a manutenção da casa (no máximo 1 vez por intervalo).
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

do $$
declare
  v_a uuid := tests.create_user('a8@morano.test');
  v_b uuid := tests.create_user('b8@morano.test');
  v_home uuid := gen_random_uuid();
begin
  perform set_config('t.a', v_a::text, true);
  perform set_config('t.b', v_b::text, true);
  perform set_config('t.home', v_home::text, true);
  insert into public.homes (id, name, created_by) values (v_home, 'Casa A8', v_a);
  insert into public.homes (id, name, created_by) values (gen_random_uuid(), 'Casa B8', v_b);
end $$;

select tests.authenticate_as(current_setting('t.a')::uuid);

select is(
  (select public.claim_home_maintenance(current_setting('t.home')::uuid)),
  jsonb_build_object('claimed', true, 'previous', null),
  'primeira chamada: assume a manutenção, sem execução anterior'
);

select is(
  (select (public.claim_home_maintenance(current_setting('t.home')::uuid))->>'claimed'),
  'false',
  'chamada logo em seguida: outra pessoa/aba já cuidou (não repete)'
);

select ok(
  (select (public.claim_home_maintenance(current_setting('t.home')::uuid))->>'previous') is not null,
  'devolve quando foi a execução anterior'
);

-- passaram 20 minutos
select tests.clear_authentication();
reset role;
update public.homes set maintenance_ran_at = now() - interval '20 minutes' where id = current_setting('t.home')::uuid;
select tests.authenticate_as(current_setting('t.a')::uuid);

select is(
  (select (public.claim_home_maintenance(current_setting('t.home')::uuid))->>'claimed'),
  'true',
  'depois do intervalo, assume de novo'
);

select is(
  (select (public.claim_home_maintenance(current_setting('t.home')::uuid, interval '1 hour'))->>'claimed'),
  'false',
  'respeita o intervalo informado'
);

-- quem não é da casa não consegue
select tests.clear_authentication();
reset role;
select tests.authenticate_as(current_setting('t.b')::uuid);
select throws_ok(
  format('select public.claim_home_maintenance(%L::uuid)', current_setting('t.home')),
  '42501',
  'forbidden',
  'quem não é membro da casa não pode assumir a manutenção'
);

select tests.clear_authentication();
reset role;
select ok(
  not has_function_privilege('anon', 'public.claim_home_maintenance(uuid, interval)', 'EXECUTE'),
  'anônimo não executa'
);

select * from finish();
rollback;
