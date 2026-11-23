import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Mission } from "@/features/shopping/schemas";

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
  mission: Mission | null;
  priority: "normal" | "urgente";
  created_by: string | null;
  added_by_name: string | null;
  purchased_by: string | null;
  purchased_by_name: string | null;
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
      mission, priority, created_by, purchased_by,
      category:shopping_categories(id, name, icon),
      room:rooms(id, name),
      added_by_profile:profiles!shopping_items_created_by_fkey(full_name),
      purchased_by_profile:profiles!shopping_items_purchased_by_fkey(full_name)
    `)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error || !data) return { pending: [], purchased: [] };

  const pending: ShoppingItem[] = [];
  const purchased: ShoppingItem[] = [];
  for (const raw of data) {
    const item = raw as unknown as {
      id: string; name: string; category_id: string | null; notes: string | null;
      room_id: string | null; quantity: number; unit: Database["public"]["Enums"]["shopping_unit"];
      is_purchased: boolean; purchased_at: string | null; created_at: string;
      mission: Mission | null; priority: "normal" | "urgente"; created_by: string | null; purchased_by: string | null;
      category: { id: string; name: string; icon: string } | null;
      room: { id: string; name: string } | null;
      added_by_profile: { full_name: string | null } | null;
      purchased_by_profile: { full_name: string | null } | null;
    };
    const typedItem: ShoppingItem = {
      id: item.id,
      name: item.name,
      category_id: item.category_id,
      category: item.category,
      notes: item.notes,
      room_id: item.room_id,
      room: item.room,
      quantity: item.quantity,
      unit: item.unit,
      is_purchased: item.is_purchased,
      purchased_at: item.purchased_at,
      created_at: item.created_at,
      mission: item.mission,
      priority: item.priority ?? "normal",
      created_by: item.created_by,
      added_by_name: item.added_by_profile?.full_name ?? null,
      purchased_by: item.purchased_by,
      purchased_by_name: item.purchased_by_profile?.full_name ?? null,
    };
    if (typedItem.is_purchased) {
      purchased.push(typedItem);
    } else {
      pending.push(typedItem);
    }
  }
  return { pending, purchased };
}
