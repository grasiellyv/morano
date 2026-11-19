-- Adiciona contador cumulativo de ocorrências não geradas por política de inatividade
alter table public.routines
  add column ungenerated_count integer not null default 0
    check (ungenerated_count >= 0);

-- Permite que o cliente autenticado incremente o contador
grant update (ungenerated_count)
  on public.routines to authenticated;
