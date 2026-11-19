-- Melhoria C: classificação de tarefas essenciais
ALTER TABLE tasks ADD COLUMN is_essential boolean NOT NULL DEFAULT false;
