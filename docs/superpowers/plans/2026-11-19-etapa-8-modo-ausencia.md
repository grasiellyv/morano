# Etapa 8 — Modo Ausência (Strategy C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um membro marque um período de ausência da casa; durante a ausência, ocorrências `pending` e `missed` desse período são ocultadas da sua view diária na /rotina, sem acumular tarefas perdidas; formulário de configuração em /configuracoes.

**Architecture:** `absence_start DATE` e `absence_end DATE` são adicionados a `home_members` (ausência é individual por membro). `is_absence_suspended` **não** é adicionado a `task_occurrences` — a suspensão é implementada como filtro em `rotina/page.tsx` via `filterAbsenceOccurrences`, função pura que exclui da view diária as ocorrências `pending`/`missed` cujo `scheduled_for` cai no período ativo de ausência do usuário corrente. Ocorrências `completed`/`skipped` são sempre exibidas. `extendWindowForHome` não muda — continua gerando ocorrências normalmente para a home; a ausência é uma camada de apresentação, não de geração. Uma nova feature `src/features/absence/` encapsula schemas, query, actions, componentes e a função de filtro.

**Decisão de arquitetura:** `task_occurrences` não tem `user_id` — ocorrências pertencem à home, não a membros individuais. Um flag `is_absence_suspended` em `task_occurrences` afetaria todos os membros simultaneamente, tornando-o inviável para ausência individual. O filtro em query layer é a única abordagem correta. Reconciliação é zero-cost: alterar ou encerrar ausência recalcula automaticamente na próxima visita — zero escritas retroativas em `task_occurrences`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict + noUncheckedIndexedAccess, Supabase local via Docker, Zod 4.

**Spec:** Requisitos do usuário — Strategy C (suspensão automática, ausência individual por membro em `home_members`).

## Global Constraints

- Zod 4: `{ error: "..." }`, `.trim()` antes de `.min(1)`, `.coerce.number()`
- Homebound security: nunca aceitar `homeId` do cliente — derivar de `profiles.current_home_id`
- `"use server"` no topo dos arquivos de server actions; `"server-only"` nos arquivos de queries
- `useActionState` de `react` (não `react-dom`) para forms client-side
- `FormState` de `@/features/auth/form-state`; `textField` para ler FormData
- TypeScript strict: sem `any`, sem `!` não-nulo, sem `@ts-ignore`
- Sem comentários desnecessários no código; sem emoji no código-fonte
- Grants: sempre por coluna, nunca table-level `grant insert, update`
- **`is_absence_suspended` não existe e não deve ser criado em `task_occurrences`**: suspensão é filtro na camada de apresentação
- **`extendWindowForHome` não deve ser alterado**: gera ocorrências normalmente para a home inteira
- O filtro de ausência aplica-se somente à view diária (`/rotina`); `/rotina/calendario` exibe todas as ocorrências sem filtro de ausência

## Review Focus

1. Ausência de um único dia (`absence_start === absence_end`) — schema (`refine`) e filtro devem aceitar e processar corretamente
2. Ausência expirada (`absence_end < selectedDate`) — banner NÃO deve aparecer; `activeAbsenceRange` deve ser `null`; filtro NÃO deve se aplicar
3. Ocorrência `completed` ou `skipped` durante período de ausência — deve aparecer normalmente (apenas `pending`/`missed` são filtrados)
4. Período alterado retroativamente (ex: encerramento antecipado) — próxima visita à rotina deve refletir o novo período automaticamente; nenhuma escrita em `task_occurrences`
5. `filterAbsenceOccurrences` com `range = null` — deve retornar o array original sem modificações

---

## Task 1: Backend — migration, schemas, queries, actions e testes

**Files:**
- Create: `supabase/migrations/20261119010000_absence.sql`
- Create: `src/features/absence/schemas.ts`
- Create: `src/features/absence/schemas.test.ts`
- Create: `src/features/absence/queries.ts`
- Create: `src/features/absence/queries.test.ts`
- Create: `src/features/absence/actions.ts`

**Interfaces:**
- Produces:
  - `type AbsenceInfo = { absence_start: string; absence_end: string }` — exportado de `queries.ts`
  - `type AbsenceRange = { start: string; end: string } | null` — exportado de `queries.ts`
  - `function filterAbsenceOccurrences<T extends { scheduled_for: string; status: string }>(occurrences: T[], range: AbsenceRange): T[]` — exportado de `queries.ts`
  - `setAbsenceSchema` — Zod schema exportado de `schemas.ts`
  - `getMyAbsence(supabase: SupabaseClient, userId: string): Promise<AbsenceInfo | null>` — de `queries.ts`
  - `setAbsence(_: FormState, fd: FormData): Promise<FormState>` — server action de `actions.ts`
  - `clearAbsence(_fd: FormData): Promise<void>` — server action de `actions.ts`

