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
  // In-memory approach: fetch pending occurrences before today and mark all but the most recent per task as missed
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
    .in("status", ["pending", "completed"])
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

/**
 * Returns occurrence counts per day for a given month.
 * Includes pending, completed, skipped (NOT missed).
 */
export async function getOccurrencesForMonth(
  supabase: SupabaseClient,
  homeId: string,
  year: number,
  month: number, // 1-12
): Promise<{ date: string; pendingCount: number; completedCount: number }[]> {
  const monthStr = String(month).padStart(2, "0");
  const firstDay = `${year}-${monthStr}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const lastDay = addDaysStr(
    `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}-01`,
    -1,
  );

  const { data, error } = await supabase
    .from("task_occurrences")
    .select("scheduled_for, status")
    .eq("home_id", homeId)
    .in("status", ["pending", "completed", "skipped"])
    .gte("scheduled_for", firstDay)
    .lte("scheduled_for", lastDay);

  if (error || !data) return [];

  const map = new Map<string, { pendingCount: number; completedCount: number }>();
  for (const row of data) {
    const date = row.scheduled_for as string;
    const status = row.status as string;
    const entry = map.get(date) ?? { pendingCount: 0, completedCount: 0 };
    if (status === "pending") entry.pendingCount++;
    else if (status === "completed") entry.completedCount++;
    map.set(date, entry);
  }

  return Array.from(map.entries()).map(([date, counts]) => ({ date, ...counts }));
}

/**
 * Returns all occurrences for a week (Sunday to Saturday).
 */
export async function getOccurrencesForWeek(
  supabase: SupabaseClient,
  homeId: string,
  weekStart: string, // "yyyy-MM-dd" Sunday
): Promise<OccurrenceWithTask[]> {
  const weekEnd = addDaysStr(weekStart, 6);

  const { data, error } = await supabase
    .from("task_occurrences")
    .select(
      "id, task_id, original_date, scheduled_for, status, completed_at, notes, task:tasks(id, title, priority, estimated_minutes, room_id, status)",
    )
    .eq("home_id", homeId)
    .gte("scheduled_for", weekStart)
    .lte("scheduled_for", weekEnd);

  if (error || !data) return [];

  return data as unknown as OccurrenceWithTask[];
}

/**
 * Returns completed, skipped, and missed occurrences, ordered by scheduled_for DESC.
 * Includes archived tasks (no filter on tasks.status).
 */
export async function getHistory(
  supabase: SupabaseClient,
  homeId: string,
  limit = 50,
): Promise<OccurrenceWithTask[]> {
  const { data, error } = await supabase
    .from("task_occurrences")
    .select(
      "id, task_id, original_date, scheduled_for, status, completed_at, notes, task:tasks(id, title, priority, estimated_minutes, room_id, status)",
    )
    .eq("home_id", homeId)
    .in("status", ["completed", "skipped", "missed"])
    .order("scheduled_for", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data as unknown as OccurrenceWithTask[];
}
