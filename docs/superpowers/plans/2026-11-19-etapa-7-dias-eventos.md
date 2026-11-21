# Etapa 7 — Navegação por Dias e Eventos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar navegação dia-a-dia na rotina (semana começa segunda, navegar entre semanas) e uma nova entidade `events` com CRUD completo, visível no calendário existente.

**Architecture:** Três frentes independentes — (1) banco + backend para eventos, (2) navegação de dias na rotina via URL params, (3) UI de eventos no calendário. Eventos NÃO alteram tarefas automaticamente.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict + noUncheckedIndexedAccess, Tailwind CSS, Supabase local (port 54322), Zod 4, date-fns (já instalado).

**Spec:** Planejamento técnico revisado (Etapas 6–9) — Artifact https://claude.ai/artifact/SzYxtqTEmwUfYodLM4QuNg

## Global Constraints

- Preservar comportamento existente do calendário (`/rotina/calendario`) — `getOccurrencesForWeek` e `CalendarView` não devem ser alterados
- `homeId` sempre derivado de `profiles.current_home_id` via `requireUser()` — nunca aceitar do cliente
- RLS em todas as tabelas novas; GRANTs explícitos (sem SELECT * implícito)
- `created_by` em `events`: DEFAULT `auth.uid()` — NOT em INSERT grant
- Zod 4: `.trim().min(1, { error: "..." })`, `.coerce.number()`, sem `.transform()` antes de `.min()`
- `"use server"` no topo de actions; `import "server-only"` no topo de queries
- `useActionState` do React para forms cliente
- `FormState` de `@/features/auth/form-state`: `{ status: "idle"|"error"|"success", message?, fieldErrors? }`
- TypeScript strict: sem `any`, sem `!` não-nulo, sem `@ts-ignore`
- Semana começa segunda-feira; navegar entre semanas via `?date=YYYY-MM-DD` (dia selecionado)
- Eventos multi-dia: aparecem em TODOS os dias do intervalo `[start_date, end_date]`
- Sem emoji no código-fonte; sem comentários desnecessários

## Review Focus

1. Tarefa com `scheduled_for` fora da semana atual aparecendo na rotina de outro dia
2. Evento multi-dia (viagem) não aparecendo nos dias intermediários
3. `created_by` sendo aceito no INSERT via FormData (deve ser ignorado — DEFAULT do DB)
4. RLS em `events` permitindo ver eventos de outra residência
5. Semana navegada via URL `?date=`: dia inválido ou fora do range causando redirect loop

---

## Task 1: Backend — migration, schemas, queries, actions

**Files:**
- Create: `supabase/migrations/20261119000000_events.sql`
- Create: `src/features/events/schemas.ts`
- Create: `src/features/events/queries.ts`
- Create: `src/features/events/actions.ts`
- Test: `src/features/events/schemas.test.ts`

**Interfaces:**
- Produces para Task 3:
  ```ts
  export type Event = {
    id: string;
    home_id: string;
    title: string;
    event_type: "aniversario"|"viagem"|"jantar"|"consulta_medica"|"visita"|"manutencao"|"feriado"|"outros";
    start_date: string;        // "yyyy-MM-dd"
    end_date: string | null;   // null = single-day
    start_time: string | null; // "HH:mm:ss" or null
    end_time: string | null;
    description: string | null;
    created_at: string;
  };
  export async function getEventsForRange(
    supabase: SupabaseClient<Database>,
    homeId: string,
    from: string,  // inclusive, "yyyy-MM-dd"
    to: string,    // inclusive, "yyyy-MM-dd"
  ): Promise<Event[]>
  ```
  
  Actions (Server Actions):
  ```ts
  export async function createEvent(_: FormState, fd: FormData): Promise<FormState>
  export async function updateEvent(_: FormState, fd: FormData): Promise<FormState>
  export async function deleteEvent(_: FormState, fd: FormData): Promise<FormState>
  ```

- [ ] **Step 1: Escrever a migration**

Arquivo: `supabase/migrations/20261119000000_events.sql`

