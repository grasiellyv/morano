import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { addDaysStr } from "@/lib/dates";

type Row = { id: string; created_at: string };

export type DayGroup<T extends Row> = { label: string; items: T[] };

/**
 * Agrupa notificações por dia no fuso informado.
 * `today` é "yyyy-MM-dd" no mesmo fuso. Grupos em ordem decrescente de data;
 * dentro de cada grupo, mantém a ordem recebida.
 */
export function groupByDay<T extends Row>(rows: T[], timezone: string, today: string): DayGroup<T>[] {
  const yesterday = addDaysStr(today, -1);
  const byDate = new Map<string, T[]>();

  for (const row of rows) {
    const dateStr = format(new TZDate(new Date(row.created_at), timezone), "yyyy-MM-dd");
    const bucket = byDate.get(dateStr);
    if (bucket) bucket.push(row);
    else byDate.set(dateStr, [row]);
  }

  return [...byDate.keys()]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((dateStr) => {
      const label =
        dateStr === today
          ? "HOJE"
          : dateStr === yesterday
            ? "ONTEM"
            : format(new Date(`${dateStr}T12:00:00`), "d 'de' MMMM", { locale: ptBR });
      return { label, items: byDate.get(dateStr)! };
    });
}
