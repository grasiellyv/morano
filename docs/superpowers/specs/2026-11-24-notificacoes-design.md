# Notificações — Central Persistida (Frente 1)

## Intent and Why

O app tem hoje um sininho (`NotificationBell`) que recalcula, a cada carregamento
da Home, os itens que "pedem atenção agora" (tarefas atrasadas/hoje, reposição de
compras, manutenção pendente) e usa `localStorage` só para marcar o que já foi
visto. Não existe histórico — fechar o app e reabrir não mostra "o que aconteceu
enquanto eu estava fora", e não há forma de notificar sobre uma ação de outro
morador ("Rafael adicionou um item"). O documento de produto pede uma central
completa: histórico agrupado por dia, persistido no banco, com preferências por
tipo de notificação.

## Goals

- Registrar no banco 4 tipos de notificação (ver Escopo abaixo) quando o evento
  correspondente acontece.
- Tela dedicada `/notificacoes`: lista agrupada por "HOJE" / "ONTEM" / data,
  cada item com ícone, título, descrição curta, tempo relativo, e um botão
  "Marcar todas como lidas".
- Clicar numa notificação leva à tela do item correspondente.
- Preferência por tipo (ligado/desligado) em `/perfil` ("Minha conta").
- Sininho no header de `/inicio` mostra contagem de não lidas e navega para
  `/notificacoes` (substitui o dropdown atual).
- Nunca notificar o próprio autor da ação sobre a própria ação.
- Consolidar múltiplas notificações do mesmo tipo/autor num período curto
  (ex.: 3 itens adicionados em 10 min → 1 notificação "adicionou 3 itens").

## Escopo — 4 tipos para o MVP

Mapeados a partir dos exemplos do wireframe, não dos nomes genéricos do texto:

| Tipo | Gatilho | Destinatário | Consolida? |
|---|---|---|---|
| `shopping_item_added` | `addItem` (compras) | casa toda, exceto autor | Sim — janela de 30 min |
| `shopping_item_purchased` | `togglePurchased(is_purchased=true)` | casa toda, exceto autor | Não |
| `maintenance_registered` | `createMaintenanceItem` | casa toda, exceto autor | Não |
| `task_due_today` | sem ação de usuário — backfill idempotente ao carregar `/notificacoes` | casa toda | Não (1 por ocorrência, para sempre — ver Decisions) |

## Non-goals

- Push notifications (web push, mobile) — só in-app.
- Email digest.
- Tempo real (Supabase Realtime/websocket) — contagem atualiza ao navegar/recarregar, suficiente para o ritmo de uso de uma casa.
- Marcar como lida item a item — só "marcar todas" (cursor único por usuário).
- Tipos de notificação das Frentes 2/3/4 (manutenção com responsável, plano de evento, recomendações) — ficam para quando essas frentes forem construídas.
- Mover o sininho para um shell de navegação global — por ora ele continua só no header de `/inicio`, onde já está.
- Paginação infinita — a tela carrega até 100 notificações dos últimos 30 dias; "ver mais" fica para depois se fizer falta.

## Anti-goals

- Nunca notificar o autor sobre a própria ação.
- Nunca vazar notificação entre casas diferentes (escopo por `home_id`, reforçado via RLS).
- Texto da notificação é sempre factual ("X foi adicionado"), nunca preditivo/sugestivo — isso é território da Frente 4 (Recomendações), que tem sua própria regra de não apresentar estimativa como certeza.

## Constraints

- `home_id` sempre derivado de `profiles.current_home_id` no servidor (padrão do projeto).
- RLS protege leitura e escrita; nenhuma lógica de permissão só no client.
- Zod 4 + `textField`/`useActionState` onde aplicável (os emissores não são forms — são chamadas de função dentro de actions já existentes).
- Vitest: manter suíte verde; novos testes para o helper de emissão e para o agrupamento por dia.
- Reutilizar `TZDate` + `homes.timezone` para o agrupamento HOJE/ONTEM (mesmo padrão usado em `onboarding/actions.ts`).

## Approaches

**A — Triggers no banco (fan-out na escrita).** Cada tabela relevante ganha
trigger que decide destinatários e insere uma linha por destinatário.
Descartada: a lógica de "quem é relevante" ficaria em PL/pgSQL, difícil de
testar, e o projeto já evita lógica de negócio em trigger (prefere actions TS
testáveis — ver `invite_member`, `createMaintenanceItem`).

