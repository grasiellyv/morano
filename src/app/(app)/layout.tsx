import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { updatePresence } from "@/lib/presence";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O proxy já redireciona; aqui a sessão é verificada de novo no servidor (spec §7).
  const user = await requireUser();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_completed, last_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  // Only redirect to onboarding when we have a confirmed incomplete profile.
  // A DB error leaves the user where they are rather than dropping them into the wizard.
  if (!error && profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  void updatePresence(user.id, profile?.last_seen_at ?? null, supabase);

  return (
    <PostHogProvider userId={user.id}>
      <AppShell>{children}</AppShell>
    </PostHogProvider>
  );
}
