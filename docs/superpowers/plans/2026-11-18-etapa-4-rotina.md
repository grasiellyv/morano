# Etapa 4 — Rotina Completa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o módulo de rotina — engine de recorrência TypeScript, CRUD de tarefas, materialização de ocorrências, concluir/adiar/pular/desfazer, lógica de "atrasadas", histórico e calendário semanal/mensal.

**Architecture:** A engine de recorrência é TypeScript puro sem acesso ao banco, gerando arrays de strings `yyyy-MM-dd`. Ocorrências são materializadas em `task_occurrences` com `on conflict (task_id, original_date) do nothing`. A janela é estendida a cada carga de /inicio e /rotina (sem cron) para rotinas com `generated_until < hoje + 28 dias`. Operações de ocorrências são Server Actions com `revalidatePath`.

**Tech Stack:** Next.js 16 App Router, TypeScript strict + noUncheckedIndexedAccess, Supabase (@supabase/ssr Server Actions + RLS), date-fns 4.4.0, @date-fns/tz 1.5.0 (TZDate), Zod 4, useActionState + useValidatedSubmit + RHF + zodResolver

**Spec:** docs/superpowers/specs/2026-11-18-morano-mvp-design.md

## Global Constraints

- Todas as tabelas DB (tasks, routines, task_occurrences) existem — NÃO criar novas migrations
- `home_id` sempre lido de `profiles.current_home_id` no servidor via `getHomeWithRooms(userId)` (src/features/homes/queries.ts); nunca aceitar home_id de parâmetro do cliente sem verificar membership
- `tasks.created_by` NÃO está no INSERT grant — omitir; o DB default `auth.uid()` preenche
- `routines` tem coluna `home_id` (inserida pelo onboarding em Etapa 3); usar para queries de window extension diretamente em vez de JOIN com tasks
- Zod 4: `{ error: "..." }` nos mensagens de validação (não `invalid_type_error`)
- `@date-fns/tz` v1 usa `TZDate`, não `toZonedTime` (que é API v3)
- Tipos Supabase em `@/types/database` — não inventar tipos de colunas
- Server Actions: `"use server"`, sempre checar erros, retornar `FormState` de `@/features/auth/form-state`
- Telemetria via `trackEvent(userId, homeId, eventName)` de `@/lib/telemetry`; event_name regex `^[a-z_]{3,50}$`; nunca lança exceção
- `frequency_type` válidos: `"once" | "daily" | "weekly" | "biweekly" | "monthly" | "custom"`
- `task_occurrences.status` válidos: `"pending" | "completed" | "skipped" | "missed"`
- `tasks.status` válidos: `"active" | "paused" | "archived"`
- `tasks.priority` válidos: `"baixa" | "media" | "alta"`
- Datas são strings `yyyy-MM-dd`; "hoje" sempre calculado no fuso da casa (nunca UTC)
- Insert de ocorrências: `on conflict (task_id, original_date) do nothing`
- Desfazer conclusão: só permitido se `completed_at` foi no mesmo dia **no fuso da casa**
- Sem limite de tarefas no MVP (freemium implementado na Etapa 8)
- `getHomeWithRooms(userId)` cria seu próprio `supabase` cliente internamente

## Review Focus

1. **Desfazer depois da meia-noite (fuso da casa):** concluir às 23:50 BRT e tentar desfazer às 00:05 BRT do dia seguinte → rejeitar, pois "mesmo dia" usa o fuso da casa. Teste adicionado em Task 3.
2. **Adiar para a data da próxima ocorrência:** adiar para uma data onde já existe `scheduled_for` pending da mesma tarefa → rejeitar (evita duas ocorrências na mesma data efetiva). Teste adicionado em Task 3.
3. **Editar regra com ocorrência adiada:** tarefa com ocorrência cujo `scheduled_for ≠ original_date` (foi adiada) → editar a regra deve preservar essa ocorrência; só pendentes não-adiadas (`scheduled_for = original_date`) são purgadas. Teste adicionado em Task 4.
4. **Histórico inclui tarefas arquivadas:** tarefa arquivada (`status = 'archived'`) deve ainda aparecer no histórico com suas ocorrências concluídas. Teste adicionado em Task 6.
5. **Backlog de janela muito antigo:** `generated_until` 180 dias atrás → `extendWindowForHome` deve gerar de `generated_until + 1` até `today + 56` em uma única chamada (não parar em `today + 28`). Teste adicionado em Task 2.

---

### Task 1: Engine de recorrência e lib/dates

**Files:**
- Create: `src/lib/dates/index.ts`
- Create: `src/features/tasks/rules/recurrence.ts`
- Create: `src/features/tasks/rules/recurrence.test.ts`

