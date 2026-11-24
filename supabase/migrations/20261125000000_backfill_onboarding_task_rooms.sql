-- Corrige tarefas do onboarding que ficaram SEM cômodo (bug: approveRoutine não gravava room_id),
-- o que fazia "Varrer o chão" da cozinha, da sala e do quarto parecerem a mesma tarefa repetida.
--
-- Conservador de propósito: só mexe em tarefas source = 'onboarding', ativas e sem cômodo, e só quando a
-- atribuição é EXATA — para um mesmo título e casa, o número dessas tarefas é igual ao número de cômodos
-- (primeiro de cada tipo) que o catálogo associa àquele título. As tarefas do onboarding foram criadas em
-- sequência na ordem do catálogo, então a n-ésima tarefa vai para o n-ésimo cômodo. Se a pessoa desmarcou
-- alguma sugestão na revisão, ou editou o título, a contagem não bate e a tarefa fica como está
-- (dá para escolher o cômodo ao editar a tarefa).
--
-- A função pode ser rodada de novo sem efeito (só toca em tarefas ainda sem cômodo) e não é chamável pelo app.

create or replace function public.backfill_onboarding_task_rooms()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  with catalog(title, room_type, ord) as (
    values
    ('Lavar louça', 'cozinha', 1),
    ('Varrer o chão', 'cozinha', 2),
    ('Limpar fogão', 'cozinha', 3),
    ('Limpar bancada e pia', 'cozinha', 4),
    ('Organizar geladeira', 'cozinha', 5),
    ('Limpar interior do micro-ondas', 'cozinha', 6),
    ('Varrer o chão', 'sala', 7),
    ('Passar aspirador', 'sala', 8),
    ('Limpar móveis com flanela', 'sala', 9),
    ('Limpar vidros e janelas', 'sala', 10),
    ('Organizar estantes e prateleiras', 'sala', 11),
    ('Arrumar a cama', 'quarto', 12),
    ('Passar aspirador', 'quarto', 13),
    ('Limpar móveis com flanela', 'quarto', 14),
    ('Trocar roupa de cama', 'quarto', 15),
    ('Organizar armário', 'quarto', 16),
    ('Limpar pia e espelho', 'banheiro', 17),
    ('Limpar vaso sanitário', 'banheiro', 18),
    ('Limpar chuveiro e box', 'banheiro', 19),
    ('Lavar piso com desinfetante', 'banheiro', 20),
    ('Limpar rejunte das paredes', 'banheiro', 21),
    ('Lavar roupas', 'lavanderia', 22),
    ('Dobrar e guardar roupas', 'lavanderia', 23),
    ('Limpar máquina de lavar', 'lavanderia', 24)
  ),
  first_rooms as (
    select distinct on (r.home_id, r.room_type) r.home_id, r.id as room_id, r.room_type::text as room_type
    from public.rooms r
    order by r.home_id, r.room_type, r.position, r.id
  ),
  cands as (
    select fr.home_id, c.title, fr.room_id,
           row_number() over (partition by fr.home_id, c.title order by c.ord) as rn,
           count(*)     over (partition by fr.home_id, c.title) as n
    from catalog c
    join first_rooms fr on fr.room_type = c.room_type
  ),
  pending as (
    select t.id, t.home_id, t.title,
           row_number() over (partition by t.home_id, t.title order by t.created_at, t.id) as rn,
           count(*)     over (partition by t.home_id, t.title) as n
    from public.tasks t
    where t.source = 'onboarding' and t.status = 'active' and t.room_id is null
  ),
  matched as (
    select p.id, c.room_id
    from pending p
    join cands c on c.home_id = p.home_id and c.title = p.title and c.rn = p.rn
    where p.n = c.n
  )
  update public.tasks t
  set room_id = m.room_id
  from matched m
  where t.id = m.id;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.backfill_onboarding_task_rooms() from public, anon, authenticated;

select public.backfill_onboarding_task_rooms();
