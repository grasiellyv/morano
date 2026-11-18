# MORANO — Etapa 2 (Backend e autenticação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the whole MVP database on local Supabase: every table from spec §8, RLS on all of them, a private Storage bucket, plan limits enforced in the DB, and pgTAP tests proving cross-home isolation. Add email/password auth with confirmation and password reset, Google sign-in behind a flag, a `proxy.ts` that protects private routes, and typed Supabase clients.

**Architecture:**
- Supabase CLI runs Postgres, Auth, Storage and Mailpit locally in Docker.
- Schema lives in versioned SQL migrations under `supabase/migrations`, split by domain. Each migration creates its tables, indexes, triggers and RLS policies together.
- Authorization helpers are `security definer` SQL functions with a fixed `search_path`.
- Next.js reads the session through `@supabase/ssr`. `src/proxy.ts` refreshes the session, verifies claims and redirects.
- Auth forms post to Server Actions validated with Zod.

**Tech Stack:** Supabase CLI 3.x (dev dependency), `@supabase/supabase-js` 2.x, `@supabase/ssr` 0.12.x, `zod` 4.x, `react-hook-form` 7.x, `@hookform/resolvers`, `server-only`, pgTAP (bundled with the CLI via `supabase test db`), Playwright (existing).

**Spec:** `docs/superpowers/specs/2026-11-18-morano-mvp-design.md`. Read **§7, §8, §10, §11 and §15** before any task. The table and column lists in §8.1 are binding and not repeated here. Original requirements are in `docs/master-prompt.md` §9–§10.

## Global Constraints

- **`cacheComponents` and `partialPrefetching` are turned OFF** in `next.config.ts` (controller decision, Etapa 2 start). Pages are dynamic by default.
- All user-facing copy is in pt-BR. Error messages are friendly and never leak SQL, stack traces or whether an email exists. The "forgot password" page always says the same thing.
- **Every table has RLS enabled.** Content tables are scoped by `home_id` through `public.is_home_member(home_id)`.
- **The secret (service-role) key is never imported by client code.** It lives only in `src/lib/supabase/admin.ts`, guarded by `import "server-only"`. It is used only by tests and future server tasks. It is never put in a `NEXT_PUBLIC_*` variable.
- Env var names, exactly:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `NEXT_PUBLIC_SITE_URL` (default `http://localhost:3000`)
  - `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` (`"true"` or anything else)
- Never invent credentials. Local keys come from `npx supabase status`. Google OAuth stays disabled until the owner provides credentials. The Google button renders **only** when `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true"`.
- Money is `integer` cents. Task dates are `date`. Event instants are `timestamptz`. All PKs are `uuid default gen_random_uuid()`. `created_at timestamptz not null default now()`. Editable tables have `updated_at` maintained by trigger `public.set_updated_at()`.
- Enum values are exactly the English slugs listed in spec §8.1 (e.g. `home_role`: `owner, admin, member`).
- Deletion policies follow spec §8.2. FKs to optional parents (`room_id`, `appliance_id`, `issue_id`) use `on delete set null`. FKs to owning parents use `on delete cascade`.
- Plan limits (spec §11) are enforced **only on insert** (owner decision A). They never block select, update or delete. Free limits: 1 home (as creator), 40 active tasks per home, 5 non-archived appliances per home, attachments PRO-only. A missing `subscriptions` row means free.
- Beta: a new user gets `subscriptions(plan='pro', status='active', provider='beta_grant', current_period_end=null)`. `null` means "no end date set yet"; Etapa 10 sets it.
- Migration files are named `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`, created with `npx supabase migration new <name>`. Never edit a migration after a later task has committed on top of it. Fix forward with a new migration.
- Commits use Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `etapa-2-backend-auth`.
- Shell is Windows. Use npm scripts. Docker Desktop must be running.

## Review Focus

1. **Cross-home writes through FKs.** User A inserts a task in A's home whose `room_id` belongs to B's home, or moves an attachment to B's appliance. This must fail. Tests: each content migration's pgTAP file has a `cross-home FK rejected` case (Tasks 3–5).
2. **Signup when email confirmation is pending.** After `/cadastro`, the user sees "Confirme seu e-mail". Visiting `/inicio` before confirming redirects to `/entrar`. Test: Task 8 E2E `unconfirmed user cannot enter app`.
3. **Open redirect.** `/entrar?next=https://evil.com` or `next=//evil.com` must land on `/inicio`. Only same-origin relative paths are allowed. Test: Task 7 unit `safeNextPath`.
4. **Membership escalation.** A `member` cannot update their own `home_members.role` to `owner`, and a user cannot insert themselves into someone else's home. Test: Task 2 pgTAP `member cannot escalate role` and `cannot self-join foreign home`.
5. **Free-limit edge.** On free, the 6th appliance insert fails with a clear `P0001` error code `plan_limit_appliances`. Archiving one frees a slot. Downgrading from PRO with 8 appliances keeps all 8 readable and editable. Test: Task 6 pgTAP.

