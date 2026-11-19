# Etapa 3 — Casa e onboarding: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 4-step onboarding wizard (home creation, rooms, routine level, task review/approval) and the Minha Casa page (home data + rooms CRUD).

**Architecture:** Static catalog in TypeScript drives suggested tasks; server actions handle each wizard step and update `profiles.onboarding_step`; `(app)/layout.tsx` redirects incomplete users to `/onboarding`; Minha Casa is a server component with inline edit forms.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind 4, shadcn v4, Supabase @supabase/ssr, Zod 4, React Hook Form 7, `useActionState`, `server-only`.

**Spec:** `docs/superpowers/specs/2026-11-18-morano-mvp-design.md` §6 (onboarding), §8 (DB), §15 (single home per user).

## Global Constraints

- Never expose SUPABASE_SECRET_KEY in client code; keep in `src/lib/supabase/admin.ts` (server-only).
- TypeScript strict + `noUncheckedIndexedAccess` — no `any`, no `!` on nullable values without guard.
- Tailwind 4: tokens in `src/app/globals.css`; no arbitrary values when a token exists.
- Form pattern: `useActionState` + `useForm(zodResolver)` + `useValidatedSubmit` from `src/features/auth/components/use-validated-submit.ts`; `FormState`/`initialFormState`/`fieldErrorsFrom` from `src/features/auth/form-state.ts`.
- DB enums (exact strings): `property_type` → "apartamento"|"casa"|"sobrado"|"studio_kitnet"|"outro"; `ownership_type` → "proprio"|"alugado"|"outro"; `household_type` → "sozinho"|"casal"|"familia"|"compartilhada"|"outro"; `room_type` → "sala"|"cozinha"|"quarto"|"banheiro"|"lavanderia"|"escritorio"|"varanda"|"garagem"|"outro"; `routine_level` → "leve"|"equilibrada"|"detalhada".
- DB column grants (from migrations): `profiles` update: `onboarding_step, onboarding_completed, current_home_id, last_seen_at`; `homes` insert: `name, property_type, ownership_type, household_type, resident_count, available_minutes_per_week, routine_level, timezone, created_by`; `homes` update: same minus `created_by`; `rooms` insert: `(home_id, name, room_type, position)`; `rooms` update: `(name, room_type, position)`.
- Key rule: casa created at step 1, rooms at step 2, level/time saved at step 3, tasks only at step 4 "Aprovar". Nothing written to `tasks`/`routines`/`task_occurrences` before approval.
- Step→route: `onboarding_step` 0→`/onboarding/residencia`, 1→`/onboarding/comodos`, 2→`/onboarding/rotina`, 3→`/onboarding/revisao`; `onboarding_completed=true`→`/inicio`.
- Timezone: client-side `TimezoneDetector` fills hidden `<input name="timezone">` with `Intl.DateTimeFormat().resolvedOptions().timeZone`; fallback `"America/Sao_Paulo"`; DB trigger validates.
- Telemetry: `src/lib/telemetry.ts` (server-only), inserts into `product_events(user_id, home_id, event_name)`; `event_name` must match `^[a-z_]{3,50}$`.
- All copy in pt-BR.
- `requireUser()` from `src/lib/auth/require-user.ts` returns `{ id: string; email: string }`.

## Review Focus

1. **Tasks inserted before "Aprovar"** — `approveRoutine` is the only action that writes to `tasks`/`routines`/`task_occurrences`; `saveRotina` saves only `homes.routine_level` and `homes.available_minutes_per_week`.
2. **Timezone injection** — if `TimezoneDetector` JS doesn't run (SSR, slow JS), form must still submit with the fallback value (hidden input default).
3. **Resuming mid-wizard** — user closes browser at step 2; on return, `(app)/layout.tsx` reads `onboarding_step=1` and redirects to `/onboarding/comodos` (not step 0).
4. **RLS on homes/rooms insert** — server action must pass `created_by: userId` on homes insert; rooms insert uses `home_id` from `profiles.current_home_id` (never from client input).
5. **Minha Casa with no home** — if `profiles.current_home_id` is null (edge case: onboarding not completed), `(app)/layout.tsx` redirects to `/onboarding` before the Casa page renders.

---

### Task 1: Catálogo estático e schemas do onboarding

**Files:**
- Create: `src/features/onboarding/catalog.ts`
- Create: `src/features/onboarding/catalog.test.ts`
- Create: `src/features/onboarding/schemas.ts`
- Create: `src/features/onboarding/schemas.test.ts`

