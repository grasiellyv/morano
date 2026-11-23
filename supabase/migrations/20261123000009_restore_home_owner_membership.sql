-- =============================================================================
-- Morano — Correção: handle_new_home voltou a criar a associação do dono
-- =============================================================================
-- A migration 20261123000003_shopping_items_grants fez CREATE OR REPLACE em
-- public.handle_new_home() e, sem querer, removeu a lógica original: inserir o
-- criador em home_members como 'owner' e definir profiles.current_home_id. A
-- versão que ficou só semeava shopping_categories.
--
-- Consequência: toda casa criada a partir daquela migration ficou SEM linha em
-- home_members para o dono. Como is_home_member() passa a ser falso, o passo 2
-- do onboarding (inserir cômodos — política rooms_insert_member) e praticamente
-- todas as features por casa param de funcionar. O usuário "não consegue
-- avançar" no onboarding.
--
-- Aqui restauramos as três responsabilidades em handle_new_home (associação +
-- casa atual + seed de categorias) e fazemos backfill das casas já afetadas.
-- =============================================================================

create or replace function public.handle_new_home()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    -- Criador vira owner. Idempotente: unique (home_id, user_id).
    insert into public.home_members (home_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (home_id, user_id) do nothing;

    -- Vira a casa atual se o criador ainda não tinha uma.
    update public.profiles
    set current_home_id = new.id
    where id = new.created_by
      and current_home_id is null;
  end if;

  -- Semeia as categorias de compras da nova casa.
  perform public.seed_shopping_categories_for_home(new.id);

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Backfill: casas criadas enquanto o trigger estava quebrado ficaram sem o dono
-- em home_members. Recria a associação de dono para todas elas.
-- -----------------------------------------------------------------------------
insert into public.home_members (home_id, user_id, role)
select h.id, h.created_by, 'owner'
from public.homes h
where h.created_by is not null
  and not exists (
    select 1 from public.home_members m
    where m.home_id = h.id
      and m.user_id = h.created_by
  )
on conflict (home_id, user_id) do nothing;
