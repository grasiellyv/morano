import Link from "next/link";
import { startOfISOWeek, addWeeks, subWeeks, addDays, parseISO, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

type Props = {
  selectedDate: string;
  today: string;
  taskDates?: Set<string>;
};

export function WeekNav({ selectedDate, today, taskDates }: Props) {
  const selected = parseISO(selectedDate);
  const weekStart = startOfISOWeek(selected);

  const prevWeekMonday = format(startOfISOWeek(subWeeks(selected, 1)), "yyyy-MM-dd");
  const nextWeekMonday = format(startOfISOWeek(addWeeks(selected, 1)), "yyyy-MM-dd");

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dateStr = format(d, "yyyy-MM-dd");
    return { label: DAY_LABELS[i]!, dateStr, dayNum: format(d, "d") };
  });

  return (
    <nav className="mt-3 mb-3" aria-label="Navegação de semana">
      <div className="flex items-center gap-1">
        <Link
          href={`?date=${prevWeekMonday}`}
          className="flex shrink-0 items-center justify-center rounded-full border border-border"
          style={{ width: 28, height: 28, background: "var(--card)", color: "var(--muted-foreground)" }}
          aria-label="Semana anterior"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </Link>

        <div className="flex flex-1 gap-1">
          {days.map(({ label, dateStr, dayNum }) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const hasTasks = taskDates?.has(dateStr) ?? false;
            const active = isSelected || isToday;

            return (
              <Link
                key={dateStr}
                href={`?date=${dateStr}`}
                className="flex flex-1 flex-col items-center justify-center gap-[3px] rounded-[14px]"
                style={{
                  height: 62,
                  background: active ? "var(--nav-active)" : "var(--card)",
                  color: active ? "var(--nav-active-ink)" : "var(--foreground)",
                  border: active ? "none" : "1px solid var(--border)",
                }}
                aria-current={isSelected ? "date" : undefined}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: active ? 600 : 500,
                    opacity: active ? 0.8 : 1,
                    color: active ? undefined : "var(--muted-foreground)",
                  }}
                >
                  {label}
                </span>
                <span style={{ fontSize: 17, fontWeight: 500 }}>{dayNum}</span>
                {hasTasks ? (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      background: active ? "#F2C48D" : "#D98A2B",
                    }}
                  />
                ) : (
                  <span style={{ width: 5, height: 5 }} />
                )}
              </Link>
            );
          })}
        </div>

        <Link
          href={`?date=${nextWeekMonday}`}
          className="flex shrink-0 items-center justify-center rounded-full border border-border"
          style={{ width: 28, height: 28, background: "var(--card)", color: "var(--muted-foreground)" }}
          aria-label="Próxima semana"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </Link>
      </div>
    </nav>
  );
}
