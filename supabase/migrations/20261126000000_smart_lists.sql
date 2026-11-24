-- Listas inteligentes: uma lista salva (ex.: "Churrasco", "Compras do mês", "Limpeza") pode ter uma
-- missão/ocasião e uma categoria padrão, e vai para a lista ativa com um toque.
--
--  * shopping_lists.mission / category_id: ao aplicar, os itens novos entram com essa missão e, se o
--    item não tem categoria própria, com a categoria da lista.
--  * create_shopping_list: cria a lista JÁ com itens (ex.: escolhidos nos "mais pedidos") de forma
--    atômica — nunca fica lista vazia pela metade. Categoria de outra casa vira "sem categoria".
--  * apply_shopping_list: aplica a lista inteira em UMA chamada (antes: uma ida ao banco por item),
--    usando add_shopping_item (soma o que já está pendente, nunca duplica).
-- Todas SECURITY INVOKER: a RLS continua valendo.

alter table public.shopping_lists
  add column mission text check (mission in ('abastecimento', 'reposicao', 'ocasioes')),
  add column category_id uuid references public.shopping_categories (id) on delete set null;

create index shopping_lists_category_id_idx on public.shopping_lists (category_id) where category_id is not null;

create function public.create_shopping_list(
  p_home_id uuid,
  p_name text,
  p_mission text,
  p_category_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_category uuid := p_category_id;
begin
  if not public.can_manage_shopping(p_home_id) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if v_category is not null and not exists (
    select 1 from public.shopping_categories c where c.id = v_category and c.home_id = p_home_id
  ) then
    v_category := null;
  end if;

  insert into public.shopping_lists (home_id, name, mission, category_id)
  values (p_home_id, btrim(p_name), p_mission, v_category)
  returning id into v_id;

  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    if jsonb_array_length(p_items) > 50 then
      raise exception using errcode = '22023', message = 'too_many_items';
    end if;

    insert into public.shopping_list_items (list_id, name, category_id, quantity, unit)
    select
      v_id,
      btrim(i.name),
      case when exists (
        select 1 from public.shopping_categories c where c.id = i.category_id and c.home_id = p_home_id
      ) then i.category_id end,
      coalesce(i.quantity, 1),
      coalesce(i.unit, 'un')::public.shopping_unit
    from jsonb_to_recordset(p_items) as i(name text, category_id uuid, quantity numeric, unit text);
  end if;

  return v_id;
end;
$$;

revoke all on function public.create_shopping_list(uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.create_shopping_list(uuid, text, text, uuid, jsonb) to authenticated;

create function public.apply_shopping_list(p_list_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_list public.shopping_lists%rowtype;
  v_item record;
  v_res jsonb;
  v_total int := 0;
  v_inserted int := 0;
  v_merged int := 0;
  v_conflict int := 0;
begin
  select * into v_list from public.shopping_lists where id = p_list_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  for v_item in
    select * from public.shopping_list_items where list_id = p_list_id order by created_at, id
  loop
    v_total := v_total + 1;
    -- add_shopping_item confere a permissão de Compras (42501) e soma o que já está pendente.
    v_res := public.add_shopping_item(
      v_list.home_id, v_item.name, coalesce(v_item.category_id, v_list.category_id), v_item.quantity,
      v_item.unit, v_item.notes, null, v_list.mission, 'normal', null
    );
    case v_res->>'result'
      when 'inserted' then v_inserted := v_inserted + 1;
      when 'merged' then v_merged := v_merged + 1;
      else v_conflict := v_conflict + 1;
    end case;
  end loop;

  if v_total = 0 then
    return jsonb_build_object('result', 'empty');
  end if;

  update public.shopping_list_items set last_added_at = now() where list_id = p_list_id;

  return jsonb_build_object('result', 'applied', 'inserted', v_inserted, 'merged', v_merged, 'conflict', v_conflict);
end;
$$;

revoke all on function public.apply_shopping_list(uuid) from public, anon;
grant execute on function public.apply_shopping_list(uuid) to authenticated;
