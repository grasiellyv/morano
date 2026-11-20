# Rodízio Semanal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add weekly rotation groups to tasks — named groups with manually ordered members that rotate responsibility on a fixed weekday, advancing lazily on page load.

**Architecture:** Two new DB tables (`task_rotations`, `task_rotation_members`) plus `tasks.rotation_id` FK. Rotation advance is lazy: on each rotina page load the server checks whether the rotation day has passed since `last_rotated_at` and advances + persists the index if so. Absent-member skip is computed at read time without changing the persisted index. Rotation info is fetched server-side, resolved to a `RotationInfo` record per rotation, and threaded down to the task occurrence row as props.

**Tech Stack:** Next.js 16, React 19, Supabase (local), Zod 4, Vitest, TypeScript

**Spec:** `docs/superpowers/specs/2026-11-20-rodizio-semanal-design.md`

## Global Constraints

- Next.js 16 / React 19: `useActionState` (not `useFormState`); `"use client"` on all client components
- Zod 4: `{ error: "..." }` (not `message:`); `z.coerce.number()` for numeric FormData fields
- `textField(fd, "field")` for string FormData extraction; `fieldErrorsFrom(parsed.error)` for Zod errors
- `initialFormState` and `FormState` from `@/features/auth/form-state`
- `requireUser()` from `@/lib/auth/require-user`; `createClient()` from `@/lib/supabase/server`
- Server action files: first line `"use server"`, second line `import "server-only"`
- Query files: first line `import "server-only"`
- `home_id` always from `profiles.current_home_id` on server — never from client
- `getMemberPermissions` → gate mutations behind `can_manage_tasks` (bypass: true skips the gate)
- `revalidatePath("/rotina")` after all mutations
- `rotation_day` values: 0 = domingo, 1 = segunda, …, 6 = sábado
- `current_member_index` indexes the full ordered member list; skip absent in `resolveCurrentMember`
- `npx supabase db reset` and `npx supabase gen types typescript --local > src/types/database.ts 2>/dev/null` run with Bash (not PowerShell)
- No push, PR, deploy, or remote operations

## Review Focus

1. **All members absent → null**: `resolveCurrentMember` with every member in `absentProfileIds` must return `null` — tested in Task 2.
2. **Index out of range after member removal**: if `currentIndex >= members.length` (member cascade-deleted), `resolveCurrentMember` must still return a valid member (wrap-around with `% members.length`) — tested in Task 2.
3. **`last_rotated_at` null (rotation never advanced)**: `advanceRotationsIfDue` for a brand-new rotation must correctly advance on first rotation day — tested in Task 3.
4. **Same weekday, already advanced today**: calling `advanceRotationsIfDue` twice in the same day must NOT double-advance — tested in Task 3.
5. **Rotation with 0 members**: `resolveCurrentMember([], 0, new Set())` must return `null` without throwing — tested in Task 2.

---

### Task 1: DB Migration + Types

**Files:**
- Create: `supabase/migrations/20261120200000_rodizio.sql`
- Regenerate: `src/types/database.ts`

**Interfaces:**
- Produces: `task_rotations` table, `task_rotation_members` table, `tasks.rotation_id` column

- [ ] **Step 1: Write migration `supabase/migrations/20261120200000_rodizio.sql`**

