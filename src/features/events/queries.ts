import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
    .or(`end_date.is.null.and.start_date.gte.${from},end_date.gte.${from}`)
    .order("start_date", { ascending: true });

  if (error || !data) return [];

  return data;
}
