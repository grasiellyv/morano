# Manutenção — Módulo de Problemas e Serviços Ad-hoc

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo `/manutencao` para registro e acompanhamento de problemas e serviços ad-hoc na casa, com status, notas de progresso e celebração 🎉 ao concluir.

**Architecture:** Nova tabela `maintenance_items` com enum `maintenance_status` e RLS por `home_id`. Quatro server actions (criar, editar campos, mudar status, excluir). UI com dois grupos (Em aberto / Histórico) e transições de status inline. `CelebrationOverlay` estendido com props opcionais de texto.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (local), Zod 4, Vitest, TypeScript

**Spec:** `docs/superpowers/specs/2026-11-19-manutencao-design.md`

## Global Constraints

- `home_id` sempre de `profiles.current_home_id` no servidor — nunca do cliente
- Status enum DB (sem acento): `pendente | em_andamento | concluido | cancelado`
- `updateMaintenanceItem` bloqueia edição de itens com `status IN ('concluido', 'cancelado')`; retorna `{ status: "error", message: "Item já foi concluído ou cancelado." }`
- `updateMaintenanceStatus` não aceita `status = 'pendente'` (schema Zod rejeita)
- `resolved_at` recebe `new Date().toISOString()` ao transitar para `concluido` ou `cancelado`; recebe `null` para `em_andamento`
- `CelebrationOverlay`: título `"Item concluído! 🎉"`, mensagem `"Registrado no histórico."`
- Zod 4: usar `{ error: "..." }` nos min/max/enum (não `message:`)
- Padrão de verificação pós-write: `.select("id")` após UPDATE/DELETE para detectar 0 rows sem erro
- Manter todos os testes passando (atualmente 180/180)

## Review Focus

1. **`updateMaintenanceItem` em item `concluido`** → server retorna erro. Garantido pelo SELECT de status antes do UPDATE em Task 3; não testável em unidade sem Supabase.
2. **`updateStatusSchema` recebe `status: "pendente"`** → `safeParse` retorna `success: false`. Teste: `updateStatusSchema rejects pendente` em Task 2.
3. **`resolved_at` em transição para `em_andamento`** → deve ser `null`. Garantido pela lógica da action em Task 3; não testável em unidade sem Supabase.
4. **Título com 201 caracteres** → schema rejeita. Teste: `createMaintenanceSchema rejects title > 200` em Task 2.
5. **RLS: membro de outra casa tenta acessar item** → Supabase bloqueia via policy. Não testável sem integração.

---

### Task 1: Migration, tipos e CelebrationOverlay

**Files:**
- Create: `supabase/migrations/20261119090000_manutencao.sql`
- Modify: `src/types/database.ts` (regenerado — não editar manualmente)
- Modify: `src/features/tasks/components/celebration-overlay.tsx`

**Interfaces:**
- Produces: enum `maintenance_status` e tabela `maintenance_items` no banco e nos tipos gerados; `CelebrationOverlay` aceita `title?: string` e `message?: string`

- [ ] **Step 1: Escrever a migration em `supabase/migrations/20261119090000_manutencao.sql`**

```sql
CREATE TYPE maintenance_status AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');

CREATE TABLE maintenance_items (
  id           UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id      UUID               NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  room_id      UUID               REFERENCES rooms(id) ON DELETE SET NULL,
  title        TEXT               NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  TEXT,
  notes        TEXT,
  status       maintenance_status NOT NULL DEFAULT 'pendente',
  created_by   UUID               NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home members full access"
  ON maintenance_items FOR ALL
  USING (
    home_id IN (SELECT current_home_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    home_id IN (SELECT current_home_id FROM profiles WHERE id = auth.uid())
  );

GRANT ALL ON maintenance_items TO authenticated;
```

- [ ] **Step 2: Aplicar a migration**

Bash: `npx supabase migration up --local`
Esperado: `Applying migration 20261119090000_manutencao.sql... done.`

- [ ] **Step 3: Regenerar tipos** (usar Bash — não PowerShell)

Bash: `npx supabase gen types typescript --local > src/types/database.ts 2>/dev/null`

- [ ] **Step 4: Verificar tipos gerados**

Bash: `grep -c "maintenance_items" src/types/database.ts`
Esperado: número > 0

- [ ] **Step 5: Estender `CelebrationOverlay` em `src/features/tasks/components/celebration-overlay.tsx`**

