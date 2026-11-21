# Etapa 5 — Lista de Compras

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a seção Compras do MORANO: lista de itens por residência com adição rápida, categorias, controle de quantidade/unidade, marcação como comprado e histórico de itens adquiridos.

**Architecture:** Backend puro primeiro (schemas + queries + actions + testes), depois UI (componentes + página `/compras`). A tabela `shopping_items`, enums, RLS e GRANTs já existem no banco — não recriar. O padrão de autenticação segue `src/features/tasks/actions.ts`: `requireUser()` → `profiles.current_home_id` → homeId nunca vem do frontend diretamente.

**Tech Stack:** TypeScript strict + `noUncheckedIndexedAccess`, Zod 4, Supabase SSR, React 19 `useActionState`, Tailwind 4, shadcn/ui

**Spec:** Master-prompt §5.5 e ajustes do usuário aprovados em 2026-11-19 (adição rápida por Enter, pendentes primeiro, comprados em seção separada, desmarcação devolve ao pendente, estados de carregamento, sem dados de outras casas).

## Global Constraints

- **TypeScript strict** + `noUncheckedIndexedAccess` — todos os acessos a array devem ser seguros
- **Zod 4** — usar `{ error: "..." }` em vez de `{ invalid_type_error: "..." }`
- **`"use server"`** no topo de arquivos de actions (não só em funções individuais)
- **`"server-only"`** no topo de arquivos de queries
- **homeId sempre derivado server-side** de `profiles.current_home_id` — nunca aceitar homeId do cliente sem verificação RLS
- **`requireUser()`** de `@/lib/auth/require-user` em toda Server Action
- **`createClient()`** de `@/lib/supabase/server` em Server Actions e queries
- **Tabela `shopping_items` já existe** — não criar migration; não recriar enums, RLS ou GRANTs
- **Trigger `set_purchased`** preenche `purchased_at` e `purchased_by` automaticamente — não definir esses campos no UPDATE; apenas alternar `is_purchased`
- **`created_by` não está no INSERT grant** — omitir do insert (o DB usa `auth.uid()` como default)
- **`FormState`** de `@/features/auth/form-state` — `{ status: "idle"|"error"|"success", message?, fieldErrors? }`
- **`useActionState`** do React para formulários client, com `initialFormState`
- **Sem novos pacotes npm**
- **Nenhuma alteração no banco remoto**

## Review Focus

1. **homeId injetado pelo cliente**: se uma action aceitar `home_id` via FormData sem verificar `profiles.current_home_id`, um usuário pode listar/criar itens de outra casa. Toda action deve derivar homeId do perfil autenticado.
2. **Trigger `set_purchased`**: UPDATE deve enviar apenas `is_purchased: true/false`. Se o código tentar definir `purchased_at` ou `purchased_by` manualmente, o GRANT não permite e a operação falha silenciosamente ou com erro.
3. **`noUncheckedIndexedAccess`**: acesso a `array[0]` deve checar `undefined` ou usar optional chaining. Um `items[0].name` sem guarda falha em TypeScript strict.
4. **Desmarcação restaura para pendente**: desmarcar um item comprado deve aparecer na seção Pendentes imediatamente (otimista ou revalidatePath).
5. **Enter no campo de adição**: submit via Enter deve funcionar sem botão clicado — o formulário deve ter `type="submit"` acessível ou capturar `onKeyDown`.

---

### Task 1: Backend — schemas, queries, actions, testes

**Files:**
- Create: `src/features/shopping/schemas.ts`
- Create: `src/features/shopping/queries.ts`
- Create: `src/features/shopping/actions.ts`
- Create: `src/features/shopping/actions.test.ts`

