import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { RotinaForm } from "@/features/onboarding/components/rotina-form";

export default async function RotinaPage() {
  const { id: userId } = await requireUser();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_completed")
    .eq("id", userId)
    .single();

  // Em erro de BD, redireciona para início para não bloquear o usuário
  if (error ?? !profile) {
    redirect("/inicio");
  }

  if (profile.onboarding_completed) {
    redirect("/inicio");
  }

  const step = profile.onboarding_step ?? 0;

  if (step === 0) redirect("/onboarding/residencia");
  if (step === 1) redirect("/onboarding/comodos");
  if (step >= 3) redirect("/onboarding/revisao");

  return <RotinaForm />;
}
