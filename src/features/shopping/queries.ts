import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ShoppingItem = {
  id: string;
  name: string;
  category: Database["public"]["Enums"]["shopping_category"];
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
    .select("id, name, category, quantity, unit, is_purchased, purchased_at, created_at")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error || !data) return { pending: [], purchased: [] };

  const pending: ShoppingItem[] = [];
  const purchased: ShoppingItem[] = [];
  for (const item of data) {
    if (item.is_purchased) {
      purchased.push(item);
    } else {
      pending.push(item);
    }
  }
  return { pending, purchased };
}
