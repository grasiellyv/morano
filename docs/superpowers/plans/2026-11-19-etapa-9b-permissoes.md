# Etapa 9B — Permissões Granulares

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar permissões granulares por módulo para membros com role `member`. Owner e admin têm acesso completo e ignoram completamente as permissões. Sem nenhuma configuração, membros acessam tudo (opt-in restriction). Guards em server actions e queries. Scopes por room_type (tarefas) e por categoria (compras). UI para configuração por membro.

**Architecture:** `home_member_permissions` guarda restrições por (home_id, user_id, module); ausência de linha = acesso padrão (true). `home_member_task_scopes` e `home_member_shopping_scopes` guardam escopos; ausência = sem filtro. `has_home_permission(home_id, module, check)` SQL: resolve bypass owner/admin e default-true. TypeScript `hasPermission(supabase, homeId, module, level)`: thin wrapper ao RPC. Guards nos server actions de tasks, shopping, events. `can_view` guard nas queries `getTodayOccurrences` e `getShoppingItems`. Scopes: filtro TypeScript pós-query. Mutations vão por RPCs SQL (security definer), não por acesso direto às tabelas. Visibilidade condicional: Sidebar e BottomNav filtram itens com `can_view = false`.

**Dependência:** Requer Etapa 9A (tabela `home_members`, helpers `is_home_member`, `has_home_role`) já aplicada em `main`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict + noUncheckedIndexedAccess, Supabase local via Docker, Zod 4.

**Spec:** Documento "Etapa 9 — Planejamento: Casa Compartilhada e Permissões" (Claude Docs), seção "Etapa 9B".

## Global Constraints

- Zod 4: `{ error: "..." }`, `.trim()` antes de `.min(1)`, `.coerce.number()`
- Homebound security: nunca aceitar `homeId` do cliente — derivar de `profiles.current_home_id`
- `"use server"` no topo dos arquivos de server actions; `"server-only"` nos arquivos de queries
- TypeScript strict: sem `any`, sem `!` não-nulo, sem `@ts-ignore`
- Sem comentários desnecessários no código; sem emoji no código-fonte
- Grants: `revoke all ... from anon, authenticated` antes de qualquer grant; mutations vão por RPCs, não por `grant insert/update/delete` em tabelas
- `has_home_permission` não aceita `userId` — usa `auth.uid()` internamente (security definer)
- Owner e admin SEMPRE bypassam; member com ausência de linha para o módulo = acesso padrão (true)
- `useActionState` de `react` (não `react-dom`) para forms client-side
- `FormState` de `@/features/auth/form-state`; `textField` para ler FormData
- Após a migration, rodar `npm run db:reset` e depois `npm run db:types` para regenerar `src/types/database.ts`

## Review Focus

1. Owner/admin bypassam completamente — `has_home_permission` retorna `true` sem checar `home_member_permissions`
2. Membro sem linha para módulo → acesso completo (não bloquear o que não foi configurado)
3. Guard em `completeOccurrence` com `can_edit = false` → erro antes de qualquer query DB
4. `getTodayOccurrences` com `can_view = false` → retorna `[]` imediatamente
5. Task scope presente → filtra por room_type; task scope ausente → sem filtro (todas as ocorrências)
6. Shopping scope: mesmo padrão do task scope
7. Remover membro limpa permissões e scopes via FK CASCADE (garantido pela migration)
8. `setMemberPermission` com todos os valores padrão (can_view=true, can_edit=true, can_manage=false) deve DELETE a linha, não mantê-la, para preservar o comportamento default-true

---

## Task 1: Migration SQL — tabelas de permissões, scopes e RPCs

**Files:**
- Create: `supabase/migrations/20261119040000_permissions.sql`

**Steps:**
- [ ] **Enum:** `create type public.permission_module as enum ('tasks', 'shopping', 'events', 'maintenance', 'members_read', 'members_manage', 'settings')`

- [ ] **Tabela `home_member_permissions`:**
  ```sql
  create table public.home_member_permissions (
    home_id uuid not null references public.homes(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    module public.permission_module not null,
    can_view boolean not null default true,
    can_edit boolean not null default true,
    can_manage boolean not null default false,
    granted_by uuid not null references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (home_id, user_id, module),
    foreign key (home_id, user_id) references public.home_members(home_id, user_id) on delete cascade
  );
  ```

- [ ] **Tabela `home_member_task_scopes`:**
  ```sql
  create table public.home_member_task_scopes (
    home_id uuid not null,
    user_id uuid not null,
    room_type public.room_type not null,
    primary key (home_id, user_id, room_type),
    foreign key (home_id, user_id) references public.home_members(home_id, user_id) on delete cascade
  );
  ```

