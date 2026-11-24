-- Concluir tarefa em UMA chamada ao banco (antes: ~5 idas sequenciais — ocorrência, papel,
-- permissões, escopo de cômodos, atualização). SECURITY INVOKER: a RLS continua valendo e as
-- regras de permissão são as mesmas do app (dono/admin passam; membro precisa de
-- can_complete_tasks, e se tiver escopo de cômodos só conclui tarefas desses cômodos).
-- Retorno: { result: completed | not_found | forbidden | forbidden_room, home_id? }.

create function public.complete_task_occurrence(p_occurrence_id uuid)
returns jsonb
language plpgsql
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

  update public.task_occurrences
  set status = 'completed', completed_at = now(), completed_by = v_uid
  where id = p_occurrence_id;

  return jsonb_build_object('result', 'completed', 'home_id', v_occ.home_id);
end;
$$;

revoke all on function public.complete_task_occurrence(uuid) from public, anon;
grant execute on function public.complete_task_occurrence(uuid) to authenticated;
