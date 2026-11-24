-- pgTAP: backfill_onboarding_task_rooms — liga tarefas do onboarding ao cômodo só quando é exato.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

do $$
declare
  v_user uuid := tests.create_user('bf7@morano.test');
  v_home uuid := gen_random_uuid();
  v_coz uuid := gen_random_uuid();
  v_sala uuid := gen_random_uuid();
  v_q uuid := gen_random_uuid();
begin
  perform set_config('t.home', v_home::text, true);
  perform set_config('t.coz', v_coz::text, true);
  perform set_config('t.sala', v_sala::text, true);
  insert into public.homes (id, name, created_by) values (v_home, 'Casa BF7', v_user);
  insert into public.rooms (id, home_id, name, room_type, position) values
    (v_coz, v_home, 'Cozinha', 'cozinha', 0),
    (v_sala, v_home, 'Sala', 'sala', 1),
    (v_q, v_home, 'Quarto', 'quarto', 2);

  -- "Varrer o chão" existe no catálogo para cozinha e sala: 2 tarefas = atribuição exata, na ordem de criação
  insert into public.tasks (home_id, title, source, status, created_by, created_at) values
    (v_home, 'Varrer o chão', 'onboarding', 'active', v_user, now() - interval '10 minutes'),
    (v_home, 'Varrer o chão', 'onboarding', 'active', v_user, now() - interval '9 minutes');
  -- título único no catálogo: sempre exato
  insert into public.tasks (home_id, title, source, status, created_by, created_at)
  values (v_home, 'Lavar louça', 'onboarding', 'active', v_user, now() - interval '8 minutes');
  -- "Passar aspirador" existe para sala e quarto, mas só há 1 tarefa (a pessoa desmarcou a outra): ambíguo, não mexe
  insert into public.tasks (home_id, title, source, status, created_by, created_at)
  values (v_home, 'Passar aspirador', 'onboarding', 'active', v_user, now() - interval '7 minutes');
  -- manual com o mesmo título e tarefa do onboarding que já tinha cômodo: intactas
  insert into public.tasks (home_id, title, source, status, created_by, created_at)
  values (v_home, 'Lavar louça', 'manual', 'active', v_user, now() - interval '6 minutes');
  insert into public.tasks (home_id, title, source, status, room_id, created_by, created_at)
  values (v_home, 'Limpar fogão', 'onboarding', 'active', v_sala, v_user, now() - interval '5 minutes');
end $$;

select is(
  (select count(*)::int from pg_proc where proname = 'backfill_onboarding_task_rooms' and pronamespace = 'public'::regnamespace),
  1,
  'a função de backfill existe'
);
select ok(
  not has_function_privilege('authenticated', 'public.backfill_onboarding_task_rooms()', 'EXECUTE'),
  'o app (authenticated) não pode chamar a função'
);

select is(public.backfill_onboarding_task_rooms(), 3, 'atualiza exatamente 3 tarefas (2 varrer + 1 lavar louça)');

select is(
  (select room_id from public.tasks where home_id = current_setting('t.home')::uuid and title = 'Varrer o chão' order by created_at limit 1),
  current_setting('t.coz')::uuid,
  'primeira "Varrer o chão" vai para a cozinha (ordem do catálogo)'
);
select is(
  (select room_id from public.tasks where home_id = current_setting('t.home')::uuid and title = 'Varrer o chão' order by created_at desc limit 1),
  current_setting('t.sala')::uuid,
  'segunda "Varrer o chão" vai para a sala'
);
select is(
  (select room_id from public.tasks where home_id = current_setting('t.home')::uuid and title = 'Lavar louça' and source = 'onboarding'),
  current_setting('t.coz')::uuid,
  'título único vai para o cômodo do catálogo'
);
select is(
  (select room_id from public.tasks where home_id = current_setting('t.home')::uuid and title = 'Passar aspirador'),
  null::uuid,
  'ambíguo (menos tarefas que cômodos candidatos) fica como está'
);
select is(
  (select room_id from public.tasks where home_id = current_setting('t.home')::uuid and title = 'Lavar louça' and source = 'manual'),
  null::uuid,
  'tarefa manual não é tocada'
);
select is(public.backfill_onboarding_task_rooms(), 0, 'rodar de novo não muda nada (idempotente)');

select * from finish();
rollback;
