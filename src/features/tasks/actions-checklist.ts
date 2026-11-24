"use server";
import "server-only";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { type FormState, fieldErrorsFrom, textField } from "@/features/auth/form-state";
import { getMemberPermissions } from "@/features/members/permissions";
import {
  addChecklistItemSchema,
  removeChecklistItemSchema,
  setChecklistStateSchema,
} from "./schemas-checklist";

function revalidateRotina() {
  revalidatePath("/rotina");
  revalidatePath("/rotina/ocorrencia/[id]", "page");
  revalidatePath("/inicio");
}

async function getHomeId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("current_home_id").eq("id", userId).maybeSingle();
  return data?.current_home_id ?? null;
}

/** Adiciona uma subtarefa à tarefa (vale para todas as próximas ocorrências). */
export async function addChecklistItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_tasks) {
    return { status: "error", message: "Sem permissão para editar tarefas." };
  }

  const parsed = addChecklistItemSchema.safeParse({
    task_id: textField(fd, "task_id"),
    title: textField(fd, "title"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, home_id")
    .eq("id", parsed.data.task_id)
    .eq("home_id", homeId)
    .maybeSingle();
  if (!task) return { status: "error", message: "Tarefa não encontrada." };

  const { data: last } = await supabase
    .from("task_checklist_items")
    .select("position")
    .eq("task_id", task.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("task_checklist_items").insert({
    task_id: task.id,
    home_id: homeId,
    title: parsed.data.title,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { status: "error", message: "Não foi possível adicionar o item. Tente novamente." };

  revalidateRotina();
  return { status: "success", message: "Item adicionado." };
}

/** Remove a subtarefa da tarefa (some de todas as ocorrências, inclusive o histórico de check). */
export async function removeChecklistItem(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_tasks) {
    return { status: "error", message: "Sem permissão para editar tarefas." };
  }

  const parsed = removeChecklistItemSchema.safeParse({ item_id: textField(fd, "item_id") });
  if (!parsed.success) return { status: "error", message: "Item inválido." };

  const { error } = await supabase
    .from("task_checklist_items")
    .delete()
    .eq("id", parsed.data.item_id)
    .eq("home_id", homeId);
  if (error) return { status: "error", message: "Não foi possível remover o item. Tente novamente." };

  revalidateRotina();
  return { status: "success" };
}

/**
 * Marca uma subtarefa como feita/pulada NESTA ocorrência, ou volta para em aberto.
 * Não mexe em outras ocorrências: amanhã a checklist começa limpa.
 */
export async function setChecklistItemState(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();

  const parsed = setChecklistStateSchema.safeParse({
    occurrence_id: textField(fd, "occurrence_id"),
    item_id: textField(fd, "item_id"),
    status: textField(fd, "status"),
  });
  if (!parsed.success) return { status: "error", message: "Dados inválidos." };
  const { occurrence_id, item_id, status } = parsed.data;

  // Uma ida só ao banco: a casa vem da própria ocorrência e o item precisa ser da tarefa dela.
  // (Antes: uma consulta só para descobrir a casa e outra para gravar.)
  const { data, error } = await supabase.rpc("set_checklist_item_state", {
    p_occurrence_id: occurrence_id,
    p_item_id: item_id,
    p_status: status,
  });
  const result = (data as { result?: string } | null)?.result;
  if (error || (result !== "set" && result !== "cleared")) {
    return { status: "error", message: "Não foi possível atualizar o item." };
  }

  revalidateRotina();
  return { status: "success" };
}
