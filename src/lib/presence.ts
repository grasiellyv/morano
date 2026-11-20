import type { createClient } from "@/lib/supabase/server";

const THROTTLE_MS = 15 * 60 * 1000;

export function shouldUpdatePresence(
  lastSeenAt: string | null,
  now: Date,
): boolean {
  if (!lastSeenAt) return true;
  return now.getTime() - new Date(lastSeenAt).getTime() >= THROTTLE_MS;
}

export async function updatePresence(
  userId: string,
  lastSeenAt: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  if (!shouldUpdatePresence(lastSeenAt, new Date())) return;
  try {
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    // Telemetria não deve quebrar fluxos principais
  }
}