**B — Emissão na aplicação com fan-out (uma linha por destinatário).** Cada
action chama um helper que grava uma linha por morador. Resolve a testabilidade
de A, mas cada preferência desligada ou cada "marcar como lida" vira operação
em N linhas: mais escrita, mais estado para manter sincronizado.

**C — Log único + leitura computada (escolhida).** Uma linha por evento (sem
fan-out). Preferências e "quem vê o quê" são filtros aplicados na leitura, não
na escrita. "Marcar todas como lidas" é um cursor (`last_read_at`) por usuário,
não uma linha por notificação. Menos escrita, modelo mais simples, consistente
com o estilo do projeto (actions TS testáveis, RLS simples).

## Schema

```sql
-- supabase/migrations/<ts>_notifications.sql

create type notification_type as enum (
  'shopping_item_added',
  'shopping_item_purchased',
  'maintenance_registered',
  'task_due_today'
);

create table notifications (
  id          uuid              primary key default gen_random_uuid(),
  home_id     uuid              not null references homes(id) on delete cascade,
  actor_id    uuid              references profiles(id) on delete set null,
  type        notification_type not null,
  entity_id   uuid              not null,
  target_user_id uuid           references profiles(id) on delete cascade,
  title       text              not null check (char_length(title) between 1 and 200),
  meta        text,
  occurs_on   date, -- só preenchido para task_due_today; usado na constraint abaixo
  created_at  timestamptz       not null default now()
);

-- Evita duplicar o backfill idempotente de task_due_today (corrida entre moradores
-- abrindo a tela ao mesmo tempo).
create unique index notifications_due_today_once
  on notifications (home_id, entity_id, occurs_on)
  where type = 'task_due_today';

create index notifications_home_created_idx on notifications (home_id, created_at desc);

alter table notifications enable row level security;

create policy notifications_select on notifications
  for select to authenticated
  using (
    home_id = (select current_home_id from profiles where id = auth.uid())
    and (target_user_id is null or target_user_id = auth.uid())
  );

create policy notifications_insert on notifications
  for insert to authenticated
  with check (
    home_id = (select current_home_id from profiles where id = auth.uid())
    and (actor_id = auth.uid() or actor_id is null)
  );

-- Só para consolidação: o autor pode atualizar a própria notificação recente.
create policy notifications_update_own on notifications
  for update to authenticated
  using (actor_id = auth.uid())
  with check (actor_id = auth.uid());

grant select, insert, update on notifications to authenticated;

create table notification_reads (
  user_id      uuid        not null references profiles(id) on delete cascade,
  home_id      uuid        not null references homes(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, home_id)
);

alter table notification_reads enable row level security;

create policy notification_reads_own on notification_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on notification_reads to authenticated;

create table notification_preferences (
  user_id uuid              not null references profiles(id) on delete cascade,
  type    notification_type not null,
  enabled boolean           not null default true,
  primary key (user_id, type)
);

alter table notification_preferences enable row level security;

create policy notification_preferences_own on notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on notification_preferences to authenticated;
```

Decisão: `notification_preferences` só guarda linhas para tipos **desligados**
(default é ligado quando não há linha) — tabela fica praticamente vazia na
prática.

## Helper de emissão (`src/features/notifications/emit.ts`)

```typescript
// createNotification({ supabase, homeId, actorId, type, entityId, title, meta })
//   - shopping_item_added: procura notificação do mesmo (home_id, actor_id, type)
//     criada nos últimos 30 min; se achar, UPDATE title/meta/created_at em vez de
//     inserir; senão INSERT.
//   - demais tipos: INSERT direto.
//   - nunca lança: erro de notificação não deve quebrar a action principal
//     (mesmo princípio do trackEvent).
```

Chamado a partir de três pontos já existentes (mesmo padrão do `trackEvent`):
- `addItem` em `src/features/shopping/actions.ts` (depois do insert bem-sucedido)
- `togglePurchased`, dentro do `if (parsed.data.is_purchased)` — mesmo bloco
  onde já chama `trackEvent(userId, homeId, "shopping_item_purchased")`
- `createMaintenanceItem` em `src/features/manutencao/actions.ts`

