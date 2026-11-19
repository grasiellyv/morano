-- =============================================================================
-- MORANO — Etapa 9A: Casa Compartilhada — convites, membros e permissões
-- =============================================================================
-- Decisões de design:
--   * Convites usam token hex de 32 bytes (256 bits) gerado no DB.
--   * Apenas admin/owner podem convidar; papel 'owner' só via transferência.
--   * Se o convidado já tem current_home_id, aceitar sem alterar a casa ativa.
--   * Remoção do último owner é bloqueada — a casa ficaria órfã.
--   * Todos os RPCs são security definer e derivam home_id do banco (nunca do cliente).
--   * RLS de events corrigida: usa is_home_member(home_id) em vez de current_home_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum invite_status
-- -----------------------------------------------------------------------------
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- -----------------------------------------------------------------------------
-- 2. Tabela home_invites
-- -----------------------------------------------------------------------------
create table public.home_invites (
  id            uuid        primary key default gen_random_uuid(),
  home_id       uuid        not null references public.homes(id) on delete cascade,
  token         text        not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_email text        not null check (char_length(btrim(invited_email)) between 3 and 254),
  role          public.home_role not null default 'member'
                            check (role <> 'owner'),
  status        public.invite_status not null default 'pending',
  invited_by    uuid        not null references auth.users(id),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

create index home_invites_home_status_idx on public.home_invites (home_id, status);
create index home_invites_token_idx       on public.home_invites (token);

-- -----------------------------------------------------------------------------
-- 3. Corrigir RLS de events: usar is_home_member em vez de current_home_id
-- -----------------------------------------------------------------------------
drop policy events_select on public.events;
drop policy events_insert on public.events;
drop policy events_update on public.events;
drop policy events_delete on public.events;

create policy events_select on public.events
  for select to authenticated
  using (public.is_home_member(home_id));

create policy events_insert on public.events
  for insert to authenticated
  with check (public.is_home_member(home_id));

create policy events_update on public.events
  for update to authenticated
  using (public.is_home_member(home_id));

create policy events_delete on public.events
  for delete to authenticated
  using (public.is_home_member(home_id));

-- -----------------------------------------------------------------------------
-- 4. Privilégios para home_invites
-- -----------------------------------------------------------------------------
revoke all on public.home_invites from anon, authenticated;
grant select on public.home_invites to authenticated;
-- Escrita apenas via RPCs security definer abaixo

alter table public.home_invites enable row level security;

-- Admin/owner vê os convites da própria casa; convidado vê o seu pelo token (via RPC)
create policy home_invites_select_admin on public.home_invites
  for select to authenticated
  using (public.has_home_role(home_id, '{owner,admin}'));

-- -----------------------------------------------------------------------------
-- 5. RPCs
-- -----------------------------------------------------------------------------

-- 5.1 invite_member — cria convite (admin/owner da casa atual do chamador)
create function public.invite_member(
  p_email text,
  p_role  public.home_role default 'member'
)
returns table (invite_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_home_id uuid;
  v_id      uuid;
  v_token   text;
  v_exp     timestamptz;
begin
  -- Deriva home_id do chamador
  select current_home_id into v_home_id
  from public.profiles
  where id = v_uid;

  if v_home_id is null then
    raise exception using errcode = 'P0001', message = 'no_active_home';
  end if;

  -- Exige admin ou owner
  if not public.has_home_role(v_home_id, '{owner,admin}') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  -- Convites nunca cedem papel owner
  if p_role = 'owner' then
    raise exception using errcode = 'P0001', message = 'cannot_invite_as_owner';
  end if;

  -- Revoga convites anteriores pendentes para o mesmo email/home
  update public.home_invites
  set status = 'revoked'
  where home_id = v_home_id
    and invited_email = lower(btrim(p_email))
    and status = 'pending';

  -- Insere novo convite
  insert into public.home_invites (home_id, invited_email, role, invited_by)
  values (v_home_id, lower(btrim(p_email)), p_role, v_uid)
  returning home_invites.id, home_invites.token, home_invites.expires_at
  into v_id, v_token, v_exp;

  return query select v_id, v_token, v_exp;
end;
$$;

-- 5.2 accept_invite — aceita convite pelo token; não altera current_home_id se já existe
create function public.accept_invite(p_token text)
returns table (home_id uuid, role public.home_role)
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

  -- Busca convite
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

-- 5.3 revoke_invite — revoga convite pendente (admin/owner)
create function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite record;
begin
  select * into v_invite
  from public.home_invites
  where id = p_invite_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'invite_not_found';
  end if;

  if not public.has_home_role(v_invite.home_id, '{owner,admin}') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if v_invite.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'invite_not_pending';
  end if;

  update public.home_invites set status = 'revoked' where id = p_invite_id;
end;
$$;

-- 5.4 remove_member — remove membro da casa (admin/owner)
create function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := (select auth.uid());
  v_home_id    uuid;
  v_target_role public.home_role;
  v_owner_count int;
begin
  select current_home_id into v_home_id
  from public.profiles
  where id = v_uid;

  if v_home_id is null then
    raise exception using errcode = 'P0001', message = 'no_active_home';
  end if;

  -- Busca o papel do alvo
  select role into v_target_role
  from public.home_members
  where home_id = v_home_id and user_id = p_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'member_not_found';
  end if;

  -- Owner não pode ser removido por admin; apenas por outro owner (ou a si mesmo)
  if v_target_role = 'owner' then
    if not public.has_home_role(v_home_id, '{owner}') then
      raise exception using errcode = '42501', message = 'forbidden';
    end if;

    -- Impede remover o último owner
    select count(*) into v_owner_count
    from public.home_members
    where home_id = v_home_id and role = 'owner';

    if v_owner_count <= 1 then
      raise exception using errcode = 'P0001', message = 'cannot_remove_last_owner';
    end if;
  else
    -- Admin/owner remove member/admin
    if not public.has_home_role(v_home_id, '{owner,admin}') then
      raise exception using errcode = '42501', message = 'forbidden';
    end if;
  end if;

  -- Remove membro (trigger handle_member_removed limpa current_home_id)
  delete from public.home_members
  where home_id = v_home_id and user_id = p_user_id;
end;
$$;

-- 5.5 transfer_ownership — transfere propriedade (owner atual → outro membro)
create function public.transfer_ownership(p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_home_id uuid;
begin
  select current_home_id into v_home_id
  from public.profiles
  where id = v_uid;

  if v_home_id is null then
    raise exception using errcode = 'P0001', message = 'no_active_home';
  end if;

  if not public.has_home_role(v_home_id, '{owner}') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if p_new_owner_id = v_uid then
    raise exception using errcode = 'P0001', message = 'already_owner';
  end if;

  -- Verifica que o novo owner é membro da casa
  if not exists (
    select 1 from public.home_members
    where home_id = v_home_id and user_id = p_new_owner_id
  ) then
    raise exception using errcode = 'P0001', message = 'member_not_found';
  end if;

  -- Rebaixa o owner atual para admin
  update public.home_members
  set role = 'admin'
  where home_id = v_home_id and user_id = v_uid;

  -- Promove o novo owner
  update public.home_members
  set role = 'owner'
  where home_id = v_home_id and user_id = p_new_owner_id;
end;
$$;

-- 5.6 get_home_members — lista membros com dados de perfil (security definer para join)
create function public.get_home_members()
returns table (
  user_id    uuid,
  role       public.home_role,
  full_name  text,
  avatar_url text,
  joined_at  timestamptz,
  absence_start date,
  absence_end   date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    hm.user_id,
    hm.role,
    p.full_name,
    p.avatar_url,
    hm.created_at as joined_at,
    hm.absence_start,
    hm.absence_end
  from public.home_members hm
  join public.profiles p on p.id = hm.user_id
  where hm.home_id = (
    select current_home_id from public.profiles where id = (select auth.uid())
  )
  order by
    case hm.role when 'owner' then 0 when 'admin' then 1 else 2 end,
    hm.created_at;
$$;

-- -----------------------------------------------------------------------------
-- 6. Privilégios dos RPCs
-- -----------------------------------------------------------------------------
revoke execute on function public.invite_member(text, public.home_role)     from public, anon;
revoke execute on function public.accept_invite(text)                        from public, anon;
revoke execute on function public.revoke_invite(uuid)                        from public, anon;
revoke execute on function public.remove_member(uuid)                        from public, anon;
revoke execute on function public.transfer_ownership(uuid)                   from public, anon;
revoke execute on function public.get_home_members()                         from public, anon;

grant execute on function public.invite_member(text, public.home_role)      to authenticated;
grant execute on function public.accept_invite(text)                         to authenticated;
grant execute on function public.revoke_invite(uuid)                         to authenticated;
grant execute on function public.remove_member(uuid)                         to authenticated;
grant execute on function public.transfer_ownership(uuid)                    to authenticated;
grant execute on function public.get_home_members()                          to authenticated;
