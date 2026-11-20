# Analytics e Monitoramento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrumentar o MORANO com presença de usuário (DAU/WAU/MAU), rastreamento de eventos nos módulos sem cobertura, monitoramento de erros via Sentry e analytics comportamental via PostHog.

**Architecture:** Quatro incrementos independentes: (1) `last_seen_at` com throttle de 15 min no layout protegido, sem SDK externo; (2) chamadas `trackEvent` nos módulos `events`, `shopping`, `tasks` e `manutencao`, reutilizando a função existente em `src/lib/telemetry.ts`; (3) Sentry com `beforeSend` para remover PII; (4) PostHog EU region com provider no layout, IP anonimizado, sem session replay.

**Tech Stack:** Next.js 16.4.6 App Router, React 19, Supabase, `@sentry/nextjs@9`, `posthog-js@1`

**Spec:** `memory/analytics-requirements.md` + auditoria em https://claude.ai/artifact/Le9oVAU1hchyvS6XLqfJJa

## Global Constraints

- Next.js 16 — ler `node_modules/next/dist/docs/` antes de qualquer codigo de integracao de SDK
- `trackEvent` so aceita event names com regex `/^[a-z_]{3,50}$/` — nunca enviar titulo, nome ou conteudo pessoal como event name
- `homeId` nunca aceitar do cliente sem verificacao RLS — sempre derivar de `profiles.current_home_id`
- PostHog: apenas `distinct_id = user_id` (UUID); nunca enviar `email`, `full_name`, conteudo de tarefa
- PostHog host obrigatorio: `https://eu.i.posthog.com` (EU region)
- PostHog IP anonimizado: `person_profiles: "identified_only"` e `ip: false` no `posthog.init`
- PostHog session replay: desativado (`session_recording: { maskAllInputs: true }`)
- Sentry `beforeSend`: redactar `email`, `full_name`, `homeId` concreto dos breadcrumbs; retornar `null` para cancelar envio se PII confirmado nao for removivel
- Nunca commitar `.env.local`; chaves secretas so nos paineis ou no `.env.local`
- Convencao: `event` no codigo = evento domestico (tabela `events`); `track` = telemetria de produto

## Review Focus

1. `shouldUpdatePresence(null, now)` deve retornar `true` - usuario novo nunca atualiza sem isso -> Task 1, Step 1
2. `shouldUpdatePresence(lastSeenAt14minAgo, now)` deve retornar `false` - throttle nao deve vazar -> Task 1, Step 1
3. `shouldUpdatePresence(lastSeenAt15minAgo, now)` deve retornar `true` - boundary exato deve atualizar -> Task 1, Step 1
4. PostHog configurado com `ip: false` - omitir silenciosamente envia IPs reais (violacao LGPD) -> Task 4, Step 3 (verificacao manual no painel PostHog)
5. Sentry `beforeSend` retorna `null` quando evento contem campo `email` ou `full_name` -> Task 3, Step 4

---

## File Map

**Criados:**
- `src/lib/presence.ts` - `shouldUpdatePresence` (pura, testavel) + `updatePresence` (chama Supabase)
- `src/lib/presence.test.ts` - testes unitarios de `shouldUpdatePresence`
- `sentry.client.config.ts` - config cliente Sentry (raiz do projeto)
- `sentry.server.config.ts` - config servidor Sentry (raiz do projeto)
- `sentry.edge.config.ts` - config edge Sentry (raiz do projeto)
- `src/instrumentation.ts` - hook de instrumentacao Next.js 16 para Sentry
- `src/components/providers/posthog-provider.tsx` - `PostHogProvider` client component

**Modificados:**
- `src/app/(app)/layout.tsx` - adicionar `last_seen_at` ao select, chamar `updatePresence`, envolver com `PostHogProvider`
- `src/features/events/actions.ts` - adicionar `event_created`, `event_deleted`
- `src/features/shopping/actions.ts` - adicionar `shopping_item_added`, `shopping_item_purchased`
- `src/features/tasks/actions.ts` - adicionar `task_deleted`
- `src/features/manutencao/actions.ts` - adicionar `maintenance_created`, `maintenance_completed`
- `next.config.ts` - envolver com `withSentryConfig`

---

### Task 1: Presence tracking (`last_seen_at`)

**Files:**
- Create: `src/lib/presence.ts`
- Create: `src/lib/presence.test.ts`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Produces: `shouldUpdatePresence(lastSeenAt: string | null, now: Date): boolean`
- Produces: `updatePresence(userId: string, lastSeenAt: string | null, supabase): Promise<void>`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// src/lib/presence.test.ts
import { describe, it, expect } from "vitest";
import { shouldUpdatePresence } from "./presence";

