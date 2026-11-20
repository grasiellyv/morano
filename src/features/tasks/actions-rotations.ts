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
import { getMemberPermissions } from "@/features/members/permissions";
import {
  createRotationSchema,
  updateRotationSchema,
  deleteRotationSchema,
  addRotationMemberSchema,
  removeRotationMemberSchema,
  reorderRotationMemberSchema,
  setTaskRotationSchema,
} from "./schemas-rotations";

async function getHomeId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.current_home_id ?? null;
}

async function checkPermissions(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, homeId: string): Promise<boolean> {
  const perms = await getMemberPermissions(supabase, userId, homeId);
  return perms.bypass || perms.can_manage_tasks;
}

export async function createRotation(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada." };
  if (!await checkPermissions(supabase, userId, homeId)) return { status: "error", message: "Sem permissão para gerenciar tarefas." };

  const parsed = createRotationSchema.safeParse({
    name: textField(fd, "name"),
    rotation_day: textField(fd, "rotation_day"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { error } = await supabase.from("task_rotations").insert({
    home_id: homeId,
    name: parsed.data.name,
    rotation_day: parsed.data.rotation_day,
  });
  if (error) return { status: "error", message: "Erro ao criar rodízio." };

  revalidatePath("/rotina");
  return { status: "success" };
}

export async function updateRotation(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada." };
  if (!await checkPermissions(supabase, userId, homeId)) return { status: "error", message: "Sem permissão para gerenciar tarefas." };

  const parsed = updateRotationSchema.safeParse({
    id: textField(fd, "id"),
    name: textField(fd, "name"),
    rotation_day: textField(fd, "rotation_day"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { data, error } = await supabase
    .from("task_rotations")
    .update({ name: parsed.data.name, rotation_day: parsed.data.rotation_day })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: "Erro ao atualizar rodízio." };
  if (!data) return { status: "error", message: "Rodízio não encontrado." };

  revalidatePath("/rotina");
  return { status: "success" };
}

export async function deleteRotation(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada." };
  if (!await checkPermissions(supabase, userId, homeId)) return { status: "error", message: "Sem permissão para gerenciar tarefas." };

  const parsed = deleteRotationSchema.safeParse({ id: textField(fd, "id") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { data, error } = await supabase
    .from("task_rotations")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: "Erro ao excluir rodízio." };
  if (!data) return { status: "error", message: "Rodízio não encontrado." };

  revalidatePath("/rotina");
  return { status: "success" };
}

export async function addRotationMember(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada." };
  if (!await checkPermissions(supabase, userId, homeId)) return { status: "error", message: "Sem permissão para gerenciar tarefas." };

  const parsed = addRotationMemberSchema.safeParse({
    rotation_id: textField(fd, "rotation_id"),
    profile_id: textField(fd, "profile_id"),
    sort_order: textField(fd, "sort_order"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { data: rotation } = await supabase
    .from("task_rotations")
    .select("id")
    .eq("id", parsed.data.rotation_id)
    .eq("home_id", homeId)
    .maybeSingle();
  if (!rotation) return { status: "error", message: "Rodízio não encontrado." };

  const { error } = await supabase.from("task_rotation_members").insert({
    rotation_id: parsed.data.rotation_id,
    profile_id: parsed.data.profile_id,
    sort_order: parsed.data.sort_order,
  });
  if (error) return { status: "error", message: "Erro ao adicionar participante." };

  revalidatePath("/rotina");
  return { status: "success" };
}

export async function removeRotationMember(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada." };
  if (!await checkPermissions(supabase, userId, homeId)) return { status: "error", message: "Sem permissão para gerenciar tarefas." };

  const parsed = removeRotationMemberSchema.safeParse({
    rotation_id: textField(fd, "rotation_id"),
    profile_id: textField(fd, "profile_id"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { error } = await supabase
    .from("task_rotation_members")
    .delete()
    .eq("rotation_id", parsed.data.rotation_id)
    .eq("profile_id", parsed.data.profile_id);
  if (error) return { status: "error", message: "Erro ao remover participante." };

  revalidatePath("/rotina");
  return { status: "success" };
}

export async function reorderRotationMember(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada." };
  if (!await checkPermissions(supabase, userId, homeId)) return { status: "error", message: "Sem permissão para gerenciar tarefas." };

  const parsed = reorderRotationMemberSchema.safeParse({
    rotation_id: textField(fd, "rotation_id"),
    profile_id: textField(fd, "profile_id"),
    sort_order: textField(fd, "sort_order"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { error } = await supabase
    .from("task_rotation_members")
    .update({ sort_order: parsed.data.sort_order })
    .eq("rotation_id", parsed.data.rotation_id)
    .eq("profile_id", parsed.data.profile_id);
  if (error) return { status: "error", message: "Erro ao reordenar participante." };

  revalidatePath("/rotina");
  return { status: "success" };
}

export async function setTaskRotation(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada." };
  if (!await checkPermissions(supabase, userId, homeId)) return { status: "error", message: "Sem permissão para gerenciar tarefas." };

  const rawRotationId = textField(fd, "rotation_id");
  const parsed = setTaskRotationSchema.safeParse({
    task_id: textField(fd, "task_id"),
    rotation_id: rawRotationId === "" ? null : rawRotationId,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  if (parsed.data.rotation_id !== null) {
    const { data: rotation } = await supabase
      .from("task_rotations")
      .select("id")
      .eq("id", parsed.data.rotation_id)
      .eq("home_id", homeId)
      .maybeSingle();
    if (!rotation) return { status: "error", message: "Rodízio não encontrado." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ rotation_id: parsed.data.rotation_id })
    .eq("id", parsed.data.task_id);
  if (error) return { status: "error", message: "Erro ao associar rodízio." };

  revalidatePath("/rotina");
  return { status: "success" };
}
