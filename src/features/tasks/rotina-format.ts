import { parseISO } from "date-fns";
import type { FrequencyType, OccurrenceWithTask } from "@/features/tasks/queries";
import type { Event } from "@/features/events/queries";

/** Formatação e agrupamento puros da tela Rotina (sem acesso a banco). */

export const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const WEEKDAY_INITIAL = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
export const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;
export const MONTH_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

export const FREQUENCY_SHORT: Record<FrequencyType, string> = {
  once: "Uma vez",
  daily: "Diária",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  custom: "Recorrente",
};

/** "Segunda, 23 nov." */
export function formatDayHeading(date: string): string {
  const d = parseISO(date);
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}.`;
}

/** "sex., 20 nov." */
export function formatShortDate(date: string): string {
  const d = parseISO(date);
  return `${WEEKDAY_SHORT[d.getDay()]!.toLowerCase()}., ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}.`;
}

/** "23 – 29 de novembro" ou "30 nov. – 6 dez." quando cruza o mês. */
export function formatWeekRange(start: string, end: string): string {
  const a = parseISO(start);
  const b = parseISO(end);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} de ${MONTH_LONG[b.getMonth()]}`;
  }
  return `${a.getDate()} ${MONTH_SHORT[a.getMonth()]}. – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}.`;
}

/** "09:00:00" → "09:00"; null → null */
export function formatTime(t: string | null | undefined): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

export function firstName(name: string | null | undefined): string {
  if (!name) return "Morador";
  return name.trim().split(/\s+/)[0] ?? "Morador";
}

// ── Períodos do dia ───────────────────────────────────────────────────────────

export type DayPeriod = "manha" | "tarde" | "noite" | "livre";

export const PERIOD_ORDER: DayPeriod[] = ["manha", "tarde", "noite", "livre"];

export const PERIOD_LABEL: Record<DayPeriod, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  livre: "A qualquer hora",
};

