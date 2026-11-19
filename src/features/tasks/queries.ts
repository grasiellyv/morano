import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysStr } from "@/lib/dates";

export type OccurrenceWithTask = {
  id: string;
  task_id: string;
  original_date: string;
  scheduled_for: string;
  status: "pending" | "completed" | "skipped" | "missed";
  completed_at: string | null;
  notes: string | null;
  task: {
    id: string;
    title: string;
    priority: "baixa" | "media" | "alta";
    estimated_minutes: number;
    room_id: string | null;
    status: "active" | "paused" | "archived";
  };
};

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

/**
 * Marks all pending occurrences with scheduled_for < today as 'missed',
 * EXCEPT the most recent per task_id.
 * Idempotent: can be called multiple times without side effects.
 */
export async function markMissedOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
): Promise<void> {
  // Try RPC first (migration may have created this function)
  const { error: rpcError } = await supabase.rpc("mark_missed_occurrences", {
    p_home_id: homeId,
    p_today: today,
  });

  if (!rpcError) return;

  // Fall back to in-memory approach
  const { data: pendingOld } = await supabase
    .from("task_occurrences")
    .select("id, task_id, scheduled_for")
    .eq("home_id", homeId)
    .eq("status", "pending")
    .lt("scheduled_for", today);

  if (!pendingOld || pendingOld.length === 0) return;

  // Keep only the most recent per task_id
  const mostRecentByTask = new Map<string, { id: string; scheduled_for: string }>();
  for (const row of pendingOld) {
    const existing = mostRecentByTask.get(row.task_id);
    if (!existing || row.scheduled_for > existing.scheduled_for) {
      mostRecentByTask.set(row.task_id, { id: row.id, scheduled_for: row.scheduled_for });
    }
  }

  const keepIds = new Set(Array.from(mostRecentByTask.values()).map((r) => r.id));
  const missedIds = pendingOld.map((r) => r.id).filter((id) => !keepIds.has(id));

  if (missedIds.length === 0) return;

  await supabase
    .from("task_occurrences")
    .update({ status: "missed" })
    .in("id", missedIds);
}

/**
 * Returns pending occurrences for today, sorted alta→media→baixa then by title.
 * Task must be active or paused.
 */
export async function getTodayOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
): Promise<OccurrenceWithTask[]> {
  const { data, error } = await supabase
    .from("task_occurrences")
    .select(
      "id, task_id, original_date, scheduled_for, status, completed_at, notes, task:tasks(id, title, priority, estimated_minutes, room_id, status)",
    )
    .eq("home_id", homeId)
    .eq("status", "pending")
    .eq("scheduled_for", today);

  if (error || !data) return [];

  const rows = (data as unknown as OccurrenceWithTask[]).filter(
    (r) => r.task.status === "active" || r.task.status === "paused",
  );

  rows.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.task.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.task.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.task.title.localeCompare(b.task.title);
  });

  return rows;
}

/**
 * Returns pending overdue occurrences (scheduled_for < today).
 * After markMissedOccurrences, at most 1 per task.
 */
export async function getOverdueOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
): Promise<OccurrenceWithTask[]> {
  const { data, error } = await supabase
    .from("task_occurrences")
    .select(
      "id, task_id, original_date, scheduled_for, status, completed_at, notes, task:tasks(id, title, priority, estimated_minutes, room_id, status)",
    )
    .eq("home_id", homeId)
    .eq("status", "pending")
    .lt("scheduled_for", today);

  if (error || !data) return [];

  const rows = (data as unknown as OccurrenceWithTask[]).filter(
    (r) => r.task.status === "active" || r.task.status === "paused",
  );

  rows.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.task.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.task.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.task.title.localeCompare(b.task.title);
  });

  return rows;
}

/**
 * Returns pending upcoming occurrences: scheduled_for between tomorrow and today+days (inclusive).
 * Default days=7.
 */
export async function getUpcomingOccurrences(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
  days = 7,
): Promise<OccurrenceWithTask[]> {
  const tomorrow = addDaysStr(today, 1);
  const until = addDaysStr(today, days);

  const { data, error } = await supabase
    .from("task_occurrences")
    .select(
      "id, task_id, original_date, scheduled_for, status, completed_at, notes, task:tasks(id, title, priority, estimated_minutes, room_id, status)",
    )
    .eq("home_id", homeId)
    .eq("status", "pending")
    .gte("scheduled_for", tomorrow)
    .lte("scheduled_for", until);

  if (error || !data) return [];

  const rows = (data as unknown as OccurrenceWithTask[]).filter(
    (r) => r.task.status === "active" || r.task.status === "paused",
  );

  rows.sort((a, b) => {
    if (a.scheduled_for < b.scheduled_for) return -1;
    if (a.scheduled_for > b.scheduled_for) return 1;
    const pa = PRIORITY_ORDER[a.task.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.task.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.task.title.localeCompare(b.task.title);
  });

  return rows;
}
