-- pgTAP: complete_task_occurrence — concluir tarefa em 1 chamada, com as mesmas regras de permissão do app.
-- A = dono · M1 = membro comum · M2 = membro sem permissão de concluir · M3 = membro restrito à sala · X = de fora.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

do $$
declare
  v_a uuid := tests.create_user('a9@morano.test');
  v_m1 uuid := tests.create_user('m19@morano.test');
  v_m2 uuid := tests.create_user('m29@morano.test');
  v_m3 uuid := tests.create_user('m39@morano.test');
  v_x uuid := tests.create_user('x9@morano.test');
  v_home uuid := gen_random_uuid();
  v_coz uuid := gen_random_uuid();
  v_sala uuid := gen_random_uuid();
  v_t_coz uuid := gen_random_uuid();
  v_t_sala uuid := gen_random_uuid();
begin
  perform set_config('t.a', v_a::text, true);
  perform set_config('t.m1', v_m1::text, true);
  perform set_config('t.m2', v_m2::text, true);
  perform set_config('t.m3', v_m3::text, true);
  perform set_config('t.x', v_x::text, true);
  perform set_config('t.home', v_home::text, true);

  insert into public.homes (id, name, created_by) values (v_home, 'Casa A9', v_a);
  insert into public.home_members (home_id, user_id, role) values
    (v_home, v_m1, 'member'), (v_home, v_m2, 'member'), (v_home, v_m3, 'member');
  insert into public.rooms (id, home_id, name, room_type, position) values
    (v_coz, v_home, 'Cozinha', 'cozinha', 0), (v_sala, v_home, 'Sala', 'sala', 1);
  insert into public.home_member_permissions (home_id, user_id, can_complete_tasks)
  values (v_home, v_m2, false)
  on conflict (home_id, user_id) do update set can_complete_tasks = false;
  insert into public.home_member_task_scopes (home_id, user_id, room_id) values (v_home, v_m3, v_sala);

  insert into public.tasks (id, home_id, title, room_id, created_by) values
    (v_t_coz, v_home, 'Lavar louça', v_coz, v_a), (v_t_sala, v_home, 'Varrer sala', v_sala, v_a);
  -- uma ocorrência por cenário
  perform set_config('t.o_a', gen_random_uuid()::text, true);
  perform set_config('t.o_m1', gen_random_uuid()::text, true);
  perform set_config('t.o_m2', gen_random_uuid()::text, true);
  perform set_config('t.o_m3_ok', gen_random_uuid()::text, true);
  perform set_config('t.o_m3_no', gen_random_uuid()::text, true);
  perform set_config('t.o_x', gen_random_uuid()::text, true);
  insert into public.task_occurrences (id, task_id, home_id, original_date, scheduled_for) values
    (current_setting('t.o_a')::uuid,     v_t_coz,  v_home, '2026-12-01', '2026-12-01'),
    (current_setting('t.o_m1')::uuid,    v_t_coz,  v_home, '2026-12-02', '2026-12-02'),
    (current_setting('t.o_m2')::uuid,    v_t_coz,  v_home, '2026-12-03', '2026-12-03'),
    (current_setting('t.o_m3_ok')::uuid, v_t_sala, v_home, '2026-12-04', '2026-12-04'),
    (current_setting('t.o_m3_no')::uuid, v_t_coz,  v_home, '2026-12-05', '2026-12-05'),
    (current_setting('t.o_x')::uuid,     v_t_coz,  v_home, '2026-12-06', '2026-12-06');
end $$;

-- dono
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_a')::uuid)->>'result'),
  'completed',
  'dono conclui'
);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_a')::uuid)->>'home_id'),
  current_setting('t.home'),
  'devolve a casa (para a telemetria)'
);

-- membro comum
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m1')::uuid);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_m1')::uuid)->>'result'),
  'completed',
  'membro comum conclui'
);

-- sem permissão de concluir
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m2')::uuid);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_m2')::uuid)->>'result'),
  'forbidden',
  'membro sem permissão de concluir é barrado'
);

-- restrito à sala
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m3')::uuid);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_m3_ok')::uuid)->>'result'),
  'completed',
  'restrito à sala conclui tarefa da sala'
);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_m3_no')::uuid)->>'result'),
  'forbidden_room',
  'restrito à sala não conclui tarefa da cozinha'
);

-- de fora
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.x')::uuid);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_x')::uuid)->>'result'),
  'not_found',
  'quem não é da casa nem enxerga a ocorrência'
);
select is(
  (select public.complete_task_occurrence(gen_random_uuid())->>'result'),
  'not_found',
  'ocorrência inexistente'
);

-- efeitos no banco
select tests.clear_authentication(); reset role;
select is(
  (select status::text from public.task_occurrences where id = current_setting('t.o_m1')::uuid),
  'completed',
  'status virou completed'
);
select is(
  (select completed_by from public.task_occurrences where id = current_setting('t.o_m1')::uuid),
  current_setting('t.m1')::uuid,
  'completed_by é quem concluiu'
);
select is(
  (select status::text from public.task_occurrences where id = current_setting('t.o_m2')::uuid),
  'pending',
  'a barrada continua pendente'
);

select * from finish();
rollback;
