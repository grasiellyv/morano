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
import { addShoppingItem, conflictMessage, mergedMessage } from "@/features/shopping/add-item";
import { createNotification } from "@/features/notifications/emit";

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
    mission: textField(fd, "mission") || undefined,
    priority: textField(fd, "priority") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Função atômica no banco: soma se já existe (mesma unidade), avisa se a unidade
  // difere, senão insere. Sem corrida entre membros.
  const added = await addShoppingItem(supabase, {
    homeId,
    name: parsed.data.name,
    categoryId: parsed.data.category_id,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    notes: parsed.data.notes,
    roomId: parsed.data.room_id,
    mission: parsed.data.mission,
    priority: parsed.data.priority,
  });

  if (added.result === "error") {
    return {
      status: "error",
      message: added.forbidden
        ? "Sem permissão para gerenciar compras."
        : "Erro ao adicionar item. Tente novamente.",
    };
  }
  if (added.result === "conflict") {
    return { status: "error", message: conflictMessage(added) };
  }
  if (added.result === "merged") {
    revalidatePath("/compras");
    revalidatePath("/inicio");
    return { status: "success", message: mergedMessage(added) };
  }

  revalidatePath("/compras");
  revalidatePath("/inicio");
  await trackEvent(userId, homeId, "shopping_item_added");
  if (added.result === "inserted") {
    await createNotification({
      supabase,
      homeId,
      actorId: userId,
      type: "shopping_item_added",
      entityId: added.id,
      title: "adicionou um item à lista",
      meta: parsed.data.name,
    });
  }
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

  const { data: updated, error } = await supabase
    .from("shopping_items")
    .update({ is_purchased: parsed.data.is_purchased })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id, name");

  if (error || !updated?.length) {
    return { status: "error", message: "Item não encontrado." };
  }

  revalidatePath("/compras");
  revalidatePath("/inicio");
  if (parsed.data.is_purchased) {
    await trackEvent(userId, homeId, "shopping_item_purchased");
    await createNotification({
      supabase,
      homeId,
      actorId: userId,
      type: "shopping_item_purchased",
      entityId: parsed.data.id,
      title: "concluiu uma compra",
      meta: updated[0]?.name,
    });
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
    mission: textField(fd, "mission") || undefined,
    priority: textField(fd, "priority") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: updated, error } = await supabase
    .from("shopping_items")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.category_id ?? null,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      notes: parsed.data.notes ?? null,
      mission: parsed.data.mission ?? null,
      priority: parsed.data.priority,
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

export async function finalizarCompra(_: FormState, _fd: FormData): Promise<FormState> {
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
  if (!perms.bypass && !perms.can_purchase_shopping) {
    return { status: "error", message: "Sem permissão." };
  }

  // Get purchased items to archive
  const { data: purchased } = await supabase
    .from("shopping_items")
    .select("id, name, quantity, unit, category_id")
    .eq("home_id", homeId)
    .eq("is_purchased", true);

  if (!purchased?.length) {
    return { status: "error", message: "Nenhum item marcado como comprado." };
  }

  // Record the session
  await supabase.from("shopping_sessions").insert({
    home_id: homeId,
    finished_by: userId,
    items_count: purchased.length,
    items: purchased,
  });

  // Delete purchased items
  await supabase
    .from("shopping_items")
    .delete()
    .eq("home_id", homeId)
    .eq("is_purchased", true);

  revalidatePath("/compras");
  revalidatePath("/inicio");
  await trackEvent(userId, homeId, "shopping_session_finished");
  return { status: "success", message: `Compra finalizada com ${purchased.length} iten${purchased.length !== 1 ? "s" : ""}.` };
}
