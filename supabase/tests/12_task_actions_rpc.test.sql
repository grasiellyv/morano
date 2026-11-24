-- pgTAP: adiar, assumir, liberar, anotar, atribuir e checklist — uma chamada cada, mesmas regras do app.
-- A = dono · M1 = membro comum · M2 = sem permissão de concluir e de gerenciar tarefas · X = de fora.
begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

do $$
declare
  v_a uuid := tests.create_user('a12@morano.test');
  v_m1 uuid := tests.create_user('m112@morano.test');
  v_m2 uuid := tests.create_user('m212@morano.test');
  v_x uuid := tests.create_user('x12@morano.test');
  v_home uuid := gen_random_uuid();
  v_t uuid := gen_random_uuid();
  v_t2 uuid := gen_random_uuid();
  v_today date := (now() at time zone 'UTC')::date;
begin
  perform set_config('t.a', v_a::text, true);
  perform set_config('t.m1', v_m1::text, true);
  perform set_config('t.m2', v_m2::text, true);
  perform set_config('t.x', v_x::text, true);
  perform set_config('t.home', v_home::text, true);
  perform set_config('t.today', v_today::text, true);
  perform set_config('t.item', gen_random_uuid()::text, true);        -- item da tarefa 1
  perform set_config('t.item_other', gen_random_uuid()::text, true);  -- item da tarefa 2
  perform set_config('t.o_post', gen_random_uuid()::text, true);
  perform set_config('t.o_next', gen_random_uuid()::text, true);
  perform set_config('t.o_free', gen_random_uuid()::text, true);
  perform set_config('t.o_done', gen_random_uuid()::text, true);

  insert into public.homes (id, name, created_by, timezone) values (v_home, 'Casa A12', v_a, 'UTC');
  insert into public.home_members (home_id, user_id, role) values (v_home, v_m1, 'member'), (v_home, v_m2, 'member');
  insert into public.home_member_permissions (home_id, user_id, can_complete_tasks, can_manage_tasks)
  values (v_home, v_m2, false, false)
  on conflict (home_id, user_id) do update set can_complete_tasks = false, can_manage_tasks = false;

  insert into public.tasks (id, home_id, title, created_by) values (v_t, v_home, 'Tarefa 1', v_a), (v_t2, v_home, 'Tarefa 2', v_a);
  insert into public.task_checklist_items (id, task_id, home_id, title) values
    (current_setting('t.item')::uuid, v_t, v_home, 'Passo 1'),
    (current_setting('t.item_other')::uuid, v_t2, v_home, 'Passo da tarefa 2');

  -- adiar: ocorrência em D+2 e a próxima pendente da MESMA tarefa em D+10
  insert into public.task_occurrences (id, task_id, home_id, original_date, scheduled_for) values
    (current_setting('t.o_post')::uuid, v_t, v_home, v_today + 2, v_today + 2),
    (current_setting('t.o_next')::uuid, v_t, v_home, v_today + 10, v_today + 10);

  -- assumir/liberar/atribuir/anotar/checklist (tarefa 2): uma pendente e uma concluída
  insert into public.task_occurrences (id, task_id, home_id, original_date, scheduled_for, status, completed_at, completed_by) values
    (current_setting('t.o_free')::uuid, v_t2, v_home, v_today + 20, v_today + 20, 'pending', null, null),
    (current_setting('t.o_done')::uuid, v_t2, v_home, v_today + 21, v_today + 21, 'completed', now(), v_a);
end $$;

-- ===== adiar =================================================================
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(
  (select public.postpone_task_occurrence(current_setting('t.o_post')::uuid, current_setting('t.today')::date)->>'result'),
  'not_future', 'adiar para hoje ou antes não vale');
select is(
  (select public.postpone_task_occurrence(current_setting('t.o_post')::uuid, current_setting('t.today')::date + 2)->>'result'),
  'before_original', 'não dá para adiar para a mesma data (ou antes da original)');
select is(
  (select public.postpone_task_occurrence(current_setting('t.o_post')::uuid, current_setting('t.today')::date + 10)->>'result'),
  'beyond_next', 'não passa da próxima ocorrência da mesma tarefa');
select is(
  (select public.postpone_task_occurrence(current_setting('t.o_post')::uuid, current_setting('t.today')::date + 5)->>'result'),
  'postponed', 'adia para uma data válida');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m2')::uuid);
select is(
  (select public.postpone_task_occurrence(current_setting('t.o_post')::uuid, current_setting('t.today')::date + 6)->>'result'),
  'forbidden', 'sem permissão não adia');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.x')::uuid);
select is(
  (select public.postpone_task_occurrence(current_setting('t.o_post')::uuid, current_setting('t.today')::date + 6)->>'result'),
  'not_found', 'quem é de fora não enxerga a ocorrência');

