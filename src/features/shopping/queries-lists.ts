import "server-only";
import { parseISO, format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addDaysStr } from "@/lib/dates";

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

export type ReorderSuggestion = {
  id: string;
  list_id: string;
  list_name: string;
  name: string;
  category_id: string | null;
  quantity: number;
  unit: string;
  due_date: string;
  overdue: boolean;
};

export async function getReorderSuggestions(
  supabase: SupabaseClient<Database>,
  homeId: string,
  today: string,
  daysAhead = 14,
): Promise<ReorderSuggestion[]> {
  const threshold = addDaysStr(today, daysAhead);

  const { data, error } = await supabase
    .from("shopping_lists")
    .select(`
      id, name,
      items:shopping_list_items(id, name, category_id, quantity, unit, reorder_months, last_added_at, created_at)
    `)
    .eq("home_id", homeId);

  if (error || !data) return [];

  const suggestions: ReorderSuggestion[] = [];

  for (const list of data) {
    const listTyped = list as { id: string; name: string; items: Array<{ id: string; name: string; category_id: string | null; quantity: number; unit: string; reorder_months: number | null; last_added_at: string | null; created_at: string }> };
    for (const item of listTyped.items) {
      if (!item.reorder_months) continue;
      const baseDate = (item.last_added_at ?? item.created_at).slice(0, 10);
      const base = parseISO(baseDate);
      const due = new Date(base);
      due.setMonth(due.getMonth() + item.reorder_months);
      const dueDateStr = format(due, "yyyy-MM-dd");
      if (dueDateStr <= threshold) {
        suggestions.push({
          id: item.id,
          list_id: list.id,
          list_name: list.name,
          name: item.name,
          category_id: item.category_id,
          quantity: item.quantity,
          unit: item.unit,
          due_date: dueDateStr,
          overdue: dueDateStr < today,
        });
      }
    }
  }

  suggestions.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.due_date.localeCompare(b.due_date);
  });

  return suggestions;
}

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