`task_due_today` não é emitido por nenhuma action — é gerado por
`backfillDueTodayNotifications(supabase, homeId, today)`, chamado no topo do
server component de `/notificacoes`. A query cobre **hoje e atrasadas num só
passo**: `task_occurrences` com `status = 'pending'` e `scheduled_for <= today`
(reaproveitando os mesmos filtros de `getTodayOccurrences`/`getOverdueOccurrences`
de `src/features/tasks/queries.ts`). `occurs_on` é gravado como o
`scheduled_for` da própria ocorrência — não a data de hoje — então o índice
único `notifications_due_today_once` em `(home_id, entity_id, occurs_on)`
garante **uma notificação por ocorrência, para sempre**, não uma por dia: uma
tarefa que fica atrasada por duas semanas não gera 14 linhas, porque
`occurs_on` não muda de um dia para o outro. O título é decidido no momento da
geração (`scheduled_for < today` → "está atrasada"; `scheduled_for = today` →
"está programada para hoje") e não é recalculado depois — é um registro
histórico de quando a tarefa venceu, não um indicador vivo (o indicador vivo
continua sendo a própria página `/rotina`).

## Queries (`src/features/notifications/queries.ts`)

```typescript
type NotificationRow = {
  id: string;
  type: NotificationType;
  entity_id: string;
  title: string;
  meta: string | null;
  created_at: string;
  actor_name: string | null; // primeiro nome só (full_name.split(" ")[0]); null para task_due_today
};

// getNotifications(supabase, homeId, userId): últimas 100, últimos 30 dias,
//   excluindo type desligado em notification_preferences, excluindo actor_id = userId.
// getUnreadCount(supabase, homeId, userId): mesmo WHERE de getNotifications
//   (exclui actor_id = userId e types desligados) + created_at > last_read_at.
//   As duas queries compartilham os mesmos filtros de visibilidade — o número
//   do sininho precisa corresponder exatamente ao que a lista mostra, senão
//   "marcar todas como lidas" não zera o badge.
// markAllRead(supabase, userId, homeId): upsert notification_reads.
```

Agrupamento HOJE/ONTEM/data feito em TS (não em SQL) usando `TZDate` com
`homes.timezone`, mesmo padrão de `approveRoutine`.

`actor_name` é sempre o primeiro nome (`full_name.split(" ")[0]`) — mantém o
tom acolhedor/doméstico do app; não exibe sobrenome em nenhuma notificação.

`href` de cada notificação é calculado por um switch em `type` (não armazenado):
`shopping_item_*` → `/compras`, `maintenance_registered` → `/manutencao`,
`task_due_today` → `/rotina`.

## UI

### `/notificacoes/page.tsx` (novo, dentro de `(app)`)

Server component. Roda o backfill de `task_due_today`, busca notificações e o
`last_read_at` do usuário, agrupa por dia, renderiza `NotificationsList`.

```
Notificações                    [Marcar todas como lidas]

HOJE
┌─────────────────────────────────────────┐
│●🛒  Nova atividade compartilhada          │  ← não lida: bolinha + fundo
│     Rafael adicionou um item à lista. 3h │     sutil (ex. --card mais quente
├─────────────────────────────────────────┤     / tom amber bem claro)
│ 🔧  Manutenção registrada                 │  ← lida: sem marcador
│     Vazamento na pia foi registrado. 5h  │
└─────────────────────────────────────────┘

ONTEM
┌─────────────────────────────────────────┐
│ ✅  Rafael concluiu uma compra            │
│     Os ovos foram marcados...   Ontem    │
└─────────────────────────────────────────┘
```

Cada linha compara seu `created_at` com o `last_read_at` carregado no server
component (não precisa de nova query): `created_at > last_read_at` → não lida.
Diferenciação visual exata (cor/indicador) é do builder, seguindo a paleta
brown/amber do DESIGN.md — ex.: ponto âmbar de 6px à esquerda do ícone, como
o já usado no sininho atual (`#C8643C` em `notification-bell.tsx`), e leve
tonalidade de fundo no card.

Clicar no item navega para o `href` do tipo. "Marcar todas como lidas" chama
a action `markAllNotificationsRead` e revalida a página — isso move o cursor
`last_read_at` para agora, então o próximo carregamento mostra tudo como lido
(o indicador visual não desaparece sem recarregar/revalidar, o que já
acontece pela Server Action).

### Sininho (`NotificationBell`, reescrito)

