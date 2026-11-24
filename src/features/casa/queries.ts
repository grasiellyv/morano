import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { reorderInfo, type Activity, type ReorderInfo } from "@/features/casa/logic";
import type { HomeMember } from "@/features/members/queries";

/* ── Produtos ─────────────────────────────────────────────────────────────── */

export type RecurringProduct = {
  id: string;
  name: string;
  listName: string;
  category: { name: string; icon: string } | null;
  quantity: number;
  unit: string;
  reorderMonths: number;
  lastAddedAt: string | null;
  info: ReorderInfo;
};

/** Itens de listas salvas com reposição programada, os mais urgentes primeiro. */
export async function getRecurringProducts(
  supabase: SupabaseClient<Database>,
  homeId: string,
  today: string,
): Promise<RecurringProduct[]> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select(
      "id, name, items:shopping_list_items(id, name, quantity, unit, reorder_months, last_added_at, created_at, category:shopping_categories(name, icon))",
    )
    .eq("home_id", homeId);
  if (error || !data) return [];

  const out: RecurringProduct[] = [];
  for (const list of data) {
    const items = (list.items ?? []) as unknown as Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      reorder_months: number | null;
      last_added_at: string | null;
      created_at: string;
      category: { name: string; icon: string } | null;
    }>;
    for (const it of items) {
      if (!it.reorder_months) continue;
      out.push({
        id: it.id,
        name: it.name,
        listName: list.name,
        category: it.category,
        quantity: it.quantity,
        unit: it.unit,
        reorderMonths: it.reorder_months,
        lastAddedAt: it.last_added_at,
        info: reorderInfo(it.last_added_at ?? it.created_at, it.reorder_months, today),
      });
    }
  }
  return out.sort((a, b) => a.info.daysUntil - b.info.daysUntil || a.name.localeCompare(b.name));
}

export async function getRecentShoppingSessions(
  supabase: SupabaseClient<Database>,
  homeId: string,
  limit = 60,
): Promise<Array<{ finished_at: string; items: unknown }>> {
  const { data, error } = await supabase
    .from("shopping_sessions")
    .select("finished_at, items")
    .eq("home_id", homeId)
    .order("finished_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data;
}

/* ── Histórico ────────────────────────────────────────────────────────────── */

const PER_SOURCE = 40;

export async function getActivitySources(
  supabase: SupabaseClient<Database>,
  homeId: string,
  members: HomeMember[],
): Promise<Activity[][]> {
  const [tasks, sessions, maintenance, pets] = await Promise.all([
    supabase
      .from("task_occurrences")
      .select("id, completed_at, completed_by, assigned_to, task:tasks(title)")
      .eq("home_id", homeId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(PER_SOURCE),
    supabase
      .from("shopping_sessions")
      .select("id, finished_at, finished_by, items_count")
      .eq("home_id", homeId)
      .order("finished_at", { ascending: false })
      .limit(PER_SOURCE),
    supabase
      .from("maintenance_items")
      .select("id, title, resolved_at, created_by")
      .eq("home_id", homeId)
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(PER_SOURCE),
    supabase
      .from("pets")
      .select("id, name, created_at, created_by")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE),
  ]);

  const taskActs: Activity[] = (tasks.data ?? []).map((o) => {
    const task = o.task as unknown as { title: string } | null;
    return {
      key: `task-${o.id}`,
      kind: "task",
      at: o.completed_at as string,
      title: task?.title ?? "Tarefa",
      detail: "Tarefa concluída",
      actorId: o.completed_by ?? o.assigned_to ?? null,
    };
  });

  const shoppingActs: Activity[] = (sessions.data ?? []).map((s) => ({
    key: `shop-${s.id}`,
    kind: "shopping",
    at: s.finished_at,
    title: `Compra finalizada · ${s.items_count} ${s.items_count === 1 ? "item" : "itens"}`,
    detail: null,
    actorId: s.finished_by,
  }));

  const maintenanceActs: Activity[] = (maintenance.data ?? []).map((m) => ({
    key: `maint-${m.id}`,
    kind: "maintenance",
    at: m.resolved_at as string,
    title: m.title,
    detail: "Cuidado resolvido",
    actorId: m.created_by,
  }));

  const petActs: Activity[] = (pets.data ?? []).map((p) => ({
    key: `pet-${p.id}`,
    kind: "pet",
    at: p.created_at,
    title: `${p.name} entrou para a casa`,
    detail: "Animal adicionado",
    actorId: p.created_by,
  }));

  const memberActs: Activity[] = members.map((m) => ({
    key: `member-${m.user_id}`,
    kind: "member",
    at: m.joined_at,
    title: `${m.full_name ?? "Morador"} entrou na casa`,
    detail: "Novo morador",
    actorId: null,
  }));

  return [taskActs, shoppingActs, maintenanceActs, petActs, memberActs];
}