- [ ] **Tabela `home_member_shopping_scopes`:**
  ```sql
  create table public.home_member_shopping_scopes (
    home_id uuid not null,
    user_id uuid not null,
    category public.shopping_category not null,
    primary key (home_id, user_id, category),
    foreign key (home_id, user_id) references public.home_members(home_id, user_id) on delete cascade
  );
  ```

- [ ] **GRANTs e RLS:**
  - `revoke all on public.home_member_permissions from anon, authenticated`
  - `grant select on public.home_member_permissions to authenticated`
  - RLS em `home_member_permissions`: SELECT para própria linha (`user_id = auth.uid()`) OU owner/admin da casa (`public.has_home_role(home_id, 'admin')`)
  - RLS em `home_member_task_scopes`: SELECT para própria linha OU owner/admin; sem INSERT/UPDATE/DELETE direto
  - RLS em `home_member_shopping_scopes`: idem
  - `revoke all on public.home_member_task_scopes from anon, authenticated; grant select ...`
  - `revoke all on public.home_member_shopping_scopes from anon, authenticated; grant select ...`

- [ ] **Helper `has_home_permission`:**
  ```sql
  create function public.has_home_permission(
    p_home_id uuid,
    p_module public.permission_module,
    p_check text  -- 'view' | 'edit' | 'manage'
  ) returns boolean
  language plpgsql security definer set search_path = '' stable
  as $$
  declare
    v_role public.home_role;
    v_perm record;
  begin
    select role into v_role
    from public.home_members
    where home_id = p_home_id and user_id = auth.uid();
    if v_role in ('owner', 'admin') then return true; end if;
    if v_role is null then return false; end if;
    select can_view, can_edit, can_manage into v_perm
    from public.home_member_permissions
    where home_id = p_home_id and user_id = auth.uid() and module = p_module;
    if not found then return true; end if;
    if p_check = 'view'   then return v_perm.can_view; end if;
    if p_check = 'edit'   then return v_perm.can_view and v_perm.can_edit; end if;
    if p_check = 'manage' then return v_perm.can_view and v_perm.can_edit and v_perm.can_manage; end if;
    return false;
  end;
  $$;
  ```

- [ ] **RPCs de gestão (security definer, verificam owner/admin):**

  `set_member_permission(p_target_user uuid, p_module permission_module, p_can_view boolean, p_can_edit boolean, p_can_manage boolean)`:
  - Verifica `has_home_role(current_home_id, 'admin')` para o chamador
  - Se can_view=true AND can_edit=true AND can_manage=false (defaults): DELETE a linha se existir
  - Caso contrário: UPSERT (insert ... on conflict do update)
  - Atualiza `updated_at`; set `granted_by = auth.uid()`

  `clear_member_permissions(p_target_user uuid)`:
  - Verifica `has_home_role` para chamador
  - DELETE FROM home_member_permissions WHERE home_id = current_home_id AND user_id = p_target_user
  - DELETE FROM home_member_task_scopes WHERE home_id = current_home_id AND user_id = p_target_user
  - DELETE FROM home_member_shopping_scopes WHERE home_id = current_home_id AND user_id = p_target_user

  `set_member_task_scopes(p_target_user uuid, p_room_types public.room_type[])`:
  - Verifica `has_home_role` para chamador
  - DELETE existing scopes for (home_id, p_target_user)
  - INSERT p_room_types (pode ser array vazio = sem escopo = acesso a todos)

  `set_member_shopping_scopes(p_target_user uuid, p_categories public.shopping_category[])`:
  - Verifica `has_home_role` para chamador
  - DELETE existing scopes for (home_id, p_target_user)
  - INSERT p_categories

  Para todos os RPCs:
  - `revoke execute on function ... from public, anon`
  - `grant execute on function ... to authenticated`

- [ ] **Aplica e regenera tipos:**
  - `npm run db:reset` para aplicar migration
  - `npm run db:types` para regenerar `src/types/database.ts`

**Completion criteria:**
- `npm run db:reset` completa sem erros
- `src/types/database.ts` contém `permission_module` em `Enums` e as 3 novas tabelas

---

## Task 2: TypeScript — helper hasPermission, guards e schemas

**Files:**
- Create: `src/features/permissions/helpers.ts`
- Create: `src/features/permissions/queries.ts`
- Create: `src/features/permissions/schemas.ts`
- Create: `src/features/permissions/schemas.test.ts`
- Create: `src/features/permissions/actions.ts`
- Modify: `src/features/tasks/queries.ts`
- Modify: `src/features/tasks/actions.ts`
- Modify: `src/features/shopping/queries.ts`
- Modify: `src/features/shopping/actions.ts`
- Modify: `src/features/events/actions.ts`

**Requires:** Task 1 complete (migration aplicada, tipos gerados)

**Interfaces Produced:**

