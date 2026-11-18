import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { ResidenciaForm } from "@/features/onboarding/components/residencia-form";

export default async function ResidenciaPage() {
  const { id: userId } = await requireUser();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_step")
    .eq("id", userId)
    .single();

  // Em erro de BD, redireciona para início para não bloquear usuário
  if (error ?? !profile) {
    redirect("/inicio");
  }

  const step = profile.onboarding_step ?? 0;

  // Redireciona se o usuário já completou este passo
  if (step === 1) redirect("/onboarding/comodos");
  if (step === 2) redirect("/onboarding/rotina");
  if (step >= 3) redirect("/onboarding/revisao");

  return <ResidenciaForm />;
}
