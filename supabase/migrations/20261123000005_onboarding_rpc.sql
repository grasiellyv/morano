-- =============================================================================
-- Morano — RPC onboarding_create_home
-- =============================================================================
-- Cria a residência e atualiza o perfil atomicamente em uma transação,
-- evitando a violação de RLS em profiles_update_own (que exige is_home_member
-- antes de confirmar current_home_id).
-- =============================================================================

create or replace function public.onboarding_create_home(
  p_name             text,
  p_property_type    text,
  p_ownership_type   text,
  p_household_type   text,
  p_resident_count   int,
  p_timezone         text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_home_id uuid;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  -- Insere a residência; o trigger on_home_created adiciona o usuário em
  -- home_members e define current_home_id quando era null.
  insert into public.homes (
    name, property_type, ownership_type, household_type,
    resident_count, timezone, created_by
  )
  values (
    p_name, p_property_type, p_ownership_type, p_household_type,
    p_resident_count, p_timezone, v_user_id
  )
  returning id into v_home_id;

  -- Atualiza o perfil na mesma transação — bypassa a RLS via security definer.
  update public.profiles
  set current_home_id = v_home_id,
      onboarding_step  = 1
  where id = v_user_id;

  return v_home_id;
end;
$$;

revoke execute on function public.onboarding_create_home(text, text, text, text, int, text)
  from public, anon;
grant  execute on function public.onboarding_create_home(text, text, text, text, int, text)
  to authenticated;
