"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { type FormState, fieldErrorsFrom, textField } from "@/features/auth/form-state";
import { addPetSchema, deletePetSchema } from "@/features/pets/schemas";
import { trackEvent } from "@/lib/telemetry";

async function getHomeId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  return profile?.current_home_id ?? null;
}

export async function addPet(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const parsed = addPetSchema.safeParse({
    name: textField(fd, "name"),
    species: textField(fd, "species"),
    notes: textField(fd, "notes") || undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { error } = await supabase.from("pets").insert({
    home_id: homeId,
    name: parsed.data.name,
    species: parsed.data.species,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { status: "error", message: "Não foi possível adicionar o animal. Tente novamente." };

  await trackEvent(userId, homeId, "pet_added");
  revalidatePath("/casa/animais");
  revalidatePath("/casa");
  return { status: "success", message: "Animal adicionado." };
}

export async function deletePet(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const parsed = deletePetSchema.safeParse({ id: textField(fd, "id") });
  if (!parsed.success) return { status: "error", message: "Animal inválido." };

  const { error } = await supabase.from("pets").delete().eq("id", parsed.data.id).eq("home_id", homeId);
  if (error) return { status: "error", message: "Não foi possível remover o animal." };

  revalidatePath("/casa/animais");
  revalidatePath("/casa");
  return { status: "success", message: "Animal removido." };
}