Adicionar à interface `Props`:
```typescript
title?: string;
message?: string;
```
Substituir os textos hardcoded pelos valores das props com fallback:
- `"Rotina completa!"` → `{title ?? "Rotina completa!"}`
- `"Todas as tarefas do dia foram concluídas."` → `{message ?? "Todas as tarefas do dia foram concluídas."}`

- [ ] **Step 6: Rodar suite completa**

Bash: `npx vitest run`
Esperado: 180/180 passando

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261119090000_manutencao.sql src/types/database.ts src/features/tasks/components/celebration-overlay.tsx
git commit -m "feat(manutencao): migration, tipos e CelebrationOverlay com props opcionais

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Schemas + testes

**Files:**
- Create: `src/features/manutencao/schemas.ts`
- Create: `src/features/manutencao/schemas.test.ts`

**Interfaces:**
- Produces:
  - `createMaintenanceSchema`: `{ title: string, description?: string, room_id?: string (uuid), notes?: string }`
  - `updateMaintenanceSchema`: `{ id: string (uuid), title: string, description?: string, room_id?: string (uuid), notes?: string }`
  - `updateStatusSchema`: `{ id: string (uuid), status: "em_andamento" | "concluido" | "cancelado" }`
  - `deleteMaintenanceSchema`: `{ id: string (uuid) }`

- [ ] **Step 1: Escrever os testes falhando em `src/features/manutencao/schemas.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { createMaintenanceSchema, updateStatusSchema } from "./schemas";

describe("createMaintenanceSchema", () => {
  it("rejects empty title", () => {
    expect(createMaintenanceSchema.safeParse({ title: "" }).success).toBe(false);
  });
  it("accepts title only", () => {
    expect(createMaintenanceSchema.safeParse({ title: "Vazamento" }).success).toBe(true);
  });
  it("rejects title with 201 chars", () => {
    expect(createMaintenanceSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
  });
  it("accepts all optional fields", () => {
    expect(
      createMaintenanceSchema.safeParse({
        title: "Pintura",
        description: "Quarto principal",
        room_id: "00000000-0000-1000-8000-000000000001",
        notes: "Orçamento pendente",
      }).success
    ).toBe(true);
  });
});

describe("updateStatusSchema", () => {
  it("rejects status pendente", () => {
    expect(
      updateStatusSchema.safeParse({
        id: "00000000-0000-1000-8000-000000000001",
        status: "pendente",
      }).success
    ).toBe(false);
  });
  it("accepts concluido", () => {
    expect(
      updateStatusSchema.safeParse({
        id: "00000000-0000-1000-8000-000000000001",
        status: "concluido",
      }).success
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

Bash: `npx vitest run src/features/manutencao/schemas.test.ts`
Esperado: FAIL ("Cannot find module './schemas'")

- [ ] **Step 3: Implementar `src/features/manutencao/schemas.ts`**

Quatro schemas com Zod 4:
- `createMaintenanceSchema`: `title` z.string().trim().min(1, { error: "Título obrigatório" }).max(200); `description` z.string().trim().optional(); `room_id` z.string().uuid().optional(); `notes` z.string().trim().optional()
- `updateMaintenanceSchema`: igual ao create + `id: z.string().uuid()`
- `updateStatusSchema`: `id: z.string().uuid()` + `status: z.enum(["em_andamento", "concluido", "cancelado"])`
- `deleteMaintenanceSchema`: `id: z.string().uuid()`

- [ ] **Step 4: Rodar para verificar aprovação**

Bash: `npx vitest run src/features/manutencao/schemas.test.ts`
Esperado: 6/6 passando

- [ ] **Step 5: Rodar suite completa**

Bash: `npx vitest run`
Esperado: 186/186 passando

- [ ] **Step 6: Commit**

```bash
git add src/features/manutencao/schemas.ts src/features/manutencao/schemas.test.ts
git commit -m "feat(manutencao): schemas Zod e testes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Queries e actions

**Files:**
- Create: `src/features/manutencao/queries.ts`
- Create: `src/features/manutencao/actions.ts`

