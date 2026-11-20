import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ShoppingListItem = {
  id: string;
  list_id: string;
  name: string;
  category_id: string | null;
  category: { id: string; name: string; icon: string } | null;
  quantity: number;
  unit: string;
  notes: string | null;
  reorder_months: number | null;
  last_added_at: string | null;
};

export type ShoppingList = {
  id: string;
  home_id: string;
  name: string;
  created_at: string;
  items: ShoppingListItem[];
};

export async function getShoppingLists(
  supabase: SupabaseClient<Database>,
  homeId: string,
): Promise<ShoppingList[]> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select(`
      id, home_id, name, created_at,
      items:shopping_list_items(
        id, list_id, name, category_id, quantity, unit, notes, reorder_months, last_added_at,
        category:shopping_categories(id, name, icon)
      )
    `)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as ShoppingList[];
}