---

## File Structure

```text
supabase/
  config.toml                         # from `supabase init`, edited (site_url, redirect URLs, email confirm, google provider env)
  seed.sql                            # local-only test helpers in schema `tests` (NOT production data)
  migrations/
    *_foundation.sql                  # enums, set_updated_at, profiles, homes, home_members, subscriptions, helpers, signup trigger
    *_routine.sql                     # rooms, tasks, routines, task_occurrences
    *_maintenance.sql                 # appliances, maintenance_records, home_issues, issue_events
    *_shopping_attachments.sql        # shopping_items, attachments, storage bucket + policies
    *_billing_telemetry.sql           # plan_limits, limit triggers, push_subscriptions, product_events, pro_interest, account_deletion_log
  tests/
    01_foundation.test.sql  02_routine.test.sql  03_maintenance.test.sql
    04_shopping_attachments.test.sql  05_billing_telemetry.test.sql
src/
  proxy.ts
  lib/env.ts (+ env.test.ts)
  lib/supabase/{server.ts, client.ts, admin.ts, proxy.ts}
  lib/auth/{safe-next.ts (+ .test.ts), require-user.ts}
  types/database.ts                   # generated
  features/auth/
    schemas.ts (+ schemas.test.ts)    # Zod: signIn, signUp, forgotPassword, resetPassword
    actions.ts                        # Server Actions
    errors.ts (+ errors.test.ts)      # Supabase auth error → pt-BR message
    components/{auth-card.tsx, sign-in-form.tsx, sign-up-form.tsx, forgot-password-form.tsx, reset-password-form.tsx, google-button.tsx, sign-out-button.tsx}
  app/(auth)/{layout.tsx, entrar/page.tsx, cadastro/page.tsx, cadastro/confirme/page.tsx, recuperar-senha/page.tsx, redefinir-senha/page.tsx}
  app/auth/{callback/route.ts, confirm/route.ts}
  app/(public)/{termos/page.tsx, privacidade/page.tsx}
tests/e2e/{global-setup.ts, auth.spec.ts, shell.spec.ts (modified), helpers/mailpit.ts}
docs/guias/contas-producao.md
docs/etapas/etapa-2-relatorio.md
```

---

### Task 1: Local Supabase, env, clients and the cacheComponents decision

**Files:**
- Create: `supabase/config.toml` (via init), `src/lib/env.ts`, `src/lib/env.test.ts`, `src/lib/supabase/{server,client,admin}.ts`
- Modify: `next.config.ts`, `package.json`, `.env.example`, `README.md`

**Interfaces:**
- Produces:
  - `publicEnv: { supabaseUrl: string; supabasePublishableKey: string; siteUrl: string; googleAuthEnabled: boolean }`, parsed with Zod at module load. A missing or invalid value throws `Error("Variável de ambiente inválida: <NAME>")`.
  - `getSecretKey(): string` (server-only), in `src/lib/env.ts`'s sibling `src/lib/env.server.ts`.
  - `createClient()` in `src/lib/supabase/server.ts`: async, cookie-bound, returns `SupabaseClient<Database>`.
  - `createClient()` in `src/lib/supabase/client.ts`: browser client.
  - `createAdminClient()` in `src/lib/supabase/admin.ts`: `import "server-only"`, secret key, `auth: { persistSession: false }`.
  - Scripts: `db:start`, `db:stop`, `db:reset` (`supabase db reset`), `db:test` (`supabase test db`), `db:types` (`supabase gen types typescript --local > src/types/database.ts`), `db:status`.

- [ ] **Step 1: Branch and turn off the cache flags**

Run `git checkout -b etapa-2-backend-auth`. Remove `cacheComponents` and `partialPrefetching` from `next.config.ts` and keep `redirects` and `turbopack`. Run `npm run build && npm run test:e2e`. Expected: all green, the same as the end of Etapa 1.

- [ ] **Step 2: Install dependencies**

Run: `npm i @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers server-only` and `npm i -D supabase`.

- [ ] **Step 3: Init and start Supabase**

Run `npx supabase init` and accept the defaults without generating VS Code settings. In `supabase/config.toml`:
- `[auth] site_url = "http://localhost:3000"`
- `additional_redirect_urls = ["http://localhost:3000/auth/callback", "http://localhost:3100/auth/callback", "http://localhost:3000/auth/confirm", "http://localhost:3100/auth/confirm"]`
- `[auth.email] enable_confirmations = true`
- `[auth.external.google]` with `enabled = false`, `client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"` and `secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"`
- `[storage] file_size_limit = "10MiB"`