- [ ] **Step 1: Escrever testes para `setAbsenceSchema`**

Arquivo: `src/features/absence/schemas.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { setAbsenceSchema } from "@/features/absence/schemas";

describe("setAbsenceSchema", () => {
  it("aceita datas válidas na ordem correta", () => {
    expect(
      setAbsenceSchema.safeParse({ absence_start: "2026-11-20", absence_end: "2026-11-25" }).success
    ).toBe(true);
  });

  it("aceita ausência de um único dia (start === end)", () => {
    expect(
      setAbsenceSchema.safeParse({ absence_start: "2026-11-20", absence_end: "2026-11-20" }).success
    ).toBe(true);
  });

  it("rejeita quando absence_end < absence_start", () => {
    const r = setAbsenceSchema.safeParse({ absence_start: "2026-11-25", absence_end: "2026-11-20" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toContain("absence_end");
  });

  it("rejeita formato de data inválido em absence_start", () => {
    expect(
      setAbsenceSchema.safeParse({ absence_start: "não-é-data", absence_end: "2026-11-25" }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Escrever testes para `filterAbsenceOccurrences`**

Arquivo: `src/features/absence/queries.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { filterAbsenceOccurrences } from "@/features/absence/queries";

type TestOcc = { scheduled_for: string; status: string };
const RANGE = { start: "2026-11-20", end: "2026-11-25" };

describe("filterAbsenceOccurrences", () => {
  it("retorna array vazio sem modificação", () => {
    expect(filterAbsenceOccurrences([], RANGE)).toEqual([]);
  });

  it("retorna tudo quando range é null", () => {
    const occs: TestOcc[] = [
      { scheduled_for: "2026-11-21", status: "pending" },
      { scheduled_for: "2026-11-21", status: "missed" },
    ];
    expect(filterAbsenceOccurrences(occs, null)).toEqual(occs);
  });

  it("remove ocorrência pending dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "pending" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual([]);
  });

  it("remove ocorrência missed dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "missed" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual([]);
  });

  it("mantém ocorrência completed dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "completed" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual(occs);
  });

  it("mantém ocorrência skipped dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "skipped" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual(occs);
  });

  it("mantém ocorrência pending fora do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-26", status: "pending" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual(occs);
  });

  it("filtra pending mas mantém completed no mesmo período", () => {
    const pending: TestOcc = { scheduled_for: "2026-11-21", status: "pending" };
    const completed: TestOcc = { scheduled_for: "2026-11-21", status: "completed" };
    expect(filterAbsenceOccurrences([pending, completed], RANGE)).toEqual([completed]);
  });
});
```

- [ ] **Step 3: Rodar testes para confirmar falha esperada**

Comando: `npx vitest run src/features/absence/schemas.test.ts src/features/absence/queries.test.ts`
Esperado: FAIL — `Cannot find module '@/features/absence/schemas'` e `...queries`

- [ ] **Step 4: Criar migration**

Arquivo: `supabase/migrations/20261119010000_absence.sql`

```sql
alter table public.home_members
  add column absence_start date,
  add column absence_end date,
  add constraint home_members_absence_check check (
    (absence_start is null and absence_end is null)
    or (absence_start is not null and absence_end is not null and absence_end >= absence_start)
  );

grant update (absence_start, absence_end) on public.home_members to authenticated;
```

Após criar: `npx supabase migration up`

- [ ] **Step 5: Implementar `setAbsenceSchema` em `src/features/absence/schemas.ts`**

```ts
import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const setAbsenceSchema = z
  .object({
    absence_start: z.string().trim().regex(dateRegex, { error: "Data de início inválida" }),
    absence_end: z.string().trim().regex(dateRegex, { error: "Data de término inválida" }),
  })
  .refine((d) => d.absence_end >= d.absence_start, {
    error: "Data de término deve ser igual ou posterior à data de início",
    path: ["absence_end"],
  });
```

- [ ] **Step 6: Implementar `src/features/absence/queries.ts`**

`import "server-only"` no topo.

```ts
export type AbsenceInfo = { absence_start: string; absence_end: string };
export type AbsenceRange = { start: string; end: string } | null;

