import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { ComodosForm } from "@/features/onboarding/components/comodos-form";
import { DEFAULT_ROOMS } from "@/features/onboarding/room-defaults";
import type { PropertyType } from "@/features/onboarding/room-defaults";

const VALID_PROPERTY_TYPES = new Set<string>([
  "apartamento",
  "casa",
  "sobrado",
  "studio_kitnet",
  "outro",
]);

function toPropertyType(value: string | null | undefined): PropertyType {
  if (value && VALID_PROPERTY_TYPES.has(value)) {
    return value as PropertyType;
  }
  return "outro";
}

export default async function ComodosPage() {
  const { id: userId } = await requireUser();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_step, current_home_id")
    .eq("id", userId)
    .single();

  if (error ?? !profile) {
    redirect("/inicio");
  }

  const step = profile.onboarding_step ?? 0;

  // Redireciona se o usuário ainda não criou a residência ou já avançou
  if (step === 0) redirect("/onboarding/residencia");
  if (step === 2) redirect("/onboarding/rotina");
  if (step >= 3) redirect("/onboarding/revisao");

  // Carrega o tipo de imóvel para pré-selecionar os cômodos padrão
  const homeId = profile.current_home_id;
  let propertyType: PropertyType = "outro";

  if (homeId) {
    const { data: home } = await supabase
      .from("homes")
      .select("property_type")
      .eq("id", homeId)
      .single();

    propertyType = toPropertyType(home?.property_type);
  }

  const defaultRooms = DEFAULT_ROOMS[propertyType];

  return <ComodosForm defaultRooms={defaultRooms} />;
}
