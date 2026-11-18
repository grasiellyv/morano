import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step")
    .eq("id", user.id)
    .single();

  // On DB error or missing profile, do not default to step 0 — redirect to /inicio
  // so a transient error never drops a completed user back into the wizard.
  if (error ?? !profile) {
    redirect("/inicio");
  }

  if (profile.onboarding_completed) {
    redirect("/inicio");
  }

  const step = profile.onboarding_step ?? 0;

  if (step === 0) redirect("/onboarding/residencia");
  if (step === 1) redirect("/onboarding/comodos");
  if (step === 2) redirect("/onboarding/rotina");
  if (step >= 3) redirect("/onboarding/revisao");
  redirect("/onboarding/residencia");
}