```sql
-- enum
create type public.event_type as enum (
  'aniversario','viagem','jantar','consulta_medica','visita','manutencao','feriado','outros'
);

-- tabela
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  home_id     uuid not null references public.homes(id) on delete cascade,
  title       text not null,
  event_type  public.event_type not null default 'outros',
  start_date  date not null,
  end_date    date,
  start_time  time,
  end_time    time,
  description text,
  created_by  uuid not null references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint  events_dates_check check (end_date is null or end_date >= start_date)
);

-- índices
create index events_home_date_idx on public.events (home_id, start_date);

-- RLS
alter table public.events enable row level security;

revoke all on public.events from anon, authenticated;
grant select, insert, update, delete on public.events to authenticated;

-- INSERT grant: NÃO incluir home_id (derivado de profiles), NÃO incluir created_by (DEFAULT auth.uid())
-- CORRIGIR: home_id DEVE estar no INSERT grant — será preenchido pela action via profiles.current_home_id
grant insert (title, event_type, start_date, end_date, start_time, end_time, description, home_id)
  on public.events to authenticated;
grant update (title, event_type, start_date, end_date, start_time, end_time, description)
  on public.events to authenticated;

-- policies
create policy events_select on public.events
  for select using (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
create policy events_insert on public.events
  for insert with check (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
create policy events_update on public.events
  for update using (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
create policy events_delete on public.events
  for delete using (
    home_id = (select current_home_id from public.profiles where id = auth.uid())
  );
```

- [ ] **Step 2: Aplicar a migration localmente**

Comando: `npx supabase migration up --local`
Esperado: `Applying migration 20261119000000_events.sql... ok`

- [ ] **Step 3: Regenerar tipos**

Comando: `npx supabase gen types typescript --local > src/types/database.ts`
Verificar: `event_type` enum presente, tabela `events` presente.

- [ ] **Step 4: Escrever testes para os schemas**

Arquivo: `src/features/events/schemas.test.ts`

Testar `createEventSchema` e `updateEventSchema`:
```ts
// createEventSchema — válidos
{ title: "Aniversário João", event_type: "aniversario", start_date: "2026-11-25" }
// → sucesso

{ title: "  Viagem SP  ", event_type: "viagem", start_date: "2026-11-25", end_date: "2026-11-27" }
// → título trimmed "Viagem SP"

// createEventSchema — inválidos
{ title: "   ", event_type: "aniversario", start_date: "2026-11-25" }
// → fieldError em title

{ title: "Teste", event_type: "tipo_invalido", start_date: "2026-11-25" }
// → fieldError em event_type

{ title: "Teste", event_type: "viagem", start_date: "2026-11-27", end_date: "2026-11-25" }
// → atenção: Zod não valida start<=end (isso é constraint do DB); schema aceita

// deleteEventSchema — válido
{ id: "00000000-0000-1000-8000-000000000001" }
// → sucesso
```

- [ ] **Step 5: Rodar testes para confirmar falha esperada**

Comando: `npx vitest run src/features/events/schemas.test.ts`
Esperado: FAIL — módulo não encontrado

- [ ] **Step 6: Implementar `src/features/events/schemas.ts`**

Exportar:
```ts
export const createEventSchema = z.object({
  title: z.string().trim().min(1, { error: "Título obrigatório" }).max(200),
  event_type: z.enum(["aniversario","viagem","jantar","consulta_medica","visita","manutencao","feriado","outros"]).default("outros"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida" }),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform(v => v || null),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")).transform(v => v || null),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")).transform(v => v || null),
  description: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
});
export const updateEventSchema = createEventSchema.extend({ id: z.string().uuid() });
export const deleteEventSchema = z.object({ id: z.string().uuid() });
```

- [ ] **Step 7: Rodar testes para confirmar que passam**

Comando: `npx vitest run src/features/events/schemas.test.ts`
Esperado: PASS

- [ ] **Step 8: Implementar `src/features/events/queries.ts`**

```ts
import "server-only";
// getEventsForRange: retorna eventos cujo intervalo [start_date, end_date] sobrepõe [from, to]
// Evento single-day (end_date null): pertence ao dia se start_date = from..to
// Evento multi-day: pertence se start_date <= to AND (end_date is null OR end_date >= from)
```

Query SQL lógica:
```sql
WHERE home_id = $homeId
  AND start_date <= $to
  AND (end_date IS NULL AND start_date >= $from
       OR end_date IS NOT NULL AND end_date >= $from)
```

Usando Supabase:
```ts
supabase.from("events")
  .select("id, home_id, title, event_type, start_date, end_date, start_time, end_time, description, created_at")
  .eq("home_id", homeId)
  .lte("start_date", to)
  .or(`end_date.is.null.and.start_date.gte.${from},end_date.gte.${from}`)
  .order("start_date", { ascending: true })
```

