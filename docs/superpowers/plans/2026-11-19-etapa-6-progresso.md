# Etapa 6 — Progresso Diário e Gamificação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir barra de progresso diário acima da lista de tarefas, com comemoração ao atingir 100%.

**Architecture:** Dois componentes client-side (`DailyProgressBar` e `CelebrationOverlay`) adicionados ao `TaskList` existente. Toda a lógica é client-side — zero alterações no banco, em queries ou em server actions.

**Tech Stack:** React 19, TypeScript strict + noUncheckedIndexedAccess, Tailwind CSS, Next.js 16 App Router.

**Spec:** Planejamento técnico revisado (Etapas 6–9) — Artifact https://claude.ai/artifact/SzYxtqTEmwUfYodLM4QuNg

## Global Constraints

- Zero alterações no banco de dados, migrations, queries ou server actions
- Zero alterações no comportamento atual de qualquer funcionalidade existente
- `task.status === 'active'` define elegibilidade — tarefas pausadas (`'paused'`) ficam visíveis na lista mas fora do cálculo
- Celebração dispara SOMENTE na transição de <100% para 100% — nunca ao carregar a página
- Sem mensagens punitivas em nenhuma tela
- TypeScript strict: sem `any`, sem `!` não-nulo, sem `@ts-ignore`
- Sem comentários desnecessários no código
- Nenhum emoji no código-fonte

## Review Focus

1. Celebração disparando ao carregar a página com 0/0 (barra oculta) — deve não disparar
2. Celebração disparando ao carregar a página já com 100% — deve não disparar
3. Tarefa pausada (`task.status = 'paused'`) entrando no denominador — deve ser excluída
4. Denominador = 0 (todas pausadas ou nenhuma tarefa hoje) — barra deve ser ocultada completamente
5. Transição de 100% → <100% (após reabrir tarefa): celebração não deve disparar na próxima chegada a 100% sem nova transição real

---

## Task 1: Componentes de progresso e integração

**Files:**
- Create: `src/features/tasks/components/daily-progress-bar.tsx`
- Create: `src/features/tasks/components/celebration-overlay.tsx`
- Modify: `src/features/tasks/components/task-list.tsx`
- Test: `src/features/tasks/components/daily-progress-bar.test.ts`

**Interfaces:**
- Consumes: `OccurrenceWithTask` de `@/features/tasks/queries` — shape existente, sem alteração
- Produces: `DailyProgressBar` props: `{ occurrences: OccurrenceWithTask[] }`; `CelebrationOverlay` props: `{ show: boolean; onDismiss: () => void }`

- [ ] **Step 1: Escrever testes para a lógica de progresso**

Arquivo: `src/features/tasks/components/daily-progress-bar.test.ts`

Testar a função pura `calcProgress(occurrences: OccurrenceWithTask[])`:
- retorna `{ done: 0, total: 0 }` para array vazio
- exclui ocorrências de tarefas `status === 'paused'` do total E do done
- conta `status === 'completed'` de tarefas `status === 'active'` no done
- conta `status === 'pending'` + `status === 'completed'` de tarefas `status === 'active'` no total
- NÃO conta `status === 'skipped'` ou `status === 'missed'` no total

```ts
// IDs válidos para Zod v4: versão nibble = 1–8
const BASE_OCC: OccurrenceWithTask = {
  id: "00000000-0000-1000-8000-000000000001",
  task_id: "00000000-0000-1000-8000-000000000002",
  original_date: "2026-11-19",
  scheduled_for: "2026-11-19",
  status: "pending",
  completed_at: null,
  notes: null,
  task: {
    id: "00000000-0000-1000-8000-000000000002",
    title: "Teste",
    priority: "media",
    estimated_minutes: 10,
    room_id: null,
    status: "active",
  },
};
```

Casos:
```ts
// empty
calcProgress([]) → { done: 0, total: 0 }

// 1 active pending
calcProgress([{ ...BASE_OCC, status: "pending" }]) → { done: 0, total: 1 }

// 1 active completed
calcProgress([{ ...BASE_OCC, status: "completed" }]) → { done: 1, total: 1 }

// 1 paused (qualquer status): total e done = 0
calcProgress([{ ...BASE_OCC, task: { ...BASE_OCC.task, status: "paused" } }]) → { done: 0, total: 0 }

// 1 active completed + 1 paused pending: done=1, total=1
calcProgress([
  { ...BASE_OCC, id: "00000000-0000-1000-8000-000000000001", status: "completed" },
  { ...BASE_OCC, id: "00000000-0000-1000-8000-000000000003", task: { ...BASE_OCC.task, status: "paused" } },
]) → { done: 1, total: 1 }

// skipped não entra no total
calcProgress([{ ...BASE_OCC, status: "skipped" }]) → { done: 0, total: 0 }
```