**Interfaces:**
- Produces:
  - `getLocalDateString(timezone: string): string` — "yyyy-MM-dd" do dia atual no fuso dado
  - `addDaysStr(date: string, days: number): string` — adiciona N dias a uma data string, retorna "yyyy-MM-dd"
  - `RoutineRule` interface
  - `generateOccurrenceDates(rule: RoutineRule, fromDate: string, toDate: string): string[]`

- [ ] **Step 1: Criar `src/lib/dates/index.ts`**

```ts
import { TZDate } from "@date-fns/tz";
import { format, addDays, parseISO } from "date-fns";

// Retorna "yyyy-MM-dd" do dia atual no fuso informado
export function getLocalDateString(timezone: string): string

// Adiciona N dias a uma data "yyyy-MM-dd", retorna "yyyy-MM-dd"
export function addDaysStr(date: string, days: number): string
```

Implementar `getLocalDateString` com `format(new TZDate(new Date(), timezone), "yyyy-MM-dd")`.
Implementar `addDaysStr` com `format(addDays(parseISO(date), days), "yyyy-MM-dd")`.

- [ ] **Step 2: Criar `src/features/tasks/rules/recurrence.ts`**

```ts
export type FrequencyType = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type IntervalUnit = "day" | "week" | "month";

export interface RoutineRule {
  frequency_type: FrequencyType;
  interval_value: number | null;   // para custom
  interval_unit: IntervalUnit | null; // para custom
  weekdays: number[] | null;       // 0=Dom..6=Sáb; null = usa ritmo do start_date
  month_day: number | null;        // 1–31; null = usa dia do start_date
  start_date: string;              // "yyyy-MM-dd"
  end_date: string | null;         // "yyyy-MM-dd"
}

// Retorna array ordenado de datas "yyyy-MM-dd" em [fromDate, toDate] inclusive
export function generateOccurrenceDates(
  rule: RoutineRule,
  fromDate: string,
  toDate: string,
): string[]
```

Regras de geração por `frequency_type`:
- `once`: `[rule.start_date]` se `start_date` cai em `[fromDate, toDate]`; senão `[]`
- `daily`: cada dia de `max(start_date, fromDate)` até `min(toDate, end_date ?? toDate)`
- `weekly`: a cada 7 dias do start_date, filtrado em `[fromDate, toDate]`. Se `weekdays` não-null: só dias cujo `getDay()` está em `weekdays` (re-alinhado ao start_date da semana)
- `biweekly`: a cada 14 dias do start_date, mesmo filtro de weekdays
- `monthly`: no mesmo dia do mês do start_date (ou `month_day` se set). Dia inexistente → último dia do mês (jan 31 → fev 28/29; jun 31 → jun 30)
- `custom`: interval_value unidades de interval_unit (day|week|month) a partir do start_date

- [ ] **Step 3: Criar `src/features/tasks/rules/recurrence.test.ts` com os testes obrigatórios da spec**

```ts
// virada de mês/ano
it("monthly on Dec 31 generates Jan 31")
// rule: {monthly, start_date:"2026-12-31"}, from:"2027-01-01", to:"2027-01-31"
// expect: ["2027-01-31"]

it("monthly on Nov 30 generates Dec 30 and Jan 30")

// fevereiro bissexto
it("monthly on Jan 31 2024 (ano bissexto) generates Feb 29 2024")
// from:"2024-02-01", to:"2024-02-29" → expect: ["2024-02-29"]

it("monthly on Jan 31 2023 (ano comum) generates Feb 28 2023")

// dia 31 em sequência
it("monthly day 31: jan→feb→mar→apr gives 31, 28, 31, 30")
// rule start_date "2026-01-31", from:"2026-01-01", to:"2026-04-30"
// expect: ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]

// quinzenal
it("biweekly generates every 14 days")
// rule start_date "2026-11-01", from:"2026-11-01", to:"2026-12-15"
// expect: ["2026-11-01","2026-11-15","2026-11-29","2026-12-13"]

// once
it("once: returns start_date when in range")
it("once: returns [] when start_date out of range")

// daily
it("daily: generates every day in range")

// fromDate posterior ao start_date
it("skips dates before fromDate even if rule would generate them")

// end_date
it("stops at end_date even when toDate is later")

// getLocalDateString fuso
it("getLocalDateString at 02:00 UTC returns previous day in America/Sao_Paulo (UTC-3)")
// new Date("2026-11-19T02:00:00Z") → em BRT (UTC-3) = "2026-11-18"
// new Date("2026-11-19T04:00:00Z") → em BRT = "2026-11-19"
```

- [ ] **Step 4: Rodar testes**

```
npx vitest run src/features/tasks/rules/recurrence.test.ts
```
Expected: todos PASS

- [ ] **Step 5: Commit**

```
git add src/lib/dates/index.ts src/features/tasks/rules/
git commit -m "feat(rotina): engine de recorrência e lib/dates"
```

---

