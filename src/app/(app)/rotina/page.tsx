import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { parseISO, format } from "date-fns";
import { getLocalDateString } from "@/lib/dates";
import {
  extendWindowForHome,
  createTask,
} from "@/features/tasks/actions";
import {
  markMissedOccurrences,
  getTodayOccurrences,
} from "@/features/tasks/queries";
import { TaskList } from "@/features/tasks/components/task-list";
import { WeekNav } from "@/features/tasks/components/week-nav";
import { getEventsForRange } from "@/features/events/queries";
import {
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/features/events/actions";

export const metadata: Metadata = { title: "Rotina" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);

  if (!home) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const currentDate = getLocalDateString(home.timezone);

  const params = await searchParams;
  const dateRaw = typeof params["date"] === "string" ? params["date"] : null;
  let selectedDate = currentDate;
  if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const parsed = parseISO(dateRaw);
    if (!isNaN(parsed.getTime()) && format(parsed, "yyyy-MM-dd") === dateRaw) {
      selectedDate = dateRaw;
    }
  }

  extendWindowForHome(home.id, home.timezone).catch(() => {});
  await markMissedOccurrences(supabase, home.id, currentDate).catch(() => {});

  const [todayOcc, events] = await Promise.all([
    getTodayOccurrences(supabase, home.id, selectedDate),
    getEventsForRange(supabase, home.id, selectedDate, selectedDate),
  ]);

  return (
    <TaskList
      today={todayOcc}
      currentDate={currentDate}
      selectedDate={selectedDate}
      createTaskAction={createTask}
      rooms={home.rooms}
      weekNav={<WeekNav selectedDate={selectedDate} today={currentDate} />}
      events={events}
      createEventAction={createEvent}
      updateEventAction={updateEvent}
      deleteEventAction={deleteEvent}
    />
  );
}