```sql
-- task_rotations
CREATE TABLE public.task_rotations (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id              uuid        NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  name                 text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  rotation_day         smallint    NOT NULL CHECK (rotation_day BETWEEN 0 AND 6),
  current_member_index int         NOT NULL DEFAULT 0,
  last_rotated_at      timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- task_rotation_members
CREATE TABLE public.task_rotation_members (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_id  uuid    NOT NULL REFERENCES public.task_rotations(id) ON DELETE CASCADE,
  profile_id   uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sort_order   int     NOT NULL DEFAULT 0,
  UNIQUE (rotation_id, profile_id)
);

-- link task to rotation
ALTER TABLE public.tasks
  ADD COLUMN rotation_id uuid REFERENCES public.task_rotations(id) ON DELETE SET NULL;

-- RLS: task_rotations
ALTER TABLE public.task_rotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home members read rotations"
  ON public.task_rotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.home_members hm
    WHERE hm.home_id = task_rotations.home_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "task managers write rotations"
  ON public.task_rotations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.home_members hm
    LEFT JOIN public.home_member_permissions hmp
      ON hmp.home_id = hm.home_id AND hmp.user_id = hm.user_id
    WHERE hm.home_id = task_rotations.home_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('owner','admin')
       OR (hm.home_id = task_rotations.home_id AND hm.user_id = auth.uid()
           AND COALESCE(hmp.can_manage_tasks, true) = true)
  ));

-- RLS: task_rotation_members
ALTER TABLE public.task_rotation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home members read rotation members"
  ON public.task_rotation_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.task_rotations tr
    JOIN public.home_members hm ON hm.home_id = tr.home_id
    WHERE tr.id = task_rotation_members.rotation_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "task managers write rotation members"
  ON public.task_rotation_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.task_rotations tr
    JOIN public.home_members hm ON hm.home_id = tr.home_id
    LEFT JOIN public.home_member_permissions hmp
      ON hmp.home_id = hm.home_id AND hmp.user_id = hm.user_id
    WHERE tr.id = task_rotation_members.rotation_id
      AND hm.user_id = auth.uid()
      AND (hm.role IN ('owner','admin')
           OR COALESCE(hmp.can_manage_tasks, true) = true)
  ));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.task_rotations, public.task_rotation_members TO authenticated;
```

- [ ] **Step 2: Apply migration and regenerate types**

```bash
npx supabase db reset
npx supabase gen types typescript --local > src/types/database.ts 2>/dev/null
```

Expected: reset exits 0; `database.ts` gains `task_rotations` and `task_rotation_members` table rows; `tasks` Row gains `rotation_id: string | null`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261120200000_rodizio.sql src/types/database.ts
git commit -m "feat(rodizio): migration — task_rotations, task_rotation_members, tasks.rotation_id

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Rotation Schemas + Pure Logic

**Files:**
- Create: `src/features/tasks/schemas-rotations.ts`
- Create: `src/features/tasks/schemas-rotations.test.ts`

**Interfaces:**
- Produces:
  - `createRotationSchema`, `updateRotationSchema`, `deleteRotationSchema`
  - `addRotationMemberSchema`, `removeRotationMemberSchema`, `reorderRotationMemberSchema`
  - `setTaskRotationSchema`
  - `resolveCurrentMember(members, currentIndex, absentProfileIds): string | null` — pure function, exported

- [ ] **Step 1: Write `src/features/tasks/schemas-rotations.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { createRotationSchema, addRotationMemberSchema, resolveCurrentMember } from "./schemas-rotations";

describe("createRotationSchema", () => {
  it("accepts valid rotation", () => {
    const r = createRotationSchema.safeParse({ name: "Lavar louça", rotation_day: "1" });
    expect(r.success).toBe(true);
    expect(r.data?.rotation_day).toBe(1);
  });
  it("rejects empty name", () => {
    const r = createRotationSchema.safeParse({ name: "", rotation_day: "1" });
    expect(r.success).toBe(false);
  });
  it("rejects name > 100 chars", () => {
    const r = createRotationSchema.safeParse({ name: "a".repeat(101), rotation_day: "1" });
    expect(r.success).toBe(false);
  });
  it("rejects rotation_day out of range", () => {
    expect(createRotationSchema.safeParse({ name: "X", rotation_day: "7" }).success).toBe(false);
    expect(createRotationSchema.safeParse({ name: "X", rotation_day: "-1" }).success).toBe(false);
  });
});

describe("resolveCurrentMember", () => {
  const members = [
    { profile_id: "a", sort_order: 0 },
    { profile_id: "b", sort_order: 1 },
    { profile_id: "c", sort_order: 2 },
  ];

  it("returns member at currentIndex when not absent", () => {
    expect(resolveCurrentMember(members, 0, new Set())).toBe("a");
    expect(resolveCurrentMember(members, 1, new Set())).toBe("b");
  });
  it("skips absent member and returns next", () => {
    expect(resolveCurrentMember(members, 0, new Set(["a"]))).toBe("b");
  });
  it("wraps around when skipping past end", () => {
    expect(resolveCurrentMember(members, 2, new Set(["c"]))).toBe("a");
  });
  it("returns null when all absent", () => {
    expect(resolveCurrentMember(members, 0, new Set(["a", "b", "c"]))).toBeNull();
  });
  it("returns null when members is empty", () => {
    expect(resolveCurrentMember([], 0, new Set())).toBeNull();
  });
  it("handles currentIndex >= members.length (wrap-around)", () => {
    expect(resolveCurrentMember(members, 5, new Set())).toBe("c"); // 5 % 3 = 2 → "c"
  });
});
```