- [ ] **Step 9: Implementar `src/features/events/actions.ts`**

Pattern das actions (igual shopping):
1. `requireUser()` → userId
2. `supabase.from("profiles").select("current_home_id").eq("id", userId).maybeSingle()` → homeId
3. Parse com schema
4. INSERT/UPDATE/DELETE com homeId verificado por RLS
5. `revalidatePath("/rotina")` + `revalidatePath("/rotina/calendario")`

`createEvent`: INSERT sem `created_by` (DB default) e sem `id` (DB default gen_random_uuid())
`updateEvent`: UPDATE filtrando por `id` + `.select("id")` para detectar 0 rows
`deleteEvent`: DELETE filtrando por `id` + `.select("id")` para detectar 0 rows

- [ ] **Step 10: Rodar suite completa**

Comando: `npm test`
Esperado: todos os testes passam (mínimo 141 existentes + novos)

- [ ] **Step 11: Verificar tipos**

Comando: `npx tsc --noEmit`
Esperado: 0 erros

- [ ] **Step 12: Commit**

```bash
git add supabase/migrations/20261119000000_events.sql \
        src/types/database.ts \
        src/features/events/schemas.ts \
        src/features/events/queries.ts \
        src/features/events/actions.ts \
        src/features/events/schemas.test.ts
git commit -m "feat(eventos): backend — migration, schemas, queries e actions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Navegação de dias na rotina

**Files:**
- Create: `src/features/tasks/components/week-nav.tsx`
- Modify: `src/app/(app)/rotina/page.tsx`
- Modify: `src/features/tasks/components/task-list.tsx`

**Interfaces:**
- Consumes de Task 1: nenhuma dependência direta
- Produces para Task 3: `selectedDate: string` disponível na page para buscar eventos
- `WeekNav` props:
  ```ts
  { selectedDate: string; today: string }
  // Linka para ?date=YYYY-MM-DD; semana começa segunda (ISO)
  ```
- Rotina page passa `today={currentDate}` e aceita `searchParams.date`

- [ ] **Step 1: Implementar `WeekNav`**

Arquivo: `src/features/tasks/components/week-nav.tsx` — `"use client"` NÃO é necessário (é um Server Component com Links)

Lógica:
- Recebe `selectedDate: string` e `today: string`
- Calcula a semana ISO (segunda a domingo) que contém `selectedDate`
  - Usar `date-fns`: `startOfISOWeek(parseISO(selectedDate))` retorna a segunda
- Renderiza 7 botões/links (Seg a Dom), cada um linkando para `?date=YYYY-MM-DD`
- Dia selecionado: destaque visual (fundo primário ou borda)
- Hoje: ponto/indicador visual
- Botões "Semana anterior" e "Próxima semana": link para `?date=` da segunda da semana anterior/seguinte
- Sem estado interno — tudo via URL

- [ ] **Step 2: Modificar `src/app/(app)/rotina/page.tsx`**

Adicionar `searchParams` às props:
```ts
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
})
```

Lógica de `selectedDate`:
```ts
const params = await searchParams;
const dateRaw = typeof params["date"] === "string" ? params["date"] : null;
const selectedDate =
  dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : currentDate;
