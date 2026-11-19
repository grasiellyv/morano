import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { startOfWeek, format, parseISO, endOfMonth } from "date-fns";
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

  // Defaults: current month and current week (Sunday)
  const defaultYear = todayDate.getFullYear();
  const defaultMonth = todayDate.getMonth() + 1; // 1-12
  const sundayOfWeek = startOfWeek(todayDate, { weekStartsOn: 0 });
  const defaultWeekStart = format(sundayOfWeek, "yyyy-MM-dd");

  // Parse and validate query params
  const yearRaw =
    typeof params["year"] === "string" ? parseInt(params["year"], 10) : NaN;
  const monthRaw =
    typeof params["month"] === "string" ? parseInt(params["month"], 10) : NaN;
  const weekRaw =
    typeof params["week"] === "string" ? params["week"] : null;

  const year =
    Number.isFinite(yearRaw) && yearRaw > 2000 && yearRaw < 2100
      ? yearRaw
      : defaultYear;
  const month =
    Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12
      ? monthRaw
      : defaultMonth;
  const weekStart =
    weekRaw && /^\d{4}-\d{2}-\d{2}$/.test(weekRaw)
      ? weekRaw
      : defaultWeekStart;

  const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const [monthData, weekData, eventsData] = await Promise.all([
    getOccurrencesForMonth(supabase, home.id, year, month),
    getOccurrencesForWeek(supabase, home.id, weekStart),
    getEventsForRange(supabase, home.id, monthStart, monthEnd),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-4 py-6 md:px-6">
        <h1 className="text-xl font-semibold text-graphite mb-6 font-heading">
          Calendário
        </h1>
        <div className="bg-card rounded-xl border border-sand overflow-hidden">
          <CalendarView
            year={year}
            month={month}
            monthData={monthData}
            weekStart={weekStart}
            weekData={weekData}
            today={today}
            events={eventsData}
          />
        </div>
      </div>
    </div>
  );
}