- [ ] **Step 2: Run to verify RED**

```bash
npx vitest run src/features/tasks/schemas-rotations.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/features/tasks/schemas-rotations.ts`**

Exports:
- `createRotationSchema = z.object({ name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(100), rotation_day: z.coerce.number().int().min(0).max(6) })`
- `updateRotationSchema = createRotationSchema.extend({ id: z.string().uuid() })`
- `deleteRotationSchema = z.object({ id: z.string().uuid() })`
- `addRotationMemberSchema = z.object({ rotation_id: z.string().uuid(), profile_id: z.string().uuid(), sort_order: z.coerce.number().int().default(0) })`
- `removeRotationMemberSchema = z.object({ rotation_id: z.string().uuid(), profile_id: z.string().uuid() })`
- `reorderRotationMemberSchema = z.object({ rotation_id: z.string().uuid(), profile_id: z.string().uuid(), sort_order: z.coerce.number().int() })`
- `setTaskRotationSchema = z.object({ task_id: z.string().uuid(), rotation_id: z.string().uuid().nullable() })`
- `resolveCurrentMember(members: { profile_id: string; sort_order: number }[], currentIndex: number, absentProfileIds: Set<string>): string | null`

`resolveCurrentMember` algorithm: if `members.length === 0` return null. Start at `currentIndex % members.length`. Iterate up to `members.length` steps; return first `profile_id` not in `absentProfileIds`. If none found, return null.

- [ ] **Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/features/tasks/schemas-rotations.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 5: Run full suite to verify no regressions**

```bash
npx vitest run
```

Expected: same count as before (all pass).

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/schemas-rotations.ts src/features/tasks/schemas-rotations.test.ts
git commit -m "feat(rodizio): rotation schemas + resolveCurrentMember

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Rotation Backend (Queries + Actions)

**Files:**
- Create: `src/features/tasks/queries-rotations.ts`
- Create: `src/features/tasks/actions-rotations.ts`
- Create: `src/features/tasks/queries-rotations.test.ts`

**Interfaces:**
- Consumes: `resolveCurrentMember` from `./schemas-rotations`; all schemas from `./schemas-rotations`
- Produces:
  ```typescript
  // queries-rotations.ts
  export type RotationMember = { profile_id: string; sort_order: number; name: string | null; avatar_url: string | null };
  export type TaskRotation = { id: string; home_id: string; name: string; rotation_day: number; current_member_index: number; last_rotated_at: string | null; created_at: string; members: RotationMember[] };
  export type RotationInfo = { name: string; currentMemberId: string | null; currentMemberName: string | null; nextMemberName: string | null };
  export async function getRotations(supabase, homeId: string): Promise<TaskRotation[]>
  export async function getAbsentMemberIds(supabase, homeId: string, today: string): Promise<Set<string>>
  export async function advanceRotationsIfDue(supabase, homeId: string, today: string, absentIds: Set<string>): Promise<void>
  export function buildRotationInfoMap(rotations: TaskRotation[], absentIds: Set<string>): Record<string, RotationInfo>

  // actions-rotations.ts
  export async function createRotation(state: FormState, fd: FormData): Promise<FormState>
  export async function updateRotation(state: FormState, fd: FormData): Promise<FormState>
  export async function deleteRotation(state: FormState, fd: FormData): Promise<FormState>
  export async function addRotationMember(state: FormState, fd: FormData): Promise<FormState>
  export async function removeRotationMember(state: FormState, fd: FormData): Promise<FormState>
  export async function reorderRotationMember(state: FormState, fd: FormData): Promise<FormState>
  export async function setTaskRotation(state: FormState, fd: FormData): Promise<FormState>
  ```