Deixa de ser um `Dialog` com lista embutida; passa a ser um `Link` para
`/notificacoes` com o badge de contagem (`getUnreadCount`). Remove a dependência
de `localStorage`/`seen.ts` (não precisa mais — o cursor agora é do banco).

### `/perfil` — nova seção "Notificações"

`/configuracoes` foi removida (unificada em `/perfil`, redirect permanente —
ver `src/app/(app)/configuracoes/page.tsx`). Nova seção segue o padrão de
`SectionTitle` + `card` já usado em `/perfil` (Ausência, Segurança): lista os
4 tipos com toggle (switch), default ligado. Action
`setNotificationPreference(type, enabled)`.

## Files

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<ts>_notifications.sql` | Criar |
| `src/types/database.ts` | Regenerar |
| `src/features/notifications/emit.ts` | Criar |
| `src/features/notifications/queries.ts` | Criar |
| `src/features/notifications/actions.ts` | Criar (`markAllNotificationsRead`, `setNotificationPreference`) |
| `src/features/notifications/schemas.ts` | Criar |
| `src/features/notifications/group-by-day.ts` | Criar (lógica pura, testável) |
| `src/features/notifications/notification-bell.tsx` | Reescrever (Link + badge, sem Dialog) |
| `src/features/notifications/seen.ts` | Remover (substituído por cursor no banco) |
| `src/features/notifications/components/notifications-list.tsx` | Criar |
| `src/app/(app)/notificacoes/page.tsx` | Criar |
| `src/app/(app)/perfil/page.tsx` | Editar — nova seção |
| `src/features/notifications/schemas.test.ts` | Criar |
| `src/lib/supabase/proxy.ts` | Editar — adicionar `/notificacoes` a `PRIVATE_PREFIXES` |
| `src/features/shopping/actions.ts` | Editar — `addItem`, `togglePurchased` |
| `src/features/manutencao/actions.ts` | Editar — `createMaintenanceItem` |
| `src/features/notifications/group-by-day.test.ts` | Criar |
| `tests/e2e/notificacoes.spec.ts` | Criar — nenhum teste Vitest deste projeto bate num banco real (confirmado: todos são lógica pura); fluxo completo (emissão, RLS entre duas contas, marcar como lida) vai para Playwright, como o resto do projeto |

## Decisions from Builder Review

**1. `task_due_today` cobre atrasadas também, gerado uma vez por ocorrência.**
Resolvido acima (ver seção do helper de emissão) — `occurs_on = scheduled_for`
em vez de "hoje", então a constraint única dedupe para sempre, não por dia.

**2. `getUnreadCount` compartilha os filtros de `getNotifications`.**
Resolvido acima (ver Queries) — mesmo WHERE nas duas, senão o badge do
sininho não bate com o que a lista mostra.

**3. Bump de `created_at` na consolidação é intencional — a notificação volta
a aparecer como não lida.** Se Rafael adiciona 1 item e a casa já leu, depois
Rafael adiciona mais 2 dentro da janela de 30 min, a notificação consolidada
("Rafael adicionou 3 itens") deve voltar a aparecer como não lida para quem já
tinha visto a primeira versão — há informação genuinamente nova. Não precisa
de coluna `updated_at` separada: `created_at` já é o único sinal de "novo" que
o cursor (`last_read_at`) usa, e é isso que queremos sinalizar. Efeito
colateral aceito: a notificação também “sobe” para o grupo do dia atual
(HOJE), o que é correto — a atividade mais recente dela é de hoje.

## Decisions from User Review

**4. Diferenciação visual de não lidas na lista.** Ver UI/`/notificacoes`
acima — comparação `created_at > last_read_at` por linha, sem query extra.

**5. Primeiro nome, não nome completo.** `actor_name = full_name.split(" ")[0]`
em todas as mensagens de atividade (ver Queries).

## Builder's Calls (What's Left to the Builder)

- Texto exato de cada título/descrição por tipo (os do wireframe são sugestão).
- Ícone exato por tipo (reaproveitar `iconFor` existente como ponto de partida).
- Janela de consolidação exata para `shopping_item_added` (proposta: 30 min).
- Layout exato do switch de preferências em `/configuracoes`.
- Cor/indicador exato do marcador de "não lida" (sugestão: ponto âmbar `#C8643C`, mesmo tom do sininho atual).
