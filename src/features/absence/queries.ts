import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AbsenceInfo = { absence_start: string; absence_end: string };
export type AbsenceRange = { start: string; end: string } | null;

export async function getMyAbsence(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AbsenceInfo | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.current_home_id) return null;
  const homeId = profile.current_home_id;

  const { data: member } = await supabase
    .from("home_members")
    .select("absence_start, absence_end")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .maybeSingle();

  if (member?.absence_start != null && member?.absence_end != null) {
    return { absence_start: member.absence_start, absence_end: member.absence_end };
  }

  return null;
}

export function filterAbsenceOccurrences<T extends { scheduled_for: string; status: string }>(
  occurrences: T[],
  range: AbsenceRange,
): T[] {
  if (range === null) return occurrences;

  return occurrences.filter(
    (occ) =>
      occ.scheduled_for < range.start ||
      occ.scheduled_for > range.end ||
      (occ.status !== "pending" && occ.status !== "missed"),
  );
}
