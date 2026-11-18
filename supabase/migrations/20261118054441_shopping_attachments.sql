-- =============================================================================
-- MORANO — Compras, anexos e Storage (bucket privado home-files)
-- =============================================================================
-- Segue os padrões da fundação, rotina e manutenção: RLS por membro da casa,
-- GRANT por coluna (id, home_id, created_by/uploaded_by, created_at e colunas
-- derivadas por trigger nunca são graváveis pelo cliente) e consistência de FKs
-- entre casas por trigger. Limite de plano para anexos (PRO) vem na Task 6.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.shopping_category as enum
  ('limpeza', 'higiene', 'cozinha', 'lavanderia', 'alimentacao', 'outros');
create type public.shopping_unit as enum ('un', 'kg', 'g', 'l', 'ml', 'pacote', 'caixa');
create type public.attachment_kind as enum ('photo', 'document');

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category public.shopping_category not null default 'outros',
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit public.shopping_unit not null default 'un',
  is_purchased boolean not null default false,
  -- Mantidos por trigger a partir de is_purchased; não são do cliente.
  purchased_at timestamptz,
  purchased_by uuid references public.profiles (id) on delete set null,
  -- Origem opcional (problema que gerou a compra).
  issue_id uuid references public.home_issues (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  appliance_id uuid references public.appliances (id) on delete cascade,
  maintenance_id uuid references public.maintenance_records (id) on delete cascade,
  issue_id uuid references public.home_issues (id) on delete cascade,
  kind public.attachment_kind not null,
  -- {home_id}/{attachment_id}/{nome-sanitizado}; o prefixo é validado por trigger.
  file_path text not null check (char_length(file_path) <= 512),
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(appliance_id, maintenance_id, issue_id) = 1)
);

create index shopping_items_home_purchased_idx
  on public.shopping_items (home_id, is_purchased, created_at desc);
create index shopping_items_issue_id_idx on public.shopping_items (issue_id);
create index shopping_items_purchased_by_idx on public.shopping_items (purchased_by);
create index shopping_items_created_by_idx on public.shopping_items (created_by);
create index attachments_home_id_idx on public.attachments (home_id);
create index attachments_appliance_id_idx on public.attachments (appliance_id);
create index attachments_maintenance_id_idx on public.attachments (maintenance_id);
create index attachments_issue_id_idx on public.attachments (issue_id);
create index attachments_uploaded_by_idx on public.attachments (uploaded_by);
create unique index attachments_file_path_key on public.attachments (file_path);

-- -----------------------------------------------------------------------------
-- Helper de Storage
-- -----------------------------------------------------------------------------
-- Casa dona de um objeto, a partir do primeiro segmento do caminho. Devolve null
-- (nunca erro) para qualquer caminho fora do formato canônico:
--   <uuid minúsculo com hífens>/<segmentos não vazios, sem "." nem "..", sem "\">
-- Rejeita maiúsculas, espaços, chaves, uuid sem hífens, barra inicial, segmentos
-- vazios e traversal, para que a policy e o check de attachments.file_path
-- concordem e não haja duas grafias da mesma casa. A policy faz
-- is_home_member(null) = false.
create function public.storage_home_id(p_name text)
returns uuid
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/\\]+(/[^/\\]+)*$'
      and p_name !~ '(^|/)\.\.?(/|$)'
    then substr(p_name, 1, 36)::uuid
  end;
$$;

