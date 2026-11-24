import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { InviteRecord } from "@/features/members/invite-status";

export type HomeMember = {
  user_id: string;
  role: "owner" | "admin" | "member";
  full_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  absence_start: string | null;
  absence_end: string | null;
};

export type PendingInvite = {
  id: string;
  invited_email: string;
  role: "admin" | "member";
  invited_by: string;
  expires_at: string;
  created_at: string;
};

export async function getHomeMembers(
  supabase: SupabaseClient<Database>,
): Promise<HomeMember[]> {
  const { data, error } = await supabase.rpc("get_home_members");
  if (error) throw error;
  return (data ?? []) as HomeMember[];
}

export async function getPendingInvites(
  supabase: SupabaseClient<Database>,
): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from("home_invites")
    .select("id, invited_email, role, invited_by, expires_at, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PendingInvite[];
}

/**
 * Convites da casa em qualquer status (a RLS só deixa dono/admin ler). Uma consulta só:
 * `splitInvites` separa pendentes de histórico e trata o pendente vencido como expirado.
 */
export async function getHomeInvites(
  supabase: SupabaseClient<Database>,
  limit = 100,
): Promise<InviteRecord[]> {
  const { data, error } = await supabase
    .from("home_invites")
    .select("id, invited_email, role, status, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as InviteRecord[];
}

export async function getInviteByToken(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<{ home_id: string; invited_email: string; role: string; expires_at: string; status: string } | null> {
  const { data } = await supabase
    .from("home_invites")
    .select("home_id, invited_email, role, expires_at, status")
    .eq("token", token)
    .maybeSingle();
  return data;
}