Run `npm run db:start`.
Expected: it prints the API URL, the publishable key, the secret key and the Mailpit (Inbucket) URL.

- [ ] **Step 4: Write the env files**

Create `.env.local`, which stays git-ignored, from the `db:status` output. `.env.example` lists all five names from Global Constraints with empty values and pt-BR comments. Also document the commented-out `SUPABASE_AUTH_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_GOOGLE_SECRET` names, which the CLI reads.

- [ ] **Step 5: Write the failing env test**

`env.test.ts` uses a pure `parsePublicEnv(source: Record<string, string | undefined>)` exported from `env.ts`. Cases:
- Valid input yields the object, with `googleAuthEnabled` false unless the value is exactly `"true"`.
- A missing URL throws with the variable name in the message.
- A non-URL `NEXT_PUBLIC_SITE_URL` throws.
- `siteUrl` defaults to `http://localhost:3000` when absent.

Run `npm test -- env`. Expected: FAIL.

- [ ] **Step 6: Implement env.ts, env.server.ts and the three clients**

Follow the current `@supabase/ssr` docs for Next.js App Router (`getAll`/`setAll` cookies). In `server.ts`, `setAll` swallows the error thrown when it is called from a Server Component, with a comment explaining why. The `Database` type import starts as `src/types/database.ts`, generated now by `npm run db:types`, even though it is empty.

- [ ] **Step 7: Verify and commit**

Run: `npm test && npm run lint && npm run typecheck && npm run build`. All must exit 0.
Update the README (pt-BR) with: Docker required, `npm run db:start`, copying keys into `.env.local`, Mailpit at the printed URL, and the new scripts.
Commit: `chore: Supabase local, variáveis de ambiente e clientes tipados`.

---

### Task 2: Foundation migration — profiles, homes, membership, subscriptions, helpers

**Files:**
- Create: `supabase/migrations/*_foundation.sql`, `supabase/seed.sql`, `supabase/tests/01_foundation.test.sql`
- Modify: `src/types/database.ts` (regenerated)

