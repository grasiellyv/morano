-- =============================================================================
-- Morano — RPC get_invite_by_token
-- =============================================================================
-- Permite que qualquer usuário autenticado leia metadados de um convite pelo
-- token, sem precisar ser membro da casa (bypassa a RLS home_invites_select_admin).
-- Retorna apenas o mínimo necessário para a tela de aceite: role, validade,
-- status e nome da casa. Não expõe home_id, invited_by nem invited_email.
-- =============================================================================

create or replace function public.get_invite_by_token(p_token text)
returns table (
  role       public.home_role,
  expires_at timestamptz,
  status     public.invite_status,
  home_name  text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    hi.role,
    hi.expires_at,
    hi.status,
    h.name as home_name
  from public.home_invites hi
  join public.homes h on h.id = hi.home_id
  where hi.token = p_token
  limit 1;
$$;

revoke execute on function public.get_invite_by_token(text) from public, anon;
grant  execute on function public.get_invite_by_token(text) to authenticated;
