-- Ações de tarefa em UMA chamada ao banco (como já são concluir, desfazer e pular): adiar, assumir,
-- liberar, anotar, atribuir e marcar item de checklist. Antes: de 2 a ~7 idas sequenciais ao Supabase
-- remoto cada uma. Mesmas regras do app. SECURITY INVOKER (a RLS continua valendo), exceto assumir,
-- liberar e atribuir: a coluna task_occurrences.assigned_to NUNCA recebeu GRANT de UPDATE para o
-- app (as actions antigas davam "permission denied" ao gravá-la). Em vez de abrir a coluna para
-- qualquer update direto pela API (que ignoraria as regras de quem pode atribuir a quem), essas três
-- são SECURITY DEFINER com checagem de membro e de permissão dentro da função: assigned_to só muda
-- por elas.
--
--  * task_occurrence_access passa a devolver também task_id, scheduled_for e assigned_to
--    (mesma assinatura: complete/undo/skip continuam iguais).
--  * Assumir é atômico: o update só pega se ainda estiver livre e pendente (antes: ler, depois gravar —
--    duas pessoas podiam assumir ao mesmo tempo).
--  * Anotar e adiar passam a respeitar também o escopo de cômodos (como concluir/desfazer/pular).
--  * Checklist: o item precisa ser da tarefa da ocorrência.

