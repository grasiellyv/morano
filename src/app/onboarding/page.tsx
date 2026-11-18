import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/inicio");
  }

  const step = profile?.onboarding_step ?? 0;

  if (step === 0) redirect("/onboarding/residencia");
  if (step === 1) redirect("/onboarding/comodos");
  if (step === 2) redirect("/onboarding/rotina");
  redirect("/onboarding/revisao");
}
