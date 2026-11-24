import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { updatePresence } from "@/lib/presence";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { LoadingScreen } from "@/components/loading/loading-screen";
import { redirect } from "next/navigation";

/**
 * A verificação de sessão/perfil é a parte mais lenta da navegação (round-trips
 * sequenciais ao Supabase remoto em produção). Fica num Server Component à
 * parte, dentro do próprio `<Suspense>` do layout: por convenção do Next.js,
 * `loading.tsx` NUNCA envolve o layout do mesmo segmento, só `page.tsx` e
 * layouts aninhados — sem isto, essa espera não teria nenhuma tela de
 * carregamento, só o bege parado.
 */
async function AppGate({ children }: { children: React.ReactNode }) {
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

  return <PostHogProvider userId={user.id}>{children}</PostHogProvider>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<LoadingScreen area="inicio" message="Preparando tudo para você…" />}>
        <AppGate>{children}</AppGate>
      </Suspense>
    </AppShell>
  );
}
