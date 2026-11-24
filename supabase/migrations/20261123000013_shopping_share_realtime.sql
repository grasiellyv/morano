-- =============================================================================
-- MORANO — Compras: link público de visualização + tempo real
-- =============================================================================
-- 1) shopping_share_links: no máximo UM link ativo por casa. Desativar = apagar
--    a linha (o token deixa de existir). O token é gerado no banco (default),
--    nunca enviado pelo cliente.
-- 2) get_shared_shopping_list(token): única porta de entrada para visitantes sem
--    conta. SECURITY DEFINER e somente leitura; devolve só o necessário (nomes,
--    quantidades, categoria, primeiro nome de quem adicionou/comprou). Não expõe
--    ids, e-mails, notas, cômodos nem a casa além do nome.
-- 3) Realtime em shopping_items para os membros (a RLS vale para o realtime).
-- =============================================================================

create table public.shopping_share_links (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null unique references public.homes (id) on delete cascade,
  -- 2 × uuid v4 sem hífens = 64 hex (~244 bits aleatórios): não adivinhável.
  token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index shopping_share_links_created_by_idx on public.shopping_share_links (created_by);

revoke all on public.shopping_share_links from anon;
revoke all on public.shopping_share_links from authenticated;
grant select, delete on public.shopping_share_links to authenticated;
-- token, created_by e created_at ficam de fora: vêm de default.
grant insert (home_id) on public.shopping_share_links to authenticated;

alter table public.shopping_share_links enable row level security;

create policy shopping_share_links_select_member on public.shopping_share_links
  for select to authenticated using (public.is_home_member(home_id));
create policy shopping_share_links_insert_member on public.shopping_share_links
  for insert to authenticated with check (public.is_home_member(home_id));
create policy shopping_share_links_delete_member on public.shopping_share_links
  for delete to authenticated using (public.is_home_member(home_id));

-- -----------------------------------------------------------------------------
-- Leitura pública pelo token
-- -----------------------------------------------------------------------------
create function public.get_shared_shopping_list(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'home_name', h.name,
    'updated_at', (select max(i.updated_at) from public.shopping_items i where i.home_id = h.id),
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

revoke all on function public.get_shared_shopping_list(text) from public;
grant execute on function public.get_shared_shopping_list(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
-- DELETE só carrega a PK por padrão; com replica identity full o filtro
-- home_id=eq.<id> também vale para exclusões.
alter table public.shopping_items replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_items'
     ) then
    alter publication supabase_realtime add table public.shopping_items;
  end if;
end $$;
