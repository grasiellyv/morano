import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCurrentMember } from "./schemas-rotations";

export type RotationMember = {
  profile_id: string;
  sort_order: number;
  name: string | null;
  avatar_url: string | null;
};

export type TaskRotation = {
  id: string;
  home_id: string;
  name: string;
  rotation_day: number;
  current_member_index: number;
  last_rotated_at: string | null;
  created_at: string;
  members: RotationMember[];
};

export type RotationInfo = {
  name: string;
  currentMemberId: string | null;
  currentMemberName: string | null;
  nextMemberName: string | null;
};

export async function getRotations(
  supabase: SupabaseClient,
  homeId: string
): Promise<TaskRotation[]> {
  const { data, error } = await supabase
    .from("task_rotations")
    .select(`
      id, home_id, name, rotation_day, current_member_index, last_rotated_at, created_at,
      task_rotation_members(profile_id, sort_order, profiles(full_name, avatar_url))
    `)
    .eq("home_id", homeId)
    .order("created_at");

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    home_id: r.home_id,
    name: r.name,
    rotation_day: r.rotation_day,
    current_member_index: r.current_member_index,
    last_rotated_at: r.last_rotated_at,
    created_at: r.created_at,
    members: (r.task_rotation_members ?? [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({
        profile_id: m.profile_id,
        sort_order: m.sort_order,
        name: m.profiles?.full_name ?? null,
        avatar_url: m.profiles?.avatar_url ?? null,
      })),
  }));
}

export async function getAbsentMemberIds(
  supabase: SupabaseClient,
  homeId: string,
  today: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("home_members")
    .select("user_id")
    .eq("home_id", homeId)
    .lte("absence_start", today)
    .gte("absence_end", today);

  if (error || !data) return new Set();
  return new Set(data.map((m: { user_id: string }) => m.user_id));
}

function mostRecentRotationDay(rotationDay: number, today: string): string {
  const d = new Date(today + "T00:00:00Z");
  let diff = d.getUTCDay() - rotationDay;
  if (diff < 0) diff += 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export async function advanceRotationsIfDue(
  supabase: SupabaseClient,
  homeId: string,
  today: string,
  absentIds: Set<string>
): Promise<void> {
  const rotations = await getRotations(supabase, homeId);

  const advancedAt = today + "T00:00:00Z";

  for (const rotation of rotations) {
    const lastRotationDate = mostRecentRotationDay(rotation.rotation_day, today);
    const isDue =
      rotation.last_rotated_at === null ||
      lastRotationDate > rotation.last_rotated_at.slice(0, 10);

    if (!isDue) continue;

    const memberCount = rotation.members.length;
    const newIndex =
      memberCount > 0
        ? (rotation.current_member_index + 1) % memberCount
        : 0;

    if (rotation.last_rotated_at === null) {
      await supabase
        .from("task_rotations")
        .update({ current_member_index: newIndex, last_rotated_at: advancedAt })
        .eq("id", rotation.id)
        .is("last_rotated_at", null);
    } else {
      await supabase
        .from("task_rotations")
        .update({ current_member_index: newIndex, last_rotated_at: advancedAt })
        .eq("id", rotation.id)
        .eq("last_rotated_at", rotation.last_rotated_at);
    }
  }
}

export function buildRotationInfoMap(
  rotations: TaskRotation[],
  absentIds: Set<string>,
  homeMemberNames?: Map<string, string | null>
): Record<string, RotationInfo> {
  const map: Record<string, RotationInfo> = {};

  for (const rotation of rotations) {
    const currentMemberId = resolveCurrentMember(
      rotation.members,
      rotation.current_member_index,
      absentIds
    );

    const currentMember = rotation.members.find(
      (m) => m.profile_id === currentMemberId
    );

    const nextMemberId = resolveCurrentMember(
      rotation.members,
      rotation.current_member_index + 1,
      absentIds
    );

    const nextMember = rotation.members.find(
      (m) => m.profile_id === nextMemberId
    );

    map[rotation.id] = {
      name: rotation.name,
      currentMemberId: currentMemberId,
      currentMemberName: (homeMemberNames?.get(currentMemberId ?? "") ?? currentMember?.name) ?? null,
      nextMemberName: (homeMemberNames?.get(nextMemberId ?? "") ?? nextMember?.name) ?? null,
    };
  }

  return map;
}
