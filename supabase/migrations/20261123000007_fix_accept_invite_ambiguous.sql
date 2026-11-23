-- =============================================================================
-- Morano — Fix accept_invite: coluna de retorno "home_id" conflitava com a
-- coluna homônima em home_members dentro do ON CONFLICT, gerando "ambiguous
-- column reference". DROP + CREATE necessário pois PostgreSQL não permite
-- CREATE OR REPLACE quando o tipo de retorno muda.
-- =============================================================================

drop function if exists public.accept_invite(text);

create function public.accept_invite(p_token text)
returns table (out_home_id uuid, out_role public.home_role)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_email   text;
  v_invite  record;
begin
  -- Email verificado do usuário autenticado
  select email into v_email
  from auth.users
  where id = v_uid;

  -- Busca convite com lock para evitar duplo aceite concorrente
  select * into v_invite
  from public.home_invites
  where token = p_token
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invite_not_found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'invite_already_used';
  end if;

  if v_invite.expires_at < now() then
    update public.home_invites set status = 'expired' where id = v_invite.id;
    raise exception using errcode = 'P0001', message = 'invite_expired';
  end if;

  if lower(v_email) <> lower(v_invite.invited_email) then
    raise exception using errcode = '42501', message = 'email_mismatch';
  end if;

  -- Insere membro (ignora se já for membro)
  insert into public.home_members (home_id, user_id, role)
  values (v_invite.home_id, v_uid, v_invite.role)
  on conflict (home_id, user_id) do nothing;

  -- Define casa ativa apenas se não tiver nenhuma
  update public.profiles
  set current_home_id = v_invite.home_id
  where id = v_uid
    and current_home_id is null;

  -- Marca convite como aceito
  update public.home_invites
  set status = 'accepted'
  where id = v_invite.id;

  return query select v_invite.home_id, v_invite.role;
end;
$$;

revoke execute on function public.accept_invite(text) from public, anon;
grant  execute on function public.accept_invite(text) to authenticated;