**Interfaces:**
- Produces: `CatalogTask`, `filterCatalog(rooms, level, availableMinutes): CatalogTask[]` — consumed by Tasks 2 and 5.
- Produces: `residenciaSchema`, `comodoSchema`, `rotinaSchema`, `revisaoTaskSchema` — consumed by Task 2.

- [ ] **Step 1: Write catalog tests**

```ts
// catalog.test.ts
it("returns no tasks for 0 minutes", () => {
  expect(filterCatalog(["cozinha"], "detalhada", 0)).toHaveLength(0);
});
it("detalhada returns more tasks than leve for same room/minutes", () => {
  const leve = filterCatalog(["sala"], "leve", 120);
  const det  = filterCatalog(["sala"], "detalhada", 120);
  expect(det.length).toBeGreaterThanOrEqual(leve.length);
});
it("filters to rooms present", () => {
  const tasks = filterCatalog(["quarto"], "equilibrada", 999);
  expect(tasks.every(t => t.room_type === "quarto")).toBe(true);
});
it("respects available minutes (sum of estimated_minutes ≤ availableMinutes*0.5 as soft hint)", () => {
  // soft: at minimum 1 task returned when minutes > 0 and catalog has entries for the room
  const tasks = filterCatalog(["cozinha"], "leve", 20);
  expect(tasks.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run failing**

`npx vitest run src/features/onboarding/catalog.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `catalog.ts`**

Type:
```ts
export type CatalogTask = {
  id: string;           // stable slug, e.g. "cozinha_lavar_louça"
  room_type: RoomType;
  title: string;
  estimated_minutes: number;
  frequency_type: "daily" | "weekly" | "biweekly" | "monthly";
  min_level: "leve" | "equilibrada" | "detalhada"; // minimum level that includes this task
  priority: "baixa" | "media" | "alta";
};
```

`filterCatalog(rooms: RoomType[], level: RoutineLevel, availableMinutes: number): CatalogTask[]`:
- Filter `CATALOG` to tasks where `room_type ∈ rooms` and `levelOrder[task.min_level] ≤ levelOrder[level]`.
- Sort by estimated_minutes ASC. Accumulate until sum exceeds `availableMinutes`; include the task that crosses the limit if it's the first (at least 1 per room). Return the list.

Level order: `leve=0, equilibrada=1, detalhada=2`.

