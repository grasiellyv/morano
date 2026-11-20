"use server";

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
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
} from "@/features/shopping/schemas-categories";
import { getMemberPermissions } from "@/features/members/permissions";

export async function createCategory(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = createCategorySchema.safeParse({
    name: textField(fd, "name"),
    icon: textField(fd, "icon") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.from("shopping_categories").insert({
    home_id: homeId,
    name: parsed.data.name,
    icon: parsed.data.icon,
    sort_order: 999,
  });

  if (error) {
    return { status: "error", message: "Erro ao criar categoria. Tente novamente." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Categoria criada." };
}

export async function updateCategory(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = updateCategorySchema.safeParse({
    id: textField(fd, "id"),
    name: textField(fd, "name"),
    icon: textField(fd, "icon") || undefined,
    sort_order: textField(fd, "sort_order") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { id, ...fields } = parsed.data;

  const patch: { name: string; icon: string; sort_order?: number } = {
    name: fields.name,
    icon: fields.icon,
  };
  if (fields.sort_order !== undefined) patch.sort_order = fields.sort_order;

  const { data: updated, error } = await supabase
    .from("shopping_categories")
    .update(patch)
    .eq("id", id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !updated?.length) {
    return { status: "error", message: "Categoria não encontrada." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Categoria atualizada." };
}

export async function deleteCategory(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_shopping) {
    return { status: "error", message: "Sem permissão para gerenciar compras." };
  }

  const parsed = deleteCategorySchema.safeParse({
    id: textField(fd, "id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: deleted, error } = await supabase
    .from("shopping_categories")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !deleted?.length) {
    return { status: "error", message: "Categoria não encontrada." };
  }

  revalidatePath("/compras");
  return { status: "success", message: "Categoria excluída." };
}
