import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { extendWindow } from "@/features/tasks/extend-window";
import { markMissedOccurrences } from "@/features/tasks/queries";
import { advanceRotationsIfDue, getAbsentMemberIds } from "@/features/tasks/queries-rotations";

export type CronResult = {
  /** Casas encontradas sem manutenção recente. */
  due: number;
  processed: number;
  /** Outra execução (visita ou cron paralelo) já tinha assumido a casa. */
  skipped: number;
  failed: number;
  /** Parou por falta de tempo: o resto fica para a próxima execução (as mais atrasadas vão primeiro). */
  stoppedEarly: boolean;
};

/**
 * Manutenção diária das casas que ninguém abriu há um tempo: gera as ocorrências que faltam,
 * marca as atrasadas e avança o rodízio — o mesmo que a primeira visita do dia faz, mas sem
 * depender de alguém abrir o app. Recebe o cliente administrativo (sem RLS): a segurança está
 * na rota que chama (segredo do cron).
 *
 * Cada casa é "assumida" com um update condicional em `maintenance_ran_at`, como as visitas:
 * duas execuções simultâneas nunca fazem o mesmo trabalho duas vezes.
 */
export async function runMaintenanceForDueHomes(
  admin: SupabaseClient,
  opts: { now?: Date; limit?: number; minHours?: number; budgetMs?: number; clock?: () => number } = {},
): Promise<CronResult> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 200;
  const budgetMs = opts.budgetMs ?? 45_000;
  const clock = opts.clock ?? Date.now;
  const cutoff = new Date(now.getTime() - (opts.minHours ?? 20) * 3_600_000).toISOString();
  const dueFilter = `maintenance_ran_at.is.null,maintenance_ran_at.lt.${cutoff}`;

  const { data: homes, error } = await admin
    .from("homes")
    .select("id, timezone")
    .or(dueFilter)
    .order("maintenance_ran_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;

  const result: CronResult = { due: homes?.length ?? 0, processed: 0, skipped: 0, failed: 0, stoppedEarly: false };
  const startedAt = clock();

  for (const home of homes ?? []) {
    if (clock() - startedAt >= budgetMs) {
      result.stoppedEarly = true;
      break;
    }

    const { data: claimed } = await admin
      .from("homes")
      .update({ maintenance_ran_at: now.toISOString() })
      .eq("id", home.id)
      .or(dueFilter)
      .select("id");
    if (!claimed?.length) {
      result.skipped++;
      continue;
    }

    try {
      const today = format(new TZDate(now, home.timezone), "yyyy-MM-dd");
      const absent = await getAbsentMemberIds(admin, home.id, today);
      await Promise.all([
        extendWindow(admin, home.id, home.timezone),
        markMissedOccurrences(admin, home.id, today),
      ]);
      await advanceRotationsIfDue(admin, home.id, today, absent);
      result.processed++;
    } catch {
      // A próxima visita ou o próximo cron tenta de novo.
      result.failed++;
    }
  }

  return result;
}
