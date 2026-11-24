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
import { RotinaHeader, RotinaTabs, IconButton, PlusIcon } from "@/features/tasks/components/rotina-chrome";

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
      <RotinaHeader
        actions={
          <IconButton label="Novo compromisso" href="/rotina?novo=evento" add>
            <PlusIcon />
          </IconButton>
        }
      />

      <RotinaTabs
        active="calendario"
        hrefs={{ dia: "/rotina", semana: "/rotina?view=semana", calendario: "/rotina/calendario" }}
      />

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
