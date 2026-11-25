# Central de Notificações Persistida — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o sininho computado/`localStorage` por uma central de
notificações persistida no banco, cobrindo 4 tipos de evento (item de compras
adicionado/comprado, manutenção registrada, tarefa vencendo/atrasada), com
tela dedicada `/notificacoes`, badge de não lidas, preferências por tipo em
`/perfil`, e consolidação de eventos repetidos.

**Architecture:** Uma linha por evento em `notifications` (sem fan-out por
destinatário); visibilidade e preferências filtradas na leitura; "marcar
todas como lidas" é um cursor `last_read_at` por usuário em
`notification_reads`, não uma linha por notificação. Emissão via helper TS
chamado de três actions já existentes, no mesmo ponto onde elas já chamam
`trackEvent`. `task_due_today` não tem gatilho de usuário — é backfillado de
forma idempotente (via constraint única) ao abrir `/notificacoes`.

**Tech Stack:** Next.js App Router (Server Components + Server Actions),
Supabase (Postgres + RLS), Zod 4, Vitest (lógica pura), Playwright (fluxo
completo com RLS real entre duas contas).

**Spec:** `docs/superpowers/specs/2026-11-24-notificacoes-design.md`

## Global Constraints

- `home_id` sempre derivado de `profiles.current_home_id` no servidor — nunca aceito do cliente.
- RLS protege toda leitura/escrita de `notifications`, `notification_reads`, `notification_preferences`.
- Nenhum teste Vitest deste projeto chama Supabase real — lógica pura só; comportamento de banco/RLS vai para Playwright.
- `actor_name` exibido é sempre o primeiro nome: `full_name.split(" ")[0]`.
- Nunca notificar o autor sobre a própria ação (`actor_id <> viewer` em toda leitura).
- `task_due_today`: `occurs_on` grava o `scheduled_for` da ocorrência, não "hoje" — dedupe é por ocorrência, para sempre, não por dia.
- `getUnreadCount` e `getNotifications` compartilham exatamente o mesmo WHERE de visibilidade (exceto o filtro de tempo).
- Bump de `created_at` na consolidação é intencional (notificação consolidada volta a "não lida").
- `/configuracoes` não existe mais — a nova seção de preferências vai em `/perfil`.

## Review Focus

- **Usuário sem `current_home_id`** (ainda no onboarding) acessando `/notificacoes` diretamente pela URL: a página não deve quebrar com erro 500; deve redirecionar como as outras páginas de `(app)` fazem.
- **Segundo morador da mesma casa não deve ver notificação de ação que ele mesmo fez**, mas deve ver a de outro morador — é o caso central de RLS que, se quebrado, vaza ruído ou escapa de vazar teto para fora (home errada).
- **Consolidação de `shopping_item_added` dentro da janela não deve duplicar linha** quando dois membros diferentes adicionam itens quase ao mesmo tempo (a chave de consolidação inclui `actor_id`, então cada autor tem sua própria linha — isso precisa de teste explícito, é fácil escrever a query errada e consolidar entre autores diferentes).
- **`task_due_today` não deve gerar linha para ocorrência já `completed`/`skipped`/`missed`** — só `pending`, senão tarefas concluídas no mesmo dia continuam aparecendo como "vencendo" na central.
- **Toggle de preferência desligando um tipo não deve apagar notificações já existentes desse tipo** — só filtra da leitura daquele usuário dali em diante; se o usuário religar, o histórico antigo deve reaparecer (nada foi deletado).

---

## Task 1: Migration — schema, RLS e tipos

**Files:**
- Create: `supabase/migrations/<ts>_notifications.sql`
- Modify: `src/types/database.ts` (regenerar, não editar manualmente)

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: tabelas `notifications`, `notification_reads`, `notification_preferences`;
  enum `notification_type` com valores `'shopping_item_added' | 'shopping_item_purchased' | 'maintenance_registered' | 'task_due_today'`;
  todas as policies e grants do spec (seção "Schema").

- [ ] **Step 1: Escrever a migration**

Copiar o SQL exato da seção "Schema" do spec
(`docs/superpowers/specs/2026-11-24-notificacoes-design.md`) para
`supabase/migrations/<ts>_notifications.sql`, com `<ts>` no formato
`YYYYMMDDHHMMSS` maior que a última migration existente.

- [ ] **Step 2: Aplicar no banco local**

Run: `npx supabase db push --local`
Expected: migration aplicada sem erro; `notification_type`, `notifications`,
`notification_reads`, `notification_preferences` existem no banco local.

