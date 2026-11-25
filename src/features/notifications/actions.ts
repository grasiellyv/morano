"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { type FormState, fieldErrorsFrom, textField } from "@/features/auth/form-state";
import type { NotificationType } from "@/features/notifications/display";
import { setNotificationPreferencesSchema } from "@/features/notifications/schemas";
import { markAllRead } from "@/features/notifications/queries";

async function getHomeId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  return profile?.current_home_id ?? null;
}

/**
 * Marca todas as notificações da casa como lidas para o usuário atual
 * (grava/atualiza `notification_reads`). Sem casa configurada, não há o que
 * marcar — sai em silêncio, mesmo princípio de outras actions que dependem
 * de `current_home_id`.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return;

  await markAllRead(supabase, homeId, userId);
  revalidatePath("/notificacoes");
}

/**
 * Preferências de notificação são por usuário, não por casa
 * (`notification_preferences` não tem `home_id` — ver migração). A tabela só
 * guarda EXCEÇÕES ao default (que é "ligado" para todo tipo): tipo marcado
 * como `true` (ligado) remove a linha de exceção, se existir; `false`
 * (desligado) grava `enabled: false`.
 */
export async function setNotificationPreferences(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const parsed = setNotificationPreferencesSchema.safeParse({
    shopping_item_added: textField(fd, "shopping_item_added") === "true",
    shopping_item_purchased: textField(fd, "shopping_item_purchased") === "true",
    maintenance_registered: textField(fd, "maintenance_registered") === "true",
    task_due_today: textField(fd, "task_due_today") === "true",
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const entries = Object.entries(parsed.data) as [NotificationType, boolean][];

  for (const [type, enabled] of entries) {
    const { error } = enabled
      ? await supabase
          .from("notification_preferences")
          .delete()
          .eq("user_id", userId)
          .eq("type", type)
      : await supabase
          .from("notification_preferences")
          .upsert({ user_id: userId, type, enabled: false }, { onConflict: "user_id,type" });

    if (error) {
      return { status: "error", message: "Erro ao salvar preferências. Tente novamente." };
    }
  }

  revalidatePath("/perfil");
  return { status: "success", message: "Preferências de notificação atualizadas" };
}