export async function getMyAbsence(
  supabase: SupabaseClient,
  userId: string,
): Promise<AbsenceInfo | null>
```

Lógica de `getMyAbsence`:
1. Busca `profiles.current_home_id` para `userId` via `.maybeSingle()`; retorna `null` se ausente
2. Busca `home_members` selecionando `absence_start, absence_end` onde `user_id = userId AND home_id = homeId` via `.maybeSingle()`
3. Se ambos `absence_start` e `absence_end` não-null, retorna `{ absence_start, absence_end }`; senão `null`

```ts
export function filterAbsenceOccurrences<T extends { scheduled_for: string; status: string }>(
  occurrences: T[],
  range: AbsenceRange,
): T[]
```

Lógica de `filterAbsenceOccurrences`:
- Se `range` é `null`: retornar `occurrences` sem modificação
- Senão: retornar apenas ocorrências onde `scheduled_for < range.start || scheduled_for > range.end` OU `status !== "pending" && status !== "missed"`

- [ ] **Step 7: Implementar actions em `src/features/absence/actions.ts`**

`"use server"` no topo.

**`setAbsence(_: FormState, fd: FormData): Promise<FormState>`**
1. `requireUser()` → `userId`
2. `createClient()` → `supabase`
3. `setAbsenceSchema.safeParse({ absence_start: textField(fd, "absence_start"), absence_end: textField(fd, "absence_end") })` — retornar `{ status: "error", fieldErrors: ... }` se inválido
4. Buscar `profiles.current_home_id` → `homeId` via `.maybeSingle()`; retornar `{ status: "error", message: "Residência não encontrada" }` se null
5. `UPDATE home_members SET absence_start, absence_end WHERE user_id = userId AND home_id = homeId`; retornar `{ status: "error", message: "Erro ao salvar" }` se `error`
6. `revalidatePath("/rotina")` + `revalidatePath("/configuracoes")`
7. Retornar `{ status: "success", message: "Modo ausência ativado" }`

**`clearAbsence(_fd: FormData): Promise<void>`**
1. `requireUser()` → `userId` (swallow error, retornar void)
2. `createClient()` → `supabase`
3. Buscar `profiles.current_home_id` → `homeId`; retornar void se null
4. `UPDATE home_members SET absence_start = null, absence_end = null WHERE user_id = userId AND home_id = homeId`; swallow error
5. `revalidatePath("/rotina")` + `revalidatePath("/configuracoes")`

- [ ] **Step 8: Rodar testes para confirmar que passam**

Comando: `npx vitest run src/features/absence/schemas.test.ts src/features/absence/queries.test.ts`
Esperado: PASS — 4 + 8 = 12 casos

- [ ] **Step 9: Rodar suite completa e confirmar sem regressões**

Comando: `npm test`
Esperado: todos os testes passam (mínimo 155 + 12 novos = 167)

- [ ] **Step 10: Verificar tipos**

Comando: `npx tsc --noEmit`
Esperado: 0 erros

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20261119010000_absence.sql \
        src/features/absence/schemas.ts \
        src/features/absence/schemas.test.ts \
        src/features/absence/queries.ts \
        src/features/absence/queries.test.ts \
        src/features/absence/actions.ts \
        docs/superpowers/plans/2026-11-19-etapa-8-modo-ausencia.md
git commit -m "feat(ausencia): backend — migration, schemas, filtro e actions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: UI — banner em /rotina, filtro aplicado na página e formulário em /configuracoes

**Files:**
- Create: `src/features/absence/components/absence-banner.tsx`
- Create: `src/features/absence/components/absence-form.tsx`
- Modify: `src/features/tasks/components/task-list.tsx`
- Modify: `src/app/(app)/rotina/page.tsx`
- Modify: `src/app/(app)/configuracoes/page.tsx`

**Interfaces:**
- Consumes:
  - `AbsenceInfo`, `AbsenceRange`, `getMyAbsence`, `filterAbsenceOccurrences` — de `src/features/absence/queries.ts`
  - `setAbsence`, `clearAbsence` — de `src/features/absence/actions.ts`
  - Props atuais de `TaskList`; `weekNav: React.ReactNode` como referência do padrão
- Produces:
  - `AbsenceBanner({ absenceEnd: string; clearAbsenceAction: (_fd: FormData) => Promise<void> })` — sem `"use client"`
  - `AbsenceForm({ currentAbsence: AbsenceInfo | null; setAbsenceAction: (_: FormState, fd: FormData) => Promise<FormState>; clearAbsenceAction: (_fd: FormData) => Promise<void> })` — `"use client"`
  - `TaskList` com novo prop opcional `absenceBanner?: React.ReactNode`

- [ ] **Step 1: Implementar `AbsenceBanner`**

Arquivo: `src/features/absence/components/absence-banner.tsx` — sem `"use client"`

Props: `{ absenceEnd: string; clearAbsenceAction: (_fd: FormData) => Promise<void> }`

Renderiza `<div role="alert">` com:
- Texto: `"Você está em modo ausência até "` + `format(parseISO(absenceEnd), "dd/MM/yyyy")` de `date-fns`
- `<form action={clearAbsenceAction}><button type="submit">Encerrar ausência</button></form>`

- [ ] **Step 2: Implementar `AbsenceForm`**

Arquivo: `src/features/absence/components/absence-form.tsx` — `"use client"`

Props:
```ts
{
  currentAbsence: AbsenceInfo | null;
  setAbsenceAction: (_: FormState, fd: FormData) => Promise<FormState>;
  clearAbsenceAction: (_fd: FormData) => Promise<void>;
}
```

- `const [state, action, pending] = useActionState(setAbsenceAction, { status: "idle" })`
- `<form action={action}>` com dois `<input type="date" name="absence_start/end">` preenchidos com `currentAbsence?.absence_start ?? ""` e `currentAbsence?.absence_end ?? ""`
- Exibe `state.message` em erro/sucesso
- Exibe `state.fieldErrors?.absence_end` abaixo do campo de fim
- Se `currentAbsence !== null`: exibe `<form action={clearAbsenceAction}><button type="submit">Encerrar ausência</button></form>` abaixo do formulário de set

- [ ] **Step 3: Adicionar `absenceBanner` ao TaskList**

Arquivo: `src/features/tasks/components/task-list.tsx`

Adicionar `absenceBanner?: React.ReactNode` ao tipo de props e renderizar antes do `weekNav` (início do conteúdo renderizado do componente).

- [ ] **Step 4: Atualizar `rotina/page.tsx` — buscar ausência, aplicar filtro, compor banner**

Arquivo: `src/app/(app)/rotina/page.tsx`

Adicionar imports:
```ts
import { getMyAbsence, filterAbsenceOccurrences, type AbsenceRange } from "@/features/absence/queries";
import { clearAbsence } from "@/features/absence/actions";
import { AbsenceBanner } from "@/features/absence/components/absence-banner";
```

Adicionar `getMyAbsence(supabase, user.id)` ao `Promise.all` existente.

Após resolver, calcular `activeAbsenceRange` e aplicar filtro:
```ts
const activeAbsenceRange: AbsenceRange =
  absence !== null &&
  absence.absence_start <= selectedDate &&
  absence.absence_end >= selectedDate
    ? { start: absence.absence_start, end: absence.absence_end }
    : null;

