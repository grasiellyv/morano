import Link from "next/link";
import { startOfISOWeek, addWeeks, subWeeks, addDays, parseISO, format } from "date-fns";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

type Props = {
  selectedDate: string;
  today: string;
};

export function WeekNav({ selectedDate, today }: Props) {
  const selected = parseISO(selectedDate);
  const weekStart = startOfISOWeek(selected);

  const prevWeekMonday = format(startOfISOWeek(subWeeks(selected, 1)), "yyyy-MM-dd");
  const nextWeekMonday = format(startOfISOWeek(addWeeks(selected, 1)), "yyyy-MM-dd");

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayNum = format(d, "d");
    return { label: DAY_LABELS[i], dateStr, dayNum };
  });

  return (
    <nav className="mb-6" aria-label="Navegação de semana">
      <div className="flex items-center gap-1">
        <Link
          href={`?date=${prevWeekMonday}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Semana anterior"
        >
          ‹
        </Link>
        <div className="flex flex-1 justify-around">
          {days.map(({ label, dateStr, dayNum }) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            return (
              <Link
                key={dateStr}
                href={`?date=${dateStr}`}
                className={[
                  "flex flex-col items-center rounded-lg px-2 py-1.5 text-sm transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground hover:bg-muted",
                ].join(" ")}
                aria-current={isSelected ? "date" : undefined}
              >
                <span className="text-xs">{label}</span>
                <span className="font-medium">{dayNum}</span>
                {isToday ? (
                  <span
                    className="mt-0.5 h-1 w-1 rounded-full bg-current"
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
        <Link
          href={`?date=${nextWeekMonday}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Próxima semana"
        >
          ›
        </Link>
      </div>
    </nav>
  );
}
