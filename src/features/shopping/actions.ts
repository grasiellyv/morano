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
import { getMemberPermissions } from "@/features/members/permissions";
import { trackEvent } from "@/lib/telemetry";

export async function addItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const addPerms = await getMemberPermissions(supabase, userId, homeId);
  if (!addPerms.bypass && !addPerms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = addItemSchema.safeParse({
    name: textField(fd, "name"),
    category_id: textField(fd, "category_id") || undefined,
    quantity: textField(fd, "quantity") || undefined,
    unit: textField(fd, "unit") || undefined,
    notes: textField(fd, "notes") || undefined,
    room_id: textField(fd, "room_id") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.from("shopping_items").insert({
    home_id: homeId,
    name: parsed.data.name,
    category_id: parsed.data.category_id ?? null,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    notes: parsed.data.notes ?? null,
    room_id: parsed.data.room_id ?? null,
    is_purchased: false,
  });

  if (error) {
    return { status: "error", message: "Erro ao adicionar item. Tente novamente." };
  }

  revalidatePath("/compras");
  revalidatePath("/inicio");
  await trackEvent(userId, homeId, "shopping_item_added");
  return { status: "success", message: "Item adicionado." };
}

export async function togglePurchased(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const togglePerms = await getMemberPermissions(supabase, userId, homeId);
  if (!togglePerms.bypass && !togglePerms.can_purchase_shopping) {
    return { status: "error", message: "Sem permissão para marcar itens como comprados." };
  }

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
  revalidatePath("/inicio");
  if (parsed.data.is_purchased) {
    await trackEvent(userId, homeId, "shopping_item_purchased");
  }
  return { status: "success" };
}

export async function editItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const editPerms = await getMemberPermissions(supabase, userId, homeId);
  if (!editPerms.bypass && !editPerms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = editItemSchema.safeParse({
    id: textField(fd, "id"),
    name: textField(fd, "name"),
    category_id: textField(fd, "category_id") || undefined,
    quantity: textField(fd, "quantity"),
    unit: textField(fd, "unit"),
    notes: textField(fd, "notes") || undefined,
    room_id: textField(fd, "room_id") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Finding 5: select("id") detects 0-row matches that return error:null
  const { data: updated, error } = await supabase
    .from("shopping_items")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.category_id ?? null,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !updated?.length) {
    return { status: "error", message: "Item não encontrado." };
  }

  revalidatePath("/compras");
  revalidatePath("/inicio");
  return { status: "success", message: "Item atualizado." };
}

export async function deleteItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const deletePerms = await getMemberPermissions(supabase, userId, homeId);
  if (!deletePerms.bypass && !deletePerms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

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
  revalidatePath("/inicio");
  return { status: "success", message: "Item excluído." };
}

export async function clearPurchased(_: FormState, _fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada." };
  const homeId = profile.current_home_id;

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("home_id", homeId)
    .eq("is_purchased", true);

  if (error) {
    return { status: "error", message: "Erro ao limpar itens. Tente novamente." };
  }

  revalidatePath("/compras");
  revalidatePath("/inicio");
  return { status: "success" };
}
