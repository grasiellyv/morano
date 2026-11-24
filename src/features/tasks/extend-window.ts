import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocalDateString, addDaysStr } from "@/lib/dates";
import { generateOccurrenceDates, type RoutineRule } from "@/features/tasks/rules/recurrence";
import { applyRetroactivePolicy } from "@/features/tasks/rules/missed-policy";

/**
 * Estende a janela de ocorrências de todas as rotinas ativas da casa (até hoje + 56 dias,
 * quando falta menos de 28). Recebe o cliente já autenticado: pode rodar em segundo plano
 * (`after`), onde não dá para ler cookies. Engole TODOS os erros — nunca re-lança.
 * Quem chama garante que a casa é a do usuário (a RLS também protege as escritas).
 */
export async function extendWindow(
  supabase: SupabaseClient,
  homeId: string,
  homeTimezone: string,
): Promise<void> {
  try {
    const today = getLocalDateString(homeTimezone);
    const threshold = addDaysStr(today, 28);
    const newUntil = addDaysStr(today, 56);

    // Rotinas ativas (de tarefas ativas) que ainda não chegam ao limite: generated_until nulo
    // (nunca geradas) ou antes do limite. Uma consulta só, só as colunas usadas.
    const { data: routinesData } = await supabase
      .from("routines")
      .select(
        "id, task_id, frequency_type, interval_value, interval_unit, weekdays, month_day, start_date, end_date, generated_until, ungenerated_count, tasks!inner(status)",
      )
      .eq("home_id", homeId)
      .eq("is_active", true)
      .filter("tasks.status", "eq", "active")
      .or(`generated_until.is.null,generated_until.lt.${threshold}`);

    const routines = routinesData ?? [];
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
    // Swallow all errors — a manutenção nunca pode quebrar a página
  }
}
