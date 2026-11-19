-- =============================================================================
-- MORANO — Etapa 9B: Permissões granulares por membro
-- =============================================================================
-- Decisões de design:
--   * Sem registros = acesso pleno (allowlist vazia → tudo permitido).
--   * Owner/admin sempre bypass nos Server Actions; RLS cobre isolamento de residência.
--   * FKs em (home_id, user_id) com ON DELETE CASCADE — limpeza automática ao remover membro.
--   * Escrita nas três tabelas apenas por admin/owner via RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. home_member_permissions — booleanos de permissão por membro
-- -----------------------------------------------------------------------------
create table public.home_member_permissions (
  home_id               uuid    not null,
  user_id               uuid    not null,
  can_manage_tasks      boolean not null default true,
  can_complete_tasks    boolean not null default true,
  can_manage_shopping   boolean not null default true,
  can_purchase_shopping boolean not null default true,
  can_manage_events     boolean not null default true,
  primary key (home_id, user_id),
  foreign key (home_id, user_id)
    references public.home_members (home_id, user_id)
    on delete cascade
);

-- -----------------------------------------------------------------------------
-- 2. home_member_task_scopes — allowlist de cômodos para tarefas
--    Sem linhas = todos os cômodos permitidos.
-- -----------------------------------------------------------------------------
create table public.home_member_task_scopes (
  home_id uuid not null,
  user_id uuid not null,
  room_id uuid not null references public.rooms (id) on delete cascade,
  primary key (home_id, user_id, room_id),
  foreign key (home_id, user_id)
    references public.home_members (home_id, user_id)
    on delete cascade
);

-- -----------------------------------------------------------------------------
-- 3. home_member_shopping_scopes — allowlist de categorias para compras
--    Sem linhas = todas as categorias permitidas.
-- -----------------------------------------------------------------------------
create table public.home_member_shopping_scopes (
  home_id  uuid                     not null,
  user_id  uuid                     not null,
  category public.shopping_category not null,
  primary key (home_id, user_id, category),
  foreign key (home_id, user_id)
    references public.home_members (home_id, user_id)
    on delete cascade
);

-- -----------------------------------------------------------------------------
-- 4. Privilégios (antes de habilitar RLS)
-- -----------------------------------------------------------------------------
revoke all on public.home_member_permissions     from anon, authenticated;
revoke all on public.home_member_task_scopes     from anon, authenticated;
revoke all on public.home_member_shopping_scopes from anon, authenticated;

grant select, insert, update, delete on public.home_member_permissions     to authenticated;
grant select, insert, update, delete on public.home_member_task_scopes     to authenticated;
grant select, insert, update, delete on public.home_member_shopping_scopes to authenticated;

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
alter table public.home_member_permissions      enable row level security;
alter table public.home_member_task_scopes      enable row level security;
alter table public.home_member_shopping_scopes  enable row level security;

-- home_member_permissions
create policy hmp_select on public.home_member_permissions
  for select to authenticated
  using (public.is_home_member(home_id));

create policy hmp_insert on public.home_member_permissions
  for insert to authenticated
  with check (public.has_home_role(home_id, '{owner,admin}'));

create policy hmp_update on public.home_member_permissions
  for update to authenticated
  using  (public.has_home_role(home_id, '{owner,admin}'))
  with check (public.has_home_role(home_id, '{owner,admin}'));

create policy hmp_delete on public.home_member_permissions
  for delete to authenticated
  using (public.has_home_role(home_id, '{owner,admin}'));

-- home_member_task_scopes
create policy hmts_select on public.home_member_task_scopes
  for select to authenticated
  using (public.is_home_member(home_id));

create policy hmts_insert on public.home_member_task_scopes
  for insert to authenticated
  with check (public.has_home_role(home_id, '{owner,admin}'));

create policy hmts_update on public.home_member_task_scopes
  for update to authenticated
  using  (public.has_home_role(home_id, '{owner,admin}'))
  with check (public.has_home_role(home_id, '{owner,admin}'));

create policy hmts_delete on public.home_member_task_scopes
  for delete to authenticated
  using (public.has_home_role(home_id, '{owner,admin}'));

-- home_member_shopping_scopes
create policy hmss_select on public.home_member_shopping_scopes
  for select to authenticated
  using (public.is_home_member(home_id));

create policy hmss_insert on public.home_member_shopping_scopes
  for insert to authenticated
  with check (public.has_home_role(home_id, '{owner,admin}'));

create policy hmss_update on public.home_member_shopping_scopes
  for update to authenticated
  using  (public.has_home_role(home_id, '{owner,admin}'))
  with check (public.has_home_role(home_id, '{owner,admin}'));

