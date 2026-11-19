"use client";

import Link from "next/link";
import { format, parseISO, getDaysInMonth, getDay, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OccurrenceWithTask } from "@/features/tasks/queries";

type MonthDay = { date: string; pendingCount: number; completedCount: number };

type Props = {
  year: number;
  month: number;
  monthData: MonthDay[];
  weekStart: string;
  weekData: OccurrenceWithTask[];
  today: string;
};

const SHORT_DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function prevMonthHref(year: number, month: number): string {
  if (month === 1) return `?year=${year - 1}&month=12`;
  return `?year=${year}&month=${month - 1}`;
}

function nextMonthHref(year: number, month: number): string {
  if (month === 12) return `?year=${year + 1}&month=1`;
  return `?year=${year}&month=${month + 1}`;
}

export function CalendarView({
  year,
  month,
  monthData,
  weekStart,
  weekData,
  today,
}: Props) {
  // --- Month view data ---
  const monthDataMap = new Map<string, MonthDay>(
    monthData.map((d): [string, MonthDay] => [d.date, d]),
  );

  const firstDayOfMonth = parseISO(
    `${year}-${String(month).padStart(2, "0")}-01`,
  );
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startOffset = getDay(firstDayOfMonth); // 0=Sun … 6=Sat
  const rows = Math.ceil((startOffset + daysInMonth) / 7);

  // --- Week view data ---
  const weekDataByDate = new Map<string, OccurrenceWithTask[]>();
  for (const occ of weekData) {
    const existing = weekDataByDate.get(occ.scheduled_for) ?? [];
    existing.push(occ);
    weekDataByDate.set(occ.scheduled_for, existing);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(parseISO(weekStart), i);
    const dateStr = format(d, "yyyy-MM-dd");
    return {
      dateStr,
      dayName: SHORT_DAY_NAMES[i] ?? "",
      dayNum: format(d, "d"),
      isToday: dateStr === today,
    };
  });

  const prevWeekStr = format(subDays(parseISO(weekStart), 7), "yyyy-MM-dd");
  const nextWeekStr = format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd");

  const weekLabel = (() => {
    const start = parseISO(weekStart);
    const end = addDays(start, 6);
    return `${format(start, "d")} – ${format(end, "d 'de' MMMM yyyy", { locale: ptBR })}`;
  })();

  const monthLabel = `${MONTH_NAMES[month - 1] ?? ""} ${year}`;

  return (
    <div>
      {/* Mobile: week view */}
      <div className="block md:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand">
          <Link
            href={`?week=${prevWeekStr}`}
            className="text-sage-ink px-3 py-1 text-lg leading-none"
          >
            ‹
          </Link>
          <span className="text-sm font-medium text-graphite">{weekLabel}</span>
          <Link
            href={`?week=${nextWeekStr}`}
            className="text-sage-ink px-3 py-1 text-lg leading-none"
          >
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 divide-x divide-sand">
          {weekDays.map(({ dateStr, dayName, dayNum, isToday }) => {
            const occs = weekDataByDate.get(dateStr) ?? [];
            return (
              <div key={dateStr} className="min-h-[120px] flex flex-col">
                <div
                  className={`text-center py-2 text-xs font-medium border-b border-sand ${
                    isToday ? "bg-sand/50" : ""
                  }`}
                >
                  <div className="text-sage-ink">{dayName}</div>
                  <div
                    className={`mt-0.5 ${
                      isToday
                        ? "font-bold text-graphite"
                        : "text-graphite/70"
                    }`}
                  >
                    {dayNum}
                  </div>
                </div>
                <div className="flex-1 p-1 space-y-0.5">
                  {occs.length === 0 ? (
                    <div className="text-xs text-sage-ink/40 text-center pt-2">–</div>
                  ) : (
                    occs.map((occ) => (
                      <div
                        key={occ.id}
                        className={`text-xs rounded px-1 py-0.5 leading-snug truncate ${
                          occ.status === "completed"
                            ? "bg-sage/20 text-sage-ink"
                            : occ.status === "skipped"
                            ? "bg-sand text-sage-ink/70 line-through"
                            : "bg-sand text-graphite"
                        }`}
                        title={occ.task.title}
                      >
                        {occ.task.title}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: month view */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand">
          <Link
            href={prevMonthHref(year, month)}
            className="text-sage-ink px-3 py-1 text-lg leading-none hover:text-graphite transition-colors"
          >
            ‹
          </Link>
          <span className="text-base font-semibold text-graphite font-heading">
            {monthLabel}
          </span>
          <Link
            href={nextMonthHref(year, month)}
            className="text-sage-ink px-3 py-1 text-lg leading-none hover:text-graphite transition-colors"
          >
            ›
          </Link>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-sand">
          {SHORT_DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center py-2 text-xs font-medium text-sage-ink"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: rows * 7 }, (_, idx) => {
            const dayNum = idx - startOffset + 1;
            const isEmpty = dayNum < 1 || dayNum > daysInMonth;
            const isLastCol = idx % 7 === 6;
            const dateStr = isEmpty
              ? null
              : `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayData = dateStr ? monthDataMap.get(dateStr) : undefined;
            const isToday = dateStr === today;
            const allDone =
              !!dayData &&
              dayData.pendingCount === 0 &&
              dayData.completedCount > 0;

            return (
              <div
                key={idx}
                className={[
                  "h-20 p-2 border-b border-r border-sand",
                  isLastCol ? "border-r-0" : "",
                  isToday ? "bg-sand/40" : "",
                  isEmpty ? "bg-background/50" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {!isEmpty && (
                  <>
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday ? "text-caramel font-bold" : "text-graphite"
                      }`}
                    >
                      {dayNum}
                    </div>
                    {dayData && (
                      <div>
                        {allDone ? (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-sage"
                            title="Todas concluídas"
                          />
                        ) : dayData.pendingCount > 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-caramel/80 text-white text-xs font-semibold">
                            {dayData.pendingCount}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
