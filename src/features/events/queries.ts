import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { LinkedEventItem } from "@/features/events/event-items";

export type Event = {
  id: string;
  home_id: string;
  title: string;
  event_type: "aniversario" | "viagem" | "jantar" | "consulta_medica" | "visita" | "manutencao" | "feriado" | "outros";
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  created_at: string;
};

export async function getEventsForRange(
  supabase: SupabaseClient<Database>,
  homeId: string,
  from: string,
  to: string,
): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, home_id, title, event_type, start_date, end_date, start_time, end_time, description, created_at")
    .eq("home_id", homeId)
    .lte("start_date", to)
    .or(`end_date.gte.${from},and(end_date.is.null,start_date.gte.${from})`)
    .order("start_date", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data;
}

export async function getNextUpcomingEvent(
  supabase: SupabaseClient<Database>,
  homeId: string,
  afterDate: string,
): Promise<Event | null> {
  const to = new Date(afterDate + "T00:00:00Z");
  to.setUTCDate(to.getUTCDate() + 90);
  const toStr = to.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("events")
    .select("id, home_id, title, event_type, start_date, end_date, start_time, end_time, description, created_at")
    .eq("home_id", homeId)
    .gt("start_date", afterDate)
    .lte("start_date", toStr)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * Itens de compras vinculados a cada evento (para a edição e o aviso de exclusão).
 * A RLS de shopping_items é por membro da casa (is_home_member), não por permissão de Compras:
 * quem só gerencia eventos também enxerga esses itens.
 */
export async function getEventShoppingItems(
  supabase: SupabaseClient<Database>,
  eventIds: string[],
): Promise<Record<string, LinkedEventItem[]>> {
  if (eventIds.length === 0) return {};
  const { data, error } = await supabase
    .from("shopping_items")
    .select("id, event_id, name, quantity, unit, is_purchased")
    .in("event_id", eventIds);
  if (error || !data) return {};

  const byEvent: Record<string, LinkedEventItem[]> = {};
  for (const row of data) {
    if (!row.event_id) continue;
    (byEvent[row.event_id] ??= []).push({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      is_purchased: row.is_purchased,
    });
  }
  return byEvent;
}
