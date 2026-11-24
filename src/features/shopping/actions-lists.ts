"use server";

import { addShoppingItem, conflictMessage } from "@/features/shopping/add-item";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  type FormState,
  fieldErrorsFrom,
  textField,
} from "@/features/auth/form-state";
import {
  createListSchema,
  updateListSchema,
  deleteListSchema,
  addListItemSchema,
  updateListItemSchema,
  deleteListItemSchema,
  applyListSchema,
  MAX_LIST_ITEMS,
} from "@/features/shopping/schemas-lists";
import { getMemberPermissions } from "@/features/members/permissions";
import { parseProductItems } from "@/features/events/event-items";
import { applyListMessage } from "@/features/shopping/list-messages";

async function getHomeId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  return profile?.current_home_id ?? null;
}

export async function createList(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = createListSchema.safeParse({
    name: textField(fd, "name"),
    mission: textField(fd, "mission") || undefined,
    category_id: textField(fd, "category_id") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Itens (ex.: escolhidos nos "mais pedidos"): validados antes de ir ao banco.
  const itemsParsed = parseProductItems(textField(fd, "items"), { max: MAX_LIST_ITEMS, noun: "lista" });
  if (!itemsParsed.ok) return { status: "error", fieldErrors: { items: itemsParsed.message } };

  // Lista + itens numa função só (atômica): nunca sobra lista vazia pela metade.
  const { error } = await supabase.rpc("create_shopping_list", {
    p_home_id: homeId,
    p_name: parsed.data.name,
    p_mission: parsed.data.mission ?? null,
    p_category_id: parsed.data.category_id ?? null,
    p_items: itemsParsed.items,
  } as never);

  if (error) {
    if (error.code === "42501") return { status: "error", message: "Sem permissão para gerenciar compras." };
    return { status: "error", message: "Erro ao criar lista. Tente novamente." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Lista criada." };
}

export async function updateList(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = updateListSchema.safeParse({
    id: textField(fd, "id"),
    name: textField(fd, "name"),
    mission: textField(fd, "mission") || undefined,
    category_id: textField(fd, "category_id") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Só mexe na missão/categoria quando o formulário as envia (vazio = limpar o vínculo).
  const changes: { name: string; mission?: string | null; category_id?: string | null } = { name: parsed.data.name };
  if (fd.has("mission")) changes.mission = parsed.data.mission ?? null;
  if (fd.has("category_id")) {
    changes.category_id = parsed.data.category_id ?? null;
    if (changes.category_id) {
      const { data: category } = await supabase
        .from("shopping_categories")
        .select("id")
        .eq("id", changes.category_id)
        .eq("home_id", homeId)
        .maybeSingle();
      if (!category) return { status: "error", fieldErrors: { category_id: "Categoria não encontrada." } };
    }
  }

  const { data: updated, error } = await supabase
    .from("shopping_lists")
    .update(changes)
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !updated?.length) {
    return { status: "error", message: "Lista não encontrada." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Lista atualizada." };
}

export async function deleteList(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = deleteListSchema.safeParse({ id: textField(fd, "id") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: deleted, error } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !deleted?.length) {
    return { status: "error", message: "Lista não encontrada." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Lista excluída." };
}

export async function addListItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = addListItemSchema.safeParse({
    list_id: textField(fd, "list_id"),
    name: textField(fd, "name"),
    category_id: textField(fd, "category_id") || undefined,
    quantity: textField(fd, "quantity") || undefined,
    unit: textField(fd, "unit") || undefined,
    notes: textField(fd, "notes") || undefined,
    reorder_months: textField(fd, "reorder_months") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Verify the list belongs to this home
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("id", parsed.data.list_id)
    .eq("home_id", homeId)
    .maybeSingle();

  if (!list) return { status: "error", message: "Lista não encontrada." };

  const { error } = await supabase.from("shopping_list_items").insert({
    list_id: parsed.data.list_id,
    name: parsed.data.name,
    category_id: parsed.data.category_id ?? null,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    notes: parsed.data.notes ?? null,
    reorder_months: parsed.data.reorder_months ?? null,
  });

  if (error) return { status: "error", message: "Erro ao adicionar item. Tente novamente." };

  revalidatePath("/compras");
  return { status: "success", message: "Item adicionado." };
}

export async function updateListItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = updateListItemSchema.safeParse({
    id: textField(fd, "id"),
    name: textField(fd, "name"),
    category_id: textField(fd, "category_id") || undefined,
    quantity: textField(fd, "quantity") || undefined,
    unit: textField(fd, "unit") || undefined,
    notes: textField(fd, "notes") || undefined,
    reorder_months: textField(fd, "reorder_months") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Verify ownership via join
  const { data: existing } = await supabase
    .from("shopping_list_items")
    .select("id, shopping_lists!inner(home_id)")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const parentList = existing?.shopping_lists as { home_id: string } | null;
  if (!existing || parentList?.home_id !== homeId) {
    return { status: "error", message: "Item não encontrado." };
  }

  const { id, ...fields } = parsed.data;
  const { error } = await supabase
    .from("shopping_list_items")
    .update({
      name: fields.name,
      category_id: fields.category_id ?? null,
      quantity: fields.quantity,
      unit: fields.unit,
      notes: fields.notes ?? null,
      reorder_months: fields.reorder_months ?? null,
    })
    .eq("id", id);

  if (error) return { status: "error", message: "Erro ao atualizar item. Tente novamente." };

  revalidatePath("/compras");
  return { status: "success", message: "Item atualizado." };
}

export async function deleteListItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = deleteListItemSchema.safeParse({ id: textField(fd, "id") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Verify ownership via join
  const { data: existing } = await supabase
    .from("shopping_list_items")
    .select("id, shopping_lists!inner(home_id)")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const parentList = existing?.shopping_lists as { home_id: string } | null;
  if (!existing || parentList?.home_id !== homeId) {
    return { status: "error", message: "Item não encontrado." };
  }

  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { status: "error", message: "Erro ao remover item. Tente novamente." };

  revalidatePath("/compras");
  return { status: "success", message: "Item removido." };
}

export async function applyList(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = applyListSchema.safeParse({ list_id: textField(fd, "list_id") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Uma ida só ao banco (antes: uma por item): a função aplica a lista inteira com
  // add_shopping_item (soma o que já está pendente, nunca duplica) e leva a missão/categoria da lista.
  const { data, error } = await supabase.rpc("apply_shopping_list", { p_list_id: parsed.data.list_id });
  if (error) {
    if (error.code === "42501") return { status: "error", message: "Sem permissão para gerenciar compras." };
    return { status: "error", message: "Erro ao aplicar lista. Tente novamente." };
  }

  const outcome = data as { result?: string; inserted?: number; merged?: number; conflict?: number } | null;
  if (outcome?.result === "not_found") return { status: "error", message: "Lista não encontrada." };
  if (outcome?.result === "empty") return { status: "error", message: "Lista vazia." };
  if (outcome?.result !== "applied") return { status: "error", message: "Erro ao aplicar lista. Tente novamente." };

  revalidatePath("/compras");
  revalidatePath("/inicio");
  return {
    status: "success",
    message: applyListMessage({
      inserted: outcome.inserted ?? 0,
      merged: outcome.merged ?? 0,
      conflict: outcome.conflict ?? 0,
    }),
  };
}

export async function reorderItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const listItemId = textField(fd, "list_item_id");
  if (!listItemId) return { status: "error", message: "Item inválido." };

  const { data: listItem } = await supabase
    .from("shopping_list_items")
    .select("id, name, category_id, quantity, unit, notes, shopping_lists!inner(home_id)")
    .eq("id", listItemId)
    .maybeSingle();

  const parentList = listItem?.shopping_lists as { home_id: string } | null;
  if (!listItem || parentList?.home_id !== homeId) {
    return { status: "error", message: "Item não encontrado." };
  }

  const added = await addShoppingItem(supabase, {
    homeId,
    name: listItem.name,
    categoryId: listItem.category_id,
    quantity: listItem.quantity,
    unit: listItem.unit,
    notes: listItem.notes,
  });
  if (added.result === "error") return { status: "error", message: "Erro ao adicionar. Tente novamente." };
  if (added.result === "conflict") return { status: "error", message: conflictMessage(added) };

  await supabase
    .from("shopping_list_items")
    .update({ last_added_at: new Date().toISOString() })
    .eq("id", listItemId);

  revalidatePath("/compras");
  revalidatePath("/inicio");
  return { status: "success", message: `${listItem.name} adicionado.` };
}