create or replace function public.task_occurrence_access(p_occurrence_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_occ public.task_occurrences%rowtype;
  v_uid uuid := (select auth.uid());
  v_role public.home_role;
  v_room uuid;
begin
  -- A RLS esconde ocorrências de outras casas: para quem é de fora, "não encontrada".
  select * into v_occ from public.task_occurrences where id = p_occurrence_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  select m.role into v_role
  from public.home_members m
  where m.home_id = v_occ.home_id and m.user_id = v_uid;

  if v_role is null then
    return jsonb_build_object('result', 'not_found');
  end if;

  if v_role not in ('owner', 'admin') then
    if not coalesce((
      select p.can_complete_tasks
      from public.home_member_permissions p
      where p.home_id = v_occ.home_id and p.user_id = v_uid
    ), true) then
      return jsonb_build_object('result', 'forbidden');
    end if;

    select t.room_id into v_room from public.tasks t where t.id = v_occ.task_id;
    if v_room is not null
       and exists (
         select 1 from public.home_member_task_scopes s
         where s.home_id = v_occ.home_id and s.user_id = v_uid
       )
       and not exists (
         select 1 from public.home_member_task_scopes s
         where s.home_id = v_occ.home_id and s.user_id = v_uid and s.room_id = v_room
       )
    then
      return jsonb_build_object('result', 'forbidden_room');
    end if;
  end if;

  return jsonb_build_object(
    'result', 'ok',
    'home_id', v_occ.home_id,
    'task_id', v_occ.task_id,
    'status', v_occ.status,
    'completed_at', v_occ.completed_at,
    'scheduled_for', v_occ.scheduled_for,
    'assigned_to', v_occ.assigned_to
  );
end;
$$;

-- Adiar: só para o futuro (data da casa), depois da data original e antes da próxima ocorrência pendente
-- da mesma tarefa (evita duas na mesma data efetiva).
create function public.postpone_task_occurrence(p_occurrence_id uuid, p_new_date date)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_access jsonb := public.task_occurrence_access(p_occurrence_id);
  v_tz text;
  v_today date;
  v_next date;
begin
  if v_access->>'result' <> 'ok' then
    return jsonb_build_object('result', v_access->>'result');
  end if;

  select h.timezone into v_tz from public.homes h where h.id = (v_access->>'home_id')::uuid;
  if v_tz is null then
    return jsonb_build_object('result', 'not_found');
  end if;
  v_today := (now() at time zone v_tz)::date;

  if p_new_date <= v_today then
    return jsonb_build_object('result', 'not_future');
  end if;
  if p_new_date <= (v_access->>'scheduled_for')::date then
    return jsonb_build_object('result', 'before_original');
  end if;

  select min(o.scheduled_for) into v_next
  from public.task_occurrences o
  where o.task_id = (v_access->>'task_id')::uuid
    and o.status = 'pending'
    and o.scheduled_for > (v_access->>'scheduled_for')::date;
  if v_next is not null and p_new_date >= v_next then
    return jsonb_build_object('result', 'beyond_next');
  end if;

  update public.task_occurrences set scheduled_for = p_new_date where id = p_occurrence_id;

  return jsonb_build_object('result', 'postponed', 'home_id', v_access->>'home_id');
end;
$$;

revoke all on function public.postpone_task_occurrence(uuid, date) from public, anon;
grant execute on function public.postpone_task_occurrence(uuid, date) to authenticated;

-- Assumir: qualquer morador, desde que ainda esteja pendente e livre (atômico).
create function public.claim_task_occurrence(p_occurrence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occ public.task_occurrences%rowtype;
  v_rows int;
begin
  select * into v_occ from public.task_occurrences where id = p_occurrence_id;
  -- SECURITY DEFINER ignora a RLS: quem não é da casa nem "enxerga" a ocorrência.
  if not found or not public.is_home_member(v_occ.home_id) then
    return jsonb_build_object('result', 'not_found');
  end if;
  if v_occ.status <> 'pending' then
    return jsonb_build_object('result', 'not_pending');
  end if;
  if v_occ.assigned_to is not null then
    return jsonb_build_object('result', 'already_assigned');
  end if;

  update public.task_occurrences
  set assigned_to = (select auth.uid())
  where id = p_occurrence_id and assigned_to is null and status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('result', 'already_assigned');
  end if;

  return jsonb_build_object('result', 'claimed');
end;
$$;

revoke all on function public.claim_task_occurrence(uuid) from public, anon;
grant execute on function public.claim_task_occurrence(uuid) to authenticated;

-- Liberar: só quem é o responsável.
create function public.unclaim_task_occurrence(p_occurrence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occ public.task_occurrences%rowtype;
begin
  select * into v_occ from public.task_occurrences where id = p_occurrence_id;
  if not found or not public.is_home_member(v_occ.home_id) then
    return jsonb_build_object('result', 'not_found');
  end if;
  if v_occ.assigned_to is distinct from (select auth.uid()) then
    return jsonb_build_object('result', 'not_yours');
  end if;

  update public.task_occurrences set assigned_to = null where id = p_occurrence_id;

  return jsonb_build_object('result', 'released');
end;
$$;

revoke all on function public.unclaim_task_occurrence(uuid) from public, anon;
grant execute on function public.unclaim_task_occurrence(uuid) to authenticated;

-- Atribuir (só ESTA ocorrência): dono/admin ou quem gerencia tarefas atribui a qualquer morador;
-- os demais só a si mesmos, ou devolvem a própria. `p_assigned_to` nulo = compartilhada.
create function public.assign_task_occurrence(p_occurrence_id uuid, p_assigned_to uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occ public.task_occurrences%rowtype;
  v_uid uuid := (select auth.uid());
  v_role public.home_role;
  v_can_manage boolean;
  v_self_service boolean;
begin
  select * into v_occ from public.task_occurrences where id = p_occurrence_id;
  if not found or not public.is_home_member(v_occ.home_id) then
    return jsonb_build_object('result', 'not_found');
  end if;
  if v_occ.status <> 'pending' then
    return jsonb_build_object('result', 'not_pending');
  end if;
  if v_occ.assigned_to is not distinct from p_assigned_to then
    return jsonb_build_object('result', 'unchanged');
  end if;

  select m.role into v_role from public.home_members m where m.home_id = v_occ.home_id and m.user_id = v_uid;
  if v_role is null then
    return jsonb_build_object('result', 'not_found');
  end if;

  v_can_manage := v_role in ('owner', 'admin') or coalesce((
    select p.can_manage_tasks from public.home_member_permissions p
    where p.home_id = v_occ.home_id and p.user_id = v_uid
  ), true);
  v_self_service := p_assigned_to = v_uid or (p_assigned_to is null and v_occ.assigned_to = v_uid);
  if not v_can_manage and not v_self_service then
    return jsonb_build_object('result', 'forbidden');
  end if;

  if p_assigned_to is not null and not exists (
    select 1 from public.home_members m where m.home_id = v_occ.home_id and m.user_id = p_assigned_to
  ) then
    return jsonb_build_object('result', 'member_not_found');
  end if;

  update public.task_occurrences set assigned_to = p_assigned_to where id = p_occurrence_id;

  return jsonb_build_object('result', 'assigned');
end;
$$;

revoke all on function public.assign_task_occurrence(uuid, uuid) from public, anon;
grant execute on function public.assign_task_occurrence(uuid, uuid) to authenticated;

-- Anotar: nota em branco apaga; até 2000 caracteres.
create function public.update_occurrence_notes(p_occurrence_id uuid, p_notes text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_access jsonb := public.task_occurrence_access(p_occurrence_id);
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if v_access->>'result' <> 'ok' then
    return jsonb_build_object('result', v_access->>'result');
  end if;
  if v_notes is not null and char_length(v_notes) > 2000 then
    return jsonb_build_object('result', 'too_long');
  end if;

  update public.task_occurrences set notes = v_notes where id = p_occurrence_id;

  return jsonb_build_object('result', 'saved');
end;
$$;

revoke all on function public.update_occurrence_notes(uuid, text) from public, anon;
grant execute on function public.update_occurrence_notes(uuid, text) to authenticated;

-- Checklist: marca o item como feito/pulado NESTA ocorrência, ou volta para em aberto ('clear').
create function public.set_checklist_item_state(p_occurrence_id uuid, p_item_id uuid, p_status text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_occ public.task_occurrences%rowtype;
begin
  if p_status not in ('done', 'skipped', 'clear') then
    return jsonb_build_object('result', 'invalid');
  end if;

  select * into v_occ from public.task_occurrences where id = p_occurrence_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  -- O item precisa ser da tarefa desta ocorrência.
  if not exists (
    select 1 from public.task_checklist_items i where i.id = p_item_id and i.task_id = v_occ.task_id
  ) then
    return jsonb_build_object('result', 'item_not_found');
  end if;

  if p_status = 'clear' then
    delete from public.occurrence_checklist_states
    where occurrence_id = p_occurrence_id and item_id = p_item_id and home_id = v_occ.home_id;
    return jsonb_build_object('result', 'cleared');
  end if;

  insert into public.occurrence_checklist_states (occurrence_id, item_id, home_id, status, updated_at, updated_by)
  values (p_occurrence_id, p_item_id, v_occ.home_id, p_status, now(), (select auth.uid()))
  on conflict (occurrence_id, item_id)
  do update set status = excluded.status, updated_at = excluded.updated_at, updated_by = excluded.updated_by;

  return jsonb_build_object('result', 'set');
end;
$$;

revoke all on function public.set_checklist_item_state(uuid, uuid, text) from public, anon;
grant execute on function public.set_checklist_item_state(uuid, uuid, text) to authenticated;