`src/features/permissions/helpers.ts`:
```ts
export type PermissionModule = 'tasks' | 'shopping' | 'events' | 'maintenance' |
  'members_read' | 'members_manage' | 'settings'
export type PermissionCheck = 'view' | 'edit' | 'manage'

// Thin wrapper ao RPC has_home_permission. homeId = current home do usuário.
export async function hasPermission(
  supabase: SupabaseClient<Database>,
  homeId: string,
  module: PermissionModule,
  check: PermissionCheck,
): Promise<boolean>
```

`src/features/permissions/queries.ts` (server-only):
```ts
export type MemberPermissionRow = {
  module: PermissionModule
  can_view: boolean
  can_edit: boolean
  can_manage: boolean
}
export type MemberScopesData = {
  task_scopes: string[]      // room_type[]
  shopping_scopes: string[]  // shopping_category[]
}

// Lê permissões do membro (owner/admin usa para configurar; membro lê próprias)
export async function getMemberPermissions(
  supabase: SupabaseClient<Database>,
  userId: string,
  homeId: string,
): Promise<MemberPermissionRow[]>

// Lê scopes do membro
export async function getMemberScopes(
  supabase: SupabaseClient<Database>,
  userId: string,
  homeId: string,
): Promise<MemberScopesData>
```

`src/features/permissions/actions.ts`:
```ts
// Chama RPC set_member_permission para um único módulo
// fd: user_id, module, can_view (checkbox), can_edit (checkbox), can_manage (checkbox)
export async function setMemberPermission(_: FormState, fd: FormData): Promise<FormState>

// Chama RPCs set_member_task_scopes e set_member_shopping_scopes
// fd: user_id, task_scopes[] (checkboxes de room_type), shopping_scopes[] (checkboxes de category)
export async function setMemberScopes(_: FormState, fd: FormData): Promise<FormState>

// Chama clear_member_permissions
// fd: user_id
export async function clearMemberPermissions(_fd: FormData): Promise<void>
```

**Modificações em tasks/queries.ts:**
- `OccurrenceWithTask.task` ganha campo `room: { id: string; room_type: string } | null`
- `getTodayOccurrences(supabase, homeId, today, userId?)`:
  1. Se `userId` fornecido: chama `hasPermission(supabase, homeId, 'tasks', 'view')` → se false, retorna `[]`
  2. Query existente + join adicional em tasks: `task:tasks(id, title, priority, estimated_minutes, room_id, status, room:rooms(id, room_type))`
  3. Se `userId` fornecido: carrega task scopes via `getMemberTaskScopes`; se scopes não-vazios, filtra `rows` por `r.task.room?.room_type in scopes`
- `getOverdueOccurrences` e demais queries: NÃO precisam de guard de view (critério de conclusão da 9B não as cita)

**Modificações em tasks/actions.ts (guards can_edit e can_manage):**
- **Não** guardar `extendWindowForHome` (uso interno, não iniciado pelo usuário)
- Guards `can_edit` (antes do código principal): `completeOccurrence`, `undoComplete`, `skipOccurrence`, `postponeOccurrence`
- Guards `can_manage`: `createTask`, `updateTask`, `editTaskRule`, `archiveTask`, `deleteTask`
- Pattern guard: após obter `homeId` de `profiles.current_home_id`, chamar `hasPermission(supabase, homeId, 'tasks', 'edit')` e retornar erro formatado se false

**Modificações em shopping/queries.ts:**
- `getShoppingItems(supabase, homeId, userId?)`:
  1. Se `userId` fornecido: guard `can_view` para shopping
  2. Se scopes presentes: filtra por categoria

**Modificações em shopping/actions.ts:**
- Guards `can_edit`: `addItem`, `togglePurchased`, `editItem`
- Guards `can_manage`: `deleteItem`

**Modificações em events/actions.ts:**
- Guards `can_edit`: `createEvent`, `updateEvent`
- Guards `can_manage`: `deleteEvent`

**Testes em schemas.test.ts:**
- Schemas Zod para as FormData das actions (setMemberPermission, setMemberScopes)
- Validações: módulo válido, userId uuid válido, booleans corretos

**Completion criteria:**
- `npm test` passando (180+ testes, 0 falhas)
- `hasPermission('tasks', 'edit')` retorna false → server action retorna `{ status: 'error', message: '...' }`

---

## Task 3: Página de permissões — /casa/membros/[userId]/permissoes

**Files:**
- Create: `src/app/(app)/casa/membros/[userId]/permissoes/page.tsx`
- Create: `src/features/permissions/components/permission-form.tsx`
- Create: `src/features/permissions/components/scopes-form.tsx`
- Create: `src/features/permissions/templates.ts`

**Requires:** Task 2 complete

**Routing:** Next.js App Router, `[userId]` é dinâmico

