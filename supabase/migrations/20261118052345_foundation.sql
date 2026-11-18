-- =============================================================================
-- MORANO — Fundação: perfis, casas, membros, assinaturas, helpers de autorização
-- =============================================================================
-- Padrões que as próximas migrations seguem:
--   * RLS ligada em toda tabela; políticas sempre `to authenticated`.
--   * `anon` não recebe nenhum privilégio de tabela (defesa em profundidade).
--   * Colunas que o cliente não pode alterar (ids, FKs de dono, created_by,
--     created_at) ficam fora do GRANT de UPDATE por coluna.
--   * Helpers `security definer` com `set search_path = ''` e nomes qualificados.
--   * Políticas usam `(select auth.uid())` para o planner avaliar uma vez só.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.home_role as enum ('owner', 'admin', 'member');
create type public.property_type as enum ('apartamento', 'casa', 'sobrado', 'studio_kitnet', 'outro');
create type public.ownership_type as enum ('proprio', 'alugado', 'outro');
create type public.household_type as enum ('sozinho', 'casal', 'familia', 'compartilhada', 'outro');
create type public.routine_level as enum ('leve', 'equilibrada', 'detalhada');
create type public.subscription_plan as enum ('free', 'pro');
create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled');
create type public.subscription_provider as enum ('none', 'beta_grant', 'stripe', 'mercadopago');

-- -----------------------------------------------------------------------------
-- Funções genéricas de trigger
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Valida `timezone` contra a base IANA do Postgres. É trigger (e não CHECK)
-- porque consultar pg_timezone_names custa ~25 ms; assim só roda quando o
-- fuso muda, e não em todo UPDATE (ex.: profiles.last_seen_at).
create function public.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.timezone is distinct from old.timezone then
    if new.timezone is null
       or not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
      raise exception using
        errcode = '23514',
        message = 'invalid_timezone',
        detail = format('timezone %L is not a valid IANA name', new.timezone);
    end if;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text check (char_length(avatar_url) <= 2048),
  timezone text not null default 'America/Sao_Paulo',
  onboarding_step smallint not null default 0 check (onboarding_step >= 0),
  onboarding_completed boolean not null default false,
  marketing_opt_in boolean not null default false,
  current_home_id uuid, -- FK adicionada depois de `homes`
  last_seen_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  property_type public.property_type,
  ownership_type public.ownership_type,
  household_type public.household_type,
  resident_count smallint check (resident_count between 1 and 50),
  available_minutes_per_week integer check (available_minutes_per_week between 0 and 10080),
  routine_level public.routine_level,
  timezone text not null default 'America/Sao_Paulo',
  -- nullable só para sobreviver à exclusão da conta do criador (set null);
  -- a política de insert exige created_by = auth.uid().
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_current_home_id_fkey
  foreign key (current_home_id) references public.homes (id) on delete set null;

create table public.home_members (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.home_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (home_id, user_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status not null default 'active',
  provider public.subscription_provider not null default 'none',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de FK (home_members.home_id e subscriptions.user_id já são cobertos
-- pelos índices únicos, cuja primeira coluna é a FK).
create index profiles_current_home_id_idx on public.profiles (current_home_id);
create index homes_created_by_idx on public.homes (created_by);
create index home_members_user_id_idx on public.home_members (user_id);

-- Triggers de updated_at e fuso
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.homes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger validate_timezone before insert or update of timezone on public.profiles
  for each row execute function public.validate_timezone();
create trigger validate_timezone before insert or update of timezone on public.homes
  for each row execute function public.validate_timezone();

-- -----------------------------------------------------------------------------
-- Helpers de autorização
-- -----------------------------------------------------------------------------
-- security definer: leem home_members sem passar pela RLS (evita recursão).
-- Só respondem sobre o próprio chamador (auth.uid()), então não vazam dados
-- de terceiros mesmo recebendo ids arbitrários.
create function public.is_home_member(p_home_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_members m
    where m.home_id = p_home_id
      and m.user_id = (select auth.uid())
  );
$$;

create function public.has_home_role(p_home_id uuid, p_roles public.home_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_members m
    where m.home_id = p_home_id
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

-- Consistência de FKs entre casas. É security INVOKER de propósito: rodando
-- com os privilégios do usuário, uma linha de outra casa é invisível pela RLS
-- e cai no mesmo erro — a função não serve de oráculo sobre dados alheios.
-- Com service role (sem RLS) a checagem continua valendo.
create function public.ensure_same_home(p_home_id uuid, p_table regclass, p_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_home_id uuid;
begin
  if p_id is null then
    return;
  end if;

  execute format('select home_id from %s where id = $1', p_table)
    into v_home_id
    using p_id;

  -- null = linha inexistente ou invisível para quem chama.
  if v_home_id is null or v_home_id is distinct from p_home_id then
    raise exception using
      errcode = 'P0001',
      message = 'cross_home_reference',
      detail = format('%s %s does not belong to home %s', p_table, p_id, p_home_id);
  end if;
end;
$$;

-- Plano efetivo. security definer porque os triggers de limite (Task 6)
-- consultam o plano do owner da casa, cuja linha de subscriptions o membro
-- não enxerga. Para não virar oráculo, um usuário autenticado só consulta a
-- si mesmo ou alguém com quem divide uma casa.
create function public.current_plan(p_user_id uuid)
returns public.subscription_plan
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is not null
     and p_user_id is distinct from v_uid
     and not exists (
       select 1
       from public.home_members me
       join public.home_members other on other.home_id = me.home_id
       where me.user_id = v_uid
         and other.user_id = p_user_id
     ) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan = 'pro'
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) then
    return 'pro';
  end if;
  return 'free';
end;
$$;

-- -----------------------------------------------------------------------------
-- Triggers de ciclo de vida
-- -----------------------------------------------------------------------------
-- Cadastro: cria profile + assinatura beta. raw_user_meta_data vem do cliente,
-- então só lemos full_name (truncado) e o aceite dos termos.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, terms_accepted_at)
  values (
    new.id,
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 120), ''),
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() end
  );

  insert into public.subscriptions (user_id, plan, status, provider, current_period_start, current_period_end)
  values (new.id, 'pro', 'active', 'beta_grant', now(), null);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nova casa: criador vira owner e, se não tiver casa ativa, ela vira a atual.
