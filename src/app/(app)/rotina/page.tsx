import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeMembers } from "@/features/members/queries";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { parseISO, format } from "date-fns";
import { getLocalDateString } from "@/lib/dates";
import {
  extendWindowForHome,
  createTask,
  updateTask,
} from "@/features/tasks/actions";
import {
  markMissedOccurrences,
  getTodayOccurrences,
  getOverdueOccurrences,
  getUpcomingOccurrences,
} from "@/features/tasks/queries";
import { TaskList } from "@/features/tasks/components/task-list";
import { WeekNav } from "@/features/tasks/components/week-nav";
import { getEventsForRange } from "@/features/events/queries";
import {
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/features/events/actions";
import {
  getMyAbsence,
  filterAbsenceOccurrences,
  type AbsenceRange,
} from "@/features/absence/queries";
import { clearAbsence } from "@/features/absence/actions";
import { AbsenceBanner } from "@/features/absence/components/absence-banner";
import {
  getRotations,
  getAbsentMemberIds,
  advanceRotationsIfDue,
  buildRotationInfoMap,
} from "@/features/tasks/queries-rotations";

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
  const filterEssencial = params["filter"] === "essenciais";
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

  const absentIds = await getAbsentMemberIds(supabase, home.id, currentDate);
  await advanceRotationsIfDue(supabase, home.id, currentDate, absentIds);

  const [todayOcc, overdueOcc, upcomingOcc, events, absence, rotations, homeMembers] = await Promise.all([
    getTodayOccurrences(supabase, home.id, selectedDate),
    selectedDate === currentDate ? getOverdueOccurrences(supabase, home.id, currentDate) : Promise.resolve([]),
    selectedDate === currentDate ? getUpcomingOccurrences(supabase, home.id, currentDate) : Promise.resolve([]),
    getEventsForRange(supabase, home.id, selectedDate, selectedDate),
    getMyAbsence(supabase, userId),
    getRotations(supabase, home.id),
    getHomeMembers(supabase),
  ]);

  const memberNamesMap = new Map(homeMembers.map((m) => [m.user_id, m.full_name]));
  const rotationInfoMap = buildRotationInfoMap(rotations, absentIds, memberNamesMap);

  const activeAbsenceRange: AbsenceRange =
    absence !== null &&
    absence.absence_start <= selectedDate &&
    absence.absence_end >= selectedDate
      ? { start: absence.absence_start, end: absence.absence_end }
      : null;

  const filteredOccurrences = filterAbsenceOccurrences(todayOcc, activeAbsenceRange);
  const filteredOverdue = filterAbsenceOccurrences(overdueOcc, activeAbsenceRange);

  const isAbsent =
    absence !== null &&
    absence.absence_start <= currentDate &&
    absence.absence_end >= currentDate;

  const absenceBanner = isAbsent ? (
    <AbsenceBanner absenceEnd={absence.absence_end} clearAbsenceAction={clearAbsence} />
  ) : undefined;

  return (
    <TaskList
      today={filteredOccurrences}
      overdue={filteredOverdue}
      upcoming={upcomingOcc}
      currentDate={currentDate}
      selectedDate={selectedDate}
      createTaskAction={createTask}
      rooms={home.rooms}
      weekNav={<WeekNav selectedDate={selectedDate} today={currentDate} />}
      absenceBanner={absenceBanner}
      events={events}
      createEventAction={createEvent}
      updateEventAction={updateEvent}
      deleteEventAction={deleteEvent}
      filterEssencial={filterEssencial}
      userId={userId}
      rotationInfoMap={rotationInfoMap}
      rotations={rotations}
      homeMembers={homeMembers.map(m => ({ id: m.user_id, name: m.full_name }))}
      updateTaskAction={updateTask}
    />
  );
}

