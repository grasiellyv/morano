import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
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
  const selectedDate =
    dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : currentDate;

  extendWindowForHome(home.id, home.timezone).catch(() => {});
  await markMissedOccurrences(supabase, home.id, currentDate).catch(() => {});

  const todayOcc = await getTodayOccurrences(supabase, home.id, selectedDate);

  return (
    <TaskList
      today={todayOcc}
      currentDate={currentDate}
      selectedDate={selectedDate}
      createTaskAction={createTask}
      rooms={home.rooms}
      weekNav={<WeekNav selectedDate={selectedDate} today={currentDate} />}
    />
  );
}
