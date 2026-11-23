-- =============================================================================
-- Morano — Correção: onboarding_create_home (cast text → enum)
-- =============================================================================
-- A RPC recebia os parâmetros como text e os inseria direto nas colunas enum
-- de `homes` (property_type, ownership_type, household_type). O PostgreSQL não
-- faz cast implícito de text para enum dentro de PL/pgSQL, então o INSERT
-- falhava com:
--   42804: column "property_type" is of type public.property_type
--          but expression is of type text
-- O fluxo antigo com .insert() direto funcionava porque o PostgREST fazia o
-- cast. Aqui recriamos a função com casts explícitos para os tipos enum.
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
    p_name,
    p_property_type::public.property_type,
    p_ownership_type::public.ownership_type,
    p_household_type::public.household_type,
    p_resident_count,
    p_timezone,
    v_user_id
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
