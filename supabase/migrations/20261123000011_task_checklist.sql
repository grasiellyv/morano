-- Rotina: subtarefas (checklist) de uma tarefa.
--
-- task_checklist_items  = os itens da tarefa (valem para todas as ocorrências).
-- occurrence_checklist_states = o que foi feito/pulado em UMA ocorrência.
--   Sem linha = item em aberto. Como o estado é por ocorrência, pular um item
--   hoje não afeta amanhã: a próxima ocorrência começa com a checklist limpa.

create table public.task_checklist_items (
  id         uuid        primary key default gen_random_uuid(),
  task_id    uuid        not null references public.tasks (id) on delete cascade,
  home_id    uuid        not null references public.homes (id) on delete cascade,
  title      text        not null check (char_length(btrim(title)) between 1 and 120),
  position   int         not null default 0,
  created_at timestamptz not null default now()
);

create index task_checklist_items_task_id_idx on public.task_checklist_items (task_id, position);
create index task_checklist_items_home_id_idx on public.task_checklist_items (home_id);

create table public.occurrence_checklist_states (
  occurrence_id uuid        not null references public.task_occurrences (id) on delete cascade,
  item_id       uuid        not null references public.task_checklist_items (id) on delete cascade,
  home_id       uuid        not null references public.homes (id) on delete cascade,
  status        text        not null check (status in ('done', 'skipped')),
  updated_by    uuid        default auth.uid() references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (occurrence_id, item_id)
);

create index occurrence_checklist_states_item_id_idx on public.occurrence_checklist_states (item_id);
create index occurrence_checklist_states_home_id_idx on public.occurrence_checklist_states (home_id);

alter table public.task_checklist_items enable row level security;
alter table public.occurrence_checklist_states enable row level security;

-- Itens: membros da casa leem e escrevem; a tarefa precisa ser da mesma casa.
create policy checklist_items_select_member on public.task_checklist_items
  for select to authenticated
  using (public.is_home_member(home_id));

create policy checklist_items_write_member on public.task_checklist_items
  for all to authenticated
  using (public.is_home_member(home_id))
  with check (
    public.is_home_member(home_id)
    and exists (
      select 1 from public.tasks t
      where t.id = task_checklist_items.task_id and t.home_id = task_checklist_items.home_id
    )
  );

-- Estados: ocorrência e item precisam ser da mesma casa e da mesma tarefa.
create policy checklist_states_select_member on public.occurrence_checklist_states
  for select to authenticated
  using (public.is_home_member(home_id));

create policy checklist_states_write_member on public.occurrence_checklist_states
  for all to authenticated
  using (public.is_home_member(home_id))
  with check (
    public.is_home_member(home_id)
    and exists (
      select 1
      from public.task_occurrences o
      join public.task_checklist_items i on i.task_id = o.task_id
      where o.id = occurrence_checklist_states.occurrence_id
        and i.id = occurrence_checklist_states.item_id
        and o.home_id = occurrence_checklist_states.home_id
    )
  );

grant select, delete on public.task_checklist_items, public.occurrence_checklist_states to authenticated;
grant insert (task_id, home_id, title, position) on public.task_checklist_items to authenticated;
grant update (title, position) on public.task_checklist_items to authenticated;
grant insert (occurrence_id, item_id, home_id, status, updated_at, updated_by) on public.occurrence_checklist_states to authenticated;
grant update (status, updated_at, updated_by) on public.occurrence_checklist_states to authenticated;
