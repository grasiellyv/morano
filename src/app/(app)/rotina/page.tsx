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
  getOverdueOccurrences,
  getUpcomingOccurrences,
} from "@/features/tasks/queries";
import { TaskList } from "@/features/tasks/components/task-list";

export const metadata: Metadata = { title: "Rotina" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);

  if (!home) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const currentDate = getLocalDateString(home.timezone);

  extendWindowForHome(home.id, home.timezone).catch(() => {});
  await markMissedOccurrences(supabase, home.id, currentDate).catch(() => {});

  const [todayOcc, overdueOcc, upcomingOcc] = await Promise.all([
    getTodayOccurrences(supabase, home.id, currentDate),
    getOverdueOccurrences(supabase, home.id, currentDate),
    getUpcomingOccurrences(supabase, home.id, currentDate, 7),
  ]);

  return (
    <TaskList
      today={todayOcc}
      overdue={overdueOcc}
      upcoming={upcomingOcc}
      currentDate={currentDate}
      createTaskAction={createTask}
      rooms={home.rooms}
    />
  );
}