create function public.handle_new_home()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.home_members (home_id, user_id, role)
    values (new.id, new.created_by, 'owner');

    update public.profiles
    set current_home_id = new.id
    where id = new.created_by
      and current_home_id is null;
  end if;
  return new;
end;
$$;

create trigger on_home_created
  after insert on public.homes
  for each row execute function public.handle_new_home();

-- Saiu da casa: limpa a casa ativa que apontava para ela.
create function public.handle_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set current_home_id = null
  where id = old.user_id
    and current_home_id = old.home_id;
  return old;
end;
$$;

create trigger on_home_member_removed
  after delete on public.home_members
  for each row execute function public.handle_member_removed();

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
-- O Supabase concede ALL em tabelas/funções de public para anon e
-- authenticated via default privileges. Aqui fechamos o que não é necessário.
revoke all on public.profiles, public.homes, public.home_members, public.subscriptions from anon;
revoke all on public.profiles, public.homes, public.home_members, public.subscriptions from authenticated;

-- profiles: lê o próprio; edita só colunas de preferência. Sem insert/delete
-- (o trigger cria; a exclusão vem em cascata do auth.users). terms_accepted_at
-- não é editável pelo cliente — aceite tardio (ex.: OAuth) deve ir por RPC.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, timezone, onboarding_step, onboarding_completed,
              marketing_opt_in, current_home_id, last_seen_at)
  on public.profiles to authenticated;

-- homes: id/created_at/updated_at nunca vêm do cliente; created_by só pode
-- ser o próprio usuário (política homes_insert_self) e é imutável depois.
grant select, delete on public.homes to authenticated;
grant insert (name, property_type, ownership_type, household_type, resident_count,
              available_minutes_per_week, routine_level, timezone, created_by)
  on public.homes to authenticated;
grant update (name, property_type, ownership_type, household_type, resident_count,
              available_minutes_per_week, routine_level, timezone)
  on public.homes to authenticated;

-- home_members: sem insert (ver políticas); só o papel é editável;
-- home_id/user_id nunca mudam.
grant select, delete on public.home_members to authenticated;
grant update (role) on public.home_members to authenticated;

-- subscriptions: somente leitura; escrita só via service role (webhooks).
grant select on public.subscriptions to authenticated;

-- Funções: nada para anon; triggers não são chamáveis por ninguém do cliente.
revoke execute on function public.is_home_member(uuid) from public, anon;
revoke execute on function public.has_home_role(uuid, public.home_role[]) from public, anon;
revoke execute on function public.ensure_same_home(uuid, regclass, uuid) from public, anon;
revoke execute on function public.current_plan(uuid) from public, anon;
grant execute on function public.is_home_member(uuid) to authenticated, service_role;
grant execute on function public.has_home_role(uuid, public.home_role[]) to authenticated, service_role;
grant execute on function public.ensure_same_home(uuid, regclass, uuid) to authenticated, service_role;
grant execute on function public.current_plan(uuid) to authenticated, service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_home() from public, anon, authenticated;
revoke execute on function public.handle_member_removed() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_timezone() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.subscriptions enable row level security;

-- profiles ---------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- current_home_id só pode apontar para uma casa da qual o usuário é membro.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (current_home_id is null or public.is_home_member(current_home_id))
  );

-- homes ------------------------------------------------------------------------
-- `or created_by = auth.uid()` permite `insert ... returning`: a política de
-- select é checada no momento do insert, antes do trigger criar o owner.
create policy homes_select_member on public.homes
  for select to authenticated
  using (public.is_home_member(id) or created_by = (select auth.uid()));

create policy homes_insert_self on public.homes
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy homes_update_admin on public.homes
  for update to authenticated
  using (public.has_home_role(id, '{owner,admin}'))
  with check (public.has_home_role(id, '{owner,admin}'));

create policy homes_delete_owner on public.homes
  for delete to authenticated
  using (public.has_home_role(id, '{owner}'));

-- home_members -----------------------------------------------------------------
create policy home_members_select_member on public.home_members
  for select to authenticated
  using (public.is_home_member(home_id));

-- Sem INSERT pelo cliente: memberships nascem só do trigger on_home_created
-- (security definer) até existir um fluxo de convite com consentimento (v1.5).
-- Adicionar qualquer uuid sem consentimento abriria um oráculo de
-- current_plan e "lavagem" de plano nos limites da Task 6.
-- owner/admin gerenciam; só owner concede (ou mexe em) papel owner.
create policy home_members_update_admin on public.home_members
  for update to authenticated
  using (
    public.has_home_role(home_id, '{owner}')
    or (public.has_home_role(home_id, '{admin}') and role <> 'owner')
  )
  with check (
    public.has_home_role(home_id, '{owner}')
    or (public.has_home_role(home_id, '{admin}') and role <> 'owner')
  );

create policy home_members_delete_admin on public.home_members
  for delete to authenticated
  using (
    public.has_home_role(home_id, '{owner}')
    or (public.has_home_role(home_id, '{admin}') and role <> 'owner')
  );

-- subscriptions ----------------------------------------------------------------
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));
