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
} from "@/features/shopping/schemas-lists";
import { getMemberPermissions } from "@/features/members/permissions";

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

  const parsed = createListSchema.safeParse({ name: textField(fd, "name") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase
    .from("shopping_lists")
    .insert({ home_id: homeId, name: parsed.data.name });

  if (error) return { status: "error", message: "Erro ao criar lista. Tente novamente." };

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
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: updated, error } = await supabase
    .from("shopping_lists")
    .update({ name: parsed.data.name })
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

  const listId = parsed.data.list_id;

  // Verify list belongs to home
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("id", listId)
    .eq("home_id", homeId)
    .maybeSingle();

  if (!list) return { status: "error", message: "Lista não encontrada." };

  // Fetch items
  const { data: items } = await supabase
    .from("shopping_list_items")
    .select("name, category_id, quantity, unit, notes")
    .eq("list_id", listId);

  if (!items?.length) return { status: "error", message: "Lista vazia." };

  // Um a um pela função atômica: o que já está pendente é somado, nunca duplicado.
  let inserted = 0;
  let merged = 0;
  let skipped = 0;
  for (const i of items) {
    const r = await addShoppingItem(supabase, {
      homeId,
      name: i.name,
      categoryId: i.category_id,
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes,
    });
    if (r.result === "error") return { status: "error", message: "Erro ao aplicar lista. Tente novamente." };
    if (r.result === "inserted") inserted++;
    else if (r.result === "merged") merged++;
    else skipped++;
  }

  // Update last_added_at on all items in the list
  await supabase
    .from("shopping_list_items")
    .update({ last_added_at: new Date().toISOString() })
    .eq("list_id", listId);

  revalidatePath("/compras");
  revalidatePath("/inicio");
  const parts = [`${inserted} ${inserted === 1 ? "item adicionado" : "itens adicionados"}`];
  if (merged > 0) parts.push(`${merged} já ${merged === 1 ? "estava" : "estavam"} na lista (quantidade somada)`);
  if (skipped > 0) parts.push(`${skipped} com unidade diferente ${skipped === 1 ? "foi ignorado" : "foram ignorados"}`);
  return { status: "success", message: `${parts.join("; ")}.` };
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
