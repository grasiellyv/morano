-- Índices que faltavam em colunas usadas em filtros .eq() e em joins/FKs (auditoria de performance).
-- `if not exists` + índices parciais onde a coluna é opcional (menores e mais baratos de manter).

-- getRotations filtra task_rotations por home_id (só tinha a PK).
create index if not exists task_rotations_home_id_idx on public.task_rotations (home_id);

-- Tarefas de um rodízio (FK sem índice: varredura completa a cada join/exclusão de rodízio).
create index if not exists tasks_rotation_id_idx on public.tasks (rotation_id) where rotation_id is not null;

-- FKs de compras sem índice: exclusão de categoria/cômodo varria a tabela inteira.
create index if not exists shopping_items_category_id_idx on public.shopping_items (category_id) where category_id is not null;
create index if not exists shopping_items_room_id_idx on public.shopping_items (room_id) where room_id is not null;
