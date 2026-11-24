-- =============================================================================
-- MORANO — Animais da casa
-- =============================================================================
-- Mesmo padrão das demais tabelas: RLS por membro da casa e GRANT por coluna
-- (id, created_by, created_at e updated_at nunca são graváveis pelo cliente).
-- =============================================================================

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  species text not null default 'outro'
    check (species in ('cachorro', 'gato', 'passaro', 'peixe', 'roedor', 'outro')),
  -- Cuidados e necessidades (ração, remédio, passeio…).
  notes text check (char_length(notes) <= 500),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pets_home_id_idx on public.pets (home_id);
create index pets_created_by_idx on public.pets (created_by);

create trigger set_updated_at before update on public.pets
  for each row execute function public.set_updated_at();

revoke all on public.pets from anon;
revoke all on public.pets from authenticated;
grant select, delete on public.pets to authenticated;
grant insert (home_id, name, species, notes) on public.pets to authenticated;
grant update (name, species, notes) on public.pets to authenticated;

alter table public.pets enable row level security;

create policy pets_select_member on public.pets
  for select to authenticated using (public.is_home_member(home_id));
create policy pets_insert_member on public.pets
  for insert to authenticated with check (public.is_home_member(home_id));
create policy pets_update_member on public.pets
  for update to authenticated
  using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));
create policy pets_delete_member on public.pets
  for delete to authenticated using (public.is_home_member(home_id));