### Task 2: Schemas, createTask e extendWindowForHome

**Files:**
- Create: `src/features/tasks/schemas.ts`
- Create: `src/features/tasks/actions.ts`
- Modify: `src/app/(app)/inicio/page.tsx`

**Interfaces:**
- Consumes: `generateOccurrenceDates`, `getLocalDateString`, `addDaysStr` (Task 1); `requireUser` from `@/lib/auth/require-user`; `createClient` from `@/lib/supabase/server`; `getHomeWithRooms` from `@/features/homes/queries`; `trackEvent` from `@/lib/telemetry`; `FormState`, `fieldErrorsFrom`, `textField` from `@/features/auth/form-state`
- Produces:
  - `createTaskSchema` (Zod)
  - `updateTaskMetaSchema` (Zod, sem recorrência — para Task 4)
  - `createTask(_: FormState, fd: FormData): Promise<FormState>` Server Action
  - `extendWindowForHome(homeId: string, homeTimezone: string): Promise<void>` server helper

- [ ] **Step 1: Criar `src/features/tasks/schemas.ts`**

```ts
export const createTaskSchema = z.object({
  title: z.string().min(1, { error: "Título obrigatório" }).max(120),
  description: z.string().max(500).optional(),
  priority: z.enum(["baixa", "media", "alta"]),
  estimated_minutes: z.coerce.number({ error: "Informe os minutos" }).min(1).max(480),
  room_id: z.string().uuid().nullable().optional(),
  frequency_type: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "custom"]),
  interval_value: z.coerce.number().min(1).max(365).nullable().optional(),
  interval_unit: z.enum(["day", "week", "month"]).nullable().optional(),
  weekdays: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.number().min(0).max(6)).nullable().optional(),
  ),
  month_day: z.coerce.number().min(1).max(31).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida" }),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export const updateTaskMetaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, { error: "Título obrigatório" }).max(120),
  description: z.string().max(500).optional(),
  priority: z.enum(["baixa", "media", "alta"]),
  estimated_minutes: z.coerce.number({ error: "Informe os minutos" }).min(1).max(480),
  room_id: z.string().uuid().nullable().optional(),
})
```

- [ ] **Step 2: Implementar `extendWindowForHome` em `src/features/tasks/actions.ts`**

```ts
"use server";
// extendWindowForHome não é uma Server Action (não exporta para o cliente),
// mas fica neste arquivo para ser importada pelos Server Components de /inicio e /rotina.
// Adicionar "use server" no topo do arquivo; as exports são actions + helpers.

export async function extendWindowForHome(
  homeId: string,
  homeTimezone: string,
): Promise<void>
```

Fluxo:
1. `today = getLocalDateString(homeTimezone)`, `threshold = addDaysStr(today, 28)`, `newUntil = addDaysStr(today, 56)`
2. Buscar: `SELECT routines.* FROM routines JOIN tasks ON tasks.id = routines.task_id WHERE routines.home_id = $homeId AND routines.is_active = true AND tasks.status = 'active' AND routines.generated_until < $threshold`
3. Para cada routine: `fromDate = addDaysStr(routine.generated_until, 1)`; gerar datas com `generateOccurrenceDates(rule, fromDate, newUntil)`
4. Batch insert: `{task_id, home_id: homeId, original_date: d, scheduled_for: d, status: "pending"}` com `upsert([...], {onConflict: "task_id,original_date", ignoreDuplicates: true})`
5. Update `routines.generated_until = newUntil` para cada routine processada
6. Swallow all errors (não relançar — a página deve renderizar mesmo se a extensão falhar)

- [ ] **Step 3: Implementar `createTask` em `src/features/tasks/actions.ts`**

```ts
export async function createTask(
  _: FormState,
  fd: FormData,
): Promise<FormState>
```

Fluxo:
1. `requireUser()` → `userId`; `createClient()` → `supabase`
2. Buscar `profiles.current_home_id` → `homeId`; buscar `homes.timezone` → `timezone`
3. Validar com `createTaskSchema`
4. Insert `tasks {home_id, title, description, priority, estimated_minutes, room_id, source: "manual", status: "active"}` → `task.id` (omitir `created_by`)
5. `today = getLocalDateString(timezone)`, `until = addDaysStr(today, 56)`
6. Insert `routines {task_id, frequency_type, interval_value, interval_unit, weekdays, month_day, start_date: parsed.start_date, end_date, generated_until: until, is_active: true}`
7. Gerar datas com `generateOccurrenceDates(rule, parsed.start_date, until)` e batch insert em `task_occurrences`
8. `trackEvent(userId, homeId, "task_created")`
9. `revalidatePath("/rotina")`, `revalidatePath("/inicio")`
10. Return `{status: "success", message: "Tarefa criada."}`

- [ ] **Step 4: Modificar `src/app/(app)/inicio/page.tsx`**