- [ ] **Step 3: Regenerar tipos**

Run: `npx supabase gen types typescript --local 2>/dev/null > src/types/database.ts`
Expected: `src/types/database.ts` agora inclui as 3 tabelas e o enum
`notification_type` em `Database["public"]["Enums"]`.

- [ ] **Step 4: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros novos (o resto do app ainda não referencia as tabelas novas).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/<ts>_notifications.sql src/types/database.ts
git commit -m "feat(notificacoes): schema notifications/notification_reads/notification_preferences"
```

---

## Task 2: Lógica pura — agrupamento por dia e geração de título/href

**Files:**
- Create: `src/features/notifications/group-by-day.ts`
- Create: `src/features/notifications/group-by-day.test.ts`
- Create: `src/features/notifications/display.ts`
- Create: `src/features/notifications/display.test.ts`

**Interfaces:**
- Consumes: nenhuma dependência de outras tasks (funções puras, sem Supabase).
- Produces:
  - Em `display.ts`: `export type NotificationType = Database["public"]["Enums"]["notification_type"];`
    — **definição única** do alias; toda outra task que precisar do tipo
    (Task 3, Task 6, Task 7) importa `NotificationType` deste arquivo, nunca
    redeclara.
  - `groupByDay(rows: { id: string; created_at: string }[], timezone: string, today: string): { label: string; items: typeof rows }[]`
    — `label` é `"HOJE"`, `"ONTEM"` ou a data formatada (`"DD de mês"`); ordem decrescente.
  - `hrefForType(type: NotificationType): string` — switch fixo:
    `shopping_item_added` e `shopping_item_purchased` → `/compras`;
    `maintenance_registered` → `/manutencao`; `task_due_today` → `/rotina`.
  - `firstName(fullName: string | null): string` — `fullName?.split(" ")[0] ?? "Alguém"`.

`groupByDay` fica em `group-by-day.ts`; `NotificationType`, `hrefForType` e
`firstName` ficam em `display.ts`. Usadas por Task 3 (schemas), Task 6
(queries) e Task 7 (UI).

- [ ] **Step 1: Escrever os testes de `groupByDay`**

```typescript
import { describe, expect, it } from "vitest";
import { groupByDay } from "./group-by-day";