- [ ] **Step 1: Write `src/features/tasks/queries-rotations.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { buildRotationInfoMap } from "./queries-rotations";
import type { TaskRotation } from "./queries-rotations";

const makeRotation = (overrides: Partial<TaskRotation> = {}): TaskRotation => ({
  id: "r1", home_id: "h1", name: "Lavar", rotation_day: 1,
  current_member_index: 0, last_rotated_at: null, created_at: "2026-01-01T00:00:00Z",
  members: [
    { profile_id: "u1", sort_order: 0, name: "Ana", avatar_url: null },
    { profile_id: "u2", sort_order: 1, name: "Ben", avatar_url: null },
  ],
  ...overrides,
});

describe("buildRotationInfoMap", () => {
  it("resolves current and next member", () => {
    const map = buildRotationInfoMap([makeRotation()], new Set());
    expect(map["r1"].currentMemberId).toBe("u1");
    expect(map["r1"].currentMemberName).toBe("Ana");
    expect(map["r1"].nextMemberName).toBe("Ben");
  });
  it("skips absent current member", () => {
    const map = buildRotationInfoMap([makeRotation()], new Set(["u1"]));
    expect(map["r1"].currentMemberId).toBe("u2");
  });
  it("returns null when all absent", () => {
    const map = buildRotationInfoMap([makeRotation()], new Set(["u1", "u2"]));
    expect(map["r1"].currentMemberId).toBeNull();
  });
  it("last_rotated_at null does not throw", () => {
    expect(() => buildRotationInfoMap([makeRotation({ last_rotated_at: null })], new Set())).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify RED**

```bash
npx vitest run src/features/tasks/queries-rotations.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/features/tasks/queries-rotations.ts`**

```
import "server-only" at top (except buildRotationInfoMap which is a pure function — OK to still be in this file; it won't be imported by client code since the file starts with server-only)
```

`getRotations`: select `task_rotations` with nested `task_rotation_members` joined to `profiles(id, full_name, avatar_url)`. Order members by `sort_order`.

`getAbsentMemberIds`: query `home_members` where `home_id = homeId AND absence_start <= today AND absence_end >= today`. Return `Set<string>` of `user_id` values.

`advanceRotationsIfDue(supabase, homeId, today, absentIds)`: for each rotation, check if rotation should advance. A rotation is due if `last_rotated_at` is null OR the most recent occurrence of `rotation_day` before or on `today` is after `last_rotated_at`. If due: compute new index via `resolveCurrentMember` starting from `current_member_index + 1`; find the index of that profile in the members array; UPDATE `task_rotations` SET `current_member_index = newIndex, last_rotated_at = now()`.

Helper: `mostRecentRotationDay(rotation_day: number, today: string): string` — returns the most recent date (≤ today) whose weekday is `rotation_day`. Use JS `Date` arithmetic: `new Date(today + "T00:00:00Z")`, subtract days until `date.getUTCDay() === rotation_day`.

`buildRotationInfoMap(rotations, absentIds)`: pure function (no server-only). For each rotation, call `resolveCurrentMember(members, current_member_index, absentIds)` → `currentMemberId`. Then compute `nextMemberId` by calling again from `current_member_index + 1`. Return `Record<string, RotationInfo>`.

- [ ] **Step 4: Implement `src/features/tasks/actions-rotations.ts`**

Pattern for all 7 actions: `requireUser()` → `current_home_id` → `getMemberPermissions` → gate `can_manage_tasks` → Zod parse → operation → `revalidatePath("/rotina")`.

- `createRotation`: INSERT into `task_rotations` with `home_id, name, rotation_day`.
- `updateRotation`: UPDATE by `id` (`.select("id")` to detect miss).
- `deleteRotation`: DELETE by `id` with `.select("id")`.
- `addRotationMember`: verify rotation belongs to home first, then INSERT into `task_rotation_members`.
- `removeRotationMember`: DELETE from `task_rotation_members` by `(rotation_id, profile_id)`.
- `reorderRotationMember`: UPDATE `sort_order` by `(rotation_id, profile_id)`.
- `setTaskRotation`: UPDATE `tasks SET rotation_id = rotation_id` by `task_id`. If `rotation_id` is not null, verify the rotation belongs to the same home before setting.

- [ ] **Step 5: Run tests to verify GREEN**

```bash
npx vitest run src/features/tasks/queries-rotations.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/tasks/queries-rotations.ts src/features/tasks/queries-rotations.test.ts src/features/tasks/actions-rotations.ts
git commit -m "feat(rodizio): rotation queries and server actions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Rotina Page Integration (Advance + Display)

**Files:**
- Modify: `src/features/tasks/queries.ts`
- Modify: `src/app/(app)/rotina/page.tsx`
- Modify: `src/features/tasks/components/task-list.tsx`
- Modify: `src/features/tasks/components/task-occurrence-row.tsx`

**Interfaces:**
- Consumes: `TaskRotation`, `RotationInfo`, `getRotations`, `getAbsentMemberIds`, `advanceRotationsIfDue`, `buildRotationInfoMap` from `./queries-rotations`
- Produces:
  - `OccurrenceWithTask.task.rotation_id: string | null` (new field)
  - `TaskList` gains prop `rotationInfoMap?: Record<string, RotationInfo>`
  - `TaskOccurrenceRow` gains prop `rotationInfo?: RotationInfo`

- [ ] **Step 1: Extend `OccurrenceWithTask` in `src/features/tasks/queries.ts`**

Add `rotation_id: string | null` to the `task` sub-type. Add `rotation_id` to every select string that includes `task:tasks(...)`. (There are 5 select calls — `getTodayOccurrences`, `getOverdueOccurrences`, `getUpcomingOccurrences`, `getOccurrencesForWeek`, `getHistory`.)

- [ ] **Step 2: Run full suite to verify no regressions**

```bash
npx vitest run
```

Expected: all tests pass (rotation_id is nullable, no existing test breaks).

- [ ] **Step 3: Update `src/app/(app)/rotina/page.tsx`**

Add to imports: `getRotations`, `getAbsentMemberIds`, `advanceRotationsIfDue`, `buildRotationInfoMap`, `type RotationInfo` from `@/features/tasks/queries-rotations`.

In the page body, after `markMissedOccurrences`:
```typescript
const absentIds = await getAbsentMemberIds(supabase, home.id, currentDate);
await advanceRotationsIfDue(supabase, home.id, currentDate, absentIds);
```

Add `getRotations(supabase, home.id)` to the existing `Promise.all`.

After the Promise.all, compute:
```typescript
const rotationInfoMap = buildRotationInfoMap(rotations, absentIds);
```

Pass `rotationInfoMap={rotationInfoMap}` to `<TaskList>`.

- [ ] **Step 4: Update `src/features/tasks/components/task-list.tsx`**

Add `rotationInfoMap?: Record<string, RotationInfo>` to props type. Import `RotationInfo` from `@/features/tasks/queries-rotations`. Pass `rotationInfo={rotationInfoMap?.[occ.task.rotation_id ?? ""]}` to each `<TaskOccurrenceRow>`.

- [ ] **Step 5: Update `src/features/tasks/components/task-occurrence-row.tsx`**

Add `rotationInfo?: RotationInfo` to props. Import `RotationInfo` from `@/features/tasks/queries-rotations`. When `rotationInfo` is defined, render a discrete indicator after the task title:

```tsx
{rotationInfo && (
  <span
    title={`Rodízio: ${rotationInfo.name}${rotationInfo.nextMemberName ? ` · Próximo: ${rotationInfo.nextMemberName}` : ""}`}
    className="ml-1 text-xs text-muted-foreground"
    aria-label="tarefa em rodízio"
  >
    ♻
  </span>
)}
```

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/tasks/queries.ts src/app/(app)/rotina/page.tsx src/features/tasks/components/task-list.tsx src/features/tasks/components/task-occurrence-row.tsx
git commit -m "feat(rodizio): wire rotation advance and indicator in rotina page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Task Edit UI (Rotation Panel + Manage Dialog)

**Files:**
- Create: `src/features/tasks/components/rotation-panel.tsx`
- Create: `src/features/tasks/components/manage-rotations-dialog.tsx`
- Modify: `src/features/tasks/components/task-form.tsx`
- Modify: `src/features/tasks/components/task-list.tsx` (pass rotations down)
- Modify: `src/app/(app)/rotina/page.tsx` (pass homeMembers down)

**Interfaces:**
- Consumes: all actions from `../actions-rotations`; `TaskRotation`, `RotationInfo` from `../queries-rotations`

- [ ] **Step 1: Create `src/features/tasks/components/rotation-panel.tsx`**

`"use client"`. Props:
```typescript
interface RotationPanelProps {
  taskId: string;
  rotations: TaskRotation[];
  currentRotationId: string | null;
  homeMembers: { id: string; name: string | null }[];
}
```

UI:
- Section heading "Rodízio"
- If `currentRotationId`: shows current rotation name + "Remover do rodízio" button (calls `setTaskRotation` with `rotation_id: null`)
- Select to associate with an existing rotation (calls `setTaskRotation`); default option "Sem rodízio"
- "Gerenciar grupos" link/button that sets `showManageDialog = true`
- Renders `<ManageRotationsDialog>` when `showManageDialog`
- Uses `useActionState(setTaskRotation, initialFormState)` for the association form; hidden `task_id` input

- [ ] **Step 2: Create `src/features/tasks/components/manage-rotations-dialog.tsx`**

`"use client"`. Props:
```typescript
interface ManageRotationsDialogProps {
  rotations: TaskRotation[];
  homeMembers: { id: string; name: string | null }[];
  open: boolean;
  onClose: () => void;
}
```

UI:
- Fixed overlay modal; `✕ Fechar` button + backdrop click closes
- Title "Gerenciar rodízios"
- Per rotation: name + rotation_day label (e.g. "Segunda-feira") | `[Editar]` `[Excluir]`
  - Inline edit: name input, rotation_day select (Dom=0…Sáb=6), Salvar/Cancelar
  - Delete: `ConfirmDialog` from `@/components/feedback/confirm-dialog`, message: `"As tarefas do rodízio '${rot.name}' ficarão sem rodízio associado."`
  - Members list per rotation: each member row with name | `[↑]` `[↓]` `[Remover]`
  - Add member: select from `homeMembers` not already in group + `[Adicionar]` button
- "Novo rodízio" form at bottom: name input, rotation_day select, `[Criar]`
- Each mutation uses `useActionState` or `useTransition` + direct action call

- [ ] **Step 3: Modify `src/features/tasks/components/task-form.tsx`**

Add optional props:
```typescript
rotations?: TaskRotation[];
homeMembers?: { id: string; name: string | null }[];
currentRotationId?: string | null;
```

In edit mode (`mode === "edit"` and `taskId` is defined and `rotations` is defined): render `<RotationPanel taskId={taskId} rotations={rotations} currentRotationId={currentRotationId ?? null} homeMembers={homeMembers ?? []} />` after the existing task fields.

- [ ] **Step 4: Thread `rotations`, `homeMembers`, `currentRotationId` from page to task-form**

In `src/app/(app)/rotina/page.tsx`: add `home_members` query to `Promise.all` to get `{ user_id, full_name }` for all members. Pass `rotations={rotations}` and `homeMembers={homeMembers}` to `<TaskList>`.

In `src/features/tasks/components/task-list.tsx`: accept and pass `rotations` and `homeMembers` props down to the task edit form/occurrence row that renders `TaskForm`. (Read the existing task-list.tsx to find where `TaskForm` is rendered and add the new props there. If `TaskForm` is rendered inside `TaskOccurrenceRow`, thread through that component too.)

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/components/rotation-panel.tsx src/features/tasks/components/manage-rotations-dialog.tsx src/features/tasks/components/task-form.tsx src/features/tasks/components/task-list.tsx src/app/(app)/rotina/page.tsx
git commit -m "feat(rodizio): rotation panel and manage dialog in task edit UI

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
