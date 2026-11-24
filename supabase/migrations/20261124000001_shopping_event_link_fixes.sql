-- Correções da revisão final do vínculo evento ↔ compras (migration anterior ainda não foi
-- para produção; as duas sobem juntas, nesta ordem).
--  * Soma de outra origem em item já vinculado a um evento DESVINCULA o item: antes, excluir
--    o evento apagava também a quantidade somada por outra pessoa/evento.
--  * Salvar o evento de novo é idempotente: o mesmo evento pedindo o mesmo item já vinculado
--    devolve 'unchanged' em vez de somar a quantidade outra vez.
--  * O gatilho de exclusão só apaga itens da casa do evento (event_id forjado por INSERT
--    direto em outra casa não é apagado).

-- A RPC (security invoker) atualiza event_id ao somar; os GRANTs de shopping_items são por coluna.
grant update (event_id) on public.shopping_items to authenticated;

create or replace function public.add_shopping_item(
  p_home_id uuid,
  p_name text,
  p_category_id uuid,
  p_quantity numeric,
  p_unit public.shopping_unit,
  p_notes text,
  p_room_id uuid,
  p_mission text,
  p_priority text,
  p_event_id uuid default null
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
  v_event uuid := p_event_id;
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

  -- Evento inexistente ou de outra casa vira "sem vínculo".
  if v_event is not null and not exists (
    select 1 from public.events e
    where e.id = v_event and e.home_id = p_home_id
  ) then
    v_event := null;
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

    -- Salvar de novo (duplo clique, reenvio) é idempotente: o MESMO evento pedindo o mesmo
    -- item que já está vinculado a ele não soma outra vez.
    if v_event is not null and v_existing.event_id is not distinct from v_event then
      return jsonb_build_object(
        'result', 'unchanged',
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
        category_id = coalesce(category_id, v_category),
        -- Soma nunca vincula, e soma de OUTRA origem desvincula: a quantidade deixa de
        -- ser só do evento, então excluí-lo (ou "remover" na edição) não pode apagá-la.
        -- O mesmo evento pedindo de novo mantém o vínculo.
        event_id = case when event_id is not distinct from v_event then event_id else null end
    where id = v_existing.id;

    return jsonb_build_object(
      'result', 'merged',
      'name', v_existing.name,
      'quantity', v_new_qty,
      'unit', v_existing.unit
    );
  end if;

  insert into public.shopping_items
    (home_id, name, category_id, quantity, unit, notes, room_id, is_purchased, mission, priority, event_id)
  values
    (p_home_id, btrim(p_name), v_category, p_quantity, p_unit, p_notes, p_room_id, false, p_mission, coalesce(p_priority, 'normal'), v_event)
  returning id into v_id;

  return jsonb_build_object('result', 'inserted', 'id', v_id);
end;
$$;

create or replace function public.delete_event_pending_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shopping_items
  where event_id = old.id and home_id = old.home_id and not is_purchased;
  return old;
end;
$$;
