"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getMemberPermissions } from "@/features/members/permissions";
import { getProductSuggestionSources } from "@/features/shopping/queries";
import type { SuggestionSources } from "@/features/shopping/suggest";

const EMPTY: SuggestionSources = { categories: [], home: [] };

/**
 * Fontes do autocomplete de produtos, chamadas pelo cliente só quando o campo aparece
 * (formulário de evento, atalho de compras da tarefa). Sem permissão de Compras, vazio.
 */
export async function loadProductSources(): Promise<SuggestionSources> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  const homeId = profile?.current_home_id;
  if (!homeId) return EMPTY;

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) return EMPTY;

  return getProductSuggestionSources(supabase, homeId);
}
