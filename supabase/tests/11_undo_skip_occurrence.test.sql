-- pgTAP: undo_task_occurrence e skip_task_occurrence — uma chamada cada, com as regras de permissão do app.
-- A = dono · M1 = membro comum · M2 = sem permissão de concluir · M3 = restrito à sala · X = de fora.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

do $$
declare
  v_a uuid := tests.create_user('a11@morano.test');
  v_m1 uuid := tests.create_user('m111@morano.test');
  v_m2 uuid := tests.create_user('m211@morano.test');
  v_m3 uuid := tests.create_user('m311@morano.test');
  v_x uuid := tests.create_user('x11@morano.test');
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

  insert into public.homes (id, name, created_by, timezone) values (v_home, 'Casa A11', v_a, 'America/Sao_Paulo');
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

  perform set_config('t.o_done', gen_random_uuid()::text, true);      -- concluída agora
  perform set_config('t.o_old', gen_random_uuid()::text, true);       -- concluída há 2 dias
  perform set_config('t.o_pend', gen_random_uuid()::text, true);      -- pendente
  perform set_config('t.o_done_m2', gen_random_uuid()::text, true);   -- concluída, M2 sem permissão
  perform set_config('t.o_skip', gen_random_uuid()::text, true);
  perform set_config('t.o_skip_m2', gen_random_uuid()::text, true);
  perform set_config('t.o_skip_m3_no', gen_random_uuid()::text, true);
  perform set_config('t.o_skip_m3_ok', gen_random_uuid()::text, true);
  insert into public.task_occurrences (id, task_id, home_id, original_date, scheduled_for, status, completed_at, completed_by) values
    (current_setting('t.o_done')::uuid,    v_t_coz,  v_home, '2026-12-01', '2026-12-01', 'completed', now(), v_a),
    (current_setting('t.o_old')::uuid,     v_t_coz,  v_home, '2026-12-02', '2026-12-02', 'completed', now() - interval '2 days', v_a),
    (current_setting('t.o_pend')::uuid,    v_t_coz,  v_home, '2026-12-03', '2026-12-03', 'pending', null, null),
    (current_setting('t.o_done_m2')::uuid, v_t_coz,  v_home, '2026-12-04', '2026-12-04', 'completed', now(), v_a),
    (current_setting('t.o_skip')::uuid,    v_t_coz,  v_home, '2026-12-05', '2026-12-05', 'pending', null, null),
    (current_setting('t.o_skip_m2')::uuid, v_t_coz,  v_home, '2026-12-06', '2026-12-06', 'pending', null, null),
    (current_setting('t.o_skip_m3_no')::uuid, v_t_coz,  v_home, '2026-12-07', '2026-12-07', 'pending', null, null),
    (current_setting('t.o_skip_m3_ok')::uuid, v_t_sala, v_home, '2026-12-08', '2026-12-08', 'pending', null, null);
end $$;

-- ===== desfazer ==============================================================
select tests.authenticate_as(current_setting('t.a')::uuid);

select is(
  (select public.undo_task_occurrence(current_setting('t.o_done')::uuid)->>'result'),
  'undone',
  'desfaz conclusão do mesmo dia'
);
select is(
  (select public.undo_task_occurrence(current_setting('t.o_old')::uuid)->>'result'),
  'wrong_day',
  'só dá para desfazer no mesmo dia (no fuso da casa)'
);
select is(
  (select public.undo_task_occurrence(current_setting('t.o_pend')::uuid)->>'result'),
  'not_completed',
  'pendente não tem o que desfazer'
);

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m2')::uuid);
select is(
  (select public.undo_task_occurrence(current_setting('t.o_done_m2')::uuid)->>'result'),
  'forbidden',
  'sem permissão de concluir também não desfaz'
);

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.x')::uuid);
select is(
  (select public.undo_task_occurrence(current_setting('t.o_done_m2')::uuid)->>'result'),
  'not_found',
  'quem é de fora não enxerga a ocorrência'
);

-- ===== pular =================================================================
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(
  (select public.skip_task_occurrence(current_setting('t.o_skip')::uuid)->>'result'),
  'skipped',
  'dono pula'
);

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m2')::uuid);
select is(
  (select public.skip_task_occurrence(current_setting('t.o_skip_m2')::uuid)->>'result'),
  'forbidden',
  'sem permissão de concluir não pula'
);

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m3')::uuid);
select is(
  (select public.skip_task_occurrence(current_setting('t.o_skip_m3_ok')::uuid)->>'result'),
  'skipped',
  'restrito à sala pula tarefa da sala'
);
select is(
  (select public.skip_task_occurrence(current_setting('t.o_skip_m3_no')::uuid)->>'result'),
  'forbidden_room',
  'restrito à sala não pula tarefa da cozinha'
);

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.x')::uuid);
select is(
  (select public.skip_task_occurrence(current_setting('t.o_skip_m2')::uuid)->>'result'),
  'not_found',
  'quem é de fora não pula'
);
select is(
  (select public.skip_task_occurrence(gen_random_uuid())->>'result'),
  'not_found',
  'ocorrência inexistente'
);

-- ===== efeitos ===============================================================
select tests.clear_authentication(); reset role;
select is(
  (select status::text || '|' || coalesce(completed_at::text, 'null') || '|' || coalesce(completed_by::text, 'null')
   from public.task_occurrences where id = current_setting('t.o_done')::uuid),
  'pending|null|null',
  'desfazer volta para pendente e limpa quem/quando concluiu'
);
select is(
  (select status::text from public.task_occurrences where id = current_setting('t.o_old')::uuid),
  'completed',
  'a de ontem continua concluída'
);
select is(
  (select status::text from public.task_occurrences where id = current_setting('t.o_skip')::uuid),
  'skipped',
  'pular grava skipped'
);
select is(
  (select status::text from public.task_occurrences where id = current_setting('t.o_skip_m2')::uuid),
  'pending',
  'a barrada continua pendente'
);
-- a função de concluir continua igual depois da refatoração (agora usa o mesmo helper de acesso)
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(
  (select public.complete_task_occurrence(current_setting('t.o_pend')::uuid)->>'result'),
  'completed',
  'concluir continua funcionando'
);

select tests.clear_authentication(); reset role;
select * from finish();
rollback;
