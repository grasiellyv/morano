import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { firstName } from "@/features/notifications/display";
import type { NotificationType } from "@/features/notifications/display";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  entity_id: string;
  title: string;
  meta: string | null;
  created_at: string;
  actor_name: string | null;
};

const READ_WINDOW_DAYS = 30;
const NOTIFICATIONS_LIMIT = 100;

/**
 * Decide quais ocorrências ainda precisam de um INSERT de notificação
 * `task_due_today`, dado o que já existe em `notifications`.
 *
 * A chave de deduplicação precisa ser a MESMA da constraint
 * `notifications_due_today_once`: `(home_id, entity_id, occurs_on)` —
 * composta, não só `entity_id`. Isso importa porque `postpone_task_occurrence`
 * atualiza `scheduled_for` NA MESMA linha de `task_occurrences` (mesmo `id`/
 * `entity_id`), em vez de criar uma ocorrência nova. Exemplo: a ocorrência X
 * vence atrasada no dia 1 e gera notificação `(X, occurs_on=dia1)`; o
 * residente posterga X para o dia 5 (mesmo `id` X, `scheduled_for` agora
 * dia5); no dia 5 a notificação `(X, occurs_on=dia5)` é uma chave diferente
 * e PRECISA ser inserida. Filtrar só por `entity_id` (ignorando `occurs_on`)
 * faria X nunca mais notificar depois da primeira postergação — por isso a
 * chave usada aqui é sempre `entity_id:occurs_on`, não `entity_id` isolado.
 *
 * Função pura (sem Supabase) para poder testar a lógica de deduplicação
 * isoladamente.
 */
export function selectOccurrencesNeedingNotification<
  T extends { id: string; scheduled_for: string },
>(
  occurrences: T[],
  existingNotifications: { entity_id: string; occurs_on: string | null }[],
): T[] {
  const existingKeys = new Set(
    existingNotifications.map((row) => `${row.entity_id}:${row.occurs_on}`),
  );

  return occurrences.filter((occ) => !existingKeys.has(`${occ.id}:${occ.scheduled_for}`));
}

/**
 * Gera (de forma idempotente) uma notificação `task_due_today` para cada
 * ocorrência pendente com `scheduled_for <= today` (hoje ou atrasada).
 *
 * IMPORTANTE: `occurs_on` é sempre a data da PRÓPRIA ocorrência
 * (`scheduled_for`), nunca `today`. É isso que a constraint
 * `notifications_due_today_once` (home_id, entity_id, occurs_on) usa para
 * garantir no máximo 1 notificação por ocorrência — mesmo que ela fique
 * atrasada por semanas e esta função seja chamada todos os dias, `occurs_on`
 * não muda, então o conflito de unicidade bloqueia as repetições.
 *
 * `notifications_due_today_once` é um índice único PARCIAL
 * (`where type = 'task_due_today'`). O supabase-js não permite expressar
 * `on conflict (...) where ...` via `.upsert()` — o `onConflict` do
 * PostgREST só aceita uma lista de colunas, e o Postgres só considera um
 * índice parcial como alvo de um `ON CONFLICT (cols)` quando o predicado é
 * repetido no próprio INSERT (o que o PostgREST não gera). Nessas condições
 * `.upsert({ onConflict: "home_id,entity_id,occurs_on" })` falharia em toda
 * chamada com "no unique or exclusion constraint matching the ON CONFLICT
 * specification", não só em conflitos reais. Por isso inserimos linha a
 * linha com `.insert()` simples e tratamos a violação de unicidade (código
 * Postgres 23505) como sucesso idempotente — equivalente ao `on conflict do
 * nothing` sem alvo explícito, que o Postgres aceita para qualquer
 * constraint único da tabela (incluindo parciais).
 */
export async function backfillDueTodayNotifications(
  supabase: SupabaseClient<Database>,
  homeId: string,
  today: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("task_occurrences")
    .select("id, task_id, scheduled_for, task:tasks(title)")
    .eq("home_id", homeId)
    .eq("status", "pending")
    .lte("scheduled_for", today);

  if (error || !data) return;

  const occurrences = data as unknown as {
    id: string;
    task_id: string;
    scheduled_for: string;
    task: { title: string } | null;
  }[];

  // Evita tentar INSERT em toda chamada para ocorrências que já têm
  // notificação (o caso comum: esta função é chamada a cada carregamento de
  // /inicio). Sem este filtro, cada visita repetia N INSERTs que falhavam com
  // 23505 e eram descartados — N round-trips desperdiçados por acesso à
  // página mais visitada do app. Com o filtro: 1 SELECT + INSERT só para
  // ocorrências genuinamente novas. O catch de 23505 abaixo continua como
  // rede de segurança para a corrida entre dois usuários carregando a página
  // no mesmo instante, mas deixa de ser o caminho normal.
  //
  // Seleciona `occurs_on` junto com `entity_id`: a deduplicação usa a chave
  // composta (entity_id, occurs_on) para bater com a constraint
  // `notifications_due_today_once` — ver `selectOccurrencesNeedingNotification`.
  const { data: existing, error: existingError } = await supabase
    .from("notifications")
    .select("entity_id, occurs_on")
    .eq("home_id", homeId)
    .eq("type", "task_due_today");

  if (existingError) {
    console.error("[notifications:backfill]", existingError);
  }

  const pendingOccurrences = selectOccurrencesNeedingNotification(occurrences, existing ?? []);

  for (const occ of pendingOccurrences) {
    const taskTitle = occ.task?.title ?? "Tarefa";
    const title =
      occ.scheduled_for < today
        ? `${taskTitle} está atrasada`
        : `${taskTitle} está programada para hoje`;

    const { error: insertError } = await supabase.from("notifications").insert({
      home_id: homeId,
      actor_id: null,
      type: "task_due_today",
      entity_id: occ.id,
      title,
      occurs_on: occ.scheduled_for,
    });

    // 23505 = unique_violation: já existe notificação para esta ocorrência
    // (notifications_due_today_once) — resultado esperado do "on conflict
    // do nothing", não um erro real.
    if (insertError && insertError.code !== "23505") {
      console.error("[notifications:backfill]", insertError);
    }
  }
}

