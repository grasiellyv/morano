import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { NotificationType } from "@/features/notifications/display";

const CONSOLIDATION_WINDOW_MS = 30 * 60 * 1000;

export type EmitArgs = {
  supabase: SupabaseClient<Database>;
  homeId: string;
  actorId: string;
  type: Exclude<NotificationType, "task_due_today">;
  entityId: string;
  title: string;
  meta?: string;
};

/**
 * Único caminho de escrita para notificações geradas por eventos de produto
 * (compras, manutenção). `task_due_today` não passa por aqui — é gerada por
 * outro mecanismo. Nunca lança: falhas ao emitir notificação não devem
 * interromper a ação principal que a disparou (mesmo princípio do
 * `trackEvent` em `src/lib/telemetry.ts`).
 */
export async function createNotification(args: EmitArgs): Promise<void> {
  const { supabase, homeId, actorId, type, entityId, title, meta } = args;

  try {
    if (type === "shopping_item_added") {
      const since = new Date(Date.now() - CONSOLIDATION_WINDOW_MS).toISOString();
      const { data: existing, error: selectError } = await supabase
        .from("notifications")
        .select("id, created_at")
        .eq("home_id", homeId)
        .eq("actor_id", actorId)
        .eq("type", "shopping_item_added")
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("notifications")
          .update({ title, meta: meta ?? null, created_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select("id");
        if (updateError) throw updateError;
        // `notifications_update_own` só permite atualizar linhas cujo actor_id é o
        // próprio caller. `notifications_select` (usado na busca acima) não filtra por
        // actor_id, então a linha encontrada pode pertencer a outro actor — nesse caso
        // o update acima afeta 0 linhas, sem erro. Sem o `.select("id")` isso passaria
        // em silêncio e a notificação seria perdida; com ele, cai no insert abaixo.
        if (updated && updated.length > 0) return;
      }
    }

    const { error: insertError } = await supabase.from("notifications").insert({
      home_id: homeId,
      actor_id: actorId,
      type,
      entity_id: entityId,
      title,
      meta: meta ?? null,
    });
    if (insertError) throw insertError;
  } catch (error) {
    // Falha ao emitir notificação não deve quebrar o fluxo principal — erro logado, não relançado.
    console.error("[notifications:emit]", error);
  }
}
