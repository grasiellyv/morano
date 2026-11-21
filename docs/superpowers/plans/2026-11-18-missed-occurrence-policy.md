# Missed Occurrence Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit retroactive occurrence generation to a 30-day window and 3 occurrences per task per session, recording the ungenerated count in `routines.ungenerated_count`.

**Architecture:** A pure function `applyRetroactivePolicy` encapsulates the policy rules (window cap, occurrence cap, counting) and is called by `extendWindowForHome` to filter the retroactive portion of each routine's generation. Future occurrences (from today onward) are generated without limits. The DB migration adds `ungenerated_count` to `routines` with a column-level GRANT so the existing server action can increment it.

**Tech Stack:** TypeScript strict, Vitest, Supabase (Postgres), date-fns

**Spec:** This plan implements the product policy confirmed in conversation on 2026-11-18:
- Retroactive window: 30 days maximum
- Retroactive limit: 3 occurrences per task (most recent 3)
- Excess occurrences: counted in `routines.ungenerated_count` (cumulative), never inserted
- Recurrence rule and `start_date` unchanged
- Idempotence preserved via `generated_until` advancing to `today+56` regardless of skips

## Global Constraints

- **TypeScript strict** + `noUncheckedIndexedAccess` — all array accesses must be safe
- **Zod 4** syntax: `{ error: "..." }` not `{ invalid_type_error: "..." }`
- **date-fns + `@date-fns/tz` v1** — use `addDaysStr` from `@/lib/dates` for date arithmetic
- **Supabase**: never expose SUPABASE_SECRET_KEY in frontend; use `createClient()` from `@/lib/supabase/server` in server actions
- **No new npm packages** — use existing `date-fns`, `vitest`
- **`routines.weekdays`** is `smallint[] NOT NULL DEFAULT '{}'` — never send `null`
- **`tasks.created_by`** NOT in INSERT grant — omit from inserts
- **`generated_until` must advance to `today+56`** even when retroactive occurrences are capped — this prevents re-attempting skipped dates on the next session
- **`ungenerated_count` is cumulative** — use `ungenerated_count + N` (SQL increment), not a reset

## Review Focus

1. **First open ever (`generated_until IS NULL`) with old `start_date`**: if `start_date` is 180 days ago, retroactive dates before the 30-day window must be counted, not inserted — `ungenerated_count` = count of dates in `[start_date, today-31]`. Covered in Task 1 test `policy_first_open_old_start_date`.
2. **Boundary at exactly `today-30`**: a date equal to `windowStart` must be INCLUDED in the window (inclusive lower bound). Covered in Task 1 test `policy_window_boundary`.
3. **`once` frequency with old date**: produces at most 1 retroactive occurrence — always within the 3-limit, `ungenerated_count = 0` when in-window, `= 1` when before window. Covered in Task 1 test `policy_once_before_window`.
4. **`generated_until` advances past skipped dates**: after the second open the retroactive window is empty, so `ungenerated_count` does not double. Covered in Task 2 step "verify idempotence" (manual code review: `generated_until = today+56` is set unconditionally).
5. **Task with exactly 3 occurrences in window**: all 3 inserted, `ungeneratedCount = 0`. Covered in Task 1 test `policy_exactly_three_in_window`.

---

### Task 1: Pure policy function + DB migration

**Files:**
- Create: `src/features/tasks/rules/missed-policy.ts`
- Create: `src/features/tasks/rules/missed-policy.test.ts`
- Create: `supabase/migrations/20261118200000_missed_policy.sql`

**Interfaces:**
- Consumes: `addDaysStr` from `@/lib/dates`
- Produces:
  ```ts
  // src/features/tasks/rules/missed-policy.ts
  export const RETROACTIVE_WINDOW_DAYS = 30;
  export const RETROACTIVE_OCCURRENCE_LIMIT = 3;

  export interface RetroactivePolicyResult {
    toInsert: string[];       // dates to persist (at most RETROACTIVE_OCCURRENCE_LIMIT)
    ungeneratedCount: number; // dates intentionally not inserted
  }

  /**
   * Given all retroactive candidate dates (sorted asc, all before today),
   * applies the 30-day window cap and 3-occurrence limit.
   * Does NOT filter future dates — callers pass only past dates.
   */
  export function applyRetroactivePolicy(
    retrodates: string[],  // sorted asc "yyyy-MM-dd", all < today
    today: string,         // "yyyy-MM-dd"
  ): RetroactivePolicyResult
  ```

