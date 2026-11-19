-- =============================================================================
-- Ausência: funções RPC security definer para membro atualizar a própria linha
-- =============================================================================
-- A política `home_members_update_admin` só permite owner/admin; um membro
-- não pode fazer UPDATE direto nas colunas de ausência sem promover o papel.
-- A solução correta é security definer: a função roda com privilégios de
-- dono da função (owner do schema), não do chamador, e só altera a própria
-- linha do chamador (auth.uid()).
-- =============================================================================

create function public.set_my_absence(p_start date, p_end date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_home_id uuid;
begin
  select current_home_id
    into v_home_id
    from public.profiles
   where id = (select auth.uid());

  if v_home_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'home_not_found';
  end if;

  update public.home_members
     set absence_start = p_start,
         absence_end   = p_end
   where user_id = (select auth.uid())
     and home_id = v_home_id;
end;
$$;

create function public.clear_my_absence()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_home_id uuid;
begin
  select current_home_id
    into v_home_id
    from public.profiles
   where id = (select auth.uid());

  if v_home_id is null then
    return;
  end if;

  update public.home_members
     set absence_start = null,
         absence_end   = null
   where user_id = (select auth.uid())
     and home_id = v_home_id;
end;
$$;

grant execute on function public.set_my_absence(date, date) to authenticated;
grant execute on function public.clear_my_absence() to authenticated;

-- Revoga o grant de UPDATE por coluna concedido em 20261119010000_absence.sql.
-- Membros não devem escrever diretamente na tabela; o acesso passa pelas RPCs.
revoke update (absence_start, absence_end) on public.home_members from authenticated;
