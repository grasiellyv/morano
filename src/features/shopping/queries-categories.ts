import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ShoppingCategory = {
  id: string;
  home_id: string;
  name: string;
  icon: string;
  sort_order: number;
  default_slug: string | null;
};

export async function getCategories(
  supabase: SupabaseClient<Database>,
  homeId: string,
): Promise<ShoppingCategory[]> {
  const { data, error } = await supabase
    .from("shopping_categories")
    .select("id, home_id, name, icon, sort_order, default_slug")
    .eq("home_id", homeId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data;
}