Transformar em async Server Component. Adicionar:
1. `requireUser()` → userId; `getHomeWithRooms(userId)` → se null, `redirect("/onboarding")`
2. `extendWindowForHome(home.id, home.timezone).catch(() => {})` antes de renderizar
3. Manter o `EmptyState` existente (dashboard real vem na Etapa 7)

- [ ] **Step 5: Teste de backlog antigo (Review Focus 5)**

Criar `src/features/tasks/actions.test.ts`:

```ts
import { generateOccurrenceDates } from "@/features/tasks/rules/recurrence";
import { addDaysStr, getLocalDateString } from "@/lib/dates";

it("generateOccurrenceDates handles fromDate 180 days before toDate in one call", () => {
  const today = "2026-11-18";
  const fromDate = addDaysStr(today, -180); // "2026-05-22"
  const toDate = addDaysStr(today, 56);    // "2027-01-13"
  const rule = { frequency_type: "daily" as const, start_date: fromDate,
    interval_value: null, interval_unit: null, weekdays: null, month_day: null, end_date: null };
  const dates = generateOccurrenceDates(rule, fromDate, toDate);
  // 180 + 1 + 56 = 237 days
  expect(dates.length).toBe(237);
  expect(dates[0]).toBe(fromDate);
  expect(dates[dates.length - 1]).toBe(toDate);
});
```

- [ ] **Step 6: Rodar lint, typecheck e testes**

```
npm run lint && npm run typecheck && npx vitest run src/features/tasks/
```
Expected: PASS

- [ ] **Step 7: Commit**

```
git add src/features/tasks/schemas.ts src/features/tasks/actions.ts src/features/tasks/actions.test.ts src/app/\(app\)/inicio/page.tsx
git commit -m "feat(rotina): schemas, createTask e extendWindowForHome"
```

---

### Task 3: Operações em ocorrências e queries

**Files:**
- Create: `src/features/tasks/queries.ts`
- Modify: `src/features/tasks/actions.ts`
- Modify: `src/features/tasks/actions.test.ts`

**Interfaces:**
- Consumes: `getLocalDateString`, `addDaysStr` (Task 1); `extendWindowForHome` (Task 2)
- Produces:
  - `OccurrenceWithTask` type
  - `markMissedOccurrences(supabase, homeId, today): Promise<void>`
  - `getTodayOccurrences(supabase, homeId, today): Promise<OccurrenceWithTask[]>`
  - `getOverdueOccurrences(supabase, homeId, today): Promise<OccurrenceWithTask[]>`
  - `getUpcomingOccurrences(supabase, homeId, today, days?: number): Promise<OccurrenceWithTask[]>`
  - `completeOccurrence(_: FormState, fd: FormData): Promise<FormState>`
  - `undoComplete(_: FormState, fd: FormData): Promise<FormState>`
  - `skipOccurrence(_: FormState, fd: FormData): Promise<FormState>`
  - `postponeOccurrence(_: FormState, fd: FormData): Promise<FormState>`

- [ ] **Step 1: Criar `src/features/tasks/queries.ts`**

```ts
import "server-only";

export type OccurrenceWithTask = {
  id: string;
  task_id: string;
  original_date: string;
  scheduled_for: string;
  status: "pending" | "completed" | "skipped" | "missed";
  completed_at: string | null;
  notes: string | null;
  task: {
    id: string;
    title: string;
    priority: "baixa" | "media" | "alta";
    estimated_minutes: number;
    room_id: string | null;
    status: "active" | "paused" | "archived";
  };
};

// Marca como 'missed' todas as pending com scheduled_for < today,
// EXCETO a mais recente por task_id.
// Idempotente: pode ser chamada múltiplas vezes sem efeito colateral.
export async function markMissedOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
): Promise<void>

// status='pending', scheduled_for=today, task.status IN ('active','paused')
// ordenado: alta→media→baixa, depois title
export async function getTodayOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
): Promise<OccurrenceWithTask[]>

// status='pending', scheduled_for < today
// (after markMissedOccurrences, no máximo 1 por task)
export async function getOverdueOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
): Promise<OccurrenceWithTask[]>

// status='pending', scheduled_for ENTRE tomorrow E addDaysStr(today, days)
// default days=7
export async function getUpcomingOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
  days?: number,
): Promise<OccurrenceWithTask[]>
```

Para `markMissedOccurrences`, a lógica SQL via RPC ou subquery:
```sql
UPDATE task_occurrences
SET status = 'missed'
WHERE home_id = $homeId
  AND status = 'pending'
  AND scheduled_for < $today
  AND id NOT IN (
    SELECT DISTINCT ON (task_id) id
    FROM task_occurrences
    WHERE home_id = $homeId AND status = 'pending' AND scheduled_for < $today
    ORDER BY task_id, scheduled_for DESC
  )
```
Se a query SQL direta não for possível via SDK, usar RPC `supabase.rpc("mark_missed_occurrences", {p_home_id, p_today})` — a migration já existe.