-- ===== assumir / liberar =====================================================
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m1')::uuid);
select is((select public.claim_task_occurrence(current_setting('t.o_free')::uuid)->>'result'), 'claimed', 'membro assume a tarefa');
select is((select public.claim_task_occurrence(current_setting('t.o_done')::uuid)->>'result'), 'not_pending', 'só assume pendente');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select is((select public.claim_task_occurrence(current_setting('t.o_free')::uuid)->>'result'), 'already_assigned', 'já é de outro membro');
select is((select public.unclaim_task_occurrence(current_setting('t.o_free')::uuid)->>'result'), 'not_yours', 'não libera a tarefa dos outros');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.x')::uuid);
select is((select public.claim_task_occurrence(current_setting('t.o_free')::uuid)->>'result'), 'not_found', 'quem é de fora não assume');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m1')::uuid);
select is((select public.unclaim_task_occurrence(current_setting('t.o_free')::uuid)->>'result'), 'released', 'libera a própria tarefa');

-- ===== atribuir ==============================================================
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m2')::uuid);
select is(
  (select public.assign_task_occurrence(current_setting('t.o_free')::uuid, current_setting('t.m1')::uuid)->>'result'),
  'forbidden', 'sem permissão de gerenciar não atribui a outro morador');
select is(
  (select public.assign_task_occurrence(current_setting('t.o_free')::uuid, current_setting('t.m2')::uuid)->>'result'),
  'assigned', 'qualquer um atribui a si mesmo');
select is(
  (select public.assign_task_occurrence(current_setting('t.o_free')::uuid, current_setting('t.m2')::uuid)->>'result'),
  'unchanged', 'repetir a mesma atribuição não muda nada');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.a')::uuid);
select is(
  (select public.assign_task_occurrence(current_setting('t.o_free')::uuid, current_setting('t.x')::uuid)->>'result'),
  'member_not_found', 'só atribui a quem é da casa');
select is(
  (select public.assign_task_occurrence(current_setting('t.o_free')::uuid, current_setting('t.m1')::uuid)->>'result'),
  'assigned', 'dono atribui a qualquer morador');
select is(
  (select public.assign_task_occurrence(current_setting('t.o_done')::uuid, current_setting('t.m1')::uuid)->>'result'),
  'not_pending', 'só troca o responsável de tarefa pendente');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m1')::uuid);
select is(
  (select public.assign_task_occurrence(current_setting('t.o_free')::uuid, null)->>'result'),
  'assigned', 'quem é o responsável pode devolver a tarefa a todos');

-- ===== anotar ================================================================
select is(
  (select public.update_occurrence_notes(current_setting('t.o_free')::uuid, '  oi  ')->>'result'),
  'saved', 'salva a nota (aparada)');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m2')::uuid);
select is(
  (select public.update_occurrence_notes(current_setting('t.o_free')::uuid, 'não deveria')->>'result'),
  'forbidden', 'sem permissão não anota');

-- ===== checklist =============================================================
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m1')::uuid);
select is(
  (select public.set_checklist_item_state(current_setting('t.o_free')::uuid, current_setting('t.item_other')::uuid, 'done')->>'result'),
  'set', 'marca o item como feito');
select is(
  (select public.set_checklist_item_state(current_setting('t.o_free')::uuid, current_setting('t.item_other')::uuid, 'skipped')->>'result'),
  'set', 'marca como pulado (troca o estado)');
select is(
  (select public.set_checklist_item_state(current_setting('t.o_free')::uuid, current_setting('t.item_other')::uuid, 'clear')->>'result'),
  'cleared', 'volta para em aberto');
select is(
  (select public.set_checklist_item_state(current_setting('t.o_free')::uuid, current_setting('t.item')::uuid, 'done')->>'result'),
  'item_not_found', 'item de outra tarefa não vale');

select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.x')::uuid);
select is(
  (select public.set_checklist_item_state(current_setting('t.o_free')::uuid, current_setting('t.item_other')::uuid, 'done')->>'result'),
  'not_found', 'quem é de fora não mexe no checklist');

-- assigned_to só muda pelas funções (a API não pode gravar a coluna direto: ignoraria as regras)
select tests.clear_authentication(); reset role;
select tests.authenticate_as(current_setting('t.m1')::uuid);
select throws_ok(
  format('update public.task_occurrences set assigned_to = %L where id = %L', current_setting('t.m1'), current_setting('t.o_free')),
  '42501',
  null,
  'update direto de assigned_to pela API continua negado'
);

-- ===== efeitos no banco ======================================================
select tests.clear_authentication(); reset role;
select is(
  (select scheduled_for from public.task_occurrences where id = current_setting('t.o_post')::uuid),
  current_setting('t.today')::date + 5, 'a ocorrência foi para a nova data');
select is(
  (select notes from public.task_occurrences where id = current_setting('t.o_free')::uuid),
  'oi', 'a nota ficou aparada e a barrada não a sobrescreveu');
select is(
  (select count(*)::int from public.occurrence_checklist_states where occurrence_id = current_setting('t.o_free')::uuid),
  0, 'sem estado de checklist depois de limpar');
select is(
  (select assigned_to from public.task_occurrences where id = current_setting('t.o_free')::uuid),
  null::uuid, 'devolvida a todos');

select * from finish();
rollback;
