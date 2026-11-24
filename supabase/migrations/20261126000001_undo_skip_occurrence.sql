-- Desfazer e pular tarefa em UMA chamada ao banco (como já é o concluir), com as mesmas regras de
-- permissão do app. Antes: ~5 idas sequenciais ao Supabase remoto em cada uma.
--
--  * task_occurrence_access: a regra de quem pode mexer numa ocorrência (membro da casa; dono/admin
--    sempre; os demais precisam de can_complete_tasks e, se tiverem escopo de cômodos, só os deles).
--    Fica num lugar só: complete/undo/skip usam o mesmo helper.
--  * complete_task_occurrence passa a usar o helper (mesmo comportamento; coberto pelo pgTAP 09 e 11).
--  * undo_task_occurrence: só concluída, e só no MESMO DIA no fuso da casa.
--  * skip_task_occurrence: marca como pulada.
-- Todas SECURITY INVOKER: a RLS continua valendo.

create function public.task_occurrence_access(p_occurrence_id uuid)
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
    'status', v_occ.status,
    'completed_at', v_occ.completed_at
  );
end;
$$;

revoke all on function public.task_occurrence_access(uuid) from public, anon;
grant execute on function public.task_occurrence_access(uuid) to authenticated;

create or replace function public.complete_task_occurrence(p_occurrence_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_access jsonb := public.task_occurrence_access(p_occurrence_id);
begin
  if v_access->>'result' <> 'ok' then
    return jsonb_build_object('result', v_access->>'result');
  end if;

  update public.task_occurrences
  set status = 'completed', completed_at = now(), completed_by = (select auth.uid())
  where id = p_occurrence_id;

  return jsonb_build_object('result', 'completed', 'home_id', v_access->>'home_id');
end;
$$;

create function public.undo_task_occurrence(p_occurrence_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_access jsonb := public.task_occurrence_access(p_occurrence_id);
  v_tz text;
begin
  if v_access->>'result' <> 'ok' then
    return jsonb_build_object('result', v_access->>'result');
  end if;

  if v_access->>'status' <> 'completed' then
    return jsonb_build_object('result', 'not_completed');
  end if;

  select h.timezone into v_tz from public.homes h where h.id = (v_access->>'home_id')::uuid;
  if v_tz is null then
    return jsonb_build_object('result', 'not_found');
  end if;

  -- Só no mesmo dia (na data da casa) em que foi concluída.
  if ((v_access->>'completed_at')::timestamptz at time zone v_tz)::date <> (now() at time zone v_tz)::date then
    return jsonb_build_object('result', 'wrong_day');
  end if;

  update public.task_occurrences
  set status = 'pending', completed_at = null, completed_by = null
  where id = p_occurrence_id;

  return jsonb_build_object('result', 'undone', 'home_id', v_access->>'home_id');
end;
$$;

revoke all on function public.undo_task_occurrence(uuid) from public, anon;
grant execute on function public.undo_task_occurrence(uuid) to authenticated;

create function public.skip_task_occurrence(p_occurrence_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_access jsonb := public.task_occurrence_access(p_occurrence_id);
begin
  if v_access->>'result' <> 'ok' then
    return jsonb_build_object('result', v_access->>'result');
  end if;

  update public.task_occurrences set status = 'skipped' where id = p_occurrence_id;

  return jsonb_build_object('result', 'skipped', 'home_id', v_access->>'home_id');
end;
$$;

revoke all on function public.skip_task_occurrence(uuid) from public, anon;
grant execute on function public.skip_task_occurrence(uuid) to authenticated;