- [ ] **Step 2: Adicionar operações em `src/features/tasks/actions.ts`**

```ts
// fields: occurrence_id (uuid hidden input)
export async function completeOccurrence(_: FormState, fd: FormData): Promise<FormState>
// 1. requireUser → userId; createClient → supabase
// 2. Buscar occurrence (home_id via join tasks) para validar membership via RLS
// 3. UPDATE status='completed', completed_at=new Date().toISOString(), completed_by=userId
// 4. trackEvent(userId, homeId, "occurrence_completed")
// 5. revalidatePath("/rotina")

export async function undoComplete(_: FormState, fd: FormData): Promise<FormState>
// 1. Buscar occurrence; verificar status='completed'
// 2. homeTimezone = buscar homes.timezone via current_home_id
// 3. today = getLocalDateString(homeTimezone)
// 4. completedOnDay = format(new TZDate(new Date(occurrence.completed_at), homeTimezone), "yyyy-MM-dd")
// 5. Se completedOnDay !== today → return {status:"error", message:"Só é possível desfazer no mesmo dia"}
// 6. UPDATE status='pending', completed_at=null, completed_by=null
// 7. revalidatePath("/rotina")

export async function skipOccurrence(_: FormState, fd: FormData): Promise<FormState>
// UPDATE status='skipped'; revalidatePath("/rotina")

export async function postponeOccurrence(_: FormState, fd: FormData): Promise<FormState>
// fields: occurrence_id, new_date (yyyy-MM-dd)
// Validar: new_date > today
// Validar: new_date < scheduled_for da PRÓXIMA pending desta task (por scheduled_for ASC)
//   spec: "não é possível adiar para depois da próxima ocorrência — evita duas na mesma data efetiva"
//   se não existe próxima, sem restrição de upper bound
// UPDATE scheduled_for = new_date; revalidatePath("/rotina")
```

- [ ] **Step 3: Adicionar testes dos Review Focus 1 e 2**

Em `src/features/tasks/actions.test.ts`:

```ts
// Review Focus 1: desfazer fora do dia no fuso da casa
it("undoComplete rejects when completed_at is yesterday in home timezone", () => {
  // completed_at = "2026-11-19T02:00:00.000Z" (UTC)
  // timezone = "America/Sao_Paulo" (UTC-3)
  // new TZDate(new Date("2026-11-19T02:00:00Z"), "America/Sao_Paulo") → 2026-11-18 23:00 BRT
  // completedOnDay = "2026-11-18"
  // today (simulado) = "2026-11-19"
  // → deve retornar erro "Só é possível desfazer no mesmo dia"
})

// Review Focus 2: adiar para depois da próxima ocorrência
it("postponeOccurrence rejects when new_date >= next pending scheduled_for", () => {
  // task tem occurrence A scheduled_for "2026-11-20" e occurrence B scheduled_for "2026-11-25"
  // tentar adiar A para "2026-11-25" → erro (new_date não < B.scheduled_for)
  // tentar adiar A para "2026-11-26" → também erro (new_date > B.scheduled_for)
  // tentar adiar A para "2026-11-24" → OK (new_date < "2026-11-25")
})
```

- [ ] **Step 4: Rodar testes**

```
npx vitest run src/features/tasks/
```
Expected: PASS

- [ ] **Step 5: Commit**

```
git add src/features/tasks/queries.ts src/features/tasks/actions.ts src/features/tasks/actions.test.ts
git commit -m "feat(rotina): operações em ocorrências (concluir/adiar/pular/desfazer)"
```

---

### Task 4: Edição e exclusão de tarefas

**Files:**
- Modify: `src/features/tasks/schemas.ts`
- Modify: `src/features/tasks/actions.ts`
- Modify: `src/features/tasks/actions.test.ts`
- Create: `src/features/tasks/components/task-form.tsx`

**Interfaces:**
- Consumes: `updateTaskMetaSchema`, `createTaskSchema` (Task 2); `generateOccurrenceDates`, `RoutineRule` (Task 1); `extendWindowForHome` (Task 2)
- Produces:
  - `updateTask(_: FormState, fd: FormData): Promise<FormState>`
  - `editTaskRule(_: FormState, fd: FormData): Promise<FormState>`
  - `archiveTask(_: FormState, fd: FormData): Promise<FormState>`
  - `deleteTask(_: FormState, fd: FormData): Promise<FormState>`
  - `TaskForm` client component

- [ ] **Step 1: Adicionar `editTaskRuleSchema` em `src/features/tasks/schemas.ts`**

