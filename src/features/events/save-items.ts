import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addShoppingItem, type AddItemResult } from "@/features/shopping/add-item";
import type { EventItemInput } from "@/features/events/event-items";

/**
 * Coloca os itens do evento na lista de compras (missão "Ocasiões", vinculados ao evento).
 * Em sequência, pela RPC atômica: um item que falha não impede os outros. Sem permissão
 * de Compras nem tenta (a RPC recusaria) — todos voltam como "proibido".
 */
export async function addEventItems(
  supabase: SupabaseClient<Database>,
  args: { homeId: string; eventId: string; title: string; items: EventItemInput[]; canManageShopping: boolean },
): Promise<Array<{ name: string; result: AddItemResult }>> {
  const results: Array<{ name: string; result: AddItemResult }> = [];
  const notes = `Para: ${args.title}`.slice(0, 200);
  for (const item of args.items) {
    if (!args.canManageShopping) {
      results.push({ name: item.name, result: { result: "error", forbidden: true } });
      continue;
    }
    const result = await addShoppingItem(supabase, {
      homeId: args.homeId,
      name: item.name,
      categoryId: item.category_id,
      quantity: item.quantity,
      unit: item.unit,
      notes,
      mission: "ocasioes",
      eventId: args.eventId,
    });
    results.push({ name: item.name, result });
  }
  return results;
}
