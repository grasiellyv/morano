"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import type { FormState } from "@/features/auth/form-state";
import { getMemberPermissions } from "@/features/members/permissions";
import { trackEvent } from "@/lib/telemetry";

async function context() {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  const homeId = profile?.current_home_id ?? null;
  if (!homeId) return { error: "Casa não encontrada. Tente novamente." as const };

  // Quem pode gerenciar compras pode abrir/fechar o link de visualização.
  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { error: "Sem permissão para compartilhar a lista." as const };
  }
  return { userId, homeId, supabase };
}

/** Cria o link de visualização (idempotente: se já existe, mantém o mesmo). */
export async function createShareLink(): Promise<FormState> {
  const ctx = await context();
  if ("error" in ctx) return { status: "error", message: ctx.error };
  const { userId, homeId, supabase } = ctx;

  const { data: existing } = await supabase
    .from("shopping_share_links")
    .select("id")
    .eq("home_id", homeId)
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("shopping_share_links").insert({ home_id: homeId });
    // 23505 = outro membro criou ao mesmo tempo: o resultado é o mesmo.
    if (error && error.code !== "23505") {
      return { status: "error", message: "Não foi possível criar o link. Tente novamente." };
    }
    await trackEvent(userId, homeId, "shopping_share_created");
  }

  revalidatePath("/compras");
  return { status: "success", message: "Link criado." };
}

/** Desativa o link: o token deixa de existir e a página pública para de responder. */
export async function revokeShareLink(): Promise<FormState> {
  const ctx = await context();
  if ("error" in ctx) return { status: "error", message: ctx.error };
  const { userId, homeId, supabase } = ctx;

  const { error } = await supabase.from("shopping_share_links").delete().eq("home_id", homeId);
  if (error) return { status: "error", message: "Não foi possível desativar o link." };

  await trackEvent(userId, homeId, "shopping_share_revoked");
  revalidatePath("/compras");
  return { status: "success", message: "Link desativado." };
}
