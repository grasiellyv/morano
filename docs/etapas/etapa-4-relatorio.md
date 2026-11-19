# MORANO — Relatório da Etapa 4 (Rotina completa)

**Sua casa. Sob controle.**

Branch: `worktree-etapa-4-rotina`. Esta etapa entregou o núcleo funcional da seção Rotina: criação e gerenciamento de tarefas recorrentes, marcação de ocorrências, adiamento, histórico, calendário e os bastidores que mantêm a agenda sempre atualizada.

## 1. O que foi desenvolvido

### Motor de recorrência

O coração da etapa é o algoritmo de geração de ocorrências (`recurrence.ts`). Dado um conjunto de regras (tipo de frequência, dias da semana, dia do mês, datas de início e fim), ele retorna todas as datas em que a tarefa deve aparecer dentro de uma janela de tempo. Os tipos de frequência suportados são:

- **Uma vez** — aparece exatamente na data de início.
- **Diário** — um item por dia.
- **Semanal** — a cada 7 dias; opcionalmente em dias específicos da semana.
- **Quinzenal** — a cada 14 dias; opcionalmente em dias específicos da semana.
- **Mensal** — no dia escolhido do mês (clampeado para o último dia em meses curtos, ex: 31 de fevereiro vira 28 ou 29).
- **Personalizado** — a cada N dias, semanas ou meses.

### Janela deslizante de ocorrências

As ocorrências não são geradas para sempre — apenas para os próximos 56 dias. Um processo automático (`extendWindowForHome`) roda de forma silenciosa toda vez que o usuário abre a página `/rotina` e estende a janela quando ela está prestes a vencer. Assim a agenda está sempre populada sem sobrecarregar o banco.

### Tela principal `/rotina`

A tela mostra três seções:

- **Atrasadas** — tarefas que passaram da data sem ser concluídas (ficam em vermelho).
- **Hoje** — tarefas do dia atual, com estimativa total de minutos.
- **Próximas 7 dias** — uma visão do que está por vir.

Cada linha de tarefa (`TaskOccurrenceRow`) tem um botão de círculo para marcar como concluída, e um menu "⋯" com as opções Adiar, Pular e Desfazer (esta última só para tarefas já concluídas no mesmo dia).

**Nova tarefa:** um botão no topo abre um formulário inline (`TaskForm`) que permite configurar título, prioridade, duração estimada, cômodo e regra de recorrência completa, incluindo seleção de dias da semana por chips.

### Operações em ocorrências

- **Concluir** — registra hora e usuário; revalida a página para refletir o estado imediatamente.
- **Desfazer** — só funciona no mesmo dia (fuso horário da residência); protege contra desfazer no dia seguinte.
- **Pular** — marca como "skipped"; aparece no histórico.
- **Adiar** — move a data agendada para uma data futura; valida que a nova data é antes da próxima ocorrência (evita sobreposição).

### Calendário `/rotina/calendario`

- **Visão mobile (semanal):** grade de 7 colunas mostrando as tarefas de cada dia da semana atual, com navegação por semana.
- **Visão desktop (mensal):** grade calendário com contadores por dia (tarefas pendentes em laranja; ponto verde quando todas estão concluídas). Navegação por mês.

### Histórico `/rotina/historico`

Lista as últimas 50 ocorrências encerradas (concluídas, puladas, perdidas), em ordem cronológica, com ícones distintos para cada status. Tarefas arquivadas aparecem com o rótulo "(arquivada)" para diferenciar do conteúdo ativo.

### Edição e arquivamento de tarefas (ações de servidor)

As ações `updateTask`, `editTaskRule`, `archiveTask` e `deleteTask` estão implementadas em `actions.ts`. O `archiveTask` distingue dois casos: se a tarefa já tem histórico, apenas muda o status para "arquivada" (preservando as ocorrências passadas); se nunca foi executada, deleta em cascata. O `editTaskRule` apaga apenas as ocorrências pendentes não adiadas a partir de hoje (preserva as adiadas pelo usuário) e regenera a agenda com a nova regra. A exposição dessas ações em elementos visuais da interface fica para uma etapa futura.

### Limpeza automática de ocorrências perdidas

Ao carregar `/rotina`, o sistema chama `markMissedOccurrences`, que marca como "missed" (perdida) qualquer ocorrência pendente com data anterior a hoje. Isso mantém o histórico preciso sem nenhuma ação do usuário.

## 2. Arquivos criados ou modificados

**Novo motor de recorrência:**
- `src/features/tasks/rules/recurrence.ts` — algoritmo de geração de datas
- `src/features/tasks/rules/recurrence.test.ts` — 32 testes unitários do algoritmo

**Queries e actions do módulo de tarefas:**
- `src/features/tasks/queries.ts` — getTodayOccurrences, getOverdueOccurrences, getUpcomingOccurrences, getHistory, getOccurrencesForMonth, getOccurrencesForWeek, markMissedOccurrences
- `src/features/tasks/actions.ts` — extendWindowForHome, createTask, completeOccurrence, undoComplete, skipOccurrence, postponeOccurrence, updateTask, editTaskRule, archiveTask, deleteTask
- `src/features/tasks/actions.test.ts` — testes das regras de negócio das actions
- `src/features/tasks/schemas.ts` — createTaskSchema, updateTaskMetaSchema, editTaskRuleSchema

