import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type EffectivePermissions =
  | { bypass: true }
  | {
      bypass: false;
      can_manage_tasks: boolean;
      can_complete_tasks: boolean;
      can_manage_shopping: boolean;
      can_purchase_shopping: boolean;
      can_manage_events: boolean;
      task_room_ids: string[];
      shopping_categories: string[];
    };

/**
 * Returns effective permissions for userId in homeId.
 * Owner/admin always bypass; members get their configured permissions (defaults open).
 */
export async function getMemberPermissions(
  supabase: SupabaseClient<Database>,
  userId: string,
  homeId: string,
): Promise<EffectivePermissions> {
  const { data: member } = await supabase
    .from("home_members")
    .select("role")
    .eq("home_id", homeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (member?.role === "owner" || member?.role === "admin") {
    return { bypass: true };
  }

  const [{ data: perms }, { data: taskScopes }, { data: shopScopes }] =
    await Promise.all([
      supabase
        .from("home_member_permissions")
        .select(
          "can_manage_tasks, can_complete_tasks, can_manage_shopping, can_purchase_shopping, can_manage_events",
        )
        .eq("home_id", homeId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("home_member_task_scopes")
        .select("room_id")
        .eq("home_id", homeId)
        .eq("user_id", userId),
      supabase
        .from("home_member_shopping_scopes")
        .select("category")
        .eq("home_id", homeId)
        .eq("user_id", userId),
    ]);

  return {
    bypass: false,
    can_manage_tasks: perms?.can_manage_tasks ?? true,
    can_complete_tasks: perms?.can_complete_tasks ?? true,
    can_manage_shopping: perms?.can_manage_shopping ?? true,
    can_purchase_shopping: perms?.can_purchase_shopping ?? true,
    can_manage_events: perms?.can_manage_events ?? true,
    task_room_ids: (taskScopes ?? []).map((s) => s.room_id),
    shopping_categories: (shopScopes ?? []).map((s) => s.category),
  };
}