- [ ] **Step 2: Rodar testes para confirmar falha esperada**

Comando: `npx vitest run src/features/tasks/components/daily-progress-bar.test.ts`
Esperado: FAIL — `calcProgress is not defined`

- [ ] **Step 3: Implementar `calcProgress` e `DailyProgressBar`**

Arquivo: `src/features/tasks/components/daily-progress-bar.tsx`

Exportar:
1. `export function calcProgress(occurrences: OccurrenceWithTask[]): { done: number; total: number }` — função pura, exportada para ser testável
2. `export function DailyProgressBar({ occurrences }: { occurrences: OccurrenceWithTask[] })` — componente client `"use client"`

Lógica de `calcProgress`:
```
total = occurrences onde task.status === 'active' E occurrence.status IN ('pending','completed')
done  = occurrences onde task.status === 'active' E occurrence.status === 'completed'
```

Lógica de `DailyProgressBar`:
- Chama `calcProgress(occurrences)`
- Se `total === 0`: retorna `null` (não renderizar nada)
- Caso contrário: renderizar barra com percentual `(done / total * 100)`
- Exibir: `"{done} de {total} tarefas concluídas"` (ou `"tarefa"` no singular)
- Estilo: `<div>` com barra de progresso usando Tailwind; cor primária ao 100%, cor neutra abaixo

- [ ] **Step 4: Rodar testes para confirmar que passam**

Comando: `npx vitest run src/features/tasks/components/daily-progress-bar.test.ts`
Esperado: PASS — todos os casos

- [ ] **Step 5: Implementar `CelebrationOverlay`**

Arquivo: `src/features/tasks/components/celebration-overlay.tsx`

```tsx
"use client";
// Componente controlado: exibe overlay de celebração
// Props: { show: boolean; onDismiss: () => void }
// Quando show=true: exibe mensagem positiva centralizada com fade-in
// Auto-dismiss após 4000ms via setTimeout (cleanup em return do useEffect)
// Sem emoji no código — usar texto: "Rotina completa!"
```

Comportamento:
- `show=false` → retorna `null`
- `show=true` → renderiza overlay por cima do conteúdo (posição fixa, z-index alto), com mensagem positiva e botão "Fechar" como alternativa
- Auto-dismiss: `useEffect` com `setTimeout(onDismiss, 4000)`, cleanup obrigatório

- [ ] **Step 6: Integrar em `TaskList`**

Arquivo: `src/features/tasks/components/task-list.tsx`

Adicionar ao `TaskList`:
1. Importar `DailyProgressBar` e `CelebrationOverlay`
2. Calcular `progress = calcProgress(today)` usando a função importada
3. Estado: `const [celebrate, setCelebrate] = useState(false)`
4. Ref para comparar valor anterior: `const prevDone = useRef<number | null>(null)`
5. `useEffect` que observa `progress.done` e `progress.total`:
   ```ts
   useEffect(() => {
     if (progress.total === 0) { prevDone.current = null; return; }
     const isNow100 = progress.done === progress.total;
     const wasBefore100 = prevDone.current !== null && prevDone.current === progress.total;
     if (isNow100 && !wasBefore100) setCelebrate(true);
     prevDone.current = progress.done;
   }, [progress.done, progress.total]);
   ```
6. Renderizar `<DailyProgressBar occurrences={today} />` acima da seção "Hoje"
7. Renderizar `<CelebrationOverlay show={celebrate} onDismiss={() => setCelebrate(false)} />` em qualquer lugar no JSX

- [ ] **Step 7: Rodar suite completa e confirmar sem regressões**

Comando: `npm test`
Esperado: todos os testes passam (mínimo 133 + novos testes do Step 1)

- [ ] **Step 8: Verificar tipos**

Comando: `npx tsc --noEmit`
Esperado: 0 erros

- [ ] **Step 9: Commit**

```bash
git add src/features/tasks/components/daily-progress-bar.tsx \
        src/features/tasks/components/celebration-overlay.tsx \
        src/features/tasks/components/task-list.tsx \
        src/features/tasks/components/daily-progress-bar.test.ts \
        docs/superpowers/plans/2026-11-19-etapa-6-progresso.md
git commit -m "feat(rotina): barra de progresso diário e celebração ao 100%

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
