# Rodízio Semanal — Design

**Data:** 2026-11-20
**Pré-requisito:** Melhoria A (assigned_to / "eu pego") — já mergeada em main.

---

## Objetivo

Permitir que membros de uma residência configurem rodízios semanais de tarefas: grupos nomeados com participantes selecionados e sequência definida manualmente, que trocam de responsável automaticamente em um dia fixo da semana.

---

## Comportamento esperado

### Grupos de rodízio

- Cada rodízio é uma entidade independente com **nome próprio** (ex: "Lavar louça", "Aspirar a casa").
- Um grupo de rodízio define:
  - Nome (1–100 caracteres)
  - Dia da semana em que a troca acontece (0 = domingo … 6 = sábado)
  - Lista ordenada de participantes (seleção manual entre membros da casa)
  - Sequência de rotação (ordem definida manualmente pelo configurador)

### Tarefas em rodízio

- Uma tarefa pode ser associada a um grupo de rodízio.
- Várias tarefas podem pertencer ao mesmo grupo (compartilham a mesma sequência de responsáveis).
- Uma tarefa sem rodízio se comporta normalmente.

### Troca automática

- A troca acontece no **dia fixo configurado**, independentemente de a tarefa ter sido concluída.
- Mecanismo: **avaliação lazy** — ao buscar os dados da rotina, o servidor verifica se o dia de troca já passou desde a última troca registrada. Se sim, avança o índice e persiste.
- Não requer job em background ou cron job externo.

### Membros ausentes

- Se o membro da vez estiver em modo ausência, o sistema **pula automaticamente** para o próximo participante disponível na sequência (sem persistir o pulo — o índice oficial só avança no dia de troca).
- Se todos os participantes estiverem ausentes, a tarefa fica sem responsável naquela semana.

### Membro sai da casa

- Ao sair da residência (perfil removido via `home_members`), o membro é **automaticamente removido** de todos os grupos de rodízio da casa.
- Se o índice atual apontava para esse membro, avança para o próximo disponível na nova sequência.
- Os rodízios continuam ativos sem interrupção.

### Novo membro entra na casa

- Novos membros **não são adicionados automaticamente** a nenhum rodízio.
- Um membro com permissão `can_manage_tasks` precisa adicioná-lo manualmente.

---

## Interface

### Configuração (dentro da edição da tarefa)

- Painel dedicado "Rodízio" na tela de edição de tarefa.
- Opções:
  - Associar a um grupo existente (select/dropdown dos rodízios da casa)
  - Criar novo grupo (nome, dia da semana, participantes e ordem)
  - Remover tarefa do rodízio atual

### Gerenciar grupos (mesmo painel ou modal)

- Listar grupos existentes
- Editar nome, dia da semana, participantes e ordem
- Excluir grupo (as tarefas associadas ficam sem rodízio)

### Exibição na rotina diária

- O responsável da vez é exibido normalmente (igual a qualquer tarefa atribuída — via Melhoria A).
- Um **indicador visual discreto** (ícone ou badge) sinaliza que a tarefa faz parte de um rodízio.
- Ao passar o cursor/tocar no indicador: nome do grupo de rodízio e quem é o próximo.

---

## Modelo de dados (proposta)

```sql
-- Grupos de rodízio
CREATE TABLE task_rotations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id       uuid        NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  rotation_day  smallint    NOT NULL CHECK (rotation_day BETWEEN 0 AND 6), -- 0=dom, 6=sáb
  current_member_index int  NOT NULL DEFAULT 0,
  last_rotated_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Participantes do rodízio (ordem manual)
CREATE TABLE task_rotation_members (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_id  uuid    NOT NULL REFERENCES task_rotations(id) ON DELETE CASCADE,
  profile_id   uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order   int     NOT NULL DEFAULT 0,
  UNIQUE (rotation_id, profile_id)
);

-- Associar tarefa a um grupo
ALTER TABLE tasks
  ADD COLUMN rotation_id uuid REFERENCES task_rotations(id) ON DELETE SET NULL;
```

### Lógica do membro atual

`current_member_index` indexa a lista **completa** de participantes (ordenada por `sort_order`).

Ao resolver "quem é o responsável desta semana":
1. Buscar lista ordenada de participantes.
2. Começar em `current_member_index` (mod tamanho da lista).
3. Percorrer em frente (com wrap-around) até encontrar o primeiro participante que **não** está em modo ausência.
4. Exibir esse membro como responsável.

Ao avançar (dia de troca chegou):
1. Mesmo algoritmo acima, mas a partir da posição `current_member_index + 1`.
2. Persistir o novo índice em `current_member_index` e `last_rotated_at = now()`.

### RLS

- `task_rotations`: leitura por todos os membros da casa; escrita requer `can_manage_tasks`.
- `task_rotation_members`: mesma regra.
- `tasks.rotation_id`: já coberto pelo RLS existente de `tasks`.

---

## Permissões

Reusa a permissão `can_manage_tasks` já existente em `home_member_permissions`:
- Criar, editar e excluir grupos de rodízio → `can_manage_tasks`
- Associar/desassociar tarefa de rodízio → `can_manage_tasks`
- Visualizar responsável atual → qualquer membro

---

## Edge cases

| Situação | Comportamento |
|---|---|
| Todos os participantes ausentes | Tarefa fica sem responsável naquela semana |
| Grupo com 1 participante | Sempre o mesmo responsável; skip por ausência deixa sem responsável |
| Tarefa excluída | `rotation_id` some; o grupo permanece ativo para outras tarefas |
| Grupo excluído | `tasks.rotation_id` SET NULL via FK; tarefas voltam ao comportamento padrão |
| Membro removido da casa | `ON DELETE CASCADE` remove da `task_rotation_members`; índice avança se necessário |
| Nenhuma tarefa no grupo | Grupo vazio pode existir; não causa erro |

---

## Fora do escopo (esta versão)

- Rodízio por quinzena, mês ou período customizado (somente semanal)
- Histórico de quem ficou responsável em cada semana
- Notificações ao membro quando sua vez chegar
- Rodízio automático ao criar uma tarefa
- Integração com `task_occurrences.assigned_to` (derivação é feita em tempo de leitura, não persistida por ocorrência)
