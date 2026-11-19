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
  addItemSchema,
  editItemSchema,
  togglePurchasedSchema,
  deleteItemSchema,
} from "@/features/shopping/schemas";

export async function addItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const parsed = addItemSchema.safeParse({
    name: textField(fd, "name"),
    category: textField(fd, "category") || undefined,
    quantity: textField(fd, "quantity") || undefined,
    unit: textField(fd, "unit") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.from("shopping_items").insert({
    home_id: homeId,
    name: parsed.data.name,
    category: parsed.data.category,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    is_purchased: false,
  });

  if (error) {
    return { status: "error", message: "Erro ao adicionar item. Tente novamente." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Item adicionado." };
}

export async function togglePurchased(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const parsed = togglePurchasedSchema.safeParse({
    id: textField(fd, "id"),
    is_purchased: textField(fd, "is_purchased"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Verify item belongs to this home (RLS handles this, but we also confirm homeId)
  // Finding 5: select("id") detects 0-row matches that return error:null
  const { data: updated, error } = await supabase
    .from("shopping_items")
    .update({ is_purchased: parsed.data.is_purchased })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !updated?.length) {
    return { status: "error", message: "Item não encontrado." };
  }

  revalidatePath("/compras");
  return { status: "success" };
}

export async function editItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const parsed = editItemSchema.safeParse({
    id: textField(fd, "id"),
    name: textField(fd, "name"),
    category: textField(fd, "category"),
    quantity: textField(fd, "quantity"),
    unit: textField(fd, "unit"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Finding 5: select("id") detects 0-row matches that return error:null
  const { data: updated, error } = await supabase
    .from("shopping_items")
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
    })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !updated?.length) {
    return { status: "error", message: "Item não encontrado." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Item atualizado." };
}

export async function deleteItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const parsed = deleteItemSchema.safeParse({
    id: textField(fd, "id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Finding 5: select("id") detects 0-row matches that return error:null
  const { data: deleted, error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !deleted?.length) {
    return { status: "error", message: "Item não encontrado." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Item excluído." };
}