- [ ] **Step 1: Write the failing tests** in `src/features/tasks/rules/missed-policy.test.ts`

  ```ts
  import { describe, it, expect } from "vitest";
  import { applyRetroactivePolicy } from "./missed-policy";

  describe("applyRetroactivePolicy", () => {
    const today = "2026-11-18";

    it("policy_no_retroactive: empty input returns empty toInsert and zero count", () => {
      const r = applyRetroactivePolicy([], today);
      expect(r.toInsert).toEqual([]);
      expect(r.ungeneratedCount).toBe(0);
    });

    it("policy_all_in_window_under_limit: 2 dates within 30d window all inserted", () => {
      const dates = ["2026-11-10", "2026-11-15"];  // both within [today-30, today-1]
      const r = applyRetroactivePolicy(dates, today);
      expect(r.toInsert).toEqual(["2026-11-10", "2026-11-15"]);
      expect(r.ungeneratedCount).toBe(0);
    });

    it("policy_exactly_three_in_window: 3 dates → all inserted, count = 0", () => {
      const dates = ["2026-11-05", "2026-11-10", "2026-11-15"];
      const r = applyRetroactivePolicy(dates, today);
      expect(r.toInsert).toEqual(["2026-11-05", "2026-11-10", "2026-11-15"]);
      expect(r.ungeneratedCount).toBe(0);
    });

    it("policy_over_limit_in_window: 5 dates in window → keep last 3, count = 2", () => {
      // today = 2026-11-18, windowStart = 2026-10-19
      const dates = [
        "2026-10-20", "2026-10-25", "2026-11-01", "2026-11-08", "2026-11-15",
      ];
      const r = applyRetroactivePolicy(dates, today);
      expect(r.toInsert).toEqual(["2026-11-01", "2026-11-08", "2026-11-15"]);
      expect(r.ungeneratedCount).toBe(2);
    });

    it("policy_before_window: dates older than 30d not inserted, counted", () => {
      // today = 2026-11-18, windowStart = 2026-10-19 (inclusive)
      // 2026-10-01 is 48 days ago → before window
      const dates = ["2026-10-01", "2026-10-05"];
      const r = applyRetroactivePolicy(dates, today);
      expect(r.toInsert).toEqual([]);
      expect(r.ungeneratedCount).toBe(2);
    });

    it("policy_window_boundary: date exactly at today-30 is included", () => {
      // today = 2026-11-18, today-30 = 2026-10-19
      const dates = ["2026-10-19"];
      const r = applyRetroactivePolicy(dates, today);
      expect(r.toInsert).toEqual(["2026-10-19"]);
      expect(r.ungeneratedCount).toBe(0);
    });

    it("policy_first_open_old_start_date: mixed before+in-window with over-limit", () => {
      // 3 before window, 5 in window → toInsert = last 3 of in-window, count = 3+2 = 5
      const before = ["2026-09-01", "2026-09-15", "2026-10-01"];
      const inWindow = [
        "2026-10-20", "2026-10-27", "2026-11-03", "2026-11-10", "2026-11-15",
      ];
      const r = applyRetroactivePolicy([...before, ...inWindow], today);
      expect(r.toInsert).toEqual(["2026-11-03", "2026-11-10", "2026-11-15"]);
      expect(r.ungeneratedCount).toBe(5);
    });

    it("policy_once_before_window: single date before window → count = 1", () => {
      const r = applyRetroactivePolicy(["2026-09-01"], today);
      expect(r.toInsert).toEqual([]);
      expect(r.ungeneratedCount).toBe(1);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run src/features/tasks/rules/missed-policy.test.ts`
  Expected: FAIL (module not found)