export async function getLastReadAt(
  supabase: SupabaseClient<Database>,
  homeId: string,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("notification_reads")
    .select("last_read_at")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .maybeSingle();

  // Sem linha em notification_reads = nunca leu.
  return data?.last_read_at ?? new Date(0).toISOString();
}

async function getDisabledTypes(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<NotificationType[]> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("type")
    .eq("user_id", userId)
    .eq("enabled", false);

  return (data ?? []).map((row) => row.type);
}

/**
 * Monta a query-base de notificações visíveis para `userId` na `homeId`:
 * mesma casa, nunca o próprio ator (`actor_id` distinto de `userId`,
 * tratando `null` — "casa toda", nenhum ator — como sempre visível) e nunca
 * um tipo que o usuário desativou em `notification_preferences`.
 *
 * `getNotifications` e `getUnreadCount` SEMPRE passam por aqui para montar
 * esse WHERE — nenhuma das duas duplica esta lógica, para que o badge de
 * não lidas (`getUnreadCount`) nunca divirja da lista exibida
 * (`getNotifications`); elas diferem apenas no filtro de tempo aplicado
 * depois (`created_at > janela de 30 dias` vs. `created_at > lastReadAt`).
 */
function applyVisibilityFilter<
  Q extends { eq(column: string, value: string): Q; or(filters: string): Q; not(column: string, operator: string, value: string): Q },
>(query: Q, homeId: string, userId: string, disabledTypes: NotificationType[]): Q {
  let q = query.eq("home_id", homeId).or(`actor_id.neq.${userId},actor_id.is.null`);

  if (disabledTypes.length > 0) {
    q = q.not("type", "in", `(${disabledTypes.join(",")})`);
  }

  return q;
}

export async function getNotifications(
  supabase: SupabaseClient<Database>,
  homeId: string,
  userId: string,
): Promise<NotificationRow[]> {
  const since = new Date(Date.now() - READ_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const disabledTypes = await getDisabledTypes(supabase, userId);

  const baseQuery = supabase
    .from("notifications")
    .select(
      "id, type, entity_id, title, meta, created_at, actor:profiles!notifications_actor_id_fkey(full_name)",
    );
  const query = applyVisibilityFilter(baseQuery, homeId, userId, disabledTypes);

  const { data, error } = await query
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error || !data) return [];

  const rows = data as unknown as {
    id: string;
    type: NotificationType;
    entity_id: string;
    title: string;
    meta: string | null;
    created_at: string;
    actor: { full_name: string | null } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    entity_id: row.entity_id,
    title: row.title,
    meta: row.meta,
    created_at: row.created_at,
    // Sem ator (notificações "casa toda", ex. task_due_today) => null, não
    // "Alguém" — esse placeholder é só para um ator sem full_name.
    actor_name: row.actor ? firstName(row.actor.full_name) : null,
  }));
}

export async function getUnreadCount(
  supabase: SupabaseClient<Database>,
  homeId: string,
  userId: string,
): Promise<number> {
  const lastReadAt = await getLastReadAt(supabase, homeId, userId);
  const disabledTypes = await getDisabledTypes(supabase, userId);

  // Mesmo piso de 30 dias de `getNotifications`: sem ele, um membro novo (cujo
  // cursor de leitura começa em "nunca leu" = epoch 0) veria no badge uma
  // contagem do histórico INTEIRO da casa, embora a lista em si nunca mostre
  // nada além dos últimos 30 dias — o badge superestimaria o que é
  // efetivamente visível. O filtro mais recente entre os dois (30 dias OU
  // cursor de leitura) prevalece, já que ambas as condições (`and` implícito
  // de dois `.gt()` encadeados) precisam valer.
  const since = new Date(Date.now() - READ_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const baseQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true });
  const query = applyVisibilityFilter(baseQuery, homeId, userId, disabledTypes);

  const { count, error } = await query.gt("created_at", lastReadAt).gt("created_at", since);

  if (error || count === null) return 0;
  return count;
}

export async function markAllRead(
  supabase: SupabaseClient<Database>,
  homeId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("notification_reads").upsert(
    { user_id: userId, home_id: homeId, last_read_at: new Date().toISOString() },
    { onConflict: "user_id,home_id" },
  );

  if (error) console.error("[notifications:markAllRead]", error);
}
