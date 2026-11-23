import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { startOfISOWeek, format, parseISO, endOfMonth } from "date-fns";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import {
  getOccurrencesForMonth,
  getOccurrencesForWeek,
} from "@/features/tasks/queries";
import { getEventsForRange } from "@/features/events/queries";
import { CalendarView } from "@/features/tasks/components/calendar-view";
import Link from "next/link";

export const metadata: Metadata = { title: "Calendário" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);

  if (!home) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const today = getLocalDateString(home.timezone);
  const todayDate = parseISO(today);

  const defaultYear = todayDate.getFullYear();
  const defaultMonth = todayDate.getMonth() + 1;
  const mondayOfWeek = startOfISOWeek(todayDate);
  const defaultWeekStart = format(mondayOfWeek, "yyyy-MM-dd");

  const yearRaw = typeof params["year"] === "string" ? parseInt(params["year"], 10) : NaN;
  const monthRaw = typeof params["month"] === "string" ? parseInt(params["month"], 10) : NaN;
  const weekRaw = typeof params["week"] === "string" ? params["week"] : null;

  const year = Number.isFinite(yearRaw) && yearRaw > 2000 && yearRaw < 2100 ? yearRaw : defaultYear;
  const month = Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : defaultMonth;
  const weekStart = weekRaw && /^\d{4}-\d{2}-\d{2}$/.test(weekRaw) ? weekRaw : defaultWeekStart;

  const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const [monthData, weekData, eventsData] = await Promise.all([
    getOccurrencesForMonth(supabase, home.id, year, month),
    getOccurrencesForWeek(supabase, home.id, weekStart),
    getEventsForRange(supabase, home.id, monthStart, monthEnd),
  ]);

  return (
    <>
      {/* Page header */}
      <header className="flex items-center justify-between pb-3">
        <h1
          style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.4px", color: "var(--foreground)", lineHeight: 1.2 }}
        >
          Rotina
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/rotina/calendario"
            className="flex items-center justify-center rounded-full border border-border"
            style={{ width: 40, height: 40, background: "var(--card)", color: "var(--muted-foreground)" }}
            title="Filtrar"
            aria-label="Filtrar"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
              <circle cx="15" cy="8" r="2" />
              <circle cx="9" cy="16" r="2" />
            </svg>
          </Link>
          <Link
            href="/rotina/calendario"
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "var(--nav-active)", color: "var(--nav-active-ink)" }}
            title="Adicionar"
            aria-label="Marcar compromisso"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Segmented control — Tarefas / Calendário */}
      <div
        className="flex gap-0.5 mb-3"
        style={{ padding: 3, borderRadius: 12, background: "var(--secondary)", height: 42, boxSizing: "border-box" }}
      >
        <Link
          href="/rotina"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px]"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
          Tarefas
        </Link>
        <div
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px]"
          style={{ background: "var(--card)", boxShadow: "var(--shadow)", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}
          aria-current="page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="5" width="16" height="15" rx="3" />
            <path d="M4 10h16M9 3v4M15 3v4" />
          </svg>
          Calendário
        </div>
      </div>

      <CalendarView
        year={year}
        month={month}
        monthData={monthData}
        weekStart={weekStart}
        weekData={weekData}
        today={today}
        events={eventsData}
      />
    </>
  );
}
