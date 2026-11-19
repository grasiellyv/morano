"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  type FormState,
  fieldErrorsFrom,
  textField,
} from "@/features/auth/form-state";
import { trackEvent } from "@/lib/telemetry";
import { getLocalDateString, addDaysStr } from "@/lib/dates";
import {
  generateOccurrenceDates,
  type RoutineRule,
} from "@/features/tasks/rules/recurrence";
import { createTaskSchema } from "@/features/tasks/schemas";

/**
 * Extende a janela de ocorrências para todas as rotinas ativas de uma home.
 * Swallows ALL errors — nunca re-lança; a página deve renderizar mesmo se falhar.
 */
export async function extendWindowForHome(
  homeId: string,
  homeTimezone: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    const today = getLocalDateString(homeTimezone);
    const threshold = addDaysStr(today, 28);
    const newUntil = addDaysStr(today, 56);

    // Buscar routines ativas com tasks ativas cujo generated_until está abaixo do threshold
    // Para incluir routines com generated_until null (nunca geradas), usamos um workaround:
    // null < threshold é verdadeiro no Postgres, mas o SDK precisa de uma query separada.
    const { data: routinesBelow } = await supabase
      .from("routines")
      .select("*, tasks!inner(status)")
      .eq("home_id", homeId)
      .eq("is_active", true)
      .filter("tasks.status", "eq", "active")
      .lt("generated_until", threshold);

    // Buscar routines com generated_until null (ainda não geradas)
    const { data: routinesNull } = await supabase
      .from("routines")
      .select("*, tasks!inner(status)")
      .eq("home_id", homeId)
      .eq("is_active", true)
      .filter("tasks.status", "eq", "active")
      .is("generated_until", null);

    const routines = [...(routinesBelow ?? []), ...(routinesNull ?? [])];
    if (routines.length === 0) return;

    for (const routine of routines) {
      try {
        const rule: RoutineRule = {
          frequency_type: routine.frequency_type,
          interval_value: routine.interval_value ?? null,
          interval_unit: routine.interval_unit ?? null,
          weekdays: routine.weekdays ?? null,
          month_day: routine.month_day ?? null,
          start_date: routine.start_date,
          end_date: routine.end_date ?? null,
        };

        // fromDate: um dia após generated_until, ou start_date se nunca gerado
        const fromDate = routine.generated_until
          ? addDaysStr(routine.generated_until, 1)
          : routine.start_date;

        const dates = generateOccurrenceDates(rule, fromDate, newUntil);

        if (dates.length > 0) {
          const occurrences = dates.map((d) => ({
            task_id: routine.task_id,
            home_id: homeId,
            original_date: d,
            scheduled_for: d,
            status: "pending" as const,
          }));

          await supabase
            .from("task_occurrences")
            .upsert(occurrences, { onConflict: "task_id,original_date", ignoreDuplicates: true });
        }

        await supabase
          .from("routines")
          .update({ generated_until: newUntil })
          .eq("id", routine.id);
      } catch {
        // Swallow individual routine errors — continue processing others
      }
    }
  } catch {
    // Swallow all errors — page must render even if extension fails
  }
}

export async function createTask(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  // Buscar current_home_id do perfil
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.current_home_id) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }
  const homeId = profile.current_home_id;

  // Buscar timezone da home
  const { data: home, error: homeError } = await supabase
    .from("homes")
    .select("timezone")
    .eq("id", homeId)
    .single();

  if (homeError || !home) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }
  const timezone = home.timezone;

  // Validar com createTaskSchema
  const rawWeekdays = textField(fd, "weekdays");
  const parsed = createTaskSchema.safeParse({
    title: textField(fd, "title"),
    description: textField(fd, "description") || undefined,
    priority: textField(fd, "priority"),
    estimated_minutes: textField(fd, "estimated_minutes"),
    room_id: textField(fd, "room_id") || null,
    frequency_type: textField(fd, "frequency_type"),
    interval_value: textField(fd, "interval_value") || null,
    interval_unit: textField(fd, "interval_unit") || null,
    weekdays: rawWeekdays || null,
    month_day: textField(fd, "month_day") || null,
    start_date: textField(fd, "start_date"),
    end_date: textField(fd, "end_date") || null,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Insert task (omitir created_by — sem grant)
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      home_id: homeId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      estimated_minutes: parsed.data.estimated_minutes,
      room_id: parsed.data.room_id ?? null,
      source: "manual",
      status: "active",
    })
    .select("id")
    .single();

  if (taskError || !task) {
    return { status: "error", message: "Erro ao criar tarefa. Tente novamente." };
  }

  const today = getLocalDateString(timezone);
  const until = addDaysStr(today, 56);

  // Insert routine
  const { error: routineError } = await supabase.from("routines").insert({
    task_id: task.id,
    home_id: homeId,
    frequency_type: parsed.data.frequency_type,
    interval_value: parsed.data.interval_value ?? undefined,
    interval_unit: parsed.data.interval_unit ?? undefined,
    weekdays: parsed.data.weekdays ?? undefined,
    month_day: parsed.data.month_day ?? null,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date ?? null,
    generated_until: until,
    is_active: true,
  });

  if (routineError) {
    return { status: "error", message: "Erro ao configurar recorrência. Tente novamente." };
  }

  // Gerar ocorrências
  const rule: RoutineRule = {
    frequency_type: parsed.data.frequency_type,
    interval_value: parsed.data.interval_value ?? null,
    interval_unit: parsed.data.interval_unit ?? null,
    weekdays: parsed.data.weekdays ?? null,
    month_day: parsed.data.month_day ?? null,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date ?? null,
  };

  const dates = generateOccurrenceDates(rule, parsed.data.start_date, until);

  if (dates.length > 0) {
    const occurrences = dates.map((d) => ({
      task_id: task.id,
      home_id: homeId,
      original_date: d,
      scheduled_for: d,
      status: "pending" as const,
    }));

    await supabase
      .from("task_occurrences")
      .upsert(occurrences, { onConflict: "task_id,original_date", ignoreDuplicates: true });
  }

  await trackEvent(userId, homeId, "task_created");
  revalidatePath("/rotina");
  revalidatePath("/inicio");

  return { status: "success", message: "Tarefa criada." };
}
