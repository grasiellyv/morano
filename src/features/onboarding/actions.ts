"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { trackEvent } from "@/lib/telemetry";
import {
  type FormState,
  fieldErrorsFrom,
  textField,
} from "@/features/auth/form-state";
import {
  residenciaSchema,
  comodoSchema,
  rotinaSchema,
  revisaoTaskSchema,
} from "@/features/onboarding/schemas";

// ---------------------------------------------------------------------------
// Step 1 — Residência
// ---------------------------------------------------------------------------

export async function saveResidencia(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();

  const parsed = residenciaSchema.safeParse({
    name: textField(formData, "name"),
    property_type: textField(formData, "property_type"),
    ownership_type: textField(formData, "ownership_type"),
    household_type: textField(formData, "household_type"),
    resident_count: textField(formData, "resident_count"),
    timezone: textField(formData, "timezone"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();

  const { data: home, error: homeError } = await supabase
    .from("homes")
    .insert({ ...parsed.data, created_by: userId })
    .select("id")
    .single();

  if (homeError ?? !home) {
    return {
      status: "error",
      message: "Erro ao salvar residência. Tente novamente.",
    };
  }

  await supabase
    .from("profiles")
    .update({ current_home_id: home.id, onboarding_step: 1 })
    .eq("id", userId);

  redirect("/onboarding/comodos");
}

// ---------------------------------------------------------------------------
// Step 2 — Cômodos
// ---------------------------------------------------------------------------

export async function saveComodos(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();

  const homeId = profile?.current_home_id;
  if (!homeId) {
    return {
      status: "error",
      message: "Nenhuma residência encontrada. Reinicie o onboarding.",
    };
  }

  let roomsRaw: unknown;
  try {
    roomsRaw = JSON.parse(textField(formData, "rooms")) as unknown;
  } catch {
    roomsRaw = [];
  }

  const parsed = comodoSchema.safeParse({ rooms: roomsRaw });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Exclui cômodos anteriores (re-submit idempotente)
  await supabase.from("rooms").delete().eq("home_id", homeId);

  const roomsToInsert = parsed.data.rooms.map((room, position) => ({
    home_id: homeId,
    name: room.name,
    room_type: room.room_type,
    position,
  }));

  const { error: roomsError } = await supabase.from("rooms").insert(roomsToInsert);

  if (roomsError) {
    return {
      status: "error",
      message: "Erro ao salvar os cômodos. Tente novamente.",
    };
  }

  await supabase
    .from("profiles")
    .update({ onboarding_step: 2 })
    .eq("id", userId);

  redirect("/onboarding/rotina");
}

// ---------------------------------------------------------------------------
// Step 3 — Rotina
// ---------------------------------------------------------------------------

export async function saveRotina(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();

  const parsed = rotinaSchema.safeParse({
    routine_level: textField(formData, "routine_level"),
    available_minutes_per_week: textField(formData, "available_minutes_per_week"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();

  const homeId = profile?.current_home_id;
  if (!homeId) {
    return {
      status: "error",
      message: "Nenhuma residência encontrada. Reinicie o onboarding.",
    };
  }

  await supabase
    .from("homes")
    .update({
      routine_level: parsed.data.routine_level,
      available_minutes_per_week: parsed.data.available_minutes_per_week,
    })
    .eq("id", homeId);

  await supabase
    .from("profiles")
    .update({ onboarding_step: 3 })
    .eq("id", userId);

  redirect("/onboarding/revisao");
}

// ---------------------------------------------------------------------------
// Step 4 — Aprovar rotina (grava tasks + routines)
// ---------------------------------------------------------------------------

export async function approveRoutine(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();

  const supabase = await createClient();

  // Nunca confiar em home_id vindo do cliente — lê do servidor
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();

  const homeId = profile?.current_home_id;
  if (!homeId) {
    return {
      status: "error",
      message: "Nenhuma residência encontrada. Reinicie o onboarding.",
    };
  }

  const { data: home } = await supabase
    .from("homes")
    .select("timezone")
    .eq("id", homeId)
    .single();

  const homeTimezone = home?.timezone ?? "America/Sao_Paulo";

  let tasksRaw: unknown;
  try {
    tasksRaw = JSON.parse(textField(formData, "tasks")) as unknown;
  } catch {
    tasksRaw = [];
  }

  const parsed = z.array(revisaoTaskSchema).safeParse(tasksRaw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Lista de tarefas inválida. Recarregue a página e tente novamente.",
    };
  }

  const includedTasks = parsed.data.filter((t) => t.include);
  const today = format(new TZDate(new Date(), homeTimezone), "yyyy-MM-dd");
  let insertedCount = 0;

  for (const task of includedTasks) {
    const { data: insertedTask, error: taskError } = await supabase
      .from("tasks")
      .insert({
        home_id: homeId,
        title: task.title,
        estimated_minutes: task.estimated_minutes,
        priority: "media",
        source: "onboarding",
        created_by: userId,
        status: "active",
      })
      .select("id")
      .single();

    if (taskError ?? !insertedTask) continue;

    const { error: routineError } = await supabase.from("routines").insert({
      task_id: insertedTask.id,
      home_id: homeId,
      frequency_type: task.frequency_type,
      start_date: today,
      generated_until: today,
      is_active: true,
    });

    if (routineError) continue;

    insertedCount++;
  }

  if (insertedCount === 0) {
    return {
      status: "error",
      message:
        "Não foi possível salvar nenhuma tarefa. Verifique sua conexão e tente novamente.",
    };
  }

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true, onboarding_step: 4 })
    .eq("id", userId);

  await trackEvent(userId, homeId, "onboarding_completed");

  redirect("/inicio");
}
