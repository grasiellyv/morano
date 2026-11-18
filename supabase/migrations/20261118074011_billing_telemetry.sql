-- =============================================================================
-- MORANO — Limites do plano, telemetria própria, push e log de exclusão
-- =============================================================================
-- Segue os padrões das migrations anteriores: RLS em toda tabela, revoke-all
-- seguido de GRANT por coluna, `(select auth.uid())` nas políticas, funções
-- com `search_path = ''` e EXECUTE revogado onde o cliente não deve chamar.
--
-- Limites (spec §11, decisão A do dono): aplicados SÓ em before insert (e na
-- reativação de tarefa / desarquivamento de equipamento, que ocupam uma vaga
-- nova). Nunca em select/update/delete: ao cair para free, tudo continua
-- legível e editável; só não dá para criar acima do limite.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- plan_limits: espelho SQL de src/constants/plans.ts (null = ilimitado)
-- -----------------------------------------------------------------------------
create function public.plan_limits(p_plan public.subscription_plan)
returns table (max_homes int, max_active_tasks int, max_appliances int, attachments_allowed boolean)
language sql
immutable
set search_path = ''
as $$
  select
    case p_plan when 'free' then 1 end,
    case p_plan when 'free' then 40 end,
    case p_plan when 'free' then 5 end,
    p_plan = 'pro';
$$;

-- -----------------------------------------------------------------------------
-- Plano efetivo (helpers INTERNOS: nenhum cliente executa)
-- -----------------------------------------------------------------------------
-- public.current_plan (fundação) tem um guard que só responde sobre si mesmo ou
-- um co-membro, então não serve aos triggers de limite (o plano relevante é o
-- do CRIADOR da casa, e quem insere pode ser qualquer membro). Estes dois são
-- a mesma consulta sem o guard e por isso ficam fechados para anon/authenticated:
-- só triggers `security definer` (dono = postgres) e service_role os chamam.
-- Sem EXECUTE para o cliente não existe oráculo de plano alheio.
create function public.plan_of_user(p_user_id uuid)
returns public.subscription_plan
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
      from public.subscriptions s
      where s.user_id = p_user_id
        and s.plan = 'pro'
        and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end > now())
    ) then 'pro'::public.subscription_plan
    else 'free'::public.subscription_plan
  end;
$$;

-- Plano da casa = plano de quem a CRIOU (homes.created_by), e não de qualquer
-- linha home_members com papel owner: papéis podem ser reatribuídos, e ligar o
-- limite a eles permitiria "lavar" o plano promovendo um membro PRO a owner.
-- created_by nulo (criador excluiu a conta) ou casa inexistente => free.
create function public.home_owner_plan(p_home_id uuid)
returns public.subscription_plan
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select public.plan_of_user(h.created_by) from public.homes h where h.id = p_home_id),
    'free'::public.subscription_plan
  );
$$;

revoke execute on function public.plan_of_user(uuid) from public, anon, authenticated;
revoke execute on function public.home_owner_plan(uuid) from public, anon, authenticated;
grant execute on function public.plan_of_user(uuid) to service_role;
grant execute on function public.home_owner_plan(uuid) to service_role;
revoke execute on function public.plan_limits(public.subscription_plan) from public, anon;
grant execute on function public.plan_limits(public.subscription_plan) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Triggers de limite (security definer: contam linhas e consultam o plano do
-- criador sem passar pela RLS)
-- -----------------------------------------------------------------------------
-- Em before-insert o WITH CHECK da RLS ainda não rodou. Para um não-membro não
-- virar sonda de "esta casa está cheia / é free", os triggers de conteúdo
-- levantam 42501 'forbidden' (o mesmo código que o cliente veria da RLS) quando
-- há usuário logado que não é membro, antes de olhar contagem ou plano.
-- (auth.uid() nulo = service role/postgres: a regra vale sem checagem de membro.)

create function public.plan_limit_homes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := coalesce((select auth.uid()), new.created_by);
  v_max int;
begin
  if v_uid is null then
    return new;
  end if;

  select l.max_homes into v_max from public.plan_limits(public.plan_of_user(v_uid)) l;

  if v_max is not null
     and (select count(*) from public.homes h where h.created_by = v_uid) >= v_max then
    raise exception using errcode = 'P0001', message = 'plan_limit_homes',
      detail = format('plan allows %s home(s)', v_max);
  end if;
  return new;
end;
$$;
create trigger plan_limit before insert on public.homes
  for each row execute function public.plan_limit_homes();

-- Vaga nova = insert ativo, ou update de não-ativa (paused/archived) para ativa.
-- Sem isso, inserir 'paused' e depois ativar contornaria o limite.
create function public.plan_limit_tasks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max int;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'active' then
      return new;
    end if;
  elsif not (new.status = 'active' and old.status <> 'active') then
    return new;
  end if;

  if (select auth.uid()) is not null and not public.is_home_member(new.home_id) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select l.max_active_tasks into v_max
  from public.plan_limits(public.home_owner_plan(new.home_id)) l;

  if v_max is not null
     and (select count(*) from public.tasks t
          where t.home_id = new.home_id and t.status = 'active') >= v_max then
    raise exception using errcode = 'P0001', message = 'plan_limit_tasks',
      detail = format('plan allows %s active task(s) per home', v_max);
  end if;
  return new;
end;
$$;
create trigger plan_limit before insert or update of status on public.tasks
  for each row execute function public.plan_limit_tasks();