revoke execute on function public.storage_home_id(text) from public, anon;
grant execute on function public.storage_home_id(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.shopping_items
  for each row execute function public.set_updated_at();

create function public.shopping_items_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.home_issues', new.issue_id);
  return new;
end;
$$;
create trigger check_same_home before insert or update of home_id, issue_id on public.shopping_items
  for each row execute function public.shopping_items_check_same_home();

-- purchased_at/purchased_by acompanham is_purchased: preenchidos ao marcar,
-- limpos ao desmarcar. Security invoker: auth.uid() lê o JWT do chamador.
create function public.shopping_items_set_purchased()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.is_purchased is distinct from old.is_purchased then
    if new.is_purchased then
      new.purchased_at := now();
      new.purchased_by := (select auth.uid());
    else
      new.purchased_at := null;
      new.purchased_by := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger set_purchased before insert or update of is_purchased on public.shopping_items
  for each row execute function public.shopping_items_set_purchased();

-- attachments: o pai (um dos três) tem que ser da mesma casa; o caminho no
-- Storage tem que estar sob o prefixo da própria casa.
create function public.attachments_check_same_home()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_same_home(new.home_id, 'public.appliances', new.appliance_id);
  perform public.ensure_same_home(new.home_id, 'public.maintenance_records', new.maintenance_id);
  perform public.ensure_same_home(new.home_id, 'public.home_issues', new.issue_id);

  -- storage_home_id exige o formato canônico (sem traversal, maiúsculas etc.) e
  -- ao menos um segmento depois do prefixo.
  if public.storage_home_id(new.file_path) is distinct from new.home_id then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_file_path',
      detail = format('file_path must start with %s/', new.home_id);
  end if;
  return new;
end;
$$;
create trigger check_same_home
  before insert or update of home_id, appliance_id, maintenance_id, issue_id, file_path on public.attachments
  for each row execute function public.attachments_check_same_home();

revoke execute on function public.shopping_items_check_same_home() from public, anon, authenticated;
revoke execute on function public.shopping_items_set_purchased() from public, anon, authenticated;
revoke execute on function public.attachments_check_same_home() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.shopping_items, public.attachments from anon;
revoke all on public.shopping_items, public.attachments from authenticated;

grant select, delete on public.shopping_items, public.attachments to authenticated;

grant insert (home_id, name, category, quantity, unit, is_purchased, issue_id)
  on public.shopping_items to authenticated;
grant update (name, category, quantity, unit, is_purchased, issue_id)
  on public.shopping_items to authenticated;

-- uploaded_by e file_path (fixo depois do insert) ficam fora do update. Trocar de
-- pai dentro da mesma casa é permitido; o trigger barra casas diferentes.
grant insert (home_id, appliance_id, maintenance_id, issue_id, kind, file_path, file_name, mime_type, size_bytes)
  on public.attachments to authenticated;
grant update (appliance_id, maintenance_id, issue_id, file_name)
  on public.attachments to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.shopping_items enable row level security;
alter table public.attachments enable row level security;

create policy shopping_items_select_member on public.shopping_items
  for select to authenticated using (public.is_home_member(home_id));
create policy shopping_items_insert_member on public.shopping_items
  for insert to authenticated with check (public.is_home_member(home_id));
create policy shopping_items_update_member on public.shopping_items
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy shopping_items_delete_member on public.shopping_items
  for delete to authenticated using (public.is_home_member(home_id));

create policy attachments_select_member on public.attachments
  for select to authenticated using (public.is_home_member(home_id));
create policy attachments_insert_member on public.attachments
  for insert to authenticated with check (public.is_home_member(home_id));
create policy attachments_update_member on public.attachments
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy attachments_delete_member on public.attachments
  for delete to authenticated using (public.is_home_member(home_id));

-- -----------------------------------------------------------------------------
-- Storage: bucket privado e policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'home-files', 'home-files', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage_home_id(name) é null para caminho malformado => is_home_member(null)
-- é false (sem erro). No update, with check vale para o NOVO name: mover um
-- objeto só é possível entre casas das quais o usuário é membro.
create policy home_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'home-files' and public.is_home_member(public.storage_home_id(name)));
create policy home_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'home-files' and public.is_home_member(public.storage_home_id(name)));
create policy home_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'home-files' and public.is_home_member(public.storage_home_id(name)))
  with check (bucket_id = 'home-files' and public.is_home_member(public.storage_home_id(name)));
create policy home_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'home-files' and public.is_home_member(public.storage_home_id(name)));
