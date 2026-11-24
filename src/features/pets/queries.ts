import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Species } from "@/features/pets/schemas";

export type Pet = {
  id: string;
  name: string;
  species: Species;
  notes: string | null;
  created_at: string;
};

export async function getPets(supabase: SupabaseClient<Database>, homeId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, species, notes, created_at")
    .eq("home_id", homeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Pet[];
}
