-- Rotina: horário opcional da tarefa (prazo dentro do dia).
-- Agrupa a visão diária em Manhã / Tarde / Noite. Nulo = "a qualquer hora".
alter table public.tasks add column if not exists due_time time;

grant insert (due_time), update (due_time) on public.tasks to authenticated;
