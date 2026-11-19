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
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
} from "@/features/events/schemas";
import { getMemberPermissions } from "@/features/members/permissions";

export async function createEvent(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const createEventPerms = await getMemberPermissions(supabase, userId, homeId);
  if (!createEventPerms.bypass && !createEventPerms.can_manage_events) {
    return { status: "error", message: "Sem permissão para gerenciar eventos." };
  }

  const parsed = createEventSchema.safeParse({
    title: textField(fd, "title"),
    event_type: textField(fd, "event_type") || undefined,
    start_date: textField(fd, "start_date"),
    end_date: textField(fd, "end_date") || undefined,
    start_time: textField(fd, "start_time") || undefined,
    end_time: textField(fd, "end_time") || undefined,
    description: textField(fd, "description") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.from("events").insert({
    home_id: homeId,
    title: parsed.data.title,
    event_type: parsed.data.event_type,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    description: parsed.data.description,
  });

  if (error) {
    return { status: "error", message: "Erro ao criar evento. Tente novamente." };
  }

  revalidatePath("/rotina");
  revalidatePath("/rotina/calendario");
  return { status: "success", message: "Evento criado." };
}

export async function updateEvent(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const updateEventPerms = await getMemberPermissions(supabase, userId, homeId);
  if (!updateEventPerms.bypass && !updateEventPerms.can_manage_events) {
    return { status: "error", message: "Sem permissão para gerenciar eventos." };
  }

  const parsed = updateEventSchema.safeParse({
    id: textField(fd, "id"),
    title: textField(fd, "title"),
    event_type: textField(fd, "event_type") || undefined,
    start_date: textField(fd, "start_date"),
    end_date: textField(fd, "end_date") || undefined,
    start_time: textField(fd, "start_time") || undefined,
    end_time: textField(fd, "end_time") || undefined,
    description: textField(fd, "description") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: updated, error } = await supabase
    .from("events")
    .update({
      title: parsed.data.title,
      event_type: parsed.data.event_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      description: parsed.data.description,
    })
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !updated?.length) {
    return { status: "error", message: "Evento não encontrado." };
  }

  revalidatePath("/rotina");
  revalidatePath("/rotina/calendario");
  return { status: "success", message: "Evento atualizado." };
}

export async function deleteEvent(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const deleteEventPerms = await getMemberPermissions(supabase, userId, homeId);
  if (!deleteEventPerms.bypass && !deleteEventPerms.can_manage_events) {
    return { status: "error", message: "Sem permissão para gerenciar eventos." };
  }

  const parsed = deleteEventSchema.safeParse({
    id: textField(fd, "id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: deleted, error } = await supabase
    .from("events")
    .delete()
    .eq("id", parsed.data.id)
    .eq("home_id", homeId)
    .select("id");

  if (error || !deleted?.length) {
    return { status: "error", message: "Evento não encontrado." };
  }

  revalidatePath("/rotina");
  revalidatePath("/rotina/calendario");
  return { status: "success", message: "Evento excluído." };
}