```ts
export const editTaskRuleSchema = z.object({
  id: z.string().uuid(),
  frequency_type: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "custom"]),
  interval_value: z.coerce.number().min(1).max(365).nullable().optional(),
  interval_unit: z.enum(["day", "week", "month"]).nullable().optional(),
  weekdays: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.number().min(0).max(6)).nullable().optional(),
  ),
  month_day: z.coerce.number().min(1).max(31).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})
```

- [ ] **Step 2: Adicionar updateTask, editTaskRule, archiveTask, deleteTask em `src/features/tasks/actions.ts`**

```ts
export async function updateTask(_: FormState, fd: FormData): Promise<FormState>
// Validar updateTaskMetaSchema
// Verificar membership via RLS (a query falha se não for membro)
// UPDATE tasks SET title, description, priority, estimated_minutes, room_id WHERE id=parsed.id
// revalidatePath("/rotina")

export async function editTaskRule(_: FormState, fd: FormData): Promise<FormState>
// 1. Validar editTaskRuleSchema; requireUser; createClient
// 2. today = getLocalDateString(homeTimezone)
// 3. DELETE FROM task_occurrences WHERE task_id=parsed.id
//      AND status='pending'
//      AND scheduled_for = original_date  ← não-adiadas (Review Focus 3)
//      AND original_date >= today
// 4. UPDATE routines SET [novos campos da regra], generated_until=addDaysStr(today, -1)
//    WHERE task_id=parsed.id
// 5. extendWindowForHome(homeId, homeTimezone) para regenerar
// revalidatePath("/rotina")

export async function archiveTask(_: FormState, fd: FormData): Promise<FormState>
// fields: id
// Verificar se existe alguma occurrence com status='completed' para esta task
// Se sim → UPDATE tasks SET status='archived' (preserva histórico)
// Se não → DELETE task (cascade: routines, task_occurrences)
// revalidatePath("/rotina")

export async function deleteTask(_: FormState, fd: FormData): Promise<FormState>
// fields: id — exclusão forçada (usado em configurações, se necessário)
// DELETE task (cascade)
// revalidatePath("/rotina")
```

- [ ] **Step 3: Teste Review Focus 3 (editar regra preserva ocorrências adiadas)**

```ts
// Review Focus 3: editTaskRule não apaga ocorrências adiadas
it("editTaskRule only purges non-postponed pending occurrences (scheduled_for = original_date)", () => {
  // Simular 2 occurrences do mesmo task:
  //   A: original_date="2026-11-20", scheduled_for="2026-11-25" (adiada → scheduled_for ≠ original_date)
  //   B: original_date="2026-11-22", scheduled_for="2026-11-22" (não adiada)
  // today = "2026-11-19"
  // editTaskRule deve deletar B (scheduled_for=original_date, >= today) e NÃO A (adiada)
  // Verificar que a condição WHERE scheduled_for = original_date exclui A
})
```

- [ ] **Step 4: Criar `src/features/tasks/components/task-form.tsx`**

Client component (`"use client"`). Props:
```ts
{
  mode: "create" | "edit";
  taskId?: string;         // obrigatório quando mode="edit"
  initialValues?: {
    title?: string; description?: string; priority?: string;
    estimated_minutes?: number; room_id?: string | null;
    frequency_type?: string; start_date?: string; // etc.
  };
  rooms: Array<{ id: string; name: string }>;
  formAction: (prev: FormState, fd: FormData) => Promise<FormState>;
  onSuccess?: () => void;
}
```

Campos: title (text), priority (select), estimated_minutes (number), room_id (select, opcional), frequency_type (select). Campos condicionais: `interval_value` + `interval_unit` quando `custom`; `weekdays` (checkboxes 0–6, labels Dom/Seg/…) quando `weekly` ou `biweekly`; `month_day` quando `monthly`; `start_date` (date, default hoje); `end_date` (date, opcional).

Usa `useActionState(formAction, initialFormState)` + `useValidatedSubmit(schema, state)`.

- [ ] **Step 5: Lint + typecheck + testes**

```
npm run lint && npm run typecheck && npx vitest run src/features/tasks/
```
Expected: PASS

- [ ] **Step 6: Commit**

```
git add src/features/tasks/schemas.ts src/features/tasks/actions.ts src/features/tasks/actions.test.ts src/features/tasks/components/task-form.tsx
git commit -m "feat(rotina): edição de tarefas, regras e arquivamento"
```

---

### Task 5: Página /rotina

**Files:**
- Modify: `src/app/(app)/rotina/page.tsx`
- Create: `src/features/tasks/components/task-occurrence-row.tsx`
- Create: `src/features/tasks/components/task-list.tsx`

