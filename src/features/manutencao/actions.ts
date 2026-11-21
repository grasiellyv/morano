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
  createMaintenanceSchema,
  updateMaintenanceSchema,
  updateStatusSchema,
  deleteMaintenanceSchema,
} from "@/features/manutencao/schemas";
import { trackEvent } from "@/lib/telemetry";

async function getHomeId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  return profile?.current_home_id ?? null;
}

export async function createMaintenanceItem(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const parsed = createMaintenanceSchema.safeParse({
    title: textField(fd, "title"),
    description: textField(fd, "description") || undefined,
    room_id: textField(fd, "room_id") || undefined,
    notes: textField(fd, "notes") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.from("maintenance_items").insert({
    home_id: homeId,
    created_by: userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    room_id: parsed.data.room_id ?? null,
    notes: parsed.data.notes ?? null,
  });

  if (error) {
    return { status: "error", message: "Erro ao criar item. Tente novamente." };
  }

  await trackEvent(userId, homeId, "maintenance_created");
  revalidatePath("/manutencao");
  return { status: "success", message: "Item criado." };
}

export async function updateMaintenanceItem(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const parsed = updateMaintenanceSchema.safeParse({
    id: textField(fd, "id"),
    title: textField(fd, "title"),
    description: textField(fd, "description") || undefined,
    room_id: textField(fd, "room_id") || undefined,
    notes: textField(fd, "notes") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: updated, error } = await supabase
    .from("maintenance_items")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      room_id: parsed.data.room_id ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .in("status", ["pendente", "em_andamento"])
    .select("id");

  if (error) {
    return { status: "error", message: "Item não encontrado." };
  }

  if (!updated?.length) {
    // Distinguish "wrong status" from "not found"
    const { data: exists } = await supabase
      .from("maintenance_items")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("home_id", homeId)
      .maybeSingle();
    if (exists) {
      return { status: "error", message: "Item já foi concluído ou cancelado." };
    }
    return { status: "error", message: "Item não encontrado." };
  }

  revalidatePath("/manutencao");
  return { status: "success", message: "Item atualizado." };
}

export async function updateMaintenanceStatus(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const parsed = updateStatusSchema.safeParse({
    id: textField(fd, "id"),
    status: textField(fd, "status"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const resolved_at = ["concluido", "cancelado"].includes(parsed.data.status)
    ? new Date().toISOString()
    : null;

  const { data: updated, error } = await supabase
    .from("maintenance_items")
    .update({ status: parsed.data.status, resolved_at })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .in("status", ["pendente", "em_andamento"])
    .select("id");

  if (error) {
    return { status: "error", message: "Item não encontrado." };
  }

  if (!updated?.length) {
    return { status: "error", message: "Transição de status inválida." };
  }

  if (parsed.data.status === "concluido") {
    await trackEvent(userId, homeId, "maintenance_completed");
  }
  revalidatePath("/manutencao");
  return { status: "success" };
}

export async function deleteMaintenanceItem(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const homeId = await getHomeId(supabase, userId);
  if (!homeId) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const parsed = deleteMaintenanceSchema.safeParse({
    id: textField(fd, "id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: deleted, error } = await supabase
    .from("maintenance_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !deleted?.length) {
    return { status: "error", message: "Item não encontrado." };
  }

  revalidatePath("/manutencao");
  return { status: "success", message: "Item excluído." };
}