- [ ] **Step 3: Implement `applyRetroactivePolicy` in `src/features/tasks/rules/missed-policy.ts`**

  Export constants `RETROACTIVE_WINDOW_DAYS = 30` and `RETROACTIVE_OCCURRENCE_LIMIT = 3`. In the function: compute `windowStart = addDaysStr(today, -RETROACTIVE_WINDOW_DAYS)`. Split `retrodates` into `beforeWindow` (< `windowStart`) and `inWindow` (>= `windowStart`). Clamp `inWindow` to the last `RETROACTIVE_OCCURRENCE_LIMIT` entries (`inWindow.slice(-RETROACTIVE_OCCURRENCE_LIMIT)`). Return `{ toInsert: clamped, ungeneratedCount: beforeWindow.length + (inWindow.length - clamped.length) }`.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run src/features/tasks/rules/missed-policy.test.ts`
  Expected: 8 tests PASS

- [ ] **Step 5: Write the DB migration** `supabase/migrations/20261118200000_missed_policy.sql`

  ```sql
  -- Adiciona contador cumulativo de ocorrências não geradas por política de inatividade
  alter table public.routines
    add column ungenerated_count integer not null default 0
      check (ungenerated_count >= 0);

  -- Permite que o cliente autenticado incremente o contador
  grant update (ungenerated_count)
    on public.routines to authenticated;
  ```

- [ ] **Step 6: Apply migration to local Supabase**

  Run: `npm run db:reset`
  Expected: migration applied, no errors

- [ ] **Step 7: Regenerate TypeScript types from DB**

  Run: `npm run db:types`
  Expected: `src/types/database.ts` updated with `ungenerated_count: number` in `routines` Row/Insert/Update

- [ ] **Step 8: Run full test suite**

  Run: `npm test`
  Expected: all tests PASS

- [ ] **Step 9: Commit**

  ```bash
  git add src/features/tasks/rules/missed-policy.ts \
          src/features/tasks/rules/missed-policy.test.ts \
          supabase/migrations/20261118200000_missed_policy.sql \
          src/types/database.ts
  git commit -m "feat(rotina): política de ocorrências retroativas — janela 30d, limite 3, ungenerated_count"
  ```

---

### Task 2: Wire policy into `extendWindowForHome`

**Files:**
- Modify: `src/features/tasks/actions.ts` (function `extendWindowForHome`, lines ~29–115)

**Interfaces:**
- Consumes from Task 1:
  ```ts
  import { applyRetroactivePolicy } from "@/features/tasks/rules/missed-policy";
  // Returns { toInsert: string[]; ungeneratedCount: number }
  ```
- Consumes from existing code:
  - `generateOccurrenceDates(rule, fromDate, toDate): string[]`
  - `addDaysStr(date, days): string` (for `today-1` and `today`)
  - `getLocalDateString(timezone): string`

**Current flow in `extendWindowForHome` (per-routine loop):**
```
fromDate = generated_until+1 or start_date
dates = generateOccurrenceDates(rule, fromDate, today+56)
upsert(dates as pending)
update generated_until = today+56
```

**New flow:**
```
fromDate = generated_until+1 or start_date
yesterday = addDaysStr(today, -1)

// Retroactive portion (before today)
retroDates = []
if fromDate <= yesterday:
  retroDates = generateOccurrenceDates(rule, fromDate, yesterday)
const { toInsert: retroToInsert, ungeneratedCount } = applyRetroactivePolicy(retroDates, today)

// Future portion (today onward) — no limit
futureDates = generateOccurrenceDates(rule, today, addDaysStr(today, 56))

const allToInsert = [...retroToInsert, ...futureDates]
// upsert allToInsert (unchanged)

// generated_until advances to today+56 unconditionally (covers skipped dates)
// If ungeneratedCount > 0: increment routines.ungenerated_count
```

- [ ] **Step 1: Modify `extendWindowForHome` in `src/features/tasks/actions.ts`**

  Add import of `applyRetroactivePolicy`. Inside the per-routine loop, replace the single `generateOccurrenceDates(rule, fromDate, newUntil)` call with the two-step split. Keep `newUntil = addDaysStr(today, 56)`. After the upsert, add a conditional Supabase update of `ungenerated_count` using raw SQL increment only when `ungeneratedCount > 0`:

  ```ts
  if (ungeneratedCount > 0) {
    await supabase.rpc("increment_ungenerated_count", {
      routine_id: routine.id,
      increment: ungeneratedCount,
    });
  }
  ```

  Wait — no RPC exists. Use a raw update with `supabase.from("routines").update({ ungenerated_count: routine.ungenerated_count + ungeneratedCount })`. The `routine` row is already fetched with `select("*")`, so `routine.ungenerated_count` is available.

- [ ] **Step 2: Verify TypeScript compiles with the new column**

  Run: `npm run typecheck`
  Expected: no errors (`src/types/database.ts` already updated in Task 1 Step 7)

- [ ] **Step 3: Run full test suite**

  Run: `npm test`
  Expected: all tests PASS (no existing test should break — the wiring changes generation behavior but no test mocks `extendWindowForHome`)

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/tasks/actions.ts
  git commit -m "feat(rotina): aplicar política retroativa em extendWindowForHome"
  ```

---

## Post-implementation verification checklist (manual)

After both tasks are merged, open the app with a local Supabase instance and verify:

1. Create a daily task with `start_date = today-45`. Manually set `generated_until = NULL` (simulate fresh state). Open `/rotina`. Check `task_occurrences`: only dates in `[today-30, today-1]` exist as rows, at most 3; `routines.ungenerated_count` = count of skipped dates.
2. Open `/rotina` a second time without changing data. Confirm `ungenerated_count` did not increase (idempotent).
3. Create a `once` task with `start_date = today-45`. Open `/rotina`. Confirm 0 occurrences, `ungenerated_count = 1`.
4. Create a `once` task with `start_date = today-10`. Open `/rotina`. Confirm 1 occurrence inserted, `ungenerated_count = 0`.