create policy hmss_delete on public.home_member_shopping_scopes
  for delete to authenticated
  using (public.has_home_role(home_id, '{owner,admin}'));

-- -----------------------------------------------------------------------------
-- 6. RPC: get_member_permissions — permissões efetivas de um membro
--    Sempre retorna uma linha; defaults (tudo true) quando não há registro.
-- -----------------------------------------------------------------------------
create function public.get_member_permissions(p_target_user_id uuid)
returns table (
  can_manage_tasks      boolean,
  can_complete_tasks    boolean,
  can_manage_shopping   boolean,
  can_purchase_shopping boolean,
  can_manage_events     boolean,
  task_room_ids         uuid[],
  shopping_categories   public.shopping_category[]
)
language plpgsql
stable
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

  if not public.is_home_member(v_home_id) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  return query
  select
    coalesce(hmp.can_manage_tasks,      true),
    coalesce(hmp.can_complete_tasks,    true),
    coalesce(hmp.can_manage_shopping,   true),
    coalesce(hmp.can_purchase_shopping, true),
    coalesce(hmp.can_manage_events,     true),
    array(
      select ts.room_id
      from public.home_member_task_scopes ts
      where ts.home_id = v_home_id and ts.user_id = p_target_user_id
    ) as task_room_ids,
    array(
      select ss.category
      from public.home_member_shopping_scopes ss
      where ss.home_id = v_home_id and ss.user_id = p_target_user_id
    ) as shopping_categories
  from (select 1) _defaults
  left join public.home_member_permissions hmp
    on hmp.home_id = v_home_id and hmp.user_id = p_target_user_id;
end;
$$;

revoke execute on function public.get_member_permissions(uuid) from public, anon;
grant  execute on function public.get_member_permissions(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. RPC: set_member_permissions — define permissões de um membro (admin/owner)
--    * p_task_room_ids null = não altera; [] = remove todos; [ids] = substitui
--    * p_shopping_categories: mesma semântica
-- -----------------------------------------------------------------------------
create function public.set_member_permissions(
  p_target_user_id        uuid,
  p_can_manage_tasks      boolean                  default true,
  p_can_complete_tasks    boolean                  default true,
  p_can_manage_shopping   boolean                  default true,
  p_can_purchase_shopping boolean                  default true,
  p_can_manage_events     boolean                  default true,
  p_task_room_ids         uuid[]                   default null,
  p_shopping_categories   public.shopping_category[] default null
)
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

  if not public.has_home_role(v_home_id, '{owner,admin}') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if not exists (
    select 1 from public.home_members
    where home_id = v_home_id and user_id = p_target_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'member_not_found';
  end if;

  -- Upsert permissões booleanas
  insert into public.home_member_permissions (
    home_id, user_id,
    can_manage_tasks, can_complete_tasks,
    can_manage_shopping, can_purchase_shopping,
    can_manage_events
  )
  values (
    v_home_id, p_target_user_id,
    p_can_manage_tasks, p_can_complete_tasks,
    p_can_manage_shopping, p_can_purchase_shopping,
    p_can_manage_events
  )
  on conflict (home_id, user_id) do update set
    can_manage_tasks      = excluded.can_manage_tasks,
    can_complete_tasks    = excluded.can_complete_tasks,
    can_manage_shopping   = excluded.can_manage_shopping,
    can_purchase_shopping = excluded.can_purchase_shopping,
    can_manage_events     = excluded.can_manage_events;

  -- Task scopes: null → não altera; array vazio → remove todos; preenchido → substitui
  if p_task_room_ids is not null then
    delete from public.home_member_task_scopes
    where home_id = v_home_id and user_id = p_target_user_id;

    if cardinality(p_task_room_ids) > 0 then
      insert into public.home_member_task_scopes (home_id, user_id, room_id)
      select v_home_id, p_target_user_id, unnest(p_task_room_ids)
      on conflict do nothing;
    end if;
  end if;

  -- Shopping scopes: mesma semântica
  if p_shopping_categories is not null then
    delete from public.home_member_shopping_scopes
    where home_id = v_home_id and user_id = p_target_user_id;

    if cardinality(p_shopping_categories) > 0 then
      insert into public.home_member_shopping_scopes (home_id, user_id, category)
      select v_home_id, p_target_user_id, unnest(p_shopping_categories)
      on conflict do nothing;
    end if;
  end if;
end;
$$;

revoke execute on function public.set_member_permissions(uuid, boolean, boolean, boolean, boolean, boolean, uuid[], public.shopping_category[]) from public, anon;
grant  execute on function public.set_member_permissions(uuid, boolean, boolean, boolean, boolean, boolean, uuid[], public.shopping_category[]) to authenticated;