**DB already exists (DO NOT recreate):**
```sql
-- shopping_items columns (Row):
-- id uuid, home_id uuid, name text, category shopping_category,
-- quantity numeric(10,2), unit shopping_unit, is_purchased boolean,
-- purchased_at timestamptz|null, purchased_by uuid|null,
-- issue_id uuid|null, created_by uuid|null, created_at timestamptz, updated_at timestamptz

-- Enums:
-- shopping_category: 'limpeza'|'higiene'|'cozinha'|'lavanderia'|'alimentacao'|'outros'
-- shopping_unit: 'un'|'kg'|'g'|'l'|'ml'|'pacote'|'caixa'

-- GRANTs already applied:
-- INSERT (home_id, name, category, quantity, unit, is_purchased, issue_id)
-- UPDATE (name, category, quantity, unit, is_purchased, issue_id)
-- SELECT, DELETE — member of home only (RLS)
```

**Interfaces produced (for Task 2):**

```ts
// src/features/shopping/queries.ts
export type ShoppingItem = {
  id: string;
  name: string;
  category: "limpeza" | "higiene" | "cozinha" | "lavanderia" | "alimentacao" | "outros";
  quantity: number;
  unit: "un" | "kg" | "g" | "l" | "ml" | "pacote" | "caixa";
  is_purchased: boolean;
  purchased_at: string | null;
  created_at: string;
};

export async function getShoppingItems(supabase: SupabaseClient<Database>, homeId: string): Promise<{ pending: ShoppingItem[]; purchased: ShoppingItem[] }>

// src/features/shopping/actions.ts
export async function addItem(_: FormState, fd: FormData): Promise<FormState>
export async function togglePurchased(_: FormState, fd: FormData): Promise<FormState>
export async function editItem(_: FormState, fd: FormData): Promise<FormState>
export async function deleteItem(_: FormState, fd: FormData): Promise<FormState>
```

- [ ] **Step 1: Criar `src/features/shopping/schemas.ts`**

  ```ts
  import { z } from "zod";

  export const addItemSchema = z.object({
    name: z.string().min(1, { error: "Nome obrigatório" }).max(120).transform(s => s.trim()),
    category: z.enum(["limpeza", "higiene", "cozinha", "lavanderia", "alimentacao", "outros"]).default("outros"),
    quantity: z.coerce.number({ error: "Quantidade inválida" }).positive({ error: "Quantidade deve ser positiva" }).default(1),
    unit: z.enum(["un", "kg", "g", "l", "ml", "pacote", "caixa"]).default("un"),
  });

  export const editItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1, { error: "Nome obrigatório" }).max(120).transform(s => s.trim()),
    category: z.enum(["limpeza", "higiene", "cozinha", "lavanderia", "alimentacao", "outros"]),
    quantity: z.coerce.number({ error: "Quantidade inválida" }).positive({ error: "Quantidade deve ser positiva" }),
    unit: z.enum(["un", "kg", "g", "l", "ml", "pacote", "caixa"]),
  });

  export const togglePurchasedSchema = z.object({
    id: z.string().uuid(),
    is_purchased: z.preprocess(v => v === "true" || v === true, z.boolean()),
  });

  export const deleteItemSchema = z.object({
    id: z.string().uuid(),
  });
  ```