describe("groupByDay", () => {
  const timezone = "America/Sao_Paulo";
  const today = "2026-11-24";

  it("agrupa HOJE e ONTEM corretamente", () => {
    const rows = [
      { id: "a", created_at: "2026-11-24T14:00:00.000Z" }, // 11h BRT hoje
      { id: "b", created_at: "2026-11-23T14:00:00.000Z" }, // 11h BRT ontem
    ];
    const groups = groupByDay(rows, timezone, today);
    expect(groups.map((g) => g.label)).toEqual(["HOJE", "ONTEM"]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["a"]);
    expect(groups[1]!.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("datas mais antigas usam label formatado, mais recente primeiro", () => {
    const rows = [{ id: "c", created_at: "2026-11-20T14:00:00.000Z" }];
    const groups = groupByDay(rows, timezone, today);
    expect(groups[0]!.label).not.toBe("HOJE");
    expect(groups[0]!.label).not.toBe("ONTEM");
  });

  it("lista vazia retorna grupos vazios", () => {
    expect(groupByDay([], timezone, today)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/features/notifications/group-by-day.test.ts`
Expected: FAIL — `group-by-day.ts` não existe ainda.

- [ ] **Step 3: Implementar `groupByDay`**

Usar `TZDate` (`@date-fns/tz`) + `format(..., "yyyy-MM-dd")` para bucketar cada
`created_at` no fuso informado (mesmo padrão de
`src/features/onboarding/actions.ts`), comparar a string resultante contra
`today` e `addDaysStr(today, -1)` (de `@/lib/dates`) para decidir HOJE/ONTEM;
qualquer outra data usa `format(..., "d 'de' MMMM", { locale: ptBR })` (ou
equivalente já usado no projeto para datas em PT-BR — conferir
`formatShortDate` em `src/features/tasks/rotina-format.ts` antes de escrever
um formatador novo). Ordenar grupos por data decrescente; dentro do grupo,
manter a ordem recebida (os rows já vêm ordenados por `created_at desc` da
query).

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `npx vitest run src/features/notifications/group-by-day.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever os testes de `display.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { hrefForType, firstName } from "./display";

describe("hrefForType", () => {
  it("mapeia cada tipo para a rota certa", () => {
    expect(hrefForType("shopping_item_added")).toBe("/compras");
    expect(hrefForType("shopping_item_purchased")).toBe("/compras");
    expect(hrefForType("maintenance_registered")).toBe("/manutencao");
    expect(hrefForType("task_due_today")).toBe("/rotina");
  });
});

describe("firstName", () => {
  it("pega só o primeiro nome", () => {
    expect(firstName("Rafael Viana")).toBe("Rafael");
  });
  it("nome sem sobrenome fica igual", () => {
    expect(firstName("Rafael")).toBe("Rafael");
  });
  it("null vira Alguém", () => {
    expect(firstName(null)).toBe("Alguém");
  });
});
```

- [ ] **Step 6: Rodar, confirmar falha, implementar, confirmar sucesso**

Run: `npx vitest run src/features/notifications/display.test.ts` → FAIL →
implementar `hrefForType` e `firstName` em `src/features/notifications/display.ts`
exatamente como especificado acima → rerun → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/notifications/group-by-day.ts src/features/notifications/group-by-day.test.ts src/features/notifications/display.ts src/features/notifications/display.test.ts
git commit -m "feat(notificacoes): agrupamento por dia e helpers de exibição"
```

---

## Task 3: Schemas Zod

**Files:**
- Create: `src/features/notifications/schemas.ts`
- Create: `src/features/notifications/schemas.test.ts`

**Interfaces:**
- Consumes: `NotificationType` de `src/features/notifications/display.ts` (Task 2) — só para o tipo de `NOTIFICATION_TYPE_LABEL`, não precisa importar de `Database` diretamente.
- Produces:
  - `setNotificationPreferencesSchema = z.object({ shopping_item_added: z.boolean(), shopping_item_purchased: z.boolean(), maintenance_registered: z.boolean(), task_due_today: z.boolean() })`
    — campos nomeados, não `{type, enabled}` genérico: mesmo padrão de
    `setMemberPermissionsSchema` (`src/features/members/schemas.ts`), que já
    resolve "várias booleans de configuração num formulário só".
  - `NOTIFICATION_TYPE_LABEL: Record<NotificationType, string>` — rótulos em
    PT-BR para a UI de preferências (ex.: `"shopping_item_added": "Item adicionado à lista"`).

- [ ] **Step 1: Escrever os testes**

```typescript
import { describe, expect, it } from "vitest";
import { setNotificationPreferencesSchema, NOTIFICATION_TYPE_LABEL } from "./schemas";

describe("setNotificationPreferencesSchema", () => {
  it("aceita os 4 campos como boolean", () => {
    expect(
      setNotificationPreferencesSchema.safeParse({
        shopping_item_added: true,
        shopping_item_purchased: false,
        maintenance_registered: true,
        task_due_today: true,
      }).success,
    ).toBe(true);
  });
  it("rejeita quando falta um campo", () => {
    expect(
      setNotificationPreferencesSchema.safeParse({ shopping_item_added: true }).success,
    ).toBe(false);
  });
});

describe("NOTIFICATION_TYPE_LABEL", () => {
  it("tem rótulo para os 4 tipos", () => {
    expect(Object.keys(NOTIFICATION_TYPE_LABEL)).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/features/notifications/schemas.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

4 campos boolean fixos (um por tipo do enum). Textos exatos de
`NOTIFICATION_TYPE_LABEL` ficam a critério do builder (ver spec, "Builder's
Calls").

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `npx vitest run src/features/notifications/schemas.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/schemas.ts src/features/notifications/schemas.test.ts
git commit -m "feat(notificacoes): schemas Zod e rótulos de tipo"
```

---

## Task 4: Helper de emissão (`emit.ts`)

**Files:**
- Create: `src/features/notifications/emit.ts`

**Interfaces:**
- Consumes: tabela `notifications` (Task 1); nenhuma dependência de código de outras tasks.
- Produces:
  ```typescript
  type EmitArgs = {
    supabase: SupabaseClient<Database>;
    homeId: string;
    actorId: string;
    type: Exclude<NotificationType, "task_due_today">;
    entityId: string;
    title: string;
    meta?: string;
  };
  export async function createNotification(args: EmitArgs): Promise<void>;
  ```
  Consumida por Task 5 (actions de compras/manutenção).

Sem teste Vitest dedicado para este arquivo — ele só faz chamadas Supabase
(sem lógica pura isolável além do que já está testado em `group-by-day`/
`display`); seu comportamento real (consolidação, RLS) é coberto pelo
Playwright da Task 8, que é o primeiro ponto onde existe um banco de verdade.

- [ ] **Step 1: Implementar `createNotification`**

Para `type === "shopping_item_added"`: `select id, created_at from notifications where home_id=:homeId and actor_id=:actorId and type='shopping_item_added' and created_at > now() - interval '30 minutes' order by created_at desc limit 1`; se achar, `update ... set title=:title, meta=:meta, created_at=now() where id=:id`; senão `insert`. Para os outros tipos, `insert` direto. Envolver tudo em `try/catch` que nunca relança (mesmo princípio do `trackEvent` em `src/lib/telemetry.ts`) — logar o erro no `catch` mas não propagar.

- [ ] **Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/features/notifications/emit.ts
git commit -m "feat(notificacoes): helper de emissão com consolidação por janela"
```

---

## Task 5: Emitir notificações nas 3 actions existentes

**Files:**
- Modify: `src/features/shopping/actions.ts` (função `addItem`, linha ~85; função `togglePurchased`, bloco `if (parsed.data.is_purchased)`)
- Modify: `src/features/manutencao/actions.ts` (função `createMaintenanceItem`, depois do insert bem-sucedido)

**Interfaces:**
- Consumes: `createNotification` (Task 4); `firstName` (Task 2) para montar o título.
- Produces: nada consumido por outras tasks — efeito observável só via Playwright (Task 8).

- [ ] **Step 1: `addItem` — emitir `shopping_item_added`**

Antes de chamar `createNotification` (em ambos os steps 1 e 2), buscar o
primeiro nome do autor com uma única query extra, mesmo padrão de
`getHomeId` em `src/features/manutencao/actions.ts`:
```typescript
const { data: actorProfile } = await supabase
  .from("profiles")
  .select("full_name")
  .eq("id", userId)
  .maybeSingle();
const actorName = firstName(actorProfile?.full_name ?? null);
```
Depois da linha `await trackEvent(userId, homeId, "shopping_item_added");` em
`src/features/shopping/actions.ts`, chamar:
```typescript
await createNotification({
  supabase, homeId, actorId: userId,
  type: "shopping_item_added",
  entityId: /* id do item inserido — added.id, confirmar campo exato em addShoppingItem */,
  title: `${actorName} adicionou um item à lista`,
  meta: parsed.data.name,
});
```
Conferir o retorno de `addShoppingItem` (`src/features/shopping/add-item.ts`)
para o campo de id do item antes de escrever — usar o que já existe, não
adicionar um campo novo.

- [ ] **Step 2: `togglePurchased` — emitir `shopping_item_purchased`**

No mesmo bloco onde já chama
`trackEvent(userId, homeId, "shopping_item_purchased")`, buscar `actorName`
como no Step 1, e chamar `createNotification` com
`type: "shopping_item_purchased"`, `entityId: parsed.data.id`, título
`"${actorName} concluiu uma compra"`, `meta` com o nome do item (buscar
antes do update ou usar o que a query de update já retorna).

- [ ] **Step 3: `createMaintenanceItem` — emitir `maintenance_registered`**

Depois de `await trackEvent(userId, homeId, "maintenance_created");` em
`src/features/manutencao/actions.ts`, chamar `createNotification` com
`type: "maintenance_registered"`, `entityId` = id do item inserido, título
`"Manutenção registrada"`, `meta` = `parsed.data.title`.

- [ ] **Step 4: Verificar TypeScript e suíte Vitest completa**

Run: `npx tsc --noEmit && npx vitest run --no-coverage`
Expected: sem erros novos; suíte continua 100% verde.

- [ ] **Step 5: Commit**

```bash
git add src/features/shopping/actions.ts src/features/manutencao/actions.ts
git commit -m "feat(notificacoes): emitir notificação em addItem/togglePurchased/createMaintenanceItem"
```

---

## Task 6: Queries e backfill de `task_due_today`

**Files:**
- Create: `src/features/notifications/queries.ts`

**Interfaces:**
- Consumes: `firstName` (Task 2, de `display.ts`); `NotificationType` (Task 2,
  de `display.ts`); as queries `task_occurrences` com os mesmos filtros de
  `getTodayOccurrences`/`getOverdueOccurrences` em
  `src/features/tasks/queries.ts` (não precisa importar essas funções —
  escreve a própria query com os mesmos critérios, ver Step 1).
  `groupByDay`/`hrefForType` **não** são usados aqui — ficam para a Task 7 (UI).
- Produces:
  ```typescript
  export type NotificationRow = {
    id: string; type: NotificationType; entity_id: string;
    title: string; meta: string | null; created_at: string;
    actor_name: string | null;
  };
  export async function backfillDueTodayNotifications(supabase, homeId: string, today: string): Promise<void>;
  export async function getLastReadAt(supabase, homeId: string, userId: string): Promise<string>;
  export async function getNotifications(supabase, homeId: string, userId: string): Promise<NotificationRow[]>;
  export async function getUnreadCount(supabase, homeId: string, userId: string): Promise<number>;
  export async function markAllRead(supabase, homeId: string, userId: string): Promise<void>;
  ```
  Todas as funções que recebem `homeId` e `userId` usam essa ordem exata nos
  dois parâmetros — não inverter em nenhuma delas.
  `getLastReadAt` e `getNotifications` são consumidas por Task 7
  (`/notificacoes/page.tsx`, para o indicador visual de não lida por linha);
  `getUnreadCount` é consumida por Task 9 (badge do `NotificationBell`).

- [ ] **Step 1: Implementar `backfillDueTodayNotifications`**

`select id, task_id, scheduled_for, task:tasks(title) from task_occurrences where home_id=:homeId and status='pending' and scheduled_for <= :today`
(mesmo filtro de status usado por `getTodayOccurrences`/`getOverdueOccurrences`
em `src/features/tasks/queries.ts` — só `pending` conta; `completed`,
`skipped` e `missed` nunca geram `task_due_today`).
Para cada linha, `insert into notifications (home_id, actor_id, type, entity_id, title, occurs_on) values (:homeId, null, 'task_due_today', occ.id, :title, occ.scheduled_for) on conflict do nothing` —
`:title` é `"${task.title} está atrasada"` se `scheduled_for < today`, senão
`"${task.title} está programada para hoje"`. `target_user_id` fica `null`
(casa toda vê).

- [ ] **Step 2: Implementar `getLastReadAt`**

`select last_read_at from notification_reads where user_id=:userId and home_id=:homeId` (uma linha ou nenhuma). Sem linha = "nunca leu" → retornar
`new Date(0).toISOString()`. Com linha → retornar `last_read_at` como veio
do banco.

- [ ] **Step 3: Implementar `getNotifications` e `getUnreadCount`**

Ambas filtram: `home_id = :homeId`, `actor_id is distinct from :userId`
(ou `is null`), e excluem tipos presentes em
`notification_preferences where user_id=:userId and enabled=false`. Fazer o
filtro de preferências com uma subquery `type not in (select type from
notification_preferences where user_id=:userId and enabled=false)` —
**este WHERE precisa ser idêntico nas duas funções** (ver Global Constraints).
`getNotifications` adiciona `created_at > now() - interval '30 days'`, `order
by created_at desc`, `limit 100`, join em `profiles` para `actor_name`
(aplicar `firstName` no resultado). `getUnreadCount` chama `getLastReadAt`
primeiro e adiciona `created_at > :lastReadAt`.

- [ ] **Step 4: Implementar `markAllRead`**

`upsert` em `notification_reads` com `user_id`, `home_id`, `last_read_at: now()`
— parâmetros na ordem `(supabase, homeId, userId)`, mesma ordem das demais.

- [ ] **Step 5: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/features/notifications/queries.ts
git commit -m "feat(notificacoes): queries de leitura, contagem e backfill de task_due_today"
```

---

## Task 7: Actions e página `/notificacoes`

**Files:**
- Create: `src/features/notifications/actions.ts`
- Create: `src/features/notifications/components/notifications-list.tsx`
- Create: `src/app/(app)/notificacoes/page.tsx`
- Modify: `src/lib/supabase/proxy.ts` (adicionar `/notificacoes` a `PRIVATE_PREFIXES`)

**Interfaces:**
- Consumes: `getNotifications`, `getLastReadAt`, `markAllRead`,
  `backfillDueTodayNotifications` (Task 6 — **não** `getUnreadCount`, que é
  só para o sininho na Task 9); `groupByDay`, `hrefForType` (Task 2);
  `setNotificationPreferencesSchema` (Task 3).
- Produces: `markAllNotificationsRead(): Promise<void>` e
  `setNotificationPreferences(_: FormState, fd: FormData): Promise<FormState>`
  (plural — um formulário com os 4 checkboxes, um submit só, mesmo padrão de
  `setMemberPermissions`) — consumida por Task 10 (seção de preferências em
  `/perfil`).

- [ ] **Step 1: Adicionar `/notificacoes` a `PRIVATE_PREFIXES`**

Em `src/lib/supabase/proxy.ts`, adicionar `"/notificacoes"` ao array
`PRIVATE_PREFIXES` (junto de `/inicio`, `/rotina`, etc.).

- [ ] **Step 2: Implementar as actions**

`markAllNotificationsRead()`: `requireUser()` → resolve `homeId` →
`markAllRead(supabase, homeId, userId)` → `revalidatePath("/notificacoes")`.
`setNotificationPreferences(_, fd)`: lê os 4 checkboxes do `FormData`
(mesmo padrão `textField(fd, "shopping_item_added") === "true"` de
`setMemberPermissions`), valida com o schema da Task 3; para cada um dos 4
tipos — se `true` (ligado, é o default), `delete` a linha em
`notification_preferences` se existir; se `false`, `upsert` com
`enabled: false` (a tabela só guarda exceções — ver spec) →
`revalidatePath("/perfil")`.

- [ ] **Step 3: Implementar `/notificacoes/page.tsx`**

Server component: `requireUser()` → `getHomeWithRooms(user.id)` → se `null`,
`redirect("/onboarding")` (mesmo padrão de outras páginas de `(app)`, cobre o
Review Focus de usuário sem casa) → `getLocalDateString(home.timezone)` para
`today` → `backfillDueTodayNotifications` → `Promise.all([getNotifications(supabase, homeId, userId), getLastReadAt(supabase, homeId, userId)])`
→ `groupByDay` nos resultados de `getNotifications` → renderiza
`NotificationsList` passando os grupos e o `lastReadAt` bruto (string ISO)
como props.

- [ ] **Step 4: Implementar `NotificationsList`**

Client ou server component (preferir server, já que não há interatividade
além de navegação): cabeçalho "Notificações" + botão "Marcar todas como
lidas" (form com `markAllNotificationsRead`); grupos por dia com `<Link
href={hrefForType(type)}>`; cada linha compara `created_at > lastReadAt`
(a prop ISO recebida da página) para decidir o indicador de não lida (ver
spec, mockup da seção UI).

- [ ] **Step 5: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/features/notifications/actions.ts src/features/notifications/components/notifications-list.tsx src/app/\(app\)/notificacoes/page.tsx src/lib/supabase/proxy.ts
git commit -m "feat(notificacoes): página /notificacoes com agrupamento por dia e marcar como lidas"
```

---

## Task 8: Testes Playwright — fluxo completo com duas contas

**Files:**
- Create: `tests/e2e/notificacoes.spec.ts`

**Interfaces:**
- Consumes: `ensureConfirmedUser` (`tests/e2e/helpers/admin.ts`); fluxo de
  onboarding e de compras/manutenção já existentes na UI.
- Produces: nada consumido por outra task — último ponto de verificação do
  comportamento real (RLS, consolidação, não-auto-notificação).

- [ ] **Step 1: Escrever helper de "segundo morador na mesma casa"**

Usar `createTestAdminClient()` (de `tests/e2e/helpers/admin.ts`) para, depois
que o usuário 1 completa o onboarding, inserir o usuário 2 direto em
`home_members` (`role: "member"`) e atualizar `profiles.current_home_id` —
mesma técnica usada para testar o fluxo de convite manualmente nesta sessão
(bypassa a UI de convite, que já tem cobertura própria em `membros.spec.ts`).

- [ ] **Step 2: Teste — autor não vê a própria notificação, outro morador vê**

```typescript
test("item adicionado por um morador aparece para o outro, não para o autor", async ({ page, browser }) => {
  // user1 completa onboarding, user2 é adicionado como membro da mesma casa (Step 1)
  // user1 adiciona item em /compras
  // user1 abre /notificacoes → NÃO vê "adicionou um item" (é o autor)
  // user2 (outro contexto de browser) faz login, abre /notificacoes → VÊ "Rafael adicionou um item"
});
```

- [ ] **Step 3: Teste — consolidação por autor, não entre autores**

```typescript
test("dois itens do mesmo autor consolidam; item de outro autor não entra na mesma linha", async ({ page }) => {
  // user1 adiciona 2 itens em sequência rápida
  // user2 abre /notificacoes → vê 1 linha "adicionou 2 itens" (ou texto equivalente)
  // user2 adiciona 1 item
  // user1 abre /notificacoes → vê 2 linhas: a dele não aparece (é autor), a de user2 aparece separada
});
```

- [ ] **Step 4: Teste — nunca vaza notificação entre casas diferentes**

```typescript
test("notificação de uma casa não aparece para usuário de outra casa", async ({ page }) => {
  // user3 completa onboarding numa casa própria, SEM ser adicionado à casa de user1/user2
  // user1 (da outra casa) adiciona um item de compras
  // user3 abre /notificacoes → lista vazia / não vê nada da casa de user1
});
```

- [ ] **Step 5: Teste — marcar todas como lidas zera o badge**

```typescript
test("marcar todas como lidas remove o indicador de não lida e zera o badge", async ({ page }) => {
  // user2 vê notificação não lida (indicador visual presente)
  // clica em "Marcar todas como lidas"
  // recarrega /notificacoes → indicador de não lida não aparece mais
  // badge do sininho em /inicio não mostra contagem
});
```

- [ ] **Step 6: Teste — desligar preferência oculta o tipo sem apagar histórico**

```typescript
test("desligar um tipo de notificação oculta da lista sem apagar o histórico", async ({ page }) => {
  // user2 tem notificação de maintenance_registered visível
  // vai em /perfil, desliga "Manutenção registrada"
  // /notificacoes não mostra mais esse tipo
  // religa a preferência → notificação antiga volta a aparecer (nada foi deletado)
});
```

- [ ] **Step 7: Teste — usuário sem casa (onboarding incompleto) não quebra em `/notificacoes`**

```typescript
test("usuário que ainda não completou o onboarding é redirecionado ao acessar /notificacoes direto", async ({ page }) => {
  const email = uniqueEmail("notif-7-sem-casa");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  // NÃO completa o onboarding — current_home_id ainda é null
  await page.goto("/notificacoes");
  await expect(page).not.toHaveURL(/\/notificacoes$/);
  // não deve haver erro 500 — a página redireciona (para /onboarding, como as outras rotas de (app))
});
```

- [ ] **Step 8: Teste — ocorrência concluída não gera `task_due_today`**

```typescript
test("tarefa concluída hoje não aparece como vencendo em /notificacoes", async ({ page }) => {
  // user1 completa onboarding com uma rotina que gera ao menos 1 tarefa para hoje
  // user1 conclui a tarefa em /rotina (status vira completed)
  // user1 abre /notificacoes → não deve haver nenhum item do tipo "está programada para hoje"/"está atrasada" para essa tarefa
  // (cobre o filtro status='pending' do backfill — uma ocorrência completed/skipped/missed nunca entra)
});
```

- [ ] **Step 9: Rodar a suíte e2e nova**

Run: `npx playwright test tests/e2e/notificacoes.spec.ts`
Expected: todos os testes passam.

- [ ] **Step 10: Commit**

```bash
git add tests/e2e/notificacoes.spec.ts
git commit -m "test(notificacoes): e2e cobrindo RLS entre contas, consolidação e preferências"
```

---

## Task 9: Reescrever `NotificationBell`

**Files:**
- Modify: `src/features/notifications/notification-bell.tsx` (reescrever)
- Modify: `src/features/notifications/notification-bell.test.tsx` (reescrever)
- Delete: `src/features/notifications/seen.ts`
- Delete: `src/features/notifications/seen.test.ts`
- Modify: `src/app/(app)/inicio/page.tsx` (ponto de uso do `NotificationBell`)

**Interfaces:**
- Consumes: `getUnreadCount` (Task 6).
- Produces: `NotificationBell({ unreadCount: number }): JSX.Element` — prop
  nova, substitui `{ homeId, items }`.

- [ ] **Step 1: Escrever os testes novos**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import { NotificationBell } from "./notification-bell";

describe("NotificationBell", () => {
  it("sem não lidas: link simples, sem badge", () => {
    render(<NotificationBell unreadCount={0} />);
    const link = screen.getByRole("link", { name: "Notificações" });
    expect(link).toHaveAttribute("href", "/notificacoes");
  });

  it("com não lidas: aria-label indica contagem", () => {
    render(<NotificationBell unreadCount={3} />);
    expect(screen.getByRole("link", { name: "Notificações, 3 novas" })).toBeInTheDocument();
  });

  it("1 não lida usa singular", () => {
    render(<NotificationBell unreadCount={1} />);
    expect(screen.getByRole("link", { name: "Notificações, 1 nova" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/features/notifications/notification-bell.test.tsx`
Expected: FAIL (assinatura antiga ainda espera `homeId`/`items`).

- [ ] **Step 3: Reescrever `NotificationBell`**

Remove `Dialog`, `useSyncExternalStore`, `localStorage`. Vira um `<Link
href="/notificacoes">` com o ícone `Bell` e, se `unreadCount > 0`, o mesmo
ponto visual (`#C8643C`) que já existia, mais um `aria-label` com a contagem
(mesma lógica de singular/plural do componente antigo).

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `npx vitest run src/features/notifications/notification-bell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Remover `seen.ts` e atualizar o ponto de uso em `/inicio`**

Deletar `src/features/notifications/seen.ts` e
`src/features/notifications/seen.test.ts`. Em
`src/app/(app)/inicio/page.tsx`, trocar a chamada de `<NotificationBell
homeId={home.id} items={...} />` por `<NotificationBell
unreadCount={unreadCount} />`, buscando `unreadCount` via `getUnreadCount`
(Task 6) junto dos outros `Promise.all` já existentes na página — **não**
remover a lógica de `attention`/tiles existente (ela alimenta outras partes
da Home, como os cards de stats; só o `NotificationBell` para de consumi-la).

- [ ] **Step 6: Rodar suíte completa e verificar TypeScript**

Run: `npx vitest run --no-coverage && npx tsc --noEmit`
Expected: 100% verde, sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/features/notifications/notification-bell.tsx src/features/notifications/notification-bell.test.tsx src/app/\(app\)/inicio/page.tsx
git rm src/features/notifications/seen.ts src/features/notifications/seen.test.ts
git commit -m "refactor(notificacoes): sininho vira Link com badge do banco, remove localStorage"
```

---

## Task 10: Seção de preferências em `/perfil`

**Files:**
- Modify: `src/app/(app)/perfil/page.tsx`
- Create: `src/features/notifications/components/notification-preferences-form.tsx`

**Interfaces:**
- Consumes: `setNotificationPreferences` (Task 7); `NOTIFICATION_TYPE_LABEL`
  (Task 3).
- Produces: nada consumido por outra task (última do plano).

- [ ] **Step 1: Buscar preferências atuais na página**

Em `src/app/(app)/perfil/page.tsx`, adicionar ao `Promise.all` existente uma
query em `notification_preferences where user_id=:userId` → mapa `type →
enabled` (default `true` quando ausente).

- [ ] **Step 2: Implementar `NotificationPreferencesForm`**

Um formulário só, com os 4 tipos (`Object.entries(NOTIFICATION_TYPE_LABEL)`)
como `<input type="checkbox" name={type} value="true" defaultChecked={...}
className="h-4 w-4 rounded border-input accent-primary" />` e um botão
"Salvar" — exatamente o padrão de
`src/features/members/components/permissions-form.tsx` (várias checkboxes,
um `useActionState` só, chamando `setNotificationPreferences`), não um
switch independente por linha.

- [ ] **Step 3: Adicionar a seção à página, seguindo o padrão visual existente**

Nova `<section>` com `<SectionTitle icon={<Bell .../>} title="Notificações"
hint="O que você quer ser avisado." />` + `<div
style={card}><NotificationPreferencesForm .../></div>`, no mesmo formato das
seções "Ausência" e "Segurança" já existentes em `/perfil/page.tsx`.

- [ ] **Step 4: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Rodar a suíte Vitest completa**

Run: `npx vitest run --no-coverage`
Expected: 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/perfil/page.tsx src/features/notifications/components/notification-preferences-form.tsx
git commit -m "feat(notificacoes): seção de preferências por tipo em /perfil"
```

---

## Task 11: Migration de produção e verificação final

**Files:** nenhum arquivo novo — só comandos.

**Interfaces:**
- Consumes: tudo das tasks anteriores.
- Produces: feature completa e aplicada em produção.

- [ ] **Step 1: Rodar toda a suíte Vitest**

Run: `npx vitest run --no-coverage`
Expected: 100% passando (contagem exata = baseline + testes novos desta
feature).

- [ ] **Step 2: Rodar toda a suíte Playwright**

Run: `npx playwright test`
Expected: 100% passando, incluindo `notificacoes.spec.ts`.

- [ ] **Step 3: Pedir confirmação antes de aplicar a migration em produção**

Esta é uma ação com efeito em banco compartilhado — **parar aqui e confirmar
com o usuário** antes de rodar o próximo comando (mesmo padrão seguido nesta
sessão para as migrations do fluxo de convite).

- [ ] **Step 4: Aplicar a migration em produção**

Run: `npx supabase db push --remote --yes`
Expected: migration `<ts>_notifications.sql` aplicada ao projeto de produção.

- [ ] **Step 5: Push para o repositório remoto**

Run: `git push`
Expected: todos os commits desta feature chegam em `origin/main`.