-- Vaga nova = insert não arquivado, ou desarquivar (archived_at -> null).
create function public.plan_limit_appliances()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max int;
begin
  if tg_op = 'INSERT' then
    if new.archived_at is not null then
      return new;
    end if;
  elsif not (old.archived_at is not null and new.archived_at is null) then
    return new;
  end if;

  if (select auth.uid()) is not null and not public.is_home_member(new.home_id) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select l.max_appliances into v_max
  from public.plan_limits(public.home_owner_plan(new.home_id)) l;

  if v_max is not null
     and (select count(*) from public.appliances a
          where a.home_id = new.home_id and a.archived_at is null) >= v_max then
    raise exception using errcode = 'P0001', message = 'plan_limit_appliances',
      detail = format('plan allows %s active appliance(s) per home', v_max);
  end if;
  return new;
end;
$$;
create trigger plan_limit before insert or update of archived_at on public.appliances
  for each row execute function public.plan_limit_appliances();

create function public.plan_limit_attachments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean;
begin
  if (select auth.uid()) is not null and not public.is_home_member(new.home_id) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select l.attachments_allowed into v_allowed
  from public.plan_limits(public.home_owner_plan(new.home_id)) l;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'plan_limit_attachments',
      detail = 'attachments require the pro plan';
  end if;
  return new;
end;
$$;
create trigger plan_limit before insert on public.attachments
  for each row execute function public.plan_limit_attachments();

revoke execute on function public.plan_limit_homes() from public, anon, authenticated;
revoke execute on function public.plan_limit_tasks() from public, anon, authenticated;
revoke execute on function public.plan_limit_appliances() from public, anon, authenticated;
revoke execute on function public.plan_limit_attachments() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 2048),
  p256dh text not null check (char_length(p256dh) <= 512),
  auth text not null check (char_length(auth) <= 512),
  user_agent text check (char_length(user_agent) <= 512),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- Telemetria própria, sem conteúdo pessoal. O dono lê pelo painel/SQL (service
-- role); o cliente só escreve. Some junto com o usuário (LGPD); a casa excluída
-- só desvincula o evento.
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  home_id uuid references public.homes (id) on delete set null,
  event_name text not null check (event_name ~ '^[a-z_]{3,50}$'),
  created_at timestamptz not null default now()
);

create table public.pro_interest (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  price_option text not null check (price_option in ('mensal', 'anual')),
  created_at timestamptz not null default now(),
  unique (user_id, price_option)
);

-- Comprovação LGPD: data + referência anônima, nenhum dado pessoal. Só service role.
create table public.account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  anonymized_ref uuid not null
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index product_events_user_id_idx on public.product_events (user_id);
create index product_events_home_id_idx on public.product_events (home_id);
create index product_events_name_created_idx on public.product_events (event_name, created_at);

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.push_subscriptions, public.product_events,
              public.pro_interest, public.account_deletion_log from anon;
revoke all on public.push_subscriptions, public.product_events,
              public.pro_interest, public.account_deletion_log from authenticated;

grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth, user_agent) on public.push_subscriptions to authenticated;
grant update (p256dh, auth, user_agent, last_used_at) on public.push_subscriptions to authenticated;

-- product_events: insert-only. SELECT é concedido, mas sem política a RLS devolve
-- 0 linhas ("select retorna vazio" em vez de erro). `insert ... returning`
-- falha com 42501, pois as políticas de SELECT também valem para o RETURNING:
-- o cliente deve inserir sem `.select()`. Sem update/delete.
grant select on public.product_events to authenticated;
grant insert (user_id, home_id, event_name) on public.product_events to authenticated;

grant select on public.pro_interest to authenticated;
grant insert (user_id, price_option) on public.pro_interest to authenticated;

-- account_deletion_log: nenhum privilégio para clientes.

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;
alter table public.product_events enable row level security;
alter table public.pro_interest enable row level security;
alter table public.account_deletion_log enable row level security;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Sem política de select em product_events (de propósito).
create policy product_events_insert_own on public.product_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (home_id is null or public.is_home_member(home_id))
  );

create policy pro_interest_select_own on public.pro_interest
  for select to authenticated using (user_id = (select auth.uid()));
create policy pro_interest_insert_own on public.pro_interest
  for insert to authenticated with check (user_id = (select auth.uid()));

-- account_deletion_log: RLS ligada e nenhuma política.

-- -----------------------------------------------------------------------------
-- Storage: upload só em casa cujo criador é PRO
-- -----------------------------------------------------------------------------
-- Sem isto, um free subiria arquivos direto no bucket (só a linha em
-- attachments era barrada). security definer porque lê o plano do criador;
-- responde false para quem não é membro, então só informa sobre a própria casa.
-- Select/update/delete do bucket seguem livres: ao cair para free os arquivos
-- continuam visíveis e baixáveis (decisão A).
create function public.home_allows_attachments(p_home_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.is_home_member(p_home_id)
    and (select l.attachments_allowed
         from public.plan_limits(public.home_owner_plan(p_home_id)) l),
    false
  );
$$;

revoke execute on function public.home_allows_attachments(uuid) from public, anon;
grant execute on function public.home_allows_attachments(uuid) to authenticated, service_role;

drop policy if exists home_files_insert on storage.objects;
create policy home_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'home-files'
    and public.is_home_member(public.storage_home_id(name))
    and public.home_allows_attachments(public.storage_home_id(name))
  );