- [ ] **Step 2: Escrever testes que falham para os schemas**

  Arquivo: `src/features/shopping/actions.test.ts`

  ```ts
  import { describe, it, expect } from "vitest";
  import { addItemSchema, editItemSchema, togglePurchasedSchema } from "./schemas";

  describe("addItemSchema", () => {
    it("rejects empty name", () => {
      expect(addItemSchema.safeParse({ name: "" }).success).toBe(false);
    });
    it("rejects name with only spaces", () => {
      const r = addItemSchema.safeParse({ name: "   " });
      // trim makes it empty, min(1) rejects
      expect(r.success).toBe(false);
    });
    it("rejects name over 120 chars", () => {
      expect(addItemSchema.safeParse({ name: "a".repeat(121) }).success).toBe(false);
    });
    it("rejects quantity zero", () => {
      expect(addItemSchema.safeParse({ name: "Sabão", quantity: 0 }).success).toBe(false);
    });
    it("rejects negative quantity", () => {
      expect(addItemSchema.safeParse({ name: "Sabão", quantity: -1 }).success).toBe(false);
    });
    it("applies defaults: category outros, quantity 1, unit un", () => {
      const r = addItemSchema.safeParse({ name: "Sabão" });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.category).toBe("outros");
        expect(r.data.quantity).toBe(1);
        expect(r.data.unit).toBe("un");
      }
    });
    it("rejects invalid category", () => {
      expect(addItemSchema.safeParse({ name: "Sabão", category: "eletronicos" }).success).toBe(false);
    });
    it("rejects invalid unit", () => {
      expect(addItemSchema.safeParse({ name: "Sabão", unit: "litros" }).success).toBe(false);
    });
    it("accepts valid item with all fields", () => {
      const r = addItemSchema.safeParse({ name: "Arroz", category: "alimentacao", quantity: 2, unit: "kg" });
      expect(r.success).toBe(true);
    });
    it("coerces quantity from string", () => {
      const r = addItemSchema.safeParse({ name: "Arroz", quantity: "2.5" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.quantity).toBe(2.5);
    });
  });

  describe("editItemSchema", () => {
    it("requires uuid id", () => {
      expect(editItemSchema.safeParse({ id: "not-a-uuid", name: "Arroz", category: "alimentacao", quantity: 1, unit: "un" }).success).toBe(false);
    });
    it("requires name", () => {
      expect(editItemSchema.safeParse({ id: "00000000-0000-0000-0000-000000000001", name: "", category: "outros", quantity: 1, unit: "un" }).success).toBe(false);
    });
  });

  describe("togglePurchasedSchema", () => {
    it("coerces string 'true' to boolean true", () => {
      const r = togglePurchasedSchema.safeParse({ id: "00000000-0000-0000-0000-000000000001", is_purchased: "true" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.is_purchased).toBe(true);
    });
    it("coerces string 'false' to boolean false", () => {
      const r = togglePurchasedSchema.safeParse({ id: "00000000-0000-0000-0000-000000000001", is_purchased: "false" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.is_purchased).toBe(false);
    });
  });
  ```

- [ ] **Step 3: Rodar testes — esperar FAIL (módulos não existem)**

  Run: `npx vitest run src/features/shopping/actions.test.ts`
  Expected: FAIL (cannot find module `./schemas`)

- [ ] **Step 4: Implementar `src/features/shopping/schemas.ts`** conforme Step 1.

- [ ] **Step 5: Rodar testes de schemas — esperar PASS**

  Run: `npx vitest run src/features/shopping/actions.test.ts`
  Expected: 10+ tests PASS

- [ ] **Step 6: Criar `src/features/shopping/queries.ts`**

  ```ts
  import "server-only";
  import type { SupabaseClient } from "@supabase/supabase-js";
  import type { Database } from "@/types/database";

  export type ShoppingItem = {
    id: string;
    name: string;
    category: Database["public"]["Enums"]["shopping_category"];
    quantity: number;
    unit: Database["public"]["Enums"]["shopping_unit"];
    is_purchased: boolean;
    purchased_at: string | null;
    created_at: string;
  };

  export async function getShoppingItems(
    supabase: SupabaseClient<Database>,
    homeId: string,
  ): Promise<{ pending: ShoppingItem[]; purchased: ShoppingItem[] }> {
    const { data, error } = await supabase
      .from("shopping_items")
      .select("id, name, category, quantity, unit, is_purchased, purchased_at, created_at")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false });

    if (error || !data) return { pending: [], purchased: [] };

    const pending: ShoppingItem[] = [];
    const purchased: ShoppingItem[] = [];
    for (const item of data) {
      if (item.is_purchased) {
        purchased.push(item);
      } else {
        pending.push(item);
      }
    }
    return { pending, purchased };
  }
  ```

