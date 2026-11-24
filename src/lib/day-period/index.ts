import { TZDate } from "@date-fns/tz";

export type HeroPeriod = "morning" | "afternoon" | "night";

/** Manhã 5h–11h59 · Tarde 12h–17h59 · Noite 18h–4h59. */
export function periodForHour(hour: number): HeroPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
}

/** Período do dia no fuso da casa (o servidor roda em UTC). */
export function getHeroPeriod(timezone: string, now: Date = new Date()): HeroPeriod {
  return periodForHour(new TZDate(now, timezone).getHours());
}

/** "10:00:00" → "10h"; "10:30:00" → "10h30"; null → null. */
export function formatHourShort(t: string | null | undefined): string | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  if (!h) return null;
  const hour = String(Number(h));
  return m && m !== "00" ? `${hour}h${m}` : `${hour}h`;
}
