import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { filterCatalog } from "@/features/onboarding/catalog";
import type { RoomType, RoutineLevel } from "@/features/onboarding/catalog";
import { approveRoutine } from "@/features/onboarding/actions";
import { TaskReviewList } from "@/features/onboarding/components/task-review-list";

const VALID_ROUTINE_LEVELS = new Set<string>(["leve", "equilibrada", "detalhada"]);

function toRoutineLevel(value: string | null | undefined): RoutineLevel {
  if (value && VALID_ROUTINE_LEVELS.has(value)) {
    return value as RoutineLevel;
  }
  return "equilibrada";
}

export default async function RevisaoPage() {
  const { id: userId } = await requireUser();

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_completed, current_home_id")
    .eq("id", userId)
    .single();

  if (profileError ?? !profile) {
    redirect("/inicio");
  }

  if (profile.onboarding_completed) {
    redirect("/inicio");
  }

  const step = profile.onboarding_step ?? 0;

  // Guarda estrita: apenas step === 3 renderiza esta página
  if (step !== 3) {
    if (step === 0) redirect("/onboarding/residencia");
    if (step === 1) redirect("/onboarding/comodos");
    if (step === 2) redirect("/onboarding/rotina");
    // step >= 4 sem onboarding_completed é estado inconsistente — redireciona com segurança
    redirect("/inicio");
  }

  const homeId = profile.current_home_id;
  if (!homeId) {
    redirect("/onboarding/residencia");
  }

  // Carrega configuração da rotina da residência — erro redireciona
  const { data: home, error: homeError } = await supabase
    .from("homes")
    .select("routine_level")
    .eq("id", homeId)
    .single();

  if (homeError ?? !home) {
    redirect("/inicio");
  }

  const routineLevel = toRoutineLevel(home.routine_level);

  // Carrega tipos de cômodos cadastrados — erro redireciona
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("room_type")
    .eq("home_id", homeId);

  if (roomsError) {
    redirect("/inicio");
  }

  const roomTypes: RoomType[] = (rooms ?? [])
    .map((r) => r.room_type as RoomType)
    .filter((rt): rt is RoomType => typeof rt === "string" && rt.length > 0);

  const suggested = filterCatalog(roomTypes, routineLevel);

  return (
    <TaskReviewList tasks={suggested} formAction={approveRoutine} />
  );
}
