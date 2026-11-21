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
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import {
  generateOccurrenceDates,
  type RoutineRule,
} from "@/features/tasks/rules/recurrence";
import { applyRetroactivePolicy } from "@/features/tasks/rules/missed-policy";
import {
  createTaskSchema,
  updateTaskMetaSchema,
  editTaskRuleSchema,
} from "@/features/tasks/schemas";
import { getMemberPermissions } from "@/features/members/permissions";

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
    // Verify caller owns this home
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_home_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.current_home_id !== homeId) return;

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

        const yesterday = addDaysStr(today, -1);

        // Step 1: retroactive dates (before today)
        let retroToInsert: string[] = [];
        let ungeneratedCount = 0;
        if (fromDate <= yesterday) {
          const retroDates = generateOccurrenceDates(rule, fromDate, yesterday);
          const policy = applyRetroactivePolicy(retroDates, today);
          retroToInsert = policy.toInsert;
          ungeneratedCount = policy.ungeneratedCount;
        }

        // Step 2: future dates (today onward) — no limit
        const futureDates = generateOccurrenceDates(rule, today, newUntil);

        // Merge for upsert
        const allToInsert = [...retroToInsert, ...futureDates];

        if (allToInsert.length > 0) {
          const occurrences = allToInsert.map((d) => ({
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

        // Read-then-write (not SQL increment) is intentional: concurrent sessions both
        // write the same value, so double-counting is impossible even with fire-and-forget calls.
        if (ungeneratedCount > 0) {
          await supabase
            .from("routines")
            .update({
              generated_until: newUntil,
              ungenerated_count: routine.ungenerated_count + ungeneratedCount,
            })
            .eq("id", routine.id);
        } else {
          await supabase
            .from("routines")
            .update({ generated_until: newUntil })
            .eq("id", routine.id);
        }
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
    .maybeSingle();

  if (profileError || !profile?.current_home_id) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }
  const homeId = profile.current_home_id;

  // Buscar timezone da home
  const { data: home, error: homeError } = await supabase
    .from("homes")
    .select("timezone")
    .eq("id", homeId)
    .maybeSingle();

  if (homeError || !home) {
    return { status: "error", message: "Casa não encontrada. Tente novamente." };
  }
  const timezone = home.timezone;

  const perms = await getMemberPermissions(supabase, userId, homeId);
  if (!perms.bypass && !perms.can_manage_tasks) {
    return { status: "error", message: "Sem permissão para gerenciar tarefas." };
  }

  // Validar com createTaskSchema
  const rawWeekdays = textField(fd, "weekdays");
  const parsed = createTaskSchema.safeParse({
    title: textField(fd, "title"),
    description: textField(fd, "description") || undefined,
    instructions: textField(fd, "instructions") || undefined,
    priority: textField(fd, "priority"),
    is_essential: textField(fd, "is_essential"),
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

  if (!perms.bypass && perms.task_room_ids.length > 0 && parsed.data.room_id) {
    if (!perms.task_room_ids.includes(parsed.data.room_id)) {
      return { status: "error", message: "Sem acesso a este cômodo." };
    }
  }

  // Insert task (omitir created_by — sem grant)
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      home_id: homeId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions ?? null,
      priority: parsed.data.priority,
      is_essential: parsed.data.is_essential,
      room_id: parsed.data.room_id ?? null,
      source: "manual",
      status: "active",
    })
    .select("id")
    .maybeSingle();

  if (taskError || !task) {
    return { status: "error", message: "Erro ao criar tarefa. Tente novamente." };
  }

  const today = getLocalDateString(timezone);
  const yesterday = addDaysStr(today, -1);
  const newUntil = addDaysStr(today, 56);

  // Build rule first — needed for occurrence generation before routine INSERT
  const rule: RoutineRule = {
    frequency_type: parsed.data.frequency_type,
    interval_value: parsed.data.interval_value ?? null,
    interval_unit: parsed.data.interval_unit ?? null,
    weekdays: parsed.data.weekdays ?? null,
    month_day: parsed.data.month_day ?? null,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date ?? null,
  };

  // Same split as extendWindowForHome
  let retroToInsert: string[] = [];
  let ungeneratedCount = 0;
  if (parsed.data.start_date <= yesterday) {
    const retroDates = generateOccurrenceDates(rule, parsed.data.start_date, yesterday);
    const policy = applyRetroactivePolicy(retroDates, today);
    retroToInsert = policy.toInsert;
    ungeneratedCount = policy.ungeneratedCount;
  }

  // Future portion (today to today+56)
  const futureDates = generateOccurrenceDates(rule, today, newUntil);

  const allDates = [...retroToInsert, ...futureDates];

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
    generated_until: newUntil,
    ungenerated_count: ungeneratedCount,
    is_active: true,
  });

  if (routineError) {
    return { status: "error", message: "Erro ao configurar recorrência. Tente novamente." };
  }

  if (allDates.length > 0) {
    const occurrences = allDates.map((d) => ({
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
  revalidatePath("/casa");

  return { status: "success", message: "Tarefa criada." };
}

// ---------------------------------------------------------------------------
// Operações em ocorrências
// ---------------------------------------------------------------------------

export async function completeOccurrence(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const occurrenceId = textField(fd, "occurrence_id");
  if (!occurrenceId) return { status: "error", message: "ID inválido." };

  // Fetch occurrence — RLS validates membership implicitly
  const { data: occurrence, error: fetchError } = await supabase
    .from("task_occurrences")
    .select("id, home_id, status, task_id")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (fetchError || !occurrence) {
    return { status: "error", message: "Ocorrência não encontrada." };
  }

  const perms = await getMemberPermissions(supabase, userId, occurrence.home_id);
  if (!perms.bypass && !perms.can_complete_tasks) {
    return { status: "error", message: "Sem permissão para concluir tarefas." };
  }
  if (!perms.bypass && perms.task_room_ids.length > 0) {
    const { data: task } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", occurrence.task_id)
      .maybeSingle();
    if (task?.room_id && !perms.task_room_ids.includes(task.room_id)) {
      return { status: "error", message: "Sem acesso a este cômodo." };
    }
  }

  const { error } = await supabase
    .from("task_occurrences")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: userId,
    })
    .eq("id", occurrenceId);

  if (error) {
    return { status: "error", message: "Erro ao concluir. Tente novamente." };
  }

  await trackEvent(userId, occurrence.home_id, "occurrence_completed");
  revalidatePath("/rotina");
  revalidatePath("/inicio");

  return { status: "success" };
}

export async function undoComplete(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const occurrenceId = textField(fd, "occurrence_id");
  if (!occurrenceId) return { status: "error", message: "ID inválido." };

  const { data: occurrence, error: fetchError } = await supabase
    .from("task_occurrences")
    .select("id, home_id, status, completed_at, task_id")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (fetchError || !occurrence) {
    return { status: "error", message: "Ocorrência não encontrada." };
  }

  const undoPerms = await getMemberPermissions(supabase, userId, occurrence.home_id);
  if (!undoPerms.bypass && !undoPerms.can_complete_tasks) {
    return { status: "error", message: "Sem permissão para desfazer conclusão." };
  }

  if (occurrence.status !== "completed") {
    return { status: "error", message: "Esta ocorrência não está concluída." };
  }

  // Buscar timezone da home para verificar o dia
  const { data: home, error: homeError } = await supabase
    .from("homes")
    .select("timezone")
    .eq("id", occurrence.home_id)
    .maybeSingle();

  if (homeError || !home) {
    return { status: "error", message: "Casa não encontrada." };
  }

  const homeTimezone = home.timezone;
  const today = getLocalDateString(homeTimezone);

  // Verificar se completed_at foi hoje no fuso da casa
  const completedOnDay = format(
    new TZDate(new Date(occurrence.completed_at!), homeTimezone),
    "yyyy-MM-dd",
  );

  if (completedOnDay !== today) {
    return { status: "error", message: "Só é possível desfazer no mesmo dia" };
  }

  const { error } = await supabase
    .from("task_occurrences")
    .update({
      status: "pending",
      completed_at: null,
      completed_by: null,
    })
    .eq("id", occurrenceId);

  if (error) {
    return { status: "error", message: "Erro ao desfazer. Tente novamente." };
  }

  revalidatePath("/rotina");
  revalidatePath("/inicio");
  return { status: "success" };
}

export async function skipOccurrence(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const occurrenceId = textField(fd, "occurrence_id");
  if (!occurrenceId) return { status: "error", message: "ID inválido." };

  const { data: occurrence, error: fetchError } = await supabase
    .from("task_occurrences")
    .select("id, home_id, task_id")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (fetchError || !occurrence) {
    return { status: "error", message: "Ocorrência não encontrada." };
  }

  const skipPerms = await getMemberPermissions(supabase, userId, occurrence.home_id);
  if (!skipPerms.bypass && !skipPerms.can_complete_tasks) {
    return { status: "error", message: "Sem permissão para pular tarefas." };
  }
  if (!skipPerms.bypass && skipPerms.task_room_ids.length > 0) {
    const { data: task } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", occurrence.task_id)
      .maybeSingle();
    if (task?.room_id && !skipPerms.task_room_ids.includes(task.room_id)) {
      return { status: "error", message: "Sem acesso a este cômodo." };
    }
  }

  const { error } = await supabase
    .from("task_occurrences")
    .update({ status: "skipped" })
    .eq("id", occurrenceId);

  if (error) {
    return { status: "error", message: "Erro ao pular. Tente novamente." };
  }

  revalidatePath("/rotina");
  revalidatePath("/inicio");
  return { status: "success" };
}

export async function postponeOccurrence(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const occurrenceId = textField(fd, "occurrence_id");
  const newDate = textField(fd, "new_date");

  if (!occurrenceId) return { status: "error", message: "ID inválido." };
  if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    return { status: "error", fieldErrors: { new_date: "Data inválida." } };
  }

  // Fetch occurrence
  const { data: occurrence, error: fetchError } = await supabase
    .from("task_occurrences")
    .select("id, home_id, task_id, scheduled_for, status")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (fetchError || !occurrence) {
    return { status: "error", message: "Ocorrência não encontrada." };
  }

  const postponePerms = await getMemberPermissions(supabase, userId, occurrence.home_id);
  if (!postponePerms.bypass && !postponePerms.can_complete_tasks) {
    return { status: "error", message: "Sem permissão para adiar tarefas." };
  }
  if (!postponePerms.bypass && postponePerms.task_room_ids.length > 0) {
    const { data: postponeTask } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", occurrence.task_id)
      .maybeSingle();
    if (postponeTask?.room_id && !postponePerms.task_room_ids.includes(postponeTask.room_id)) {
      return { status: "error", message: "Sem acesso a este cômodo." };
    }
  }

  // Buscar timezone para today
  const { data: home, error: homeError } = await supabase
    .from("homes")
    .select("timezone")
    .eq("id", occurrence.home_id)
    .maybeSingle();

  if (homeError || !home) {
    return { status: "error", message: "Casa não encontrada." };
  }

  const today = getLocalDateString(home.timezone);

  // new_date must be > today (future only)
  if (newDate <= today) {
    return {
      status: "error",
      fieldErrors: { new_date: "A nova data deve ser no futuro." },
    };
  }

  // new_date must be > occurrence.scheduled_for (cannot move to an earlier date)
  if (newDate <= occurrence.scheduled_for) {
    return {
      status: "error",
      message: "A nova data deve ser posterior à data original.",
    };
  }

  // Find the next pending occurrence of the same task after current scheduled_for
  const { data: nextOccurrences } = await supabase
    .from("task_occurrences")
    .select("id, scheduled_for")
    .eq("task_id", occurrence.task_id)
    .eq("status", "pending")
    .gt("scheduled_for", occurrence.scheduled_for)
    .order("scheduled_for", { ascending: true })
    .limit(1);

  const nextOccurrence = nextOccurrences?.[0] ?? null;

  // If next exists: new_date must be strictly less than next.scheduled_for
  if (nextOccurrence && newDate >= nextOccurrence.scheduled_for) {
    return {
      status: "error",
      fieldErrors: {
        new_date:
          "Não é possível adiar para depois da próxima ocorrência — evita duas na mesma data efetiva.",
      },
    };
  }

  const { error } = await supabase
    .from("task_occurrences")
    .update({ scheduled_for: newDate })
    .eq("id", occurrenceId);

  if (error) {
    return { status: "error", message: "Erro ao adiar. Tente novamente." };
  }

  revalidatePath("/rotina");
  revalidatePath("/inicio");
  return { status: "success" };
}

// ---------------------------------------------------------------------------
// Edição de tarefas
// ---------------------------------------------------------------------------

export async function updateTask(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };
  const homeId = profile.current_home_id;

  const updatePerms = await getMemberPermissions(supabase, userId, homeId);
  if (!updatePerms.bypass && !updatePerms.can_manage_tasks) {
    return { status: "error", message: "Sem permissão para gerenciar tarefas." };
  }

  const parsed = updateTaskMetaSchema.safeParse({
    id: textField(fd, "id"),
    title: textField(fd, "title"),
    description: textField(fd, "description") || undefined,
    instructions: textField(fd, "instructions") || undefined,
    priority: textField(fd, "priority"),
    is_essential: textField(fd, "is_essential"),
    room_id: textField(fd, "room_id") || null,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  if (!updatePerms.bypass && updatePerms.task_room_ids.length > 0) {
    const { data: existingTask } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (existingTask?.room_id && !updatePerms.task_room_ids.includes(existingTask.room_id)) {
      return { status: "error", message: "Sem acesso a este cômodo." };
    }
    if (parsed.data.room_id && !updatePerms.task_room_ids.includes(parsed.data.room_id)) {
      return { status: "error", message: "Sem acesso ao cômodo de destino." };
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions ?? null,
      priority: parsed.data.priority,
      is_essential: parsed.data.is_essential,
      room_id: parsed.data.room_id ?? null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { status: "error", message: "Erro ao atualizar tarefa. Tente novamente." };
  }

  revalidatePath("/rotina");
  return { status: "success", message: "Tarefa atualizada." };
}

export async function editTaskRule(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const parsed = editTaskRuleSchema.safeParse({
    id: textField(fd, "id"),
    frequency_type: textField(fd, "frequency_type"),
    interval_value: textField(fd, "interval_value") || null,
    interval_unit: textField(fd, "interval_unit") || null,
    weekdays: textField(fd, "weekdays") || null,
    month_day: textField(fd, "month_day") || null,
    start_date: textField(fd, "start_date"),
    end_date: textField(fd, "end_date") || null,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Buscar a routine para obter home_id e timezone
  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, home_id")
    .eq("task_id", parsed.data.id)
    .maybeSingle();

  if (routineError || !routine) {
    return { status: "error", message: "Rotina não encontrada." };
  }

  const rulePerms = await getMemberPermissions(supabase, userId, routine.home_id);
  if (!rulePerms.bypass && !rulePerms.can_manage_tasks) {
    return { status: "error", message: "Sem permissão para gerenciar tarefas." };
  }

  const { data: home, error: homeError } = await supabase
    .from("homes")
    .select("timezone")
    .eq("id", routine.home_id)
    .maybeSingle();

  if (homeError || !home) {
    return { status: "error", message: "Casa não encontrada." };
  }

  const homeTimezone = home.timezone;
  const today = getLocalDateString(homeTimezone);

  // Review Focus 3: delete only non-postponed pending occurrences (scheduled_for = original_date)
  // Cannot use a column-to-column filter in Supabase SDK, so: fetch + filter + delete by IDs
  const { data: pendingOccurrences } = await supabase
    .from("task_occurrences")
    .select("id, original_date, scheduled_for")
    .eq("task_id", parsed.data.id)
    .eq("status", "pending")
    .gte("original_date", today);

  if (pendingOccurrences && pendingOccurrences.length > 0) {
    const toDeleteIds = pendingOccurrences
      .filter((o) => o.scheduled_for === o.original_date)
      .map((o) => o.id);

    if (toDeleteIds.length > 0) {
      await supabase
        .from("task_occurrences")
        .delete()
        .in("id", toDeleteIds);
    }
  }

  // Reset generated_until so extendWindowForHome regenerates from today
  const yesterday = addDaysStr(today, -1);

  const { error: updateError } = await supabase
    .from("routines")
    .update({
      frequency_type: parsed.data.frequency_type,
      interval_value: parsed.data.interval_value ?? undefined,
      interval_unit: parsed.data.interval_unit ?? undefined,
      weekdays: (parsed.data.weekdays ?? []) as number[] | undefined,
      month_day: parsed.data.month_day ?? null,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date ?? null,
      generated_until: yesterday,
    })
    .eq("task_id", parsed.data.id);

  if (updateError) {
    return { status: "error", message: "Erro ao atualizar regra. Tente novamente." };
  }

  await extendWindowForHome(routine.home_id, homeTimezone);

  revalidatePath("/rotina");
  return { status: "success", message: "Regra de recorrência atualizada." };
}

export async function archiveTask(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const id = textField(fd, "id");
  if (!id) return { status: "error", message: "ID inválido." };

  const { data: archiveProfile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!archiveProfile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const archivePerms = await getMemberPermissions(supabase, userId, archiveProfile.current_home_id);
  if (!archivePerms.bypass && !archivePerms.can_manage_tasks) {
    return { status: "error", message: "Sem permissão para gerenciar tarefas." };
  }

  // Check if any occurrence has been completed for this task
  const { data: completedOccurrences, error: checkError } = await supabase
    .from("task_occurrences")
    .select("id")
    .eq("task_id", id)
    .eq("status", "completed")
    .limit(1);

  if (checkError) {
    return { status: "error", message: "Erro ao verificar histórico. Tente novamente." };
  }

  const hasHistory = (completedOccurrences?.length ?? 0) > 0;

  if (hasHistory) {
    // Preserve history — just archive the task
    const { error } = await supabase
      .from("tasks")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      return { status: "error", message: "Erro ao arquivar tarefa. Tente novamente." };
    }
  } else {
    // No history — delete entirely (cascade deletes routines and task_occurrences)
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      return { status: "error", message: "Erro ao excluir tarefa. Tente novamente." };
    }
  }

  revalidatePath("/rotina");
  revalidatePath("/inicio");
  revalidatePath("/casa");
  return { status: "success", message: "Tarefa arquivada." };
}

export async function deleteTask(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const id = textField(fd, "id");
  if (!id) return { status: "error", message: "ID inválido." };

  const { data: deleteProfile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  if (!deleteProfile?.current_home_id) return { status: "error", message: "Casa não encontrada. Tente novamente." };

  const deletePerms = await getMemberPermissions(supabase, userId, deleteProfile.current_home_id);
  if (!deletePerms.bypass && !deletePerms.can_manage_tasks) {
    return { status: "error", message: "Sem permissão para gerenciar tarefas." };
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return { status: "error", message: "Erro ao excluir tarefa. Tente novamente." };
  }

  await trackEvent(userId, deleteProfile.current_home_id, "task_deleted");
  revalidatePath("/rotina");
  revalidatePath("/inicio");
  revalidatePath("/casa");
  return { status: "success", message: "Tarefa excluída." };
}

// ---------------------------------------------------------------------------
// claimOccurrence / unclaimOccurrence
// ---------------------------------------------------------------------------

export async function claimOccurrence(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const occurrenceId = textField(fd, "occurrence_id");
  if (!occurrenceId) return { status: "error", message: "ID inválido." };

  const { data: occ } = await supabase
    .from("task_occurrences")
    .select("id, home_id, status, assigned_to")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (!occ) return { status: "error", message: "Ocorrência não encontrada." };
  if (occ.status !== "pending") return { status: "error", message: "Ocorrência não está pendente." };
  if (occ.assigned_to !== null) return { status: "error", message: "Já atribuída a outro membro." };

  const { error } = await supabase
    .from("task_occurrences")
    .update({ assigned_to: userId })
    .eq("id", occurrenceId)
    .eq("home_id", occ.home_id);

  if (error) return { status: "error", message: "Erro ao atribuir tarefa. Tente novamente." };

  revalidatePath("/rotina");
  return { status: "success", message: "" };
}

export async function unclaimOccurrence(_: FormState, fd: FormData): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const occurrenceId = textField(fd, "occurrence_id");
  if (!occurrenceId) return { status: "error", message: "ID inválido." };

  const { data: occ } = await supabase
    .from("task_occurrences")
    .select("id, home_id, status, assigned_to")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (!occ) return { status: "error", message: "Ocorrência não encontrada." };
  if (occ.assigned_to !== userId) return { status: "error", message: "Esta tarefa não está atribuída a você." };

  const { error } = await supabase
    .from("task_occurrences")
    .update({ assigned_to: null })
    .eq("id", occurrenceId)
    .eq("home_id", occ.home_id);

  if (error) return { status: "error", message: "Erro ao liberar tarefa. Tente novamente." };

  revalidatePath("/rotina");
  return { status: "success", message: "" };
}

export async function updateOccurrenceNotes(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const occurrenceId = textField(fd, "occurrence_id");
  if (!occurrenceId) return { status: "error", message: "ID inválido." };

  const notes = (textField(fd, "notes") ?? "").trim() || null;
  if (notes !== null && notes.length > 2000) {
    return { status: "error", message: "Nota muito longa (máx. 2000 caracteres)." };
  }

  const { data: occ, error: fetchError } = await supabase
    .from("task_occurrences")
    .select("id, home_id")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (fetchError || !occ) return { status: "error", message: "Ocorrência não encontrada." };

  const perms = await getMemberPermissions(supabase, userId, occ.home_id);
  if (!perms.bypass && !perms.can_complete_tasks) {
    return { status: "error", message: "Sem permissão." };
  }

  const { error } = await supabase
    .from("task_occurrences")
    .update({ notes })
    .eq("id", occurrenceId);

  if (error) return { status: "error", message: "Erro ao salvar nota." };

  revalidatePath("/rotina");
  revalidatePath("/rotina/historico");
  return { status: "success", message: "Nota salva." };
}