**Interfaces:**
- Produces, in SQL:
  - Enums: `home_role`, `property_type`, `ownership_type`, `household_type`, `routine_level`, `subscription_plan` (`free, pro`), `subscription_status`, `subscription_provider` (`none, beta_grant, stripe, mercadopago`).
  - `public.set_updated_at() returns trigger`.
  - `public.is_home_member(p_home_id uuid) returns boolean` and `public.has_home_role(p_home_id uuid, p_roles public.home_role[]) returns boolean`. Both are `security definer`, `stable`, `set search_path = ''`, and use `auth.uid()`.
  - `public.ensure_same_home(p_home_id uuid, p_table regclass, p_id uuid) returns void`. It raises `P0001` with message `cross_home_reference` when `p_id` is not null and that row's `home_id <> p_home_id`. Later tasks call it from row triggers.
  - `public.current_plan(p_user_id uuid) returns public.subscription_plan`: `pro` if an active or trialing row exists whose `current_period_end` is null or in the future, else `free`.
  - Tables: `profiles` (spec §8.1 plus §15's `current_home_id uuid references homes on delete set null`, `last_seen_at`, `terms_accepted_at`), `homes`, `home_members` (`unique(home_id, user_id)`), `subscriptions` (`unique(user_id)`).
  - Trigger `on_auth_user_created` after insert on `auth.users`. It inserts the profile, taking `full_name` from `raw_user_meta_data->>'full_name'` and setting `terms_accepted_at = now()` when `raw_user_meta_data->>'terms_accepted' = 'true'`. It also inserts the beta `subscriptions` row.
  - Trigger after insert on `homes`. It inserts an `owner` membership for `created_by`, and sets `profiles.current_home_id` when it is null.
- Seed helpers (local only, schema `tests`):
  - `tests.create_user(p_email text) returns uuid` inserts into `auth.users` with a confirmed email, so the trigger runs.
  - `tests.authenticate_as(p_user_id uuid)` does `set local role authenticated` and sets `request.jwt.claims` to `{"sub": ..., "role": "authenticated"}`.
  - `tests.clear_authentication()` resets to `anon`.

- [ ] **Step 1: Write the failing pgTAP tests** in `supabase/tests/01_foundation.test.sql`. Begin with `begin; select plan(N);` and finish with `select * from finish(); rollback;`. Cases:
  - `rls enabled on all foundation tables`, using `tests_rls_enabled` or a query on `pg_tables.rowsecurity` for every public table.
  - `signup creates profile and beta subscription`, where `current_plan` = `pro`.
  - `creating a home makes creator owner and sets current_home_id`.
  - `user B cannot select user A's home`, `cannot update it`, `cannot select its members`.
  - `member cannot escalate role`: insert B as `member` of A's home as A, then authenticate as B and try `update home_members set role='owner'`. Zero rows change, or it errors.
  - `cannot self-join foreign home`: B inserts `home_members(home_id=A's, user_id=B)` and it fails.
  - `only owner deletes home`: an admin's delete affects 0 rows.
  - `profiles are private`: B cannot select A's profile.
  - `subscriptions are read-only for users`: A's update and insert on own subscription fail.
  - `ensure_same_home raises cross_home_reference`.

Run `npm run db:reset && npm run db:test`. Expected: FAIL, because the tables are missing.

- [ ] **Step 2: Write the migration and seed**

Policies:
- `profiles`: select and update where `id = auth.uid()`.
- `homes`: select by member; insert with `created_by = auth.uid()`; update when `has_home_role(id, '{owner,admin}')`; delete when `has_home_role(id, '{owner}')`.
- `home_members`: select by member of the same home; insert, update and delete when `has_home_role(home_id, '{owner,admin}')`. A `with check` makes a non-owner unable to grant `owner`.
- `subscriptions`: select own only.

Add indexes on every FK column. Add `updated_at` triggers on `profiles`, `homes` and `subscriptions`.

- [ ] **Step 3: Run the tests**

Run: `npm run db:reset && npm run db:test`. Expected: all pass.

- [ ] **Step 4: Regenerate types and commit**

Run `npm run db:types && npm run typecheck`. Commit: `feat(db): fundação — perfis, casas, membros, assinaturas e RLS`.

---

### Task 3: Routine migration — rooms, tasks, routines, occurrences

**Files:**
- Create: `supabase/migrations/*_routine.sql`, `supabase/tests/02_routine.test.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Consumes: `is_home_member`, `ensure_same_home`, `set_updated_at` and the seed helpers (Task 2).
- Produces:
  - Enums `room_type`, `task_priority` (`baixa, media, alta`), `task_status` (`active, paused, archived`), `task_source` (`manual, onboarding`), `frequency_type` (`once, daily, weekly, biweekly, monthly, custom`), `interval_unit` (`day, week, month`), `occurrence_status` (`pending, completed, skipped, missed`).
  - Tables `rooms`, `tasks`, `routines`, `task_occurrences`, per spec §8.1. Plus:
    - `routines`: `unique(task_id)`, `check (interval_value >= 1)`, `check (month_day between 1 and 31)`, `check (weekdays <@ '{0,1,2,3,4,5,6}')`, `check (end_date is null or end_date >= start_date)`.
    - `task_occurrences`: `unique(task_id, original_date)`, plus indexes `(home_id, scheduled_for, status)` and `(task_id, scheduled_for)`.
  - `tasks.appliance_id` is created as a plain `uuid` column now. Its FK to `appliances` is added in Task 4's migration.
  - A row trigger on `tasks` calls `ensure_same_home(new.home_id, 'public.rooms', new.room_id)`.
  - A trigger on `task_occurrences` and `routines` copies or validates `home_id` against the parent task. `task_occurrences.home_id` must equal `tasks.home_id`.

- [ ] **Step 1: Write the failing pgTAP tests.**
  - `member CRUD on rooms and tasks`.
  - `non-member sees nothing` on every table.
  - `cross-home FK rejected`: a task in A's home with B's room raises `cross_home_reference`.
  - `occurrence home_id must match task`.
  - `duplicate occurrence rejected`: same task and `original_date`, so `on conflict do nothing` inserts 0 rows.
  - `deleting room nulls task.room_id`.
  - `deleting task cascades routine and occurrences`.

  Run `npm run db:reset && npm run db:test`. Expected: the new file FAILS.
- [ ] **Step 2: Write the migration.** Each table gets RLS with the same four member policies (`using/with check public.is_home_member(home_id)`), FK indexes and `updated_at` triggers.
- [ ] **Step 3: Run the tests.** Expected: all files pass.
- [ ] **Step 4: Regenerate types, typecheck, commit** with `feat(db): cômodos, tarefas, recorrências e ocorrências com RLS`.

---

### Task 4: Maintenance migration — appliances, maintenance records, issues, issue events

**Files:**
- Create: `supabase/migrations/*_maintenance.sql`, `supabase/tests/03_maintenance.test.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Consumes: the Task 2 helpers and `rooms` and `tasks` (Task 3).
- Produces:
  - Enums `appliance_category` (`geladeira, maquina_lavar, ar_condicionado, micro_ondas, fogao, televisao, lava_loucas, outro`), `maintenance_status` (`scheduled, completed, cancelled`), `issue_status` (`open, in_progress, resolved`), `issue_event_type` (`created, status_changed, note, maintenance_linked`).
  - Tables `appliances`, `maintenance_records` (`check (cost_cents >= 0)`), `home_issues` (plus `notify_landlord boolean not null default false`, from §15), `issue_events`.
  - The FK `tasks.appliance_id → appliances(id) on delete set null`, added here.
  - Same-home triggers on every FK listed in §8.1: `tasks.appliance_id`, `maintenance_records.{appliance_id, room_id, issue_id}`, `home_issues.{room_id, appliance_id}`.
  - Trigger on `home_issues`:
    - After insert, it writes a `created` event.
    - After update of `status`, it writes a `status_changed` event with `from_status` and `to_status`.
    - It sets `resolved_at = now()` when the status becomes `resolved`, and clears it when the issue is reopened.
  - `issue_events` policies: select and insert for members only, and **no update or delete policy**, so it is append-only.

- [ ] **Step 1: Write the failing pgTAP tests.**
  - `member CRUD on appliances, maintenance, issues`.
  - `non-member sees nothing`.
  - `cross-home FK rejected`, with one case per FK.
  - `issue status change writes event and sets resolved_at`.
  - `issue_events cannot be updated or deleted by member`.
  - `deleting appliance nulls maintenance.appliance_id and keeps the record`.

  Run them. Expected: FAIL.
- [ ] **Step 2: Write the migration.**
- [ ] **Step 3: Run the tests.** Expected: all pass.
- [ ] **Step 4: Regenerate types and commit** with `feat(db): equipamentos, manutenções e problemas com histórico`.

---

### Task 5: Shopping, attachments and Storage

**Files:**
- Create: `supabase/migrations/*_shopping_attachments.sql`, `supabase/tests/04_shopping_attachments.test.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces:
  - Enums `shopping_category` (`limpeza, higiene, cozinha, lavanderia, alimentacao, outros`), `shopping_unit` (`un, kg, g, l, ml, pacote, caixa`), `attachment_kind` (`photo, document`).
  - `shopping_items` (`check (quantity > 0)`, `issue_id` same-home trigger, index `(home_id, is_purchased, created_at desc)`).
  - `attachments` with explicit FKs `appliance_id`, `maintenance_id` and `issue_id` (cascade), `check (num_nonnulls(appliance_id, maintenance_id, issue_id) = 1)`, and a `check` on `mime_type in ('image/jpeg','image/png','image/webp','image/heic','application/pdf')`. A same-home trigger covers all three FKs. `file_path` must start with `home_id::text || '/'`, which a check trigger enforces.
  - Storage bucket `home-files`, inserted into `storage.buckets` in the migration: `public = false`, `file_size_limit = 10485760`, `allowed_mime_types` = the same five types.
  - Policies on `storage.objects` for `bucket_id = 'home-files'`. Select, insert, update and delete are allowed only when `public.is_home_member(((storage.foldername(name))[1])::uuid)`. A malformed first segment must yield false, not an error. Wrap the cast in a `security definer` helper `public.storage_home_id(p_name text) returns uuid` that returns null on an invalid uuid.

- [ ] **Step 1: Write the failing pgTAP tests.**
  - `member CRUD on shopping_items`.
  - `attachment requires exactly one parent`.
  - `attachment parent must be same home`.
  - `attachment path must start with home_id`.
  - `bad mime rejected`.
  - `storage: member can insert object under own home prefix`.
  - `storage: non-member cannot read or insert under foreign prefix`.
  - `storage: malformed prefix denied without error`.
  - `bucket is private with 10 MiB limit`.

  For the storage cases, insert directly into `storage.objects` (`bucket_id`, `name`, `owner_id`) while authenticated. Run them. Expected: FAIL.
- [ ] **Step 2: Write the migration.**
- [ ] **Step 3: Run the tests.** Expected: all pass.
- [ ] **Step 4: Regenerate types and commit** with `feat(db): compras, anexos e bucket privado com políticas`.

---

### Task 6: Plan limits, telemetry and push structure

**Files:**
- Create: `supabase/migrations/*_billing_telemetry.sql`, `supabase/tests/05_billing_telemetry.test.sql`, `src/constants/plans.ts`, `src/constants/plans.test.ts`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces, in SQL:
  - `public.plan_limits(p_plan public.subscription_plan) returns table(max_homes int, max_active_tasks int, max_appliances int, attachments_allowed boolean)`. `free` returns `(1, 40, 5, false)`. `pro` returns `(null, null, null, true)`, where null means unlimited.
  - `public.home_owner_plan(p_home_id uuid) returns subscription_plan`, the `current_plan` of the home's `owner` member.
  - Before-insert triggers that raise `P0001` with these messages:
    - `plan_limit_homes` on `homes`. It counts homes where `created_by = auth.uid()`.
    - `plan_limit_tasks` on `tasks` with `status='active'`. It also fires on an update from a non-active status to `active`, because that is a new active slot.
    - `plan_limit_appliances` on `appliances` with `archived_at is null`.
    - `plan_limit_attachments` on `attachments`.
  - Tables:
    - `push_subscriptions`: own-row CRUD, `endpoint unique`.
    - `product_events`: `event_name text check (event_name ~ '^[a-z_]{3,50}$')`. Insert own only (`user_id = auth.uid()`, and `home_id` null or a membership). No select policy.
    - `pro_interest`: `user_id`, `price_option text check (price_option in ('mensal','anual'))`, `created_at`, `unique(user_id, price_option)`. Insert and select own.
    - `account_deletion_log`: `id`, `deleted_at`, `anonymized_ref uuid`. RLS is on with **no policies**.
- Produces, in TS: `src/constants/plans.ts` exports `PLAN_LIMITS: Record<"free" | "pro", { maxHomes: number | null; maxActiveTasks: number | null; maxAppliances: number | null; attachmentsAllowed: boolean }>`, with the same values, and `PLAN_LIMIT_ERRORS: Record<"plan_limit_homes" | "plan_limit_tasks" | "plan_limit_appliances" | "plan_limit_attachments", string>`, which holds pt-BR messages. For example, `plan_limit_appliances` is "No plano gratuito você pode cadastrar até 5 equipamentos. Arquive um ou conheça o MORANO PRO."

- [ ] **Step 1: Write the failing tests.**
  - pgTAP (switch a user to free by updating their subscription as `postgres` in the test):
    - `free: 2nd home rejected`.
    - `free: 41st active task rejected, paused task not counted, reactivating 41st rejected`.
    - `free: 6th appliance rejected with plan_limit_appliances; archiving one allows insert`.
    - `free: attachment rejected`.
    - `pro (beta): limits not applied`.
    - `downgrade keeps over-limit rows selectable and updatable`.
    - `product_events: insert own ok, select returns 0 rows, foreign home rejected`.
    - `account_deletion_log inaccessible to authenticated`.
  - Vitest `plans.test.ts`: the free values are exactly 1/40/5/false, and every `PLAN_LIMIT_ERRORS` key matches the SQL error names.

  Run both suites. Expected: FAIL.
- [ ] **Step 2: Write the migration and plans.ts.**
- [ ] **Step 3: Run `npm run db:reset && npm run db:test && npm test`.** Expected: all pass.
- [ ] **Step 4: Regenerate types and commit** with `feat(db): limites do plano no banco, telemetria própria e estrutura de push`.

---

### Task 7: Auth — proxy, route protection, actions and pages

**Files:**
- Create: `src/proxy.ts`, `src/lib/supabase/proxy.ts`, `src/lib/auth/{safe-next.ts,safe-next.test.ts,require-user.ts}`, `src/features/auth/{schemas.ts,schemas.test.ts,errors.ts,errors.test.ts,actions.ts}`, `src/features/auth/components/*`, `src/app/(auth)/**`, `src/app/auth/{callback,confirm}/route.ts`, `src/app/(public)/{termos,privacidade}/page.tsx`
- Modify: `next.config.ts` (remove the `/` redirect), `src/components/layout/app-header.tsx` and `sidebar.tsx` (add `SignOutButton` beside Configurações in the sidebar footer, and in the mobile header as a menu-less icon button with `aria-label="Sair"`)

**Interfaces:**
- Produces:
  - `safeNextPath(raw: string | null | undefined, fallback = "/inicio"): string`. It returns `raw` only if it starts with a single `/`, is not `//...` or `/\...`, contains no `://`, and does not point to an auth route (`/entrar`, `/cadastro`, `/auth/`). Otherwise it returns `fallback`.
  - `requireUser(): Promise<{ id: string; email: string }>` for Server Components and Actions. It uses `supabase.auth.getClaims()` and calls `redirect("/entrar")` when there are no verified claims.
  - Route rules in `src/proxy.ts`, via `updateSession(request)` in `lib/supabase/proxy.ts` (verified with `getClaims()`, never the raw cookie):
    - **Private:** `/inicio`, `/rotina`, `/casa`, `/manutencao`, `/compras`, `/configuracoes`, `/onboarding` and their subpaths. With no user, redirect to `/entrar?next=<path>`.
    - **Auth-only:** `/entrar`, `/cadastro`, `/recuperar-senha`. With a user, redirect to `/inicio`.
    - **`/`:** redirect to `/inicio` with a user, else to `/entrar`.
    - **Public:** `/termos`, `/privacidade`, `/auth/*`, `/redefinir-senha` (it needs a recovery session), and `/estilo` (dev).
    - **Matcher** excludes `_next/static`, `_next/image`, `icon.svg`, `apple-icon`, `manifest.webmanifest` and image extensions.
  - Zod schemas in `schemas.ts`:
    - `signInSchema`: `{ email, password }`.
    - `signUpSchema`: `{ fullName (2–80 chars, trimmed), email, password (min 8, at least 1 letter and 1 number), termsAccepted: literal(true) }`.
    - `forgotPasswordSchema`: `{ email }`.
    - `resetPasswordSchema`: `{ password, confirmPassword }`, which must match.
    - The pt-BR messages are part of the schema.
  - `authErrorMessage(code: string | undefined): string` in `errors.ts` maps:
    - `invalid_credentials` → "E-mail ou senha incorretos."
    - `email_not_confirmed` → "Confirme seu e-mail antes de entrar. Reenviamos o link."
    - `user_already_exists` → the same neutral text as success, so the response never reveals whether an email exists.
    - `weak_password` → "Escolha uma senha mais forte."
    - `over_email_send_rate_limit` → "Muitas tentativas. Aguarde alguns minutos."
    - The default is "Não foi possível concluir. Tente novamente."
  - Server Actions in `actions.ts`, each `(prevState, formData) => Promise<FormState>`, where `FormState = { status: "idle" | "error" | "success"; message?: string; fieldErrors?: Record<string, string> }`:
    - `signIn`: on success, `redirect(safeNextPath(next))`.
    - `signUp`: calls `emailRedirectTo` with `${siteUrl}/auth/confirm` and `data: { full_name, terms_accepted: "true" }`, then `redirect("/cadastro/confirme")` even when the user already exists.
    - `requestPasswordReset`: `redirectTo` is `${siteUrl}/auth/confirm?next=/redefinir-senha`, and the result is always success with "Se houver uma conta com esse e-mail, enviamos um link."
    - `resetPassword`: `updateUser({ password })`, then `redirect("/inicio")`.
    - `signOut`: then `redirect("/entrar")`.
    - `signInWithGoogle`: `signInWithOAuth` with `redirectTo` `${siteUrl}/auth/callback?next=...`, then `redirect(data.url)`.
  - `app/auth/confirm/route.ts` handles `token_hash` + `type` via `verifyOtp`, then redirects to `safeNextPath(next)`. On error it redirects to `/entrar?erro=link`. `app/auth/callback/route.ts` handles `code` via `exchangeCodeForSession`, with the same redirect rules.
  - Pages:
    - `(auth)/layout.tsx`: a centered card on Off-white with `Logo size="lg"` and the slogan, no app shell.
    - `/entrar`: email, password, "Entrar", a link to "Esqueci minha senha", "Criar conta", the Google button only behind the flag, and an `erro=link` banner "O link expirou ou já foi usado. Peça um novo."
    - `/cadastro`: name, email, password, a required terms checkbox linking to `/termos` and `/privacidade`.
    - `/cadastro/confirme`: "Enviamos um link para o seu e-mail. Abra-o neste aparelho para continuar."
    - `/recuperar-senha` and `/redefinir-senha`.
    - `/termos` and `/privacidade`: a clear "Versão preliminar — o texto definitivo será publicado antes do lançamento." notice plus a short honest summary of what data is collected (spec §10 and §15). They are not presented as final legal text.
  - Forms use React Hook Form + Zod for client feedback, and post the same `FormData` to the action, which re-validates. Buttons show pending state ("Entrando…") and fields have proper `autocomplete`.

- [ ] **Step 1: Write the failing unit tests**
  - `safe-next.test.ts`:
    ```ts
    expect(safeNextPath("/rotina")).toBe("/rotina");
    expect(safeNextPath("/rotina?x=1")).toBe("/rotina?x=1");
    expect(safeNextPath("https://evil.com")).toBe("/inicio");
    expect(safeNextPath("//evil.com")).toBe("/inicio");
    expect(safeNextPath("/\\evil.com")).toBe("/inicio");
    expect(safeNextPath("/entrar")).toBe("/inicio");
    expect(safeNextPath(null)).toBe("/inicio");
    expect(safeNextPath("rotina")).toBe("/inicio");
    ```
  - `schemas.test.ts`: a valid sign-up passes. A password `"abcdefgh"` fails with "A senha precisa ter letras e números." `termsAccepted: false` fails with "Aceite os termos para continuar." Mismatched reset passwords fail with "As senhas não coincidem."
  - `errors.test.ts`: each mapped code gives its message, and an unknown code gives the default.

  Run `npm test -- safe-next schemas errors`. Expected: FAIL.
- [ ] **Step 2: Implement** `safeNextPath`, the schemas, the error map, the Supabase proxy helper, `src/proxy.ts`, `requireUser`, the actions, the routes, the pages and the components. Remove the `/` redirect from `next.config.ts`.
- [ ] **Step 3: Run the unit tests, lint, typecheck and build.** Expected: all pass.
- [ ] **Step 4: Commit** with `feat(auth): login, cadastro com confirmação, recuperação de senha e rotas protegidas`.

---

### Task 8: E2E with real auth, owner guide and stage report

**Files:**
- Create: `tests/e2e/global-setup.ts`, `tests/e2e/helpers/mailpit.ts`, `tests/e2e/auth.spec.ts`, `docs/guias/contas-producao.md`, `docs/etapas/etapa-2-relatorio.md`
- Modify: `playwright.config.ts`, `tests/e2e/shell.spec.ts`, `.gitignore` (`tests/e2e/.auth/`)

**Interfaces:**
- Consumes: `createAdminClient` (Task 1) and the auth pages (Task 7).
- Produces:
  - `global-setup.ts` requires local Supabase to be running and fails with a pt-BR hint otherwise. It creates (or reuses) the confirmed user `e2e@morano.test` with password `Morano123` through `auth.admin.createUser({ email_confirm: true, user_metadata: { full_name: "Pessoa Teste", terms_accepted: "true" } })`. It signs in through the UI at `/entrar` and saves `tests/e2e/.auth/user.json`.
  - Playwright projects `mobile` and `desktop` use `storageState` from that file. A third project, `auth`, runs on Desktop Chrome without stored state and runs only `auth.spec.ts`.
  - `mailpit.ts`: `latestLinkFor(email: string): Promise<string>` polls the Mailpit API (base URL from `supabase status`; local default `http://127.0.0.1:54324`) for up to 10s and returns the first `http://localhost` link in the newest message to that address.

- [ ] **Step 1: Write the E2E tests**
  - `shell.spec.ts` keeps all its tests (now authenticated), plus `/` → `/inicio` when logged in.
  - `auth.spec.ts` (project `auth`):
    - `anonymous user is sent to /entrar with next`: `goto("/rotina")` → URL `/entrar?next=%2Frotina`.
    - `sign up, confirm by email, land in app`:
      - Use a unique email `cadastro-<timestamp>@morano.test`.
      - After submitting, the URL is `/cadastro/confirme`.
      - `latestLinkFor` the email, then `goto(link)`, and the URL ends with `/inicio`.
    - `unconfirmed user cannot enter app`: sign up, do not open the link, and `goto("/inicio")` gives `/entrar`. Signing in shows the `email_not_confirmed` message.
    - `wrong password shows friendly error`.
    - `open redirect blocked`: log in at `/entrar?next=https://evil.com`, and the URL becomes `/inicio`.
    - `forgot password flow`:
      - Request a reset, and the neutral message appears.
      - Open the Mailpit link, which lands on `/redefinir-senha`.
      - Set a new password, which lands on `/inicio`.
      - Sign out, then sign in with the new password.
    - `sign out returns to /entrar and protects routes again`.
    - `Google button hidden when flag off`.
    - `terms checkbox required`.
- [ ] **Step 2: Run** `npm run test:e2e`. Expected: all pass, with skips only where a test is project-gated.
- [ ] **Step 3: Write `docs/guias/contas-producao.md`** in pt-BR, as step-by-step instructions for a non-technical owner:
  1. Register a domain on Registro.br (`.com.br`) or another registrar. It is needed for e-mail and Google.
  2. Create a Supabase account and project, choosing the São Paulo region (sa-east-1). Note where the URL and the publishable and secret keys live, and say that **the secret key is never shared or sent in chat**.
  3. Create a Google Cloud project, configure the OAuth consent screen, create a "Web application" client ID, and set the authorized redirect URI to `https://<project>.supabase.co/auth/v1/callback`. Warn that verification can take days.
  4. Create a Resend account, verify the domain with its DNS records, and generate the SMTP credentials that go into Supabase Auth SMTP settings.
  5. Create a Vercel account. Explain that Pro is required for commercial use, so it can wait until Etapa 10.
  6. List what to send to the assistant (client ID only, never secrets in chat; secrets go straight into the dashboards or `.env.local`).
- [ ] **Step 4: Run the full verification**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run db:reset && npm run db:test && npm run build && npm run test:e2e`. Every command must exit 0.

- [ ] **Step 5: Write `docs/etapas/etapa-2-relatorio.md`** in the owner's 7-section format, as in Etapa 1. Include the pgTAP test count, Vitest and Playwright counts, dependencies with installed versions, problems found, and what is missing (Etapa 3, plus the owner's account checklist). Commit: `test(e2e): autenticação real nos testes, guia de contas e relatório da Etapa 2`.

Then stop and wait for the owner's approval.