```

Trocar `getTodayOccurrences(supabase, home.id, currentDate)` por uma versão que filtra pelo dia selecionado.

**ATENÇÃO:** `getTodayOccurrences` já usa `scheduled_for = today`. Para o dia selecionado basta passar `selectedDate` como o parâmetro `today`. NÃO criar nova query — reutilizar `getTodayOccurrences(supabase, home.id, selectedDate)`.

Remover `getOverdueOccurrences` e `getUpcomingOccurrences` da chamada principal — com navegação de dias não faz sentido mostrar "próximas 7 dias" abaixo do dia selecionado. Manter apenas `todayOcc` para o dia selecionado.

Adicionar `WeekNav` ao JSX (passado como prop para `TaskList` ou renderizado diretamente na page).

- [ ] **Step 3: Adaptar `TaskList` para modo dia único**

`TaskList` recebe `overdue` e `upcoming` opcionalmente — tornar opcionais com default `[]`:
```ts
type Props = {
  today: OccurrenceWithTask[];
  overdue?: OccurrenceWithTask[];
  upcoming?: OccurrenceWithTask[];
  currentDate: string;
  selectedDate: string;      // novo — pode diferir de currentDate
  createTaskAction: ...;
  rooms: ...;
  weekNav: React.ReactNode;  // slot para o WeekNav
};
```

Renderizar `weekNav` acima da seção principal.
Adaptar o título da seção "Hoje" para usar `selectedDate`:
- Se `selectedDate === currentDate`: exibir "Hoje"
- Caso contrário: exibir a data formatada (ex: "Ter, 18 nov")

- [ ] **Step 4: Rodar testes**

Comando: `npm test`
Esperado: todos os testes passam

- [ ] **Step 5: Verificar tipos**

Comando: `npx tsc --noEmit`
Esperado: 0 erros

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/components/week-nav.tsx \
        src/app/(app)/rotina/page.tsx \
        src/features/tasks/components/task-list.tsx
git commit -m "feat(rotina): navegação de dias e semanas via URL param

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: UI de eventos — CRUD e exibição no calendário

**Files:**
- Create: `src/features/events/components/event-form.tsx`
- Create: `src/features/events/components/event-chip.tsx`
- Modify: `src/app/(app)/rotina/page.tsx` (adicionar eventos do dia)
- Modify: `src/app/(app)/rotina/calendario/page.tsx` (adicionar eventos ao CalendarView)
- Modify: `src/features/tasks/components/calendar-view.tsx` (renderizar eventos)
- Modify: `src/features/tasks/components/task-list.tsx` (mostrar eventos do dia selecionado)

**Interfaces:**
- Consumes de Task 1: `Event`, `getEventsForRange`, `createEvent`, `updateEvent`, `deleteEvent`
- Consumes de Task 2: `selectedDate` já disponível na rotina page

- [ ] **Step 1: Implementar `EventChip`**

Arquivo: `src/features/events/components/event-chip.tsx`

Componente simples para exibir um evento em linha (no calendário ou na lista do dia):
```ts
type Props = { event: Event; compact?: boolean }
```
- Cor por tipo de evento (mapeamento fixo de `event_type` → cor Tailwind)
- Exibir título + ícone de texto do tipo (ex: "Aniversário", "Viagem")
- `compact=true`: versão pequena para o calendário mensal

- [ ] **Step 2: Implementar `EventForm`**

Arquivo: `src/features/events/components/event-form.tsx` — `"use client"`

Usar `useActionState` para create e update.
Campos: título (obrigatório), tipo (select), data início (obrigatório), data fim (opcional), hora início/fim (opcionais), descrição (opcional).
Exibir erros de campo via `state.fieldErrors`.
Props:
```ts
type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<Event>;
  createAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  updateAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  onSuccess?: () => void;
};
```

- [ ] **Step 3: Exibir eventos na rotina (dia selecionado)**

Modificar `src/app/(app)/rotina/page.tsx`:
```ts
const events = homeId 
  ? await getEventsForRange(supabase, home.id, selectedDate, selectedDate)
  : [];
```
Passar `events` e `createEvent` como props para `TaskList`.

Modificar `TaskList` para renderizar seção "Eventos" acima das tarefas, com botão "Novo evento" e lista de `EventChip`. Se não houver eventos, não exibir a seção.

- [ ] **Step 4: Exibir eventos no calendário**

Modificar `src/app/(app)/rotina/calendario/page.tsx`:
```ts
// Buscar eventos para o mês inteiro
const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
const monthEnd = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
const eventsData = await getEventsForRange(supabase, home.id, monthStart, monthEnd);
```
Passar `eventsData` para `CalendarView`.

Modificar `CalendarView` para aceitar `events?: Event[]` e renderizar `EventChip` em cada dia que tenha eventos. Eventos multi-dia: calcular quais dias do mês pertencem ao intervalo e renderizar em cada um.

- [ ] **Step 5: Rodar suite completa**

Comando: `npm test`
Esperado: todos os testes passam

- [ ] **Step 6: Verificar tipos**

Comando: `npx tsc --noEmit`
Esperado: 0 erros

- [ ] **Step 7: Commit**

```bash
git add src/features/events/components/ \
        src/app/(app)/rotina/page.tsx \
        src/app/(app)/rotina/calendario/page.tsx \
        src/features/tasks/components/calendar-view.tsx \
        src/features/tasks/components/task-list.tsx
git commit -m "feat(eventos): UI — chips, formulário, exibição na rotina e calendário

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