describe("shouldUpdatePresence", () => {
  const now = new Date("2026-11-20T12:00:00.000Z");

  it("retorna true quando last_seen_at e null", () => {
    expect(shouldUpdatePresence(null, now)).toBe(true);
  });

  it("retorna false quando last_seen_at ha menos de 15 minutos", () => {
    const recent = new Date(now.getTime() - 14 * 60 * 1000).toISOString();
    expect(shouldUpdatePresence(recent, now)).toBe(false);
  });

  it("retorna true quando last_seen_at ha exatamente 15 minutos", () => {
    const boundary = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    expect(shouldUpdatePresence(boundary, now)).toBe(true);
  });

  it("retorna true quando last_seen_at ha mais de 15 minutos", () => {
    const old = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    expect(shouldUpdatePresence(old, now)).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que os testes falham**

```
npx vitest run src/lib/presence.test.ts
```
Expected: FAIL - "Cannot find module './presence'"

- [ ] **Step 3: Implementar `src/lib/presence.ts`**

`shouldUpdatePresence`: retorna `true` se `lastSeenAt` for `null` ou se `now.getTime() - new Date(lastSeenAt).getTime() >= 15 * 60 * 1000`.

`updatePresence(userId, lastSeenAt, supabase)`: chama `shouldUpdatePresence`; se `true`, executa `supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId)` sem bloquear (fire-and-forget via `void`, erros silenciados com `try/catch`).

- [ ] **Step 4: Verificar que os testes passam**

```
npx vitest run src/lib/presence.test.ts
```
Expected: 4 passed

- [ ] **Step 5: Modificar `src/app/(app)/layout.tsx`**

Adicionar `last_seen_at` ao select existente:
```ts
.select("onboarding_completed, last_seen_at")
```
Depois do redirect do onboarding, chamar:
```ts
void updatePresence(user.id, profile.last_seen_at ?? null, supabase);
```

- [ ] **Step 6: Verificar suite completa**

```
npx vitest run
```
Expected: 223 passed (219 + 4 novos)

- [ ] **Step 7: Commit**

```
git add src/lib/presence.ts src/lib/presence.test.ts src/app/(app)/layout.tsx
git commit -m "feat(telemetria): atualizar last_seen_at com throttle de 15 minutos"
```

---

### Task 2: `trackEvent` nos modulos sem cobertura

**Files:**
- Modify: `src/features/events/actions.ts`
- Modify: `src/features/shopping/actions.ts`
- Modify: `src/features/tasks/actions.ts`
- Modify: `src/features/manutencao/actions.ts`

**Interfaces:**
- Consumes: `trackEvent(userId: string, homeId: string | null, eventName: string): Promise<void>` de `@/lib/telemetry`

Nenhum novo arquivo de teste - sao adicoes de uma linha em funcoes ja testadas pela suite existente.

- [ ] **Step 1: Adicionar import e eventos em `src/features/events/actions.ts`**

Adicionar no topo (apos os imports existentes):
```ts
import { trackEvent } from "@/lib/telemetry";
```

Em `createEvent`, apos `revalidatePath("/rotina")`:
```ts
await trackEvent(userId, homeId, "event_created");
```

Em `deleteEvent`, antes do `revalidatePath` final (ler a funcao para confirmar onde `homeId` esta disponivel):
```ts
await trackEvent(userId, homeId, "event_deleted");
```

- [ ] **Step 2: Adicionar eventos em `src/features/shopping/actions.ts`**

Adicionar import no topo:
```ts
import { trackEvent } from "@/lib/telemetry";
```

Em `addItem`, apos `revalidatePath("/compras")`:
```ts
await trackEvent(userId, homeId, "shopping_item_added");
```

Em `togglePurchased`, apenas no caminho onde `is_purchased = true` (item marcado como comprado):
```ts
await trackEvent(userId, homeId, "shopping_item_purchased");
```

- [ ] **Step 3: Adicionar evento em `src/features/tasks/actions.ts`**

Em `deleteTask` (linha ~831), apos `revalidatePath("/rotina")`:
```ts
await trackEvent(userId, deleteProfile.current_home_id, "task_deleted");
```
`trackEvent` ja esta importado nesse arquivo.

- [ ] **Step 4: Adicionar eventos em `src/features/manutencao/actions.ts`**

Adicionar import no topo:
```ts
import { trackEvent } from "@/lib/telemetry";
```

Em `createMaintenanceItem`, antes do `return { status: "success" }` final:
```ts
await trackEvent(userId, homeId, "maintenance_created");
```

Em `updateMaintenanceStatus`, antes do `return { status: "success" }` final:
```ts
if (parsed.data.status === "concluido") {
  await trackEvent(userId, homeId, "maintenance_completed");
}
```

- [ ] **Step 5: Verificar suite completa**

```
npx vitest run
```
Expected: mesmo numero de testes passando (nenhum teste novo adicionado)

- [ ] **Step 6: Commit**

```
git add src/features/events/actions.ts src/features/shopping/actions.ts src/features/tasks/actions.ts src/features/manutencao/actions.ts
git commit -m "feat(telemetria): adicionar trackEvent nos modulos eventos, compras, tarefas e manutencao"
```

---

### Task 3: Sentry — monitoramento de erros

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `src/instrumentation.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Nenhuma - Task independente

Antes de qualquer codigo: ler `node_modules/next/dist/docs/` para verificar o contrato do `instrumentation.ts` no Next.js 16.

- [ ] **Step 1: Instalar dependencia**

```
npm install @sentry/nextjs@9
```

- [ ] **Step 2: Criar `sentry.server.config.ts` na raiz do projeto**

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
  beforeSend(event) {
    if (event.request?.data) delete event.request.data;
    if (event.user) {
      delete event.user.email;
      delete (event.user as Record<string, unknown>).full_name;
    }
    return event;
  },
});
```

- [ ] **Step 3: Criar `sentry.client.config.ts` na raiz do projeto**

Mesma estrutura de `sentry.server.config.ts`, adicionando:
```ts
replaysOnErrorSampleRate: 0,
replaysSessionSampleRate: 0,
```

- [ ] **Step 4: Verificar contrato do `beforeSend`**

O `beforeSend` deve retornar `null` se o evento ainda contiver PII nao removivel. Verificacao manual: apos deploy, inspecionar um evento no painel Sentry para confirmar ausencia de email/full_name.

- [ ] **Step 5: Criar `sentry.edge.config.ts` na raiz do projeto**

Versao minima sem session replay, igual ao server config.

- [ ] **Step 6: Criar `src/instrumentation.ts`**

Ler `node_modules/next/dist/docs/` para confirmar a API exata. Contrato esperado:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
```
Incluir `export const onRequestError` apenas se a documentacao do Next.js 16 confirmar que existe.

- [ ] **Step 7: Envolver `next.config.ts` com `withSentryConfig`**

```ts
import { withSentryConfig } from "@sentry/nextjs";
// ...
export default withSentryConfig(nextConfig, { silent: true, disableLogger: true });
```

- [ ] **Step 8: Verificar build**

```
npm run build
```
Expected: build passa sem erros relacionados ao Sentry.
O usuario deve adicionar `SENTRY_DSN=<dsn>` ao `.env.local` antes deste step.

- [ ] **Step 9: Verificar suite**

```
npx vitest run
```
Expected: mesmo numero de testes passando

- [ ] **Step 10: Commit**

```
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts src/instrumentation.ts next.config.ts
git commit -m "feat(monitoramento): integrar Sentry com beforeSend para remocao de PII"
```

---

### Task 4: PostHog — analytics comportamental

**Files:**
- Create: `src/components/providers/posthog-provider.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `user.id: string` do `requireUser()` ja presente em `layout.tsx`

Antes de qualquer codigo: ler `node_modules/next/dist/docs/` para verificar restricoes de Client Components no App Router do Next.js 16 para providers de analytics.

- [ ] **Step 1: Instalar dependencia**

```
npm install posthog-js@1
```

- [ ] **Step 2: Criar `src/components/providers/posthog-provider.tsx`**

Client Component (`"use client"`) que inicializa PostHog uma vez e chama `posthog.identify(userId)`:

```tsx
"use client";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      ip: false,
      capture_pageview: true,
      session_recording: { maskAllInputs: true, maskAllText: true },
      loaded(ph) { ph.identify(userId); },
    });
  }, [userId]);
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

- [ ] **Step 3: Modificar `src/app/(app)/layout.tsx`**

Importar `PostHogProvider` e envolver `<AppShell>`:
```tsx
import { PostHogProvider } from "@/components/providers/posthog-provider";
// ...
return (
  <PostHogProvider userId={user.id}>
    <AppShell>{children}</AppShell>
  </PostHogProvider>
);
```

- [ ] **Step 4: Adicionar variaveis de ambiente**

O usuario deve adicionar ao `.env.local`:
```
NEXT_PUBLIC_POSTHOG_KEY=<valor do painel PostHog EU>
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

- [ ] **Step 5: Verificar build**

```
npm run build
```
Expected: build passa; sem erros de SSR (o `posthog.init` esta em `useEffect`, portanto client-only)

- [ ] **Step 6: Verificar suite completa**

```
npx vitest run
```
Expected: mesmo numero de testes passando

- [ ] **Step 7: Verificar no painel PostHog EU**

Iniciar dev server, navegar pelo app. Confirmar no painel:
- Eventos aparecem na regiao EU
- Campo `ip` nao aparece nos eventos
- `distinct_id` e o UUID do usuario (nao email)

- [ ] **Step 8: Commit**

```
git add src/components/providers/posthog-provider.tsx src/app/(app)/layout.tsx
git commit -m "feat(analytics): integrar PostHog EU region com identificacao por UUID"
```
