-- =============================================================================
-- MORANO — Compras: adicionar item atômico (sem duplicar), permissão no link
-- público e data de atualização consistente
-- =============================================================================
-- Correções da revisão de código:
-- 1) add_shopping_item: o "somar ou inserir" acontecia em 2 passos no servidor
--    (SELECT depois UPDATE/INSERT). Dois membros ao mesmo tempo geravam linhas
--    duplicadas ou somas perdidas. Agora é uma função só, serializada por casa
--    com advisory lock, que também escala a prioridade e completa a categoria.
-- 2) can_manage_shopping(home): permissão real no banco. O link público só pode
--    ser visto/criado/desativado por quem gerencia compras.
-- 3) get_shared_shopping_list passa a considerar a última compra finalizada em
--    "atualizada em" (itens são apagados ao finalizar).
-- =============================================================================

-- Normaliza o nome: sem acento, minúsculo, espaços únicos. Espelha normalizeName()
-- do TypeScript (que ainda é usado para avisar enquanto a pessoa digita).
create function public.shopping_name_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(
      lower(coalesce(p_name, '')),
      'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
      'aaaaaaeeeeiiiiooooouuuucnyy'
    ),
    '\s+', ' ', 'g'
  ));
$$;

create function public.can_manage_shopping(p_home_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_home_member(p_home_id)
    and (
      public.has_home_role(p_home_id, '{owner,admin}')
      or coalesce((
        select hmp.can_manage_shopping
        from public.home_member_permissions hmp
        where hmp.home_id = p_home_id and hmp.user_id = (select auth.uid())
      ), true)
    );
$$;

revoke all on function public.can_manage_shopping(uuid) from public, anon;
grant execute on function public.can_manage_shopping(uuid) to authenticated;

-- O token só é visível e gerenciável por quem pode gerenciar compras.
drop policy shopping_share_links_select_member on public.shopping_share_links;
drop policy shopping_share_links_insert_member on public.shopping_share_links;
drop policy shopping_share_links_delete_member on public.shopping_share_links;

create policy shopping_share_links_select_manager on public.shopping_share_links
  for select to authenticated using (public.can_manage_shopping(home_id));
create policy shopping_share_links_insert_manager on public.shopping_share_links
  for insert to authenticated with check (public.can_manage_shopping(home_id));
create policy shopping_share_links_delete_manager on public.shopping_share_links
  for delete to authenticated using (public.can_manage_shopping(home_id));

-- -----------------------------------------------------------------------------
-- Adicionar item sem duplicar (atômico)
-- -----------------------------------------------------------------------------
-- SECURITY INVOKER: a RLS e os GRANTs por coluna de shopping_items continuam
-- valendo. Retorna jsonb { result: inserted | merged | conflict, ... }.
create function public.add_shopping_item(
  p_home_id uuid,
  p_name text,
  p_category_id uuid,
  p_quantity numeric,
  p_unit public.shopping_unit,
  p_notes text,
  p_room_id uuid,
  p_mission text,
  p_priority text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_key text := public.shopping_name_key(p_name);
  v_existing public.shopping_items%rowtype;
  v_new_qty numeric;
  v_id uuid;
  v_category uuid := p_category_id;
begin
  if v_key = '' then
    raise exception using errcode = '22023', message = 'invalid_name';
  end if;
  if not public.can_manage_shopping(p_home_id) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  -- Serializa adições da mesma casa: duas pessoas adicionando "Leite" juntas
  -- resultam em UMA linha com a soma, não em duas linhas nem em soma perdida.
  perform pg_advisory_xact_lock(hashtextextended('shopping_add:' || p_home_id::text, 0));

  -- Categoria apagada ou de outra casa (ex.: vinda do histórico) vira "sem categoria".
  if v_category is not null and not exists (
    select 1 from public.shopping_categories c
    where c.id = v_category and c.home_id = p_home_id
  ) then
    v_category := null;
  end if;

  select * into v_existing
  from public.shopping_items i
  where i.home_id = p_home_id
    and not i.is_purchased
    and public.shopping_name_key(i.name) = v_key
  order by i.created_at
  limit 1;

  if found then
    if v_existing.unit <> p_unit then
      return jsonb_build_object(
        'result', 'conflict',
        'name', v_existing.name,
        'quantity', v_existing.quantity,
        'unit', v_existing.unit
      );
    end if;

    v_new_qty := least(round(v_existing.quantity + p_quantity, 2), 9999);
    update public.shopping_items
    set quantity = v_new_qty,
        -- Quem marca "Urgente" ao adicionar de novo espera que o item vire urgente.
        priority = case when p_priority = 'urgente' then 'urgente' else priority end,
        category_id = coalesce(category_id, v_category)
    where id = v_existing.id;

    return jsonb_build_object(
      'result', 'merged',
      'name', v_existing.name,
      'quantity', v_new_qty,
      'unit', v_existing.unit
    );
  end if;

  insert into public.shopping_items
    (home_id, name, category_id, quantity, unit, notes, room_id, is_purchased, mission, priority)
  values
    (p_home_id, btrim(p_name), v_category, p_quantity, p_unit, p_notes, p_room_id, false, p_mission, coalesce(p_priority, 'normal'))
  returning id into v_id;

  return jsonb_build_object('result', 'inserted', 'id', v_id);
end;
$$;

revoke all on function public.add_shopping_item(uuid, text, uuid, numeric, public.shopping_unit, text, uuid, text, text) from public, anon;
grant execute on function public.add_shopping_item(uuid, text, uuid, numeric, public.shopping_unit, text, uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Página pública: "atualizada em" também considera a última compra finalizada
-- -----------------------------------------------------------------------------
create or replace function public.get_shared_shopping_list(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'home_name', h.name,
    'updated_at', greatest(
      (select max(i.updated_at) from public.shopping_items i where i.home_id = h.id),
      (select max(s.finished_at) from public.shopping_sessions s where s.home_id = h.id)
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', i.name,
          'quantity', i.quantity,
          'unit', i.unit,
          'is_purchased', i.is_purchased,
          'priority', i.priority,
          'category', c.name,
          'category_icon', c.icon,
          'added_by', nullif(split_part(btrim(coalesce(pa.full_name, '')), ' ', 1), ''),
          'purchased_by', nullif(split_part(btrim(coalesce(pp.full_name, '')), ' ', 1), '')
        )
        order by i.is_purchased, c.sort_order nulls last, i.created_at desc
      )
      from public.shopping_items i
      left join public.shopping_categories c on c.id = i.category_id
      left join public.profiles pa on pa.id = i.created_by
      left join public.profiles pp on pp.id = i.purchased_by
      where i.home_id = h.id
    ), '[]'::jsonb)
  )
  from public.shopping_share_links l
  join public.homes h on h.id = l.home_id
  where l.token = p_token
    and length(p_token) = 64;
$$;