**Interfaces:**
- Consumes: `extendWindowForHome`, `createTask`, `createTaskSchema` (Task 2); `markMissedOccurrences`, `getTodayOccurrences`, `getOverdueOccurrences`, `getUpcomingOccurrences`, `OccurrenceWithTask`, `completeOccurrence`, `undoComplete`, `skipOccurrence`, `postponeOccurrence` (Task 3); `TaskForm` (Task 4); `getHomeWithRooms` from `@/features/homes/queries`
- Produces: a página /rotina funcional

- [ ] **Step 1: Redesenhar `src/app/(app)/rotina/page.tsx`**

Async Server Component. Fluxo:
1. `requireUser()` → `userId`; `getHomeWithRooms(userId)` → se null, `redirect("/onboarding")`
2. `const supabase = await createClient()`
3. `const today = getLocalDateString(home.timezone)`
4. `extendWindowForHome(home.id, home.timezone).catch(() => {})` (não bloqueia renderização)
5. `markMissedOccurrences(supabase, home.id, today).catch(() => {})`
6. Buscar em paralelo (Promise.all): `getTodayOccurrences`, `getOverdueOccurrences`, `getUpcomingOccurrences(7)`
7. Calcular `totalMinutesToday = today.reduce((s, o) => s + o.task.estimated_minutes, 0)`
8. Renderizar: botão "Nova tarefa" (abre `TaskForm` em modo create), seção "Atrasadas (N)" se houver, seção "Hoje — N tarefas · ~X min", seção "Próximas 7 dias"
9. Estado vazio para "Hoje" quando vazio: "Nenhuma tarefa para hoje 🎉"

- [ ] **Step 2: Criar `src/features/tasks/components/task-occurrence-row.tsx`**

Client component. Props:
```ts
{
  occurrence: OccurrenceWithTask;
  today: string; // para calcular "há N dias"
}
```

Renderiza:
- Formulário com `completeOccurrence` (checkbox/botão com `useActionState`)
- Título da tarefa
- Minutos estimados
- Prioridade: cor (alta=vermelho, media=amarelo, baixa=cinza)
- Se `scheduled_for < today`: "Atrasada · há N dias"
- Menu "⋯" (dropdown): "Adiar" → formulário inline com date input + `postponeOccurrence`; "Pular" → `skipOccurrence`; "Desfazer" (se completed) → `undoComplete`

Cada sub-formulário usa `useActionState(action, initialFormState)`.

- [ ] **Step 3: Criar `src/features/tasks/components/task-list.tsx`**

Client component. Props:
```ts
{
  today: OccurrenceWithTask[];
  overdue: OccurrenceWithTask[];
  upcoming: OccurrenceWithTask[];
  currentDate: string; // yyyy-MM-dd
  createTaskAction: typeof createTask;
  rooms: Array<{ id: string; name: string }>;
}
```

Renderiza seções com `TaskOccurrenceRow` por item. Botão "Nova tarefa" abre `TaskForm` em modal ou inline. Estado vazio por seção.

- [ ] **Step 4: Lint + typecheck**

```
npm run lint && npm run typecheck
```

- [ ] **Step 5: Commit**

```
git add src/app/\(app\)/rotina/page.tsx src/features/tasks/components/task-occurrence-row.tsx src/features/tasks/components/task-list.tsx
git commit -m "feat(rotina): página /rotina com tarefas e operações"
```

---

### Task 6: Calendário e histórico

**Files:**
- Modify: `src/features/tasks/queries.ts`
- Create: `src/features/tasks/components/calendar-view.tsx`
- Create: `src/app/(app)/rotina/calendario/page.tsx`
- Create: `src/features/tasks/components/task-history-list.tsx`
- Create: `src/app/(app)/rotina/historico/page.tsx`

**Interfaces:**
- Consumes: `OccurrenceWithTask`, `getLocalDateString` (Tasks 1, 3); `getHomeWithRooms`
- Produces: páginas de calendário e histórico

- [ ] **Step 1: Adicionar queries em `src/features/tasks/queries.ts`**

```ts
// Contagem de ocorrências por dia no mês; inclui pending, completed, skipped
export async function getOccurrencesForMonth(
  supabase: SupabaseClient,
  homeId: string,
  year: number,
  month: number, // 1-12
): Promise<{ date: string; pendingCount: number; completedCount: number }[]>

// Todas ocorrências de uma semana (domingo a sábado)
export async function getOccurrencesForWeek(
  supabase: SupabaseClient,
  homeId: string,
  weekStart: string, // "yyyy-MM-dd" do domingo
): Promise<OccurrenceWithTask[]>

// Histórico: status IN ('completed','skipped','missed')
// INCLUI tasks arquivadas (sem filtrar tasks.status)
// ordenado por scheduled_for DESC, limit=50
export async function getHistory(
  supabase: SupabaseClient,
  homeId: string,
  limit?: number,
): Promise<OccurrenceWithTask[]>
```

- [ ] **Step 2: Criar `src/features/tasks/components/calendar-view.tsx`**

