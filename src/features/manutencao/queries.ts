import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type MaintenanceItem = {
  id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  status: "pendente" | "em_andamento" | "concluido" | "cancelado";
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  room: { name: string } | null;
};

const STATUS_ORDER: Record<MaintenanceItem["status"], number> = {
  pendente: 0,
  em_andamento: 1,
  concluido: 2,
  cancelado: 3,
};

export async function getMaintenanceItems(
  supabase: SupabaseClient<Database>,
  homeId: string,
): Promise<MaintenanceItem[]> {
  const { data, error } = await supabase
    .from("maintenance_items")
    .select(
      "id, room_id, title, description, notes, status, created_by, created_at, resolved_at, room:rooms(name)",
    )
    .eq("home_id", homeId);

  if (error || !data) return [];

  return (data as MaintenanceItem[]).sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.created_at.localeCompare(a.created_at);
  });
}