**Interfaces:**
- Consumes: `createMaintenanceSchema`, `updateMaintenanceSchema`, `updateStatusSchema`, `deleteMaintenanceSchema` de Task 2; `textField`, `fieldErrorsFrom`, `FormState` de `@/features/auth/form-state`; `requireUser` de `@/lib/auth/require-user`; `createClient` de `@/lib/supabase/server`; `revalidatePath` de `next/cache`
- Produces:
  - `MaintenanceItem` (tipo exportado)
  - `getMaintenanceItems(supabase: SupabaseClient<Database>, homeId: string): Promise<MaintenanceItem[]>`
  - `createMaintenanceItem(_: FormState, fd: FormData): Promise<FormState>`
  - `updateMaintenanceItem(_: FormState, fd: FormData): Promise<FormState>`
  - `updateMaintenanceStatus(_: FormState, fd: FormData): Promise<FormState>`
  - `deleteMaintenanceItem(_: FormState, fd: FormData): Promise<FormState>`

- [ ] **Step 1: Implementar `src/features/manutencao/queries.ts`**

Começar com `import "server-only"`. Tipo exportado:

```typescript
export type MaintenanceItem = {
  id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  status: "pendente" | "em_andamento" | "concluido" | "cancelado";
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  room: { name: string } | null;
};
```

`getMaintenanceItems`: SELECT `"id, room_id, title, description, notes, status, created_by, created_at, resolved_at, room:rooms(name)"` WHERE `home_id = homeId`. Se erro, retorna `[]`. Ordenar client-side: pendente primeiro, em_andamento segundo, concluido terceiro, cancelado por último; dentro de cada grupo, `created_at` DESC.

- [ ] **Step 2: Implementar `src/features/manutencao/actions.ts`**

Iniciar com `"use server"`. Seguir o padrão de `shopping/actions.ts` para o boilerplate de `requireUser` + `profiles.current_home_id`.

**`createMaintenanceItem`**: parse `createMaintenanceSchema` com `textField` → INSERT `{ home_id: homeId, created_by: userId, title, description: parsed.data.description ?? null, room_id: parsed.data.room_id ?? null, notes: parsed.data.notes ?? null }` → `revalidatePath("/manutencao")` → `{ status: "success", message: "Item criado." }`

**`updateMaintenanceItem`**: parse `updateMaintenanceSchema` → SELECT `status` WHERE `id = parsed.data.id AND home_id = homeId` via `.maybeSingle()` → se `status in ["concluido", "cancelado"]` retorna `{ status: "error", message: "Item já foi concluído ou cancelado." }` → UPDATE `{ title, description, room_id, notes }` WHERE `id AND home_id` com `.select("id")` → se `!updated?.length` retorna `{ status: "error", message: "Item não encontrado." }` → `revalidatePath` → `{ status: "success", message: "Item atualizado." }`

**`updateMaintenanceStatus`**: parse `updateStatusSchema` → calcular `resolved_at`: `["concluido", "cancelado"].includes(parsed.data.status) ? new Date().toISOString() : null` → UPDATE `{ status: parsed.data.status, resolved_at }` WHERE `id AND home_id` com `.select("id")` → se `!updated?.length` retorna `{ status: "error", message: "Item não encontrado." }` → `revalidatePath` → `{ status: "success" }`

**`deleteMaintenanceItem`**: parse `deleteMaintenanceSchema` → DELETE WHERE `id AND home_id` com `.select("id")` → se `!deleted?.length` retorna erro → `revalidatePath` → `{ status: "success", message: "Item excluído." }`

- [ ] **Step 3: Rodar suite completa**

Bash: `npx vitest run`
Esperado: 186/186 passando

- [ ] **Step 4: Commit**