Client component. Props:
```ts
{
  year: number;
  month: number;
  monthData: { date: string; pendingCount: number; completedCount: number }[];
  weekStart: string;
  weekData: OccurrenceWithTask[];
  today: string;
}
```

Usa Tailwind classes responsivas para dois layouts (sem JS media query):
- `block md:hidden` → semana: 7 colunas, cada coluna lista ocorrências do dia
- `hidden md:block` → mês: grade 7×N, cada célula mostra badge de contagem pendente ou ponto verde se todos concluídos

Navegação: links `<` / `>` que atualizam `?week=` ou `?year=&month=` na URL (usar `Link` do Next.js); a página re-renderiza no servidor com novos dados.

- [ ] **Step 3: Criar `src/app/(app)/rotina/calendario/page.tsx`**

Async Server Component. Lê `searchParams.year`, `searchParams.month`, `searchParams.week`. Defaults: mês e semana atuais (calculados com `getLocalDateString`). Busca `getOccurrencesForMonth` e `getOccurrencesForWeek` em paralelo. Renderiza `CalendarView`.

- [ ] **Step 4: Criar `src/features/tasks/components/task-history-list.tsx`**

Client component. Props: `{ occurrences: OccurrenceWithTask[]; }`.

Por item: ícone de status (✓ completada, → pulada, ✗ perdida), título da tarefa, data formatada em pt-BR, minutos. Se `task.status = 'archived'`, mostrar "(arquivada)" em cinza (Review Focus 4: tasks arquivadas aparecem no histórico).

- [ ] **Step 5: Criar `src/app/(app)/rotina/historico/page.tsx`**

Async Server Component. Busca `getHistory(supabase, homeId, 50)`. Renderiza `TaskHistoryList`. Sem filtro por `tasks.status` — inclui tasks arquivadas.

- [ ] **Step 6: Lint + typecheck**

```
npm run lint && npm run typecheck
```

- [ ] **Step 7: Commit**

```
git add src/features/tasks/queries.ts src/features/tasks/components/calendar-view.tsx src/features/tasks/components/task-history-list.tsx src/app/\(app\)/rotina/
git commit -m "feat(rotina): calendário semanal/mensal e histórico"
```

---

### Task 7: Testes E2E e relatório

**Files:**
- Create: `tests/e2e/rotina.spec.ts`
- Create: `docs/etapas/etapa-4-relatorio.md`

**Interfaces:**
- Consumes: todo o módulo de tarefas das tasks anteriores
- Produces: cobertura E2E dos fluxos principais e relatório da etapa

- [ ] **Step 1: Escrever `tests/e2e/rotina.spec.ts`**

Usar `ensureConfirmedUser` de `tests/e2e/helpers/admin.ts`. Cada teste começa com um usuário que já completou o onboarding (admin set `onboarding_completed=true`).

Cenários:
1. **Criar tarefa weekly:** preencher TaskForm → tarefa aparece em /rotina no próximo 7 dias
2. **Concluir ocorrência:** clicar no checkbox da tarefa de hoje → some de "Hoje", aparece em /rotina/historico
3. **Desfazer conclusão no mesmo dia:** após concluir → clicar "Desfazer" → volta para "Hoje"
4. **Pular ocorrência:** clicar "Pular" → aparece no histórico como "pulada"
5. **Adiar ocorrência:** clicar "Adiar" → selecionar data futura → não aparece mais hoje; aparece na data escolhida
6. **Calendário mostra contagem:** navegar para /rotina/calendario → após concluir 1 tarefa, a célula do dia mostra 1 concluída
7. **Arquivar tarefa:** concluir 1 ocorrência → arquivar a tarefa → some de /rotina; aparece em /rotina/historico
8. **Editar regra:** criar tarefa diária → editar para semanal → verificar que ocorrências futuras são semanais e passadas permanecem

- [ ] **Step 2: Lint + typecheck + unit tests**

```
npm run lint && npm run typecheck && npx vitest run
```
Expected: 82+ tests passing.

- [ ] **Step 3: Escrever `docs/etapas/etapa-4-relatorio.md`**

Mesmo formato dos anteriores (pt-BR, sem jargão técnico): o que foi construído, arquivos criados/modificados, dependências (nenhuma nova), testes unitários (count), problemas encontrados durante a implementação, o que falta (testes E2E precisam de Supabase + Next.js rodando para executar).

- [ ] **Step 4: Atualizar `docs/etapas/progresso.md`**

Mudar Etapa 4 de "⏳ Aguardando" para "✅ Completa" com o branch/commit final.

- [ ] **Step 5: Commit final**

```
git add tests/e2e/rotina.spec.ts docs/etapas/etapa-4-relatorio.md docs/etapas/progresso.md
git commit -m "test(e2e): rotina e relatório etapa 4"
```
