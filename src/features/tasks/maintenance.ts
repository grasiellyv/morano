import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

/**
 * Manutenção da casa (gerar ocorrências, marcar atrasadas, avançar rodízio) FORA do caminho
 * de toda visita. A função `claim_home_maintenance` decide de forma atômica quem roda, no
 * máximo uma vez a cada 15 minutos por casa:
 *  - "skip": outra visita já cuidou há pouco → a página não gasta nada além de 1 consulta;
 *  - "sync": primeira vez, ou primeira visita do dia (na data da casa) → espera terminar,
 *    porque a virada do dia muda quais tarefas estão atrasadas e de quem é a vez no rodízio;
 *  - "background": já rodou hoje → roda depois de enviar a resposta (`after`).
 */
export type MaintenanceMode = "skip" | "sync" | "background";

export type MaintenanceClaim = { claimed: boolean; previous: string | null };

const localDay = (d: Date, timezone: string) => format(new TZDate(d, timezone), "yyyy-MM-dd");

export function decideMaintenance(
  claim: MaintenanceClaim | null,
  timezone: string,
  now: Date = new Date(),
): MaintenanceMode {
  // Sem resposta da função (migration ainda não aplicada, rede): comportamento de antes, síncrono.
  if (!claim) return "sync";
  if (!claim.claimed) return "skip";
  if (!claim.previous) return "sync";
  return localDay(new Date(claim.previous), timezone) === localDay(now, timezone) ? "background" : "sync";
}

async function claimMaintenance(supabase: SupabaseClient, homeId: string): Promise<MaintenanceClaim | null> {
  try {
    const { data, error } = await supabase.rpc("claim_home_maintenance", { p_home_id: homeId });
    if (error || !data) return null;
    const row = data as { claimed?: unknown; previous?: unknown };
    return { claimed: row.claimed === true, previous: typeof row.previous === "string" ? row.previous : null };
  } catch {
    return null;
  }
}

/** Erros da manutenção nunca derrubam a página nem a resposta. */
const safely = (run: () => Promise<void>) => async () => {
  try {
    await run();
  } catch {
    // a próxima visita tenta de novo
  }
};

export async function runHomeMaintenance({
  supabase,
  homeId,
  timezone,
  run,
  now,
}: {
  supabase: SupabaseClient;
  homeId: string;
  timezone: string;
  run: () => Promise<void>;
  now?: Date;
}): Promise<void> {
  const mode = decideMaintenance(await claimMaintenance(supabase, homeId), timezone, now);
  if (mode === "skip") return;
  if (mode === "sync") return safely(run)();
  after(safely(run));
}
