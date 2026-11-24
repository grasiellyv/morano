"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { type FormState, fieldErrorsFrom, textField } from "@/features/auth/form-state";
import { removeEventItemSchema } from "@/features/events/schemas";
import { getMemberPermissions } from "@/features/members/permissions";

/**
 * Tira da lista de compras um item pendente que o evento pediu. Itens já comprados
 * (histórico) e itens sem vínculo com evento não são tocados por aqui.
 */
export async function removeEventItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para Compras." };
  }

  const parsed = removeEventItemSchema.safeParse({ id: textField(fd, "id") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { data: deleted, error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .eq("is_purchased", false)
    .not("event_id", "is", null)
    .select("id");

  if (error || !deleted?.length) {
    return { status: "error", message: "Item não encontrado ou já comprado." };
  }

  revalidatePath("/compras");
  revalidatePath("/rotina");
  return { status: "success", message: "Item removido da lista de compras." };
}
