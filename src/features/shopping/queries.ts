import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ShoppingItem = {
  id: string;
  name: string;
  category_id: string | null;
  category: { id: string; name: string; icon: string } | null;
  notes: string | null;
  room_id: string | null;
  room: { id: string; name: string } | null;
  quantity: number;
  unit: Database["public"]["Enums"]["shopping_unit"];
  is_purchased: boolean;
  purchased_at: string | null;
  created_at: string;
};

export async function getShoppingItems(
  supabase: SupabaseClient<Database>,
  homeId: string,
): Promise<{ pending: ShoppingItem[]; purchased: ShoppingItem[] }> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select(`
      id, name, category_id, notes, room_id, quantity, unit,
      is_purchased, purchased_at, created_at,
      category:shopping_categories(id, name, icon),
      room:rooms(id, name)
    `)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error || !data) return { pending: [], purchased: [] };

  const pending: ShoppingItem[] = [];
  const purchased: ShoppingItem[] = [];
  for (const item of data) {
    const typedItem = item as unknown as ShoppingItem;
    if (typedItem.is_purchased) {
      purchased.push(typedItem);
    } else {
      pending.push(typedItem);
    }
  }
  return { pending, purchased };
}
