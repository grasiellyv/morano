import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RoomType, RoutineLevel } from "@/features/onboarding/catalog";

export type PropertyType = "apartamento" | "casa" | "sobrado" | "studio_kitnet" | "outro";
export type OwnershipType = "proprio" | "alugado" | "outro";
export type HouseholdType = "sozinho" | "casal" | "familia" | "compartilhada" | "outro";

export type HomeWithRooms = {
  id: string;
  name: string;
  property_type: PropertyType;
  ownership_type: OwnershipType;
  household_type: HouseholdType;
  resident_count: number;
  available_minutes_per_week: number;
  routine_level: RoutineLevel;
  timezone: string;
  rooms: Array<{ id: string; name: string; room_type: RoomType; position: number }>;
};

export async function getHomeWithRooms(userId: string): Promise<HomeWithRooms | null> {
  const supabase = await createClient();

  // Always read home_id server-side from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.current_home_id) return null;

  const homeId = profile.current_home_id;

  const { data: home, error: homeError } = await supabase
    .from("homes")
    .select("id, name, property_type, ownership_type, household_type, resident_count, available_minutes_per_week, routine_level, timezone")
    .eq("id", homeId)
    .single();

  if (homeError || !home) return null;

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, room_type, position")
    .eq("home_id", homeId)
    .order("position");

  if (roomsError) return null;

  // Guard nullable fields from DB
  const propertyType = (home.property_type ?? "outro") as PropertyType;
  const ownershipType = (home.ownership_type ?? "outro") as OwnershipType;
  const householdType = (home.household_type ?? "sozinho") as HouseholdType;
  const routineLevel = (home.routine_level ?? "equilibrada") as RoutineLevel;

  return {
    id: home.id,
    name: home.name,
    property_type: propertyType,
    ownership_type: ownershipType,
    household_type: householdType,
    resident_count: home.resident_count ?? 1,
    available_minutes_per_week: home.available_minutes_per_week ?? 0,
    routine_level: routineLevel,
    timezone: home.timezone,
    rooms: (rooms ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      room_type: r.room_type as RoomType,
      position: r.position,
    })),
  };
}

export async function getRoutinesCount(homeId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("routines")
    .select("id", { count: "exact", head: true })
    .eq("home_id", homeId)
    .eq("is_active", true);

  if (error) return 0;
  return count ?? 0;
}
