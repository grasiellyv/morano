import { addMonths, format, parseISO } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { formatShortDate } from "@/features/tasks/rotina-format";

/* ── Produtos recorrentes ─────────────────────────────────────────────────── */

export type ReorderState = "atrasado" | "em_breve" | "ok";

export type ReorderInfo = {
  dueDate: string; // yyyy-MM-dd
  daysUntil: number; // negativo = atrasado
  state: ReorderState;
};

const DAY_MS = 86_400_000;
export const SOON_DAYS = 14;

/** Próxima reposição = última compra (ou criação) + N meses. `today` é yyyy-MM-dd. */
export function reorderInfo(
  base: string,
  reorderMonths: number,
  today: string,
): ReorderInfo {
  const due = format(addMonths(parseISO(base.slice(0, 10)), reorderMonths), "yyyy-MM-dd");
  const daysUntil = Math.round((parseISO(due).getTime() - parseISO(today).getTime()) / DAY_MS);
  const state: ReorderState = daysUntil < 0 ? "atrasado" : daysUntil <= SOON_DAYS ? "em_breve" : "ok";
  return { dueDate: due, daysUntil, state };
}

export function reorderLabel(info: ReorderInfo): string {
  if (info.daysUntil < 0) {
    const n = Math.abs(info.daysUntil);
    return `Atrasado há ${n} ${n === 1 ? "dia" : "dias"}`;
  }
  if (info.daysUntil === 0) return "Repor hoje";
  if (info.daysUntil === 1) return "Repor amanhã";
  return `Repor em ${info.daysUntil} dias`;
}

export function everyMonthsLabel(months: number): string {
  if (months === 1) return "todo mês";
  if (months === 12) return "todo ano";
  return `a cada ${months} meses`;
}

/** Conta quantas compras finalizadas incluíram cada produto (nome sem distinguir caixa). */
export function topProducts(
  sessions: ReadonlyArray<{ finished_at: string; items: unknown }>,
  limit = 8,
): Array<{ name: string; times: number; lastAt: string }> {
  const map = new Map<string, { name: string; times: number; lastAt: string }>();
  for (const s of sessions) {
    if (!Array.isArray(s.items)) continue;
    const seen = new Set<string>();
    for (const it of s.items as Array<{ name?: unknown }>) {
      const name = typeof it?.name === "string" ? it.name.trim() : "";
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue; // uma vez por compra
      seen.add(key);
      const cur = map.get(key);
      if (cur) {
        cur.times += 1;
        if (s.finished_at > cur.lastAt) cur.lastAt = s.finished_at;
      } else {
        map.set(key, { name, times: 1, lastAt: s.finished_at });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.times - a.times || b.lastAt.localeCompare(a.lastAt) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/* ── Histórico de atividades ──────────────────────────────────────────────── */

export type ActivityKind = "task" | "shopping" | "maintenance" | "member" | "pet";

export type Activity = {
  key: string;
  kind: ActivityKind;
  /** ISO timestamp */
  at: string;
  title: string;
  detail: string | null;
  actorId: string | null;
};

export const ACTIVITY_FILTERS = ["tudo", "tarefas", "compras", "cuidados", "casa"] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const ACTIVITY_FILTER_LABELS: Record<ActivityFilter, string> = {
  tudo: "Tudo",
  tarefas: "Tarefas",
  compras: "Compras",
  cuidados: "Cuidados",
  casa: "Casa",
};

const FILTER_KINDS: Record<ActivityFilter, ActivityKind[] | null> = {
  tudo: null,
  tarefas: ["task"],
  compras: ["shopping"],
  cuidados: ["maintenance"],
  casa: ["member", "pet"],
};

export function parseActivityFilter(raw: string | undefined): ActivityFilter {
  return (ACTIVITY_FILTERS as readonly string[]).includes(raw ?? "") ? (raw as ActivityFilter) : "tudo";
}

/** Junta as fontes, filtra por tipo, ordena da mais recente para a mais antiga. */
export function mergeActivities(
  sources: Activity[][],
  filter: ActivityFilter = "tudo",
  limit = 60,
): Activity[] {
  const kinds = FILTER_KINDS[filter];
  return sources
    .flat()
    .filter((a) => !kinds || kinds.includes(a.kind))
    .sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** yyyy-MM-dd do instante, no fuso da casa. */
export function localDay(iso: string, timezone: string): string {
  return format(new TZDate(new Date(iso), timezone), "yyyy-MM-dd");
}

export function localTime(iso: string, timezone: string): string {
  return format(new TZDate(new Date(iso), timezone), "HH:mm");
}

export function dayHeading(day: string, today: string): string {
  const diff = Math.round((parseISO(today).getTime() - parseISO(day).getTime()) / DAY_MS);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return formatShortDate(day);
}

export function groupByDay(
  items: Activity[],
  timezone: string,
): Array<{ day: string; items: Activity[] }> {
  const groups: Array<{ day: string; items: Activity[] }> = [];
  for (const a of items) {
    const day = localDay(a.at, timezone);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(a);
    else groups.push({ day, items: [a] });
  }
  return groups;
}