- [ ] **Step 7: Criar `src/features/shopping/actions.ts`**

  Padrão exato de `src/features/tasks/actions.ts`:
  - `"use server"` no topo
  - Toda action: `requireUser()` → `profiles.current_home_id` → homeId
  - `togglePurchased`: UPDATE apenas `is_purchased` — NÃO definir `purchased_at` nem `purchased_by` (trigger cuida disso)
  - `deleteItem`: DELETE por `id` (RLS garante que só membro da casa acessa)
  - `revalidatePath("/compras")` ao fim de cada action bem-sucedida

  Assinaturas exatas:
  ```ts
  export async function addItem(_: FormState, fd: FormData): Promise<FormState>
  export async function togglePurchased(_: FormState, fd: FormData): Promise<FormState>
  export async function editItem(_: FormState, fd: FormData): Promise<FormState>
  export async function deleteItem(_: FormState, fd: FormData): Promise<FormState>
  ```

  `addItem` lê: `name`, `category`, `quantity`, `unit` do FormData.
  `togglePurchased` lê: `id`, `is_purchased` do FormData.
  `editItem` lê: `id`, `name`, `category`, `quantity`, `unit` do FormData.
  `deleteItem` lê: `id` do FormData.

- [ ] **Step 8: Adicionar testes de regras de negócio das actions ao `actions.test.ts`**

  Adicionar após os testes de schema:

  ```ts
  // Testes de trigger set_purchased via banco local
  // Esses testes são de lógica pura (schemas) — integração com DB não é testada aqui.
  // O trigger é validado no relatório via verificação manual descrita no Step 11.

  describe("togglePurchasedSchema — boundary", () => {
    it("requires id", () => {
      expect(togglePurchasedSchema.safeParse({ is_purchased: "true" }).success).toBe(false);
    });
    it("rejects invalid uuid", () => {
      expect(togglePurchasedSchema.safeParse({ id: "abc", is_purchased: "true" }).success).toBe(false);
    });
  });
  ```

- [ ] **Step 9: Rodar suite completa**

  Run: `npm test`
  Expected: todos os testes anteriores + novos PASS (mínimo 127 testes)

- [ ] **Step 10: Verificar TypeScript**

  Run: `npm run typecheck`
  Expected: sem erros

- [ ] **Step 11: Verificar trigger `set_purchased` no banco local**

  Run:
  ```bash
  npx supabase db query "
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'shopping_items'
    AND column_name IN ('purchased_at', 'purchased_by', 'is_purchased')
    ORDER BY column_name;
  "
  ```
  Expected: 3 colunas retornadas — confirma estrutura existente sem recriar nada.

- [ ] **Step 12: Commit Task 1**

  ```bash
  git add src/features/shopping/schemas.ts \
          src/features/shopping/queries.ts \
          src/features/shopping/actions.ts \
          src/features/shopping/actions.test.ts
  git commit -m "feat(compras): backend — schemas, queries, actions e testes"
  ```

---

### Task 2: Interface — componentes e página /compras

**Files:**
- Create: `src/features/shopping/components/shopping-item-row.tsx`
- Create: `src/features/shopping/components/add-item-form.tsx`
- Create: `src/features/shopping/components/shopping-list.tsx`
- Modify: `src/app/(app)/compras/page.tsx`

**Interfaces consumed (from Task 1):**
```ts
// From src/features/shopping/queries.ts
import type { ShoppingItem } from "@/features/shopping/queries";
import { getShoppingItems } from "@/features/shopping/queries";

// From src/features/shopping/actions.ts
import { addItem, togglePurchased, editItem, deleteItem } from "@/features/shopping/actions";

// From src/features/auth/form-state.ts
import { initialFormState } from "@/features/auth/form-state";
```

**Component responsibilities:**

`shopping-item-row.tsx` — `"use client"` — linha de um item:
- Checkbox que chama `togglePurchased` via `useActionState`; fica desabilitado quando `pending`
- Nome, categoria (badge), quantidade + unidade
- Menu "⋯" com Editar e Excluir (Excluir chama `deleteItem`)
- Modo edição inline: troca o display por campos editáveis (nome, categoria, qty, unit) com Save/Cancel
- Itens comprados aparecem com texto riscado e opacidade reduzida

`add-item-form.tsx` — `"use client"` — formulário de adição rápida:
- Campo de nome com `autoFocus`, submete por Enter (`form` com `onSubmit`)
- Após sucesso: limpa o campo, mantém foco (via `useRef` + `focus()`)
- Campos opcionais (categoria, quantidade, unidade) expandíveis mas não obrigatórios para a adição rápida
- Estados de carregamento com `pending` do `useActionState`

