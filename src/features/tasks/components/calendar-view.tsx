"use client";

import Link from "next/link";
import { format, parseISO, getDaysInMonth, startOfISOWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import type { Event } from "@/features/events/queries";

type MonthDay = { date: string; pendingCount: number; completedCount: number };

type Props = {
  year: number;
  month: number;
  monthData: MonthDay[];
  weekStart: string;
  weekData: OccurrenceWithTask[];
  today: string;
  events?: Event[];
};

const DAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

function prevMonthHref(year: number, month: number): string {
  if (month === 1) return `?year=${year - 1}&month=12`;
  return `?year=${year}&month=${month - 1}`;
}

function nextMonthHref(year: number, month: number): string {
  if (month === 12) return `?year=${year + 1}&month=1`;
  return `?year=${year}&month=${month + 1}`;
}

export function CalendarView({ year, month, monthData, today, events = [] }: Props) {
  const monthDataMap = new Map<string, MonthDay>(monthData.map((d) => [d.date, d]));

  // Build events by date
  const eventsByDate = new Map<string, Event[]>();
  const monthPad = String(month).padStart(2, "0");
  const daysCount = getDaysInMonth(parseISO(`${year}-${monthPad}-01`));
  for (const event of events) {
    const endDate = event.end_date ?? event.start_date;
    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${year}-${monthPad}-${String(d).padStart(2, "0")}`;
      if (dateStr >= event.start_date && dateStr <= endDate) {
        const existing = eventsByDate.get(dateStr) ?? [];
        existing.push(event);
        eventsByDate.set(dateStr, existing);
      }
    }
  }

  // ISO week starts on Monday; compute leading empty cells
  const firstDayOfMonth = parseISO(`${year}-${monthPad}-01`);
  const isoWeekStart = startOfISOWeek(firstDayOfMonth);
  const startOffset = Math.round(
    (firstDayOfMonth.getTime() - isoWeekStart.getTime()) / 86400000
  ); // 0=Mon … 6=Sun

  const totalCells = startOffset + daysCount;
  const rows = Math.ceil(totalCells / 7);

  const monthLabel = `${MONTH_NAMES[month - 1] ?? ""} ${year}`;

  // Upcoming events (up to 3)
  const upcomingEvents = events
    .filter((e) => e.start_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 3);

  return (
    <div>
      {/* Calendar card */}
      <div
        className="rounded-2xl"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
          padding: "10px 10px 8px",
        }}
      >
        {/* Month header */}
        <div className="flex items-center gap-2 px-1" style={{ height: 36 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{monthLabel}</span>
          <Link
            href={prevMonthHref(year, month)}
            className="flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: "var(--secondary)", color: "var(--foreground)" }}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </Link>
          <Link
            href={nextMonthHref(year, month)}
            className="flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: "var(--secondary)", color: "var(--foreground)" }}
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </Link>
        </div>

        {/* Day-of-week headers (Mon–Sun) */}
        <div className="grid grid-cols-7 mt-1">
          {DAY_HEADERS.map((name) => (
            <div
              key={name}
              className="text-center"
              style={{ fontSize: 10.5, fontWeight: 500, color: "var(--muted-foreground)", height: 20 }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7" style={{ rowGap: 0 }}>
          {Array.from({ length: rows * 7 }, (_, idx) => {
            const dayNum = idx - startOffset + 1;
            const isEmpty = dayNum < 1 || dayNum > daysCount;
            const dateStr = isEmpty
              ? null
              : `${year}-${monthPad}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === today;
            const dayData = dateStr ? monthDataMap.get(dateStr) : undefined;
            const dayEvents = dateStr ? (eventsByDate.get(dateStr) ?? []) : [];
            const hasDot = !isEmpty && (dayData != null || dayEvents.length > 0);
            const dotColor = dayEvents.length > 0
              ? (dayEvents[0]!.event_type === "aniversario" ? "#C25B6E" : dayEvents[0]!.event_type === "consulta_medica" ? "#4F6D93" : "#D98A2B")
              : dayData
                ? "#D98A2B"
                : undefined;

            return (
              <div
                key={idx}
                style={{ height: 38, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 2 }}
              >
                {isEmpty ? (
                  <>
                    <span style={{ height: 26, display: "flex", alignItems: "center", fontSize: 13, color: "var(--muted-foreground)", opacity: 0.4 }}>
                      {/* padding cell */}
                    </span>
                    <span style={{ height: 5 }} />
                  </>
                ) : (
                  <Link
                    href={`/rotina?date=${dateStr}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      color: "var(--foreground)",
                    }}
                  >
                    <span
                      style={{
                        width: 26, height: 26, borderRadius: 13,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13,
                        fontWeight: (dayData || dayEvents.length > 0) ? 600 : 400,
                        background: isToday ? "var(--nav-active)" : "transparent",
                        color: isToday ? "var(--nav-active-ink)" : "var(--foreground)",
                      }}
                    >
                      {dayNum}
                    </span>
                    <span style={{ height: 5, display: "flex", alignItems: "center" }}>
                      {hasDot && (
                        <span
                          style={{
                            width: 5, height: 5, borderRadius: 3,
                            background: dotColor,
                            opacity: isToday ? 1 : 0.9,
                          }}
                        />
                      )}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center" style={{ height: 26 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Próximos compromissos</span>
          </div>
          <div className="mt-1 flex flex-col gap-1.5">
            {upcomingEvents.map((event) => {
              const d = parseISO(event.start_date);
              const dayLabel = format(d, "EEE", { locale: ptBR }).toUpperCase().slice(0, 3);
              const dayNum = format(d, "d");
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3"
                  style={{
                    height: 54,
                    padding: "0 12px 0 8px",
                    borderRadius: 14,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center shrink-0"
                    style={{ width: 42, height: 40, borderRadius: 10, background: "var(--secondary)" }}
                  >
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.4px", lineHeight: 1 }}>{dayLabel}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.15 }}>{dayNum}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }} className="truncate">{event.title}</div>
                    {event.start_time ? (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{event.start_time}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