**Componentes de UI:**
- `src/features/tasks/components/task-form.tsx` — formulário de criação/edição de tarefa (create + edit mode)
- `src/features/tasks/components/task-occurrence-row.tsx` — linha de ocorrência com ações inline
- `src/features/tasks/components/task-list.tsx` — lista principal com seções Atrasadas / Hoje / Próximas
- `src/features/tasks/components/task-history-list.tsx` — lista do histórico com ícones de status
- `src/features/tasks/components/calendar-view.tsx` — calendário semanal (mobile) e mensal (desktop)

**Páginas:**
- `src/app/(app)/rotina/page.tsx` — tela principal da rotina
- `src/app/(app)/rotina/historico/page.tsx` — histórico de ocorrências
- `src/app/(app)/rotina/calendario/page.tsx` — visão de calendário

**Testes E2E:**
- `tests/e2e/rotina.spec.ts` — 8 cenários E2E (ver seção 4)

## 3. Dependências adicionadas

Nenhuma. Todas as bibliotecas usadas (date-fns, @date-fns/tz, Supabase SDK, React) já estavam presentes desde as etapas anteriores.

## 4. Testes executados

Rodada final neste branch:

- **Vitest (unidade): 106 de 106 passaram** (15 arquivos). Inclui os testes de recorrência (32 casos cobrindo todos os tipos de frequência, casos de borda de fim de mês e fuso horário) e os testes das regras de negócio das actions (undo no mesmo dia, postpone antes da próxima ocorrência, purge de ocorrências não adiadas no editTaskRule).
- **TypeScript (tsc): sem erros.**
- **ESLint: 0 erros, 3 avisos** (todos pré-existentes em arquivos de etapas anteriores — nenhum novo aviso introduzido nesta etapa).
- **Playwright (E2E): 8 novos testes escritos** em `tests/e2e/rotina.spec.ts`. Os testes E2E desta etapa **não foram executados** nesta sessão — eles precisam de Next.js (porta 3100) e Supabase local rodando. Para executar: `npm run test:e2e`.

## 5. Problemas encontrados e corrigidos

1. **`extendWindowForHome` bloqueando renderização:** a primeira implementação chamava `await extendWindowForHome(...)` na renderização do Server Component, o que atrasava a resposta para o usuário sempre que havia novas ocorrências a gerar. Corrigido para "fire-and-forget" (`.catch(() => {})`) — a página renderiza com os dados disponíveis e a extensão acontece em paralelo.

2. **Token `bg-sage` ausente no Tailwind:** o componente `TaskOccurrenceRow` usava `bg-sage` para o indicador de tarefa concluída, mas esse token não estava configurado no tema. Adicionado ao `tailwind.config.ts`.

3. **Campo `weekdays` nulo no editTaskRule:** quando a nova frequência não usava dias da semana (ex: diária), o campo `weekdays` era enviado como string vazia em vez de `null`, causando erro de validação. Corrigido no parser do `editTaskRuleSchema`.

4. **Ocorrências adiadas apagadas ao editar regra:** a primeira versão do `editTaskRule` deletava todas as ocorrências pendentes futuras, incluindo as que o usuário tinha adiado manualmente para uma data específica. Corrigido para deletar apenas ocorrências onde `scheduled_for = original_date` (não adiadas).

5. **`markMissedOccurrences` retornando erro silencioso:** quando o banco retornava erro ao marcar ocorrências como perdidas, o erro era propagado e interrompia a renderização da página. Corrigido com `.catch(() => {})` para não bloquear a página caso a operação falhe.

6. **Calendário mensal com offset incorreto:** a grade do calendário não posicionava corretamente os dias quando o mês começava em domingo (offset = 0), gerando uma linha extra em branco no início. Corrigido calculando `startOffset` com `getDay(firstDayOfMonth)`.

## 6. O que falta

- **UI de edição e arquivamento de tarefas:** as actions `updateTask`, `editTaskRule` e `archiveTask` estão implementadas, mas não há elementos visuais no frontend para acioná-las (nenhum botão de "Editar" ou "Arquivar" nas listas). Isso ficou para uma etapa futura.
- **Testes E2E:** os 8 cenários foram escritos mas precisam de `npm run test:e2e` em ambiente com Next.js e Supabase rodando para validar. Os cenários 7 e 8 (arquivar e editar regra) utilizam o cliente admin para contornar a ausência da UI de edição.
- **Paginação no histórico:** o histórico busca as últimas 50 ocorrências. Para usuários com muitas tarefas, paginação ou scroll infinito seriam necessários.
- **Integração com `/inicio`:** o painel inicial tem uma seção de rotina, mas ela ainda não está conectada às queries de tarefas desta etapa.

## 7. Como ver

1. Abra o Docker Desktop e, na pasta do projeto: `npm run db:start`
2. Rode o app: `npm run dev` e abra http://localhost:3000
3. Complete o onboarding (se ainda não fez) — ele já cria tarefas de exemplo.
4. Acesse `/rotina` para ver as tarefas do dia e criar novas.
5. Acesse `/rotina/historico` para ver o registro de ocorrências passadas.
6. Acesse `/rotina/calendario` para a visão de agenda semanal (mobile) ou mensal (desktop).
7. Para rodar os testes unitários: `npx vitest run`. Para os E2E: `npm run test:e2e`.