`shopping-list.tsx` — componente de servidor — recebe `{ pending, purchased }` e renderiza:
- Seção **Pendentes** com `AddItemForm` no topo + lista de `ShoppingItemRow`
- Seção **Comprados** (colapsável ou diretamente visível) com lista de `ShoppingItemRow`
- Se ambas vazias: mensagem de EmptyState

`compras/page.tsx` — Server Component:
- `requireUser()` → `profiles.current_home_id` → `getShoppingItems()`
- Renderiza `PageHeader` + `ShoppingList`
- `Suspense` com skeleton opcional

- [ ] **Step 1: Criar `src/features/shopping/components/shopping-item-row.tsx`**

  `"use client"`. Props: `{ item: ShoppingItem }`.
  Usar `useActionState` com `initialFormState` para `togglePurchased` e `deleteItem`.
  Para edição: estado local `editing: boolean`, campos controlados.
  `useActionState` para `editItem`.
  Desabilitar botões enquanto qualquer `pending` for true.

- [ ] **Step 2: Criar `src/features/shopping/components/add-item-form.tsx`**

  `"use client"`. Sem props.
  `useActionState(addItem, initialFormState)`.
  `useRef<HTMLInputElement>` para o campo de nome.
  `useEffect(() => { if (state.status === "success") { ref.current?.focus(); } }, [state])` — limpar campo via `key` ou `reset()` após sucesso.
  Botão submit desabilitado enquanto `pending`.

- [ ] **Step 3: Criar `src/features/shopping/components/shopping-list.tsx`**

  Componente de servidor. Props: `{ pending: ShoppingItem[]; purchased: ShoppingItem[] }`.
  Renderiza seções Pendentes e Comprados.

- [ ] **Step 4: Modificar `src/app/(app)/compras/page.tsx`**

  Substituir EmptyState por:
  ```tsx
  import type { Metadata } from "next";
  import { createClient } from "@/lib/supabase/server";
  import { requireUser } from "@/lib/auth/require-user";
  import { getShoppingItems } from "@/features/shopping/queries";
  import { ShoppingList } from "@/features/shopping/components/shopping-list";
  import { PageHeader } from "@/components/feedback/page-header";

  export const metadata: Metadata = { title: "Compras" };

  export default async function Page() {
    const { id: userId } = await requireUser();
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_home_id")
      .eq("id", userId)
      .single();
    const homeId = profile?.current_home_id ?? null;
    const items = homeId ? await getShoppingItems(supabase, homeId) : { pending: [], purchased: [] };
    return (
      <>
        <PageHeader title="Compras" />
        <ShoppingList pending={items.pending} purchased={items.purchased} />
      </>
    );
  }
  ```

- [ ] **Step 5: Verificar TypeScript**

  Run: `npm run typecheck`
  Expected: sem erros

- [ ] **Step 6: Rodar suite completa**

  Run: `npm test`
  Expected: todos os testes PASS (mínimo 127)

- [ ] **Step 7: Commit Task 2**

  ```bash
  git add src/features/shopping/components/shopping-item-row.tsx \
          src/features/shopping/components/add-item-form.tsx \
          src/features/shopping/components/shopping-list.tsx \
          src/app/(app)/compras/page.tsx
  git commit -m "feat(compras): interface — lista, formulário de adição rápida e página /compras"
  ```

---

## Post-implementation checklist (manual — após ambas as tasks)

1. Adicionar item por Enter: digitar nome + Enter → item aparece em Pendentes, campo limpa, foco mantido.
2. Marcar como comprado: item migra para seção Comprados, texto riscado.
3. Desmarcar: item volta para Pendentes.
4. Editar item: nome, categoria, quantidade, unidade atualizados.
5. Excluir item: item desaparece da lista.
6. TypeScript: `npm run typecheck` sem erros.
7. Testes: `npm test` ≥ 127 passando.