**Comportamento da página:**
1. Verifica se chamador é owner ou admin; se não, redireciona para `/casa/membros`
2. Verifica se `userId` é membro da casa; se não, redireciona para `/casa/membros`
3. Exibe nome, avatar e role do membro alvo
4. Mostra formulário de permissões por módulo
5. Mostra formulário de scopes (task_scopes, shopping_scopes)
6. Botões de template na parte superior para aplicar predefinições
7. Link "← Voltar para membros"

**Templates em `templates.ts`:**
```ts
export type PermissionTemplate = {
  label: string
  permissions: Array<{ module: PermissionModule; can_view: boolean; can_edit: boolean; can_manage: boolean }>
  task_scopes: string[]        // room_type[]
  shopping_scopes: string[]    // shopping_category[]
}

export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    label: 'Empregada doméstica',
    permissions: [
      { module: 'tasks', can_view: true, can_edit: true, can_manage: false },
      { module: 'shopping', can_view: true, can_edit: true, can_manage: false },
    ],
    task_scopes: ['sala', 'quarto', 'banheiro', 'lavanderia'],
    shopping_scopes: [],
  },
  {
    label: 'Cozinheiro',
    permissions: [
      { module: 'tasks', can_view: true, can_edit: true, can_manage: false },
      { module: 'shopping', can_view: true, can_edit: true, can_manage: false },
    ],
    task_scopes: ['cozinha'],
    shopping_scopes: ['alimentacao', 'cozinha'],
  },
  {
    label: 'Visualizador',
    permissions: [
      { module: 'tasks', can_view: true, can_edit: false, can_manage: false },
      { module: 'shopping', can_view: true, can_edit: false, can_manage: false },
      { module: 'events', can_view: true, can_edit: false, can_manage: false },
    ],
    task_scopes: [],
    shopping_scopes: [],
  },
  {
    label: 'Morador completo',
    permissions: [],  // sem restrições
    task_scopes: [],
    shopping_scopes: [],
  },
]
```

**UI de módulos (permission-form.tsx):**
- Tabela ou grid: linha por módulo visível (tasks, shopping, events, settings)
- Colunas: módulo | can_view | can_edit | can_manage
- Labels legíveis: "Tarefas", "Compras", "Eventos", "Configurações"
- can_view false → can_edit e can_manage desabilitados automaticamente (client JS)
- Formulário usa `useActionState(setMemberPermission, ...)`

**UI de scopes (scopes-form.tsx):**
- Seção "Cômodos (Tarefas)": checkboxes por room_type com labels em PT
- Seção "Categorias (Compras)": checkboxes por shopping_category com labels em PT
- Dica: "Sem seleção = acesso a todos"
- Formulário usa `useActionState(setMemberScopes, ...)`

**Completion criteria:**
- Página renderiza sem erros para owner/admin
- Não-owner/admin redireciona para /casa/membros
- Submissão salva permissões no DB

---

## Task 4: Visibilidade condicional nos menus

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`
- Modify: `src/components/layout/nav-items.ts`

**Requires:** Task 2 complete (hasPermission helper, tipos gerados)

**Mapeamento módulo → href:**
```ts
const MODULE_FOR_HREF: Partial<Record<NavItem['href'], PermissionModule>> = {
  '/rotina':    'tasks',
  '/compras':   'shopping',
  '/manutencao': 'maintenance',
}
// /inicio e /casa sempre visíveis (sem módulo)
// /configuracoes → 'settings' (SETTINGS_NAV separado)
```

**Mudanças:**

`nav-items.ts`: adicionar campo opcional `module?: PermissionModule` a `NavItem`; adicionar módulo nos itens que têm correspondência (rotina→tasks, compras→shopping, manutencao→maintenance).

`layout.tsx`: após obter `profile.current_home_id`, chamar `hasPermission` para cada módulo de nav que tem um item (tasks, shopping, maintenance, settings). Construir `Set<PermissionModule>` com os visíveis. Passar para `AppShell` como `visibleModules`.

`app-shell.tsx`: aceitar `visibleModules: Set<string>` como prop; passar para `Sidebar` e `BottomNav`.

`sidebar.tsx` e `bottom-nav.tsx`: aceitar `navItems: readonly NavItem[]` como prop; filtrar PRIMARY_NAV com base em `visibleModules`; BottomNav: grid com `gridTemplateColumns: repeat(N, minmax(0, 1fr))` onde N = navItems.length.

**Edge cases:**
- Se `hasPermission` falhar (ex: DB erro), defaultar para visível (fail-open)
- Owner/admin: `has_home_permission` retorna true para todos → todos os itens visíveis

**Completion criteria:**
- `npm test` passando (180+ testes)
- Membro com `tasks.can_view = false` não vê `/rotina` no menu
- Owner/admin sempre vê todos os itens

---