Catalog content (at least 3 tasks per common room_type, covering all levels — exact titles at implementer's discretion, all in pt-BR, no technical maintenance):
- Rooms to cover: sala, cozinha, quarto, banheiro, lavanderia (others optional).
- Example entries: "Lavar louça" (cozinha, daily, 15min, leve), "Limpar fogão" (cozinha, weekly, 20min, equilibrada), "Organizar geladeira" (cozinha, monthly, 30min, detalhada), "Passar aspirador" (sala, weekly, 20min, leve), etc.

- [ ] **Step 4: Write schema tests**

```ts
// schemas.test.ts
it("residenciaSchema rejects empty name", () => {
  expect(residenciaSchema.safeParse({ name: "", property_type: "casa", ... }).success).toBe(false);
});
it("comodoSchema rejects empty rooms array", () => {
  expect(comodoSchema.safeParse({ rooms: [] }).success).toBe(false);
});
it("rotinaSchema validates routine_level enum", () => {
  expect(rotinaSchema.safeParse({ routine_level: "invalido", available_minutes_per_week: 60 }).success).toBe(false);
});
```

- [ ] **Step 5: Implement `schemas.ts`**

```ts
export const residenciaSchema = z.object({
  name: z.string().min(1).max(100),
  property_type: z.enum(["apartamento","casa","sobrado","studio_kitnet","outro"]),
  ownership_type: z.enum(["proprio","alugado","outro"]),
  household_type: z.enum(["sozinho","casal","familia","compartilhada","outro"]),
  resident_count: z.coerce.number().int().min(1).max(20),
  timezone: z.string().min(1),
});

export const comodoSchema = z.object({
  rooms: z.array(z.object({
    name: z.string().min(1).max(60),
    room_type: z.enum(["sala","cozinha","quarto","banheiro","lavanderia","escritorio","varanda","garagem","outro"]),
  })).min(1, "Adicione ao menos um cômodo"),
});

export const rotinaSchema = z.object({
  routine_level: z.enum(["leve","equilibrada","detalhada"]),
  available_minutes_per_week: z.coerce.number().int().min(10).max(2000),
});

export const revisaoTaskSchema = z.object({
  id: z.string(),         // catalog task id
  include: z.boolean(),
  title: z.string().min(1).max(200),
  estimated_minutes: z.coerce.number().int().min(1),
  frequency_type: z.enum(["once","daily","weekly","biweekly","monthly"]),
});
```

- [ ] **Step 6: Run all tests passing**

`npx vitest run src/features/onboarding/`
Expected: all PASS.

- [ ] **Step 7: Commit**

```
git add src/features/onboarding/catalog.ts src/features/onboarding/catalog.test.ts \
        src/features/onboarding/schemas.ts src/features/onboarding/schemas.test.ts
git commit -m "feat(onboarding): catálogo estático de rotinas e schemas de validação"
```

---

### Task 2: Server actions e telemetria

**Files:**
- Create: `src/lib/telemetry.ts`
- Create: `src/features/onboarding/actions.ts`

**Interfaces:**
- Consumes: `residenciaSchema`, `comodoSchema`, `rotinaSchema`, `revisaoTaskSchema` from Task 1; `CatalogTask` from Task 1.
- Consumes: `FormState`, `initialFormState`, `fieldErrorsFrom`, `textField` from `src/features/auth/form-state.ts`.
- Consumes: `requireUser()` from `src/lib/auth/require-user.ts`.
- Produces: `saveResidencia(_, fd): Promise<FormState>`, `saveComodos(_, fd): Promise<FormState>`, `saveRotina(_, fd): Promise<FormState>`, `approveRoutine(_, fd): Promise<FormState>` — consumed by Tasks 4 and 5.

- [ ] **Step 1: Implement `src/lib/telemetry.ts`**

```ts
"server only" // import server-only
import { createServerClient } from "@/lib/supabase/server";

export async function trackEvent(
  userId: string,
  homeId: string | null,
  eventName: string,
): Promise<void>
```

- Insert into `product_events(user_id, home_id, event_name)`.
- Skip (no throw) if `homeId` is null or `eventName` doesn't match `/^[a-z_]{3,50}$/`.
- Never throw on failure — telemetry must not break main flows.

- [ ] **Step 2: Implement `saveResidencia` in `actions.ts`**

```ts
"use server";
export async function saveResidencia(
  _: FormState,
  formData: FormData,
): Promise<FormState>
```

Logic:
1. `requireUser()` → `userId`.
2. Parse `formData` with `residenciaSchema`; on error return `fieldErrorsFrom(e)`.
3. `supabase.from("homes").insert({ ...data, created_by: userId })` → get `home`.
4. `supabase.from("profiles").update({ current_home_id: home.id, onboarding_step: 1 }).eq("id", userId)`.
5. `redirect("/onboarding/comodos")`.

- [ ] **Step 3: Implement `saveComodos` in `actions.ts`**

Logic:
1. `requireUser()` → `userId`.
2. `supabase.from("profiles").select("current_home_id").eq("id", userId).single()` → `homeId`. Never trust client.
3. Parse `formData`: rooms JSON array field `"rooms"` with `comodoSchema`.
4. Delete existing rooms for this home (idempotent re-submit): `supabase.from("rooms").delete().eq("home_id", homeId)`.
5. Bulk insert rooms with `position` = array index.
6. `supabase.from("profiles").update({ onboarding_step: 2 }).eq("id", userId)`.
7. `redirect("/onboarding/rotina")`.

- [ ] **Step 4: Implement `saveRotina` in `actions.ts`**

Logic:
1. `requireUser()` → `userId`.
2. Get `current_home_id` from profiles (same as step 3 above).
3. Parse with `rotinaSchema`.
4. `supabase.from("homes").update({ routine_level, available_minutes_per_week }).eq("id", homeId)`.
5. `supabase.from("profiles").update({ onboarding_step: 3 }).eq("id", userId)`.
6. `redirect("/onboarding/revisao")`.

- [ ] **Step 5: Implement `approveRoutine` in `actions.ts`**

Receives: `tasks` as JSON field — array of `revisaoTaskSchema` items where `include: true`.

Logic:
1. `requireUser()` → `userId`.
2. Get `current_home_id`, home `timezone` from profiles+homes.
3. Parse tasks JSON with `z.array(revisaoTaskSchema)`.
4. For each included task: insert into `tasks` (`home_id`, `title`, `estimated_minutes`, `priority`, `source: "onboarding"`, `created_by: userId`, `status: "active"`), then insert into `routines` (`task_id`, `frequency_type`, `start_date: today in home timezone`, `generated_until: today`, `is_active: true`, plus defaults for other fields).
5. `supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 4 }).eq("id", userId)`.
6. `trackEvent(userId, homeId, "onboarding_completed")`.
7. `redirect("/inicio")`.

Note: `task_occurrences` generation happens in the Rotina feature (Etapa 4). For now `generated_until = start_date` signals that generation is pending. The `/inicio` page in Etapa 4 will trigger generation on load.

- [ ] **Step 6: Lint + typecheck**

`npm run lint && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```
git add src/lib/telemetry.ts src/features/onboarding/actions.ts
git commit -m "feat(onboarding): server actions e telemetria"
```

---

### Task 3: Routing — redirecionamentos e layouts

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/page.tsx`

**Interfaces:**
- Consumes: `requireUser()`.
- Consumes: Supabase server client to read `profiles.onboarding_completed` and `onboarding_step`.

- [ ] **Step 1: Modify `src/app/(app)/layout.tsx`**

After `requireUser()`, query:
```ts
const { data: profile } = await supabase
  .from("profiles")
  .select("onboarding_completed, current_home_id")
  .eq("id", user.id)
  .single();
```
If `!profile?.onboarding_completed` → `redirect("/onboarding")`.

- [ ] **Step 2: Create `src/app/onboarding/layout.tsx`**

Simple layout: no `AppShell`, no bottom nav. Centered container, max-w-lg, with the `morano.` logotype at the top. Renders `{children}` only. Must call `requireUser()` to protect the route.

- [ ] **Step 3: Create `src/app/onboarding/page.tsx`**

Server component. Reads `profiles.onboarding_step` and `onboarding_completed`:
- `onboarding_completed` → `redirect("/inicio")`
- `onboarding_step === 0` → `redirect("/onboarding/residencia")`
- `onboarding_step === 1` → `redirect("/onboarding/comodos")`
- `onboarding_step === 2` → `redirect("/onboarding/rotina")`
- `onboarding_step >= 3` → `redirect("/onboarding/revisao")`

- [ ] **Step 4: Lint + typecheck**

`npm run lint && npm run typecheck`

- [ ] **Step 5: Commit**

```
git add src/app/(app)/layout.tsx src/app/onboarding/layout.tsx src/app/onboarding/page.tsx
git commit -m "feat(onboarding): routing — redirecionamentos e layout do wizard"
```

---

### Task 4: Passos 1 e 2 — Residência e Cômodos

**Files:**
- Create: `src/components/onboarding/timezone-detector.tsx`
- Create: `src/features/onboarding/components/residencia-form.tsx`
- Create: `src/app/onboarding/residencia/page.tsx`
- Create: `src/features/onboarding/components/room-selector.tsx`
- Create: `src/app/onboarding/comodos/page.tsx`

**Interfaces:**
- Consumes: `saveResidencia`, `saveComodos` from Task 2.
- Consumes: `residenciaSchema`, `comodoSchema` from Task 1.
- Consumes: form pattern from `use-validated-submit.ts` and `form-state.ts`.

- [ ] **Step 1: Create `TimezoneDetector`**

```tsx
"use client";
// Renders a hidden input[name="timezone"]. On mount, sets value to
// Intl.DateTimeFormat().resolvedOptions().timeZone or fallback "America/Sao_Paulo".
export function TimezoneDetector({ fallback = "America/Sao_Paulo" }: { fallback?: string })
```

The input must have `defaultValue={fallback}` so it submits the fallback when JS hasn't run yet.

- [ ] **Step 2: Create `ResidenciaForm`**

Client component. Fields (all required):
- `name`: text, default "Minha casa"
- `property_type`: select with labels pt-BR
- `ownership_type`: select (Próprio / Alugado / Outro)
- `household_type`: select (Sozinho / Casal / Família / Compartilhada / Outro)
- `resident_count`: number input, min 1
- `<TimezoneDetector />` (hidden input)

Progress indicator: step 1 of 4 (visual only, no logic).
Submit button: "Continuar".

- [ ] **Step 3: Create `src/app/onboarding/residencia/page.tsx`**

Server component: if `profile.onboarding_step > 0` → redirect to appropriate step (re-use logic from `page.tsx`). Render `<ResidenciaForm />`.

- [ ] **Step 4: Create `RoomSelector`**

Client component. Props: `defaultRooms: Array<{ name: string; room_type: RoomType }>`.

Pre-selects rooms based on `defaultRooms`. Shows a visual grid of room type chips (Sala, Cozinha, Quarto, Banheiro, etc.). User can toggle, add custom rooms (text + type). Each selected room serializes as JSON in a hidden textarea `name="rooms"`.

Default rooms by property_type (implementer chooses the mapping, e.g. "apartamento" → sala, cozinha, quarto, banheiro):
```ts
export const DEFAULT_ROOMS: Record<PropertyType, Array<{ name: string; room_type: RoomType }>> = { ... }
```

- [ ] **Step 5: Create `src/app/onboarding/comodos/page.tsx`**

Server component. Reads `profiles.current_home_id` → loads `home.property_type` to pass `DEFAULT_ROOMS[type]` as `defaultRooms`. Renders `<RoomSelector />` inside a form with `action={saveComodos}`.

Progress indicator: step 2 of 4.

- [ ] **Step 6: Manual smoke test**

Start dev server, complete steps 1 and 2 of onboarding. Verify:
- After step 1: `homes` row created, `profiles.onboarding_step = 1`, redirected to `/onboarding/comodos`.
- After step 2: `rooms` rows created, `profiles.onboarding_step = 2`, redirected to `/onboarding/rotina`.

- [ ] **Step 7: Commit**

```
git add src/components/onboarding/ src/features/onboarding/components/ \
        src/app/onboarding/residencia/ src/app/onboarding/comodos/
git commit -m "feat(onboarding): passos 1 e 2 — residência e cômodos"
```

---

### Task 5: Passos 3 e 4 — Rotina e Revisão

**Files:**
- Create: `src/features/onboarding/components/rotina-form.tsx`
- Create: `src/app/onboarding/rotina/page.tsx`
- Create: `src/features/onboarding/components/task-review-list.tsx`
- Create: `src/app/onboarding/revisao/page.tsx`

**Interfaces:**
- Consumes: `saveRotina`, `approveRoutine` from Task 2.
- Consumes: `filterCatalog`, `CatalogTask` from Task 1.
- Consumes: `rotinaSchema`, `revisaoTaskSchema` from Task 1.

- [ ] **Step 1: Create `RotinaForm`**

Client component. Fields:
- `routine_level`: 3-card selector (Leve / Equilibrada / Detalhada) with short description each.
- `available_minutes_per_week`: number input (min 10, max 2000), label "Minutos disponíveis por semana".

Submit: "Ver sugestões →".

- [ ] **Step 2: Create `src/app/onboarding/rotina/page.tsx`**

Server component. If `profile.onboarding_step !== 2` → redirect. Renders `<RotinaForm />`. Progress: step 3 of 4.

- [ ] **Step 3: Create `TaskReviewList`**

Client component. Props:
```ts
{
  tasks: CatalogTask[];
  formAction: (fd: FormData) => void;
}
```

Renders a list of tasks. Each row: checkbox (include/exclude), title (editable inline), estimated_minutes (editable), frequency_type (select). Submit serializes all tasks as JSON in `name="tasks"`.

Button: "Aprovar rotina" (primary). Above it: summary like "12 tarefas · ~180 min/semana".

- [ ] **Step 4: Create `src/app/onboarding/revisao/page.tsx`**

Server component:
1. If `profile.onboarding_step !== 3` → redirect.
2. Load `homes` to get `routine_level`, `available_minutes_per_week`, and room types.
3. Load `rooms` to get room types.
4. `const suggested = filterCatalog(roomTypes, routine_level, available_minutes_per_week)`.
5. Render `<TaskReviewList tasks={suggested} formAction={approveRoutine} />`.

Progress: step 4 of 4. Title: "Sua rotina sugerida".

- [ ] **Step 5: Manual smoke test**

Complete steps 3 and 4. Verify:
- After step 3: `homes.routine_level` updated, `profiles.onboarding_step = 3`.
- After "Aprovar": `tasks` and `routines` rows created for included tasks, `profiles.onboarding_completed = true`, redirect to `/inicio`.
- Verify no tasks inserted before "Aprovar".

- [ ] **Step 6: Commit**

```
git add src/features/onboarding/components/rotina-form.tsx \
        src/app/onboarding/rotina/ \
        src/features/onboarding/components/task-review-list.tsx \
        src/app/onboarding/revisao/
git commit -m "feat(onboarding): passos 3 e 4 — rotina e revisão/aprovação"
```

---

### Task 6: Minha Casa

**Files:**
- Create: `src/features/homes/queries.ts`
- Create: `src/features/homes/schemas.ts`
- Create: `src/features/homes/actions.ts`
- Modify: `src/app/(app)/casa/page.tsx`
- Create: `src/app/(app)/casa/comodos/page.tsx`
- Create: `src/features/homes/components/home-form.tsx`
- Create: `src/features/homes/components/room-list.tsx`

**Interfaces:**
- Consumes: `residenciaSchema` (re-export or adapt) from Task 1 for home edit.
- Consumes: `RoomSelector` from Task 4 for room management.
- Produces: `getHomeWithRooms(userId): Promise<HomeWithRooms>` — consumed by Casa pages.

- [ ] **Step 1: Create `queries.ts`**

```ts
export type HomeWithRooms = {
  id: string;
  name: string;
  property_type: PropertyType;
  ownership_type: OwnershipType;
  household_type: HouseholdType;
  resident_count: number;
  available_minutes_per_week: number;
  routine_level: RoutineLevel;
  timezone: string;
  rooms: Array<{ id: string; name: string; room_type: RoomType; position: number }>;
};

export async function getHomeWithRooms(userId: string): Promise<HomeWithRooms | null>
```

Reads `profiles.current_home_id`, then fetches `homes` + `rooms` ordered by position.

- [ ] **Step 2: Create `schemas.ts`**

```ts
export const updateHomeSchema = residenciaSchema.omit({ timezone: true }); // timezone not editable after creation
export const updateRoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60),
  room_type: z.enum([...]),
});
export const addRoomSchema = z.object({
  name: z.string().min(1).max(60),
  room_type: z.enum([...]),
});
export const deleteRoomSchema = z.object({ id: z.string().uuid() });
```

- [ ] **Step 3: Create `actions.ts`**

```ts
export async function updateHome(_: FormState, fd: FormData): Promise<FormState>
export async function addRoom(_: FormState, fd: FormData): Promise<FormState>
export async function updateRoom(_: FormState, fd: FormData): Promise<FormState>
export async function deleteRoom(_: FormState, fd: FormData): Promise<FormState>
```

`updateHome`: validates with `updateHomeSchema`, updates `homes` row, `revalidatePath("/casa")`.
`addRoom`: validates with `addRoomSchema`, inserts with `position = current max + 1`, `revalidatePath`.
`updateRoom`/`deleteRoom`: validates id, checks membership via RLS, updates/deletes.

- [ ] **Step 4: Redesign `src/app/(app)/casa/page.tsx`**

Server component. Shows:
- Home name + property/ownership/household summary.
- "Editar dados" link or inline edit form.
- Room count + "Ver cômodos" link to `/casa/comodos`.
- Stats: tasks count, upcoming maintenance count (0 at this stage).

- [ ] **Step 5: Create `src/app/(app)/casa/comodos/page.tsx`**

Server component. Lists all rooms with edit/delete per row (via `updateRoom`/`deleteRoom` actions). "Adicionar cômodo" button opens inline form with `addRoom`.

- [ ] **Step 6: Lint + typecheck**

`npm run lint && npm run typecheck`

- [ ] **Step 7: Commit**

```
git add src/features/homes/ src/app/\(app\)/casa/
git commit -m "feat(casa): Minha Casa — dados da casa e gestão de cômodos"
```

---

### Task 7: Testes E2E e relatório

**Files:**
- Create: `tests/e2e/onboarding.spec.ts`
- Create: `docs/etapas/etapa-3-relatorio.md`

- [ ] **Step 1: Write E2E tests**

Cover:
1. New user redirected from `/inicio` to `/onboarding/residencia`.
2. Complete full onboarding → lands on `/inicio`.
3. User with `onboarding_completed=true` NOT redirected to onboarding.
4. Resume mid-wizard: user at step 2 → navigating to `/onboarding` → redirects to `/onboarding/comodos`.
5. Casa page shows home data after onboarding.
6. Add a room in Minha Casa → room appears in list.

Use `ensureConfirmedUser` from `tests/e2e/helpers/admin.ts`.

- [ ] **Step 2: Run full test suite**

```
npm run lint && npm run typecheck
npx vitest run
npm run db:reset && npm run db:test
npm run test:e2e
```

All must pass.

- [ ] **Step 3: Write `etapa-3-relatorio.md`**

Same format as `etapa-2-relatorio.md`: what was built, files, dependencies added (none expected), test counts, problems found, what's missing.

- [ ] **Step 4: Final commit**

```
git add tests/e2e/onboarding.spec.ts docs/etapas/etapa-3-relatorio.md
git commit -m "test(e2e): onboarding completo e Minha Casa"
```
