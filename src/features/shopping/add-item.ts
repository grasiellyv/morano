import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AddItemInput = {
  homeId: string;
  name: string;
  categoryId?: string | null;
  quantity: number;
  unit: Database["public"]["Enums"]["shopping_unit"];
  notes?: string | null;
  roomId?: string | null;
  mission?: string | null;
  priority?: "normal" | "urgente";
};

export type AddItemResult =
  | { result: "inserted" }
  | { result: "merged"; name: string; quantity: number; unit: string }
  | { result: "conflict"; name: string; quantity: number; unit: string }
  | { result: "error"; forbidden: boolean };

/**
 * Único caminho para colocar um item na lista de compras. Chama a função
 * atômica `add_shopping_item`, que soma a quantidade quando o produto já está
 * pendente (mesma unidade), avisa quando a unidade difere e nunca cria linhas
 * duplicadas, mesmo com várias pessoas adicionando ao mesmo tempo.
 */
export async function addShoppingItem(
  supabase: SupabaseClient<Database>,
  input: AddItemInput,
): Promise<AddItemResult> {
  // PostgREST precisa de TODOS os argumentos nomeados: opcionais vão como null
  // explícito (undefined seria omitido e a função não seria encontrada). Os tipos
  // gerados não modelam null em argumentos, daí o cast.
  const args = {
    p_home_id: input.homeId,
    p_name: input.name,
    p_category_id: input.categoryId ?? null,
    p_quantity: input.quantity,
    p_unit: input.unit,
    p_notes: input.notes ?? null,
    p_room_id: input.roomId ?? null,
    p_mission: input.mission ?? null,
    p_priority: input.priority ?? "normal",
  } as unknown as Database["public"]["Functions"]["add_shopping_item"]["Args"];
  const { data, error } = await supabase.rpc("add_shopping_item", args);
  if (error || !data) return { result: "error", forbidden: error?.code === "42501" };
  return data as unknown as AddItemResult;
}

export function mergedMessage(r: { name: string; quantity: number; unit: string }): string {
  return `“${r.name}” já estava na lista: quantidade somada (${r.quantity} ${r.unit}).`;
}

export function conflictMessage(r: { name: string; quantity: number; unit: string }): string {
  return `“${r.name}” já está na lista (${r.quantity} ${r.unit}). Edite a quantidade do item existente.`;
}