const filteredOccurrences = filterAbsenceOccurrences(occurrences, activeAbsenceRange);

const isAbsent =
  absence !== null &&
  absence.absence_start <= currentDate &&
  absence.absence_end >= currentDate;

const absenceBanner = isAbsent ? (
  <AbsenceBanner absenceEnd={absence.absence_end} clearAbsenceAction={clearAbsence} />
) : undefined;
```

Passar `filteredOccurrences` (em vez dos `occurrences` brutos) e `absenceBanner` ao `<TaskList />`.

- [ ] **Step 5: Substituir EmptyState em `/configuracoes/page.tsx` pelo conteúdo real**

Arquivo: `src/app/(app)/configuracoes/page.tsx`

Transformar em async Server Component. Importar `requireUser`, `createClient`, `getMyAbsence`, `setAbsence`, `clearAbsence`, `AbsenceForm`.

Buscar dados:
1. `const user = await requireUser()`
2. `const supabase = await createClient()` + `getMyAbsence(supabase, user.id)` → `currentAbsence`

Renderizar duas seções:
1. `<PageHeader title="Configurações" />` + parágrafo com `user.email` em modo read-only
2. `<section>` com heading "Modo ausência" + `<AbsenceForm currentAbsence={currentAbsence} setAbsenceAction={setAbsence} clearAbsenceAction={clearAbsence} />`

- [ ] **Step 6: Rodar suite completa e confirmar sem regressões**

Comando: `npm test`
Esperado: todos os testes passam (mínimo 167)

- [ ] **Step 7: Verificar tipos**

Comando: `npx tsc --noEmit`
Esperado: 0 erros

- [ ] **Step 8: Commit**

```bash
git add src/features/absence/components/absence-banner.tsx \
        src/features/absence/components/absence-form.tsx \
        src/features/tasks/components/task-list.tsx \
        src/app/(app)/rotina/page.tsx \
        src/app/(app)/configuracoes/page.tsx
git commit -m "feat(ausencia): UI — filtro na rotina, banner e formulário em /configuracoes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
