"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  type FormState,
  fieldErrorsFrom,
  textField,
} from "@/features/auth/form-state";
import {
  updateHomeSchema,
  addRoomSchema,
  updateRoomSchema,
  deleteRoomSchema,
} from "@/features/homes/schemas";

/** Lê current_home_id do perfil do usuário — nunca confia no cliente. */
async function getHomeId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.current_home_id) return null;
  return data.current_home_id;
}

export async function updateHome(_: FormState, formData: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();

  const parsed = updateHomeSchema.safeParse({
    name: textField(formData, "name"),
    property_type: textField(formData, "property_type"),
    ownership_type: textField(formData, "ownership_type"),
    household_type: textField(formData, "household_type"),
    resident_count: textField(formData, "resident_count"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const homeId = await getHomeId(userId);
  if (!homeId) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("homes")
    .update(parsed.data)
    .eq("id", homeId);

  if (error) {
    return { status: "error", message: "Erro ao salvar. Tente novamente." };
  }

  revalidatePath("/casa");
  revalidatePath("/casa/editar");
  return { status: "success", message: "Dados atualizados com sucesso." };
}

export async function addRoom(_: FormState, formData: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();

  const parsed = addRoomSchema.safeParse({
    name: textField(formData, "name"),
    room_type: textField(formData, "room_type"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const homeId = await getHomeId(userId);
  if (!homeId) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }

  const supabase = await createClient();

  // position = max atual + 1
  const { data: maxRow } = await supabase
    .from("rooms")
    .select("position")
    .eq("home_id", homeId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxRow?.position ?? 0) + 1;

  const { error } = await supabase.from("rooms").insert({
    home_id: homeId,
    name: parsed.data.name,
    room_type: parsed.data.room_type,
    position,
  });

  if (error) {
    return { status: "error", message: "Erro ao adicionar cômodo. Tente novamente." };
  }

  revalidatePath("/casa");
  revalidatePath("/casa/comodos");
  return { status: "success", message: "Cômodo adicionado." };
}

export async function updateRoom(_: FormState, formData: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();

  const parsed = updateRoomSchema.safeParse({
    id: textField(formData, "id"),
    name: textField(formData, "name"),
    room_type: textField(formData, "room_type"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const homeId = await getHomeId(userId);
  if (!homeId) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }

  const supabase = await createClient();
  // RLS garante que rooms.home_id pertence ao usuário; filtramos explicitamente também
  const { error } = await supabase
    .from("rooms")
    .update({ name: parsed.data.name, room_type: parsed.data.room_type })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId);

  if (error) {
    return { status: "error", message: "Erro ao atualizar cômodo. Tente novamente." };
  }

  revalidatePath("/casa");
  revalidatePath("/casa/comodos");
  return { status: "success", message: "Cômodo atualizado." };
}

export async function deleteRoom(_: FormState, formData: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();

  const parsed = deleteRoomSchema.safeParse({
    id: textField(formData, "id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const homeId = await getHomeId(userId);
  if (!homeId) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId);

  if (error) {
    return { status: "error", message: "Erro ao remover cômodo. Tente novamente." };
  }

  revalidatePath("/casa");
  revalidatePath("/casa/comodos");
  return { status: "success" };
}
