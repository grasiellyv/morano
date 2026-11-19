-- Melhoria A: atribuição de ocorrências de tarefa a um membro
ALTER TABLE task_occurrences
  ADD COLUMN assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX task_occurrences_assigned_to_idx ON public.task_occurrences (assigned_to);