/** Manhã 05–11h, Tarde 12–17h, Noite 18–04h; sem horário = "livre". */
export function periodOf(time: string | null | undefined): DayPeriod {
  if (!time) return "livre";
  const h = Number.parseInt(time.slice(0, 2), 10);
  if (!Number.isFinite(h)) return "livre";
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

/** Chave de ordenação dentro do dia: madrugada (00–04h) vai para o fim da noite. */
export function timeSortKey(time: string | null | undefined): string {
  if (!time) return "99:99";
  const h = Number.parseInt(time.slice(0, 2), 10);
  return h < 5 ? `${String(h + 24).padStart(2, "0")}${time.slice(2, 5)}` : time.slice(0, 5);
}

// ── Eventos na semana ─────────────────────────────────────────────────────────

type EventSpan = Pick<Event, "start_date" | "end_date">;

/** O evento acontece neste dia? (intervalo inclusivo; sem término = só o início) */
export function eventCovers(e: EventSpan, date: string): boolean {
  return e.start_date <= date && (e.end_date ?? e.start_date) >= date;
}

/**
 * Eventos por dia da semana (só dias com evento, na ordem recebida). Evento de vários
 * dias entra em cada dia que cobre dentro da semana. No dia: por horário, depois título.
 */
export function groupEventsByDay<E extends EventSpan & Pick<Event, "start_time" | "title">>(
  events: E[],
  weekDates: string[],
): Array<{ date: string; events: E[] }> {
  const days: Array<{ date: string; events: E[] }> = [];
  for (const date of weekDates) {
    const list = events
      .filter((e) => eventCovers(e, date))
      .sort(
        (a, b) =>
          timeSortKey(a.start_time).localeCompare(timeSortKey(b.start_time)) || a.title.localeCompare(b.title, "pt"),
      );
    if (list.length > 0) days.push({ date, events: list });
  }
  return days;
}

// ── Resumo da semana ──────────────────────────────────────────────────────────

export type WeekSummary = {
  planned: number;
  done: number;
  pending: number;
  future: number;
  /** Por dia (na ordem recebida): total planejado e concluído. */
  days: Array<{ date: string; total: number; done: number }>;
};

/**
 * planejadas = tudo menos puladas; concluídas = completed;
 * pendentes = não feitas até hoje (pending/missed com data ≤ hoje);
 * futuras = pending com data > hoje.
 */
export function summarizeWeek(
  occurrences: Pick<OccurrenceWithTask, "scheduled_for" | "status">[],
  weekDates: string[],
  today: string,
): WeekSummary {
  const byDay = new Map(weekDates.map((d) => [d, { date: d, total: 0, done: 0 }]));
  let planned = 0, done = 0, pending = 0, future = 0;
  for (const o of occurrences) {
    if (o.status === "skipped") continue;
    planned++;
    const day = byDay.get(o.scheduled_for);
    if (day) day.total++;
    if (o.status === "completed") {
      done++;
      if (day) day.done++;
    } else if (o.scheduled_for > today) {
      future++;
    } else {
      pending++;
    }
  }
  return { planned, done, pending, future, days: weekDates.map((d) => byDay.get(d)!) };
}

// ── Semana agrupada por categoria ─────────────────────────────────────────────

export type WeekTaskRow = {
  taskId: string;
  title: string;
  period: DayPeriod;
  dueTime: string | null;
  /** Ocorrências da tarefa na semana, por data (sem as puladas). */
  byDate: Record<string, Pick<OccurrenceWithTask, "id" | "status" | "scheduled_for" | "assigned_to">>;
  total: number;
  done: number;
};

export type WeekCategoryGroup = {
  key: string;
  name: string;
  tasks: WeekTaskRow[];
  total: number;
  done: number;
};

/**
 * Uma linha por tarefa (não por ocorrência), agrupadas por categoria (cômodo;
 * sem cômodo = "Geral"). Categorias com pendências vêm primeiro; as 100% feitas
 * vão para o fim. Dentro da categoria: por horário, depois título.
 */
export function groupWeekByCategory(
  occurrences: OccurrenceWithTask[],
  rooms: Array<{ id: string; name: string }>,
): WeekCategoryGroup[] {
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const groups = new Map<string, WeekCategoryGroup>();
  const rowsByTask = new Map<string, WeekTaskRow>();

  for (const o of occurrences) {
    if (o.status === "skipped") continue;
    const roomId = o.task.room_id;
    const key = roomId && roomName.has(roomId) ? roomId : "geral";
    let g = groups.get(key);
    if (!g) {
      g = { key, name: key === "geral" ? "Geral" : roomName.get(key)!, tasks: [], total: 0, done: 0 };
      groups.set(key, g);
    }
    let row = rowsByTask.get(o.task_id);
    if (!row) {
      row = {
        taskId: o.task_id,
        title: o.task.title,
        period: periodOf(o.task.due_time),
        dueTime: o.task.due_time ?? null,
        byDate: {},
        total: 0,
        done: 0,
      };
      rowsByTask.set(o.task_id, row);
      g.tasks.push(row);
    }
    row.byDate[o.scheduled_for] = { id: o.id, status: o.status, scheduled_for: o.scheduled_for, assigned_to: o.assigned_to };
    row.total++;
    g.total++;
    if (o.status === "completed") { row.done++; g.done++; }
  }

  const list = Array.from(groups.values());
  for (const g of list) {
    g.tasks.sort((a, b) => timeSortKey(a.dueTime).localeCompare(timeSortKey(b.dueTime)) || a.title.localeCompare(b.title, "pt"));
  }
  list.sort((a, b) => {
    const aDone = a.done === a.total, bDone = b.done === b.total;
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (a.key === "geral" || b.key === "geral") return a.key === "geral" ? 1 : -1;
    return a.name.localeCompare(b.name, "pt");
  });
  return list;
}

// ── Recorrência em linguagem natural ──────────────────────────────────────────

const WEEKDAY_LOWER = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"] as const;
const WEEKDAY_PLURAL = ["domingos", "segundas", "terças", "quartas", "quintas", "sextas", "sábados"] as const;

function joinPt(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

export type RecurrenceRule = {
  frequency_type: FrequencyType;
  interval_value: number | null;
  interval_unit: "day" | "week" | "month" | null;
  weekdays: number[] | null;
  month_day: number | null;
  start_date: string;
};

/** "Toda segunda-feira", "Às segundas e quintas", "Todo dia 15", "A cada 3 dias"… */
export function describeRecurrence(rule: RecurrenceRule | null | undefined): string {
  if (!rule) return "Só uma vez";
  const startDay = parseISO(rule.start_date).getDay();
  const days = rule.weekdays && rule.weekdays.length > 0 ? [...rule.weekdays].sort((a, b) => a - b) : [startDay];

  switch (rule.frequency_type) {
    case "once":
      return "Só uma vez";
    case "daily":
      return "Todo dia";
    case "weekly":
      if (days.length === 7) return "Todo dia";
      if (days.length === 1) {
        const d = days[0]!;
        return `${d === 0 || d === 6 ? "Todo" : "Toda"} ${WEEKDAY_LOWER[d]}`;
      }
      return `Às ${joinPt(days.map((d) => WEEKDAY_PLURAL[d]!))}`;
    case "biweekly":
      return `A cada 2 semanas, às ${joinPt(days.map((d) => WEEKDAY_PLURAL[d]!))}`;
    case "monthly": {
      const md = rule.month_day ?? parseISO(rule.start_date).getDate();
      return `Todo dia ${md} do mês`;
    }
    case "custom": {
      const n = rule.interval_value ?? 1;
      const unit = rule.interval_unit ?? "day";
      const label = unit === "day" ? (n === 1 ? "dia" : "dias") : unit === "week" ? (n === 1 ? "semana" : "semanas") : n === 1 ? "mês" : "meses";
      return n === 1 ? `Todo ${label}` : `A cada ${n} ${label}`;
    }
  }
}

/** "23 de novembro" */
export function formatLongDate(date: string): string {
  const d = parseISO(date);
  return `${d.getDate()} de ${MONTH_LONG[d.getMonth()]}`;
}