```bash
git add src/features/manutencao/queries.ts src/features/manutencao/actions.ts
git commit -m "feat(manutencao): queries e server actions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: UI e página

**Files:**
- Create: `src/features/manutencao/components/add-maintenance-form.tsx`
- Create: `src/features/manutencao/components/maintenance-item-card.tsx`
- Create: `src/features/manutencao/components/maintenance-list.tsx`
- Modify: `src/app/(app)/manutencao/page.tsx`

**Interfaces:**
- Consumes: `MaintenanceItem` de Task 3; `createMaintenanceItem`, `updateMaintenanceItem`, `updateMaintenanceStatus`, `deleteMaintenanceItem` de Task 3; `CelebrationOverlay` (com `title` e `message`) de Task 1
- Room type local: `{ id: string; name: string }`

- [ ] **Step 1: Implementar `add-maintenance-form.tsx`**

Client component (`"use client"`). Props: `rooms: Array<{ id: string; name: string }>`.
`useActionState(createMaintenanceItem, { status: "idle" })`.
Campos: `title` (input text, required), `description` (textarea, opcional), `room_id` (select com `<option value="">Nenhum</option>` + rooms, opcional), `notes` (textarea, opcional).
Mostrar `FieldError` abaixo de `title` quando `state.fieldErrors?.title`.
Botão submit "Adicionar".
Mostrar toast/mensagem de sucesso quando `state.status === "success"`.

- [ ] **Step 2: Implementar `maintenance-item-card.tsx`**

Client component. Props: `item: MaintenanceItem`.

Estado local: `showEdit: boolean`, `showCelebration: boolean`.

**Botões de status** — forms separados com `useActionState(updateMaintenanceStatus, { status: "idle" })`, input hidden `name="id"` e `name="status"`:
- `pendente`: botão "Iniciar" (`status=em_andamento`) + botão "Cancelar" (`status=cancelado`)
- `em_andamento`: botão "Concluir" (`status=concluido`) + botão "Cancelar" (`status=cancelado`)
- `concluido` / `cancelado`: nenhum botão de status

Celebração: quando o form de status retorna `status === "success"` e o `status` enviado era `"concluido"`, setar `showCelebration(true)`.
```tsx
<CelebrationOverlay
  show={showCelebration}
  onDismiss={() => setShowCelebration(false)}
  title="Item concluído! 🎉"
  message="Registrado no histórico."
/>
```

**Botão "Editar"** — visível apenas se `item.status === "pendente" || item.status === "em_andamento"`. Alterna `showEdit`.

**Form de edição** (renderizado quando `showEdit === true`):
`useActionState(updateMaintenanceItem, { status: "idle" })`.
Input hidden `name="id" value={item.id}`.
Mesmos campos do form de criação, pré-populados com `item.*`.
Botão "Salvar" + botão "Cancelar" (seta `showEdit(false)`).
Quando `state.status === "success"` fechar o form.

**Botão "Excluir"** — form com `deleteMaintenanceItem`, input hidden `name="id"`. Visível sempre.

Exibição do card: título, description (2 linhas, `line-clamp-2`), nome do cômodo (`item.room?.name`), notas, badge de status.

- [ ] **Step 3: Implementar `maintenance-list.tsx`**

Client ou server component. Props: `items: MaintenanceItem[]`, `rooms: Array<{ id: string; name: string }>`.

Separar itens:
```typescript
const open = items.filter(i => i.status === "pendente" || i.status === "em_andamento");
const history = items.filter(i => i.status === "concluido" || i.status === "cancelado");
```

Renderizar `<AddMaintenanceForm rooms={rooms} />` no topo.

Seção **"Em aberto"**: se `open.length === 0` mostrar `<EmptyState title="Nenhum item em aberto" description="Adicione um problema ou serviço acima." />`; caso contrário mapear `<MaintenanceItemCard key={item.id} item={item} />`.

Seção **"Histórico"**: collapsível com `<details>`/`<summary>` ou toggle de estado local. Default: aberto se `history.length > 0`, fechado se vazio. Mapear `<MaintenanceItemCard key={item.id} item={item} />`.

- [ ] **Step 4: Substituir `src/app/(app)/manutencao/page.tsx`**

```typescript
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getMaintenanceItems } from "@/features/manutencao/queries";
import { MaintenanceList } from "@/features/manutencao/components/maintenance-list";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Manutenção" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  const homeId = profile?.current_home_id ?? null;
  const [items, roomsResult] = homeId
    ? await Promise.all([
        getMaintenanceItems(supabase, homeId),
        supabase.from("rooms").select("id, name").eq("home_id", homeId),
      ])
    : [[], { data: [] }];
  const rooms = (roomsResult as { data: Array<{ id: string; name: string }> | null }).data ?? [];

  return (
    <>
      <PageHeader title="Manutenção" />
      <MaintenanceList items={items} rooms={rooms} />
    </>
  );
}
```

- [ ] **Step 5: Rodar suite completa**

Bash: `npx vitest run`
Esperado: 186/186 passando

- [ ] **Step 6: Commit**

```bash
git add src/features/manutencao/components/ src/app/(app)/manutencao/page.tsx
git commit -m "feat(manutencao): UI — formulário, cards, lista e página

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
