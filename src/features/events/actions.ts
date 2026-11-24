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
import { trackEvent } from "@/lib/telemetry";
import { parseEventItems, summarizeEventItemResults } from "@/features/events/event-items";
import { addEventItems } from "@/features/events/save-items";

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

  // Itens de compras são validados ANTES de gravar o evento: item inválido não deixa evento pela metade.
  const itemsParsed = parseEventItems(textField(fd, "items"));
  if (!itemsParsed.ok) return { status: "error", fieldErrors: { items: itemsParsed.message } };

  const { data: created, error } = await supabase.from("events").insert({
    home_id: homeId,
    title: parsed.data.title,
    event_type: parsed.data.event_type,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    description: parsed.data.description,
  }).select("id").single();

  if (error || !created) {
    return { status: "error", message: "Erro ao criar evento. Tente novamente." };
  }

  const itemResults = await addEventItems(supabase, {
    homeId,
    eventId: created.id,
    title: parsed.data.title,
    items: itemsParsed.items,
    canManageShopping: createEventPerms.bypass || createEventPerms.can_manage_shopping,
  });

  revalidatePath("/rotina");
  revalidatePath("/rotina/calendario");
  revalidatePath("/inicio");
  if (itemResults.length > 0) revalidatePath("/compras");
  await trackEvent(userId, homeId, "event_created");
  return { status: "success", message: summarizeEventItemResults("criado", itemResults) };
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

  const itemsParsed = parseEventItems(textField(fd, "items"));
  if (!itemsParsed.ok) return { status: "error", fieldErrors: { items: itemsParsed.message } };

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

  const itemResults = await addEventItems(supabase, {
    homeId,
    eventId: parsed.data.id,
    title: parsed.data.title,
    items: itemsParsed.items,
    canManageShopping: updateEventPerms.bypass || updateEventPerms.can_manage_shopping,
  });

  revalidatePath("/rotina");
  revalidatePath("/rotina/calendario");
  revalidatePath("/inicio");
  if (itemResults.length > 0) revalidatePath("/compras");
  return { status: "success", message: summarizeEventItemResults("atualizado", itemResults) };
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
  revalidatePath("/inicio");
  await trackEvent(userId, homeId, "event_deleted");
  return { status: "success", message: "Evento excluído." };
}
