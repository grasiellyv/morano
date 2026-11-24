import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeMembers } from "@/features/members/queries";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { parseISO, format, startOfISOWeek, addDays } from "date-fns";
import { getLocalDateString } from "@/lib/dates";
import {
  extendWindowForHome,
  createTask,
  updateTask,
} from "@/features/tasks/actions";
import {
  markMissedOccurrences,
  getOverdueOccurrences,
  getOccurrencesForWeek,
} from "@/features/tasks/queries";
import { TaskList, type RotinaFilters } from "@/features/tasks/components/task-list";
import { getEventsForRange, getEventShoppingItems } from "@/features/events/queries";
import { removeEventItem } from "@/features/events/actions-items";
import { getMemberPermissions } from "@/features/members/permissions";
import { getShoppingItems, getShoppingHistorySessions } from "@/features/shopping/queries";
import { getCategories } from "@/features/shopping/queries-categories";
import { historyProducts } from "@/features/shopping/dedupe";
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

function str(v: string | string[] | undefined): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

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
  const view = params["view"] === "semana" ? "semana" : "dia";
  const dateRaw = str(params["date"]);
  let selectedDate = currentDate;
  if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const parsed = parseISO(dateRaw);
    if (!isNaN(parsed.getTime()) && format(parsed, "yyyy-MM-dd") === dateRaw) {
      selectedDate = dateRaw;
    }
  }

  // Filtros vivem na URL para sobreviver à troca de visão (Hoje ↔ Semana) e ao recarregar.
  const filters: RotinaFilters = {
    member: str(params["quem"]),
    room: str(params["cat"]),
    // `filter=essenciais` é o formato antigo do link — continua funcionando.
    essential: params["essenciais"] === "1" || params["filter"] === "essenciais",
  };
  const novo = params["novo"] === "evento" ? "evento" : params["novo"] === "tarefa" ? "tarefa" : null;

  extendWindowForHome(home.id, home.timezone).catch(() => {});

  // markMissed e getAbsentMemberIds são independentes — rodam em paralelo para
  // cortar round-trips sequenciais ao Supabase remoto. advanceRotations depende
  // de absentIds, então vem depois.
  const [, absentIds] = await Promise.all([
    markMissedOccurrences(supabase, home.id, currentDate).catch(() => {}),
    getAbsentMemberIds(supabase, home.id, currentDate),
  ]);
  await advanceRotationsIfDue(supabase, home.id, currentDate, absentIds);

  // Semana ISO (Seg–Dom) do dia aberto. A visão diária é derivada da semana:
  // uma única consulta alimenta a lista do dia e o resumo "Visão da semana".
  const weekStartDate = startOfISOWeek(parseISO(selectedDate));
  const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStartDate, i), "yyyy-MM-dd"));
  const weekStart = weekDates[0]!;
  const weekEnd = weekDates[6]!;

  // Os itens de compras dos eventos dependem dos ids dos eventos: encadeados num só ramo,
  // em paralelo com as demais leituras.
  const weekEventsPromise = getEventsForRange(supabase, home.id, weekStart, weekEnd).catch(() => []);
  const [weekOcc, overdueOcc, weekEvents, eventItems, categories, shopping, historySessions, absence, rotations, homeMembers, perms] =
    await Promise.all([
      getOccurrencesForWeek(supabase, home.id, weekStart),
      view === "dia" && selectedDate === currentDate
        ? getOverdueOccurrences(supabase, home.id, currentDate)
        : Promise.resolve([]),
      weekEventsPromise,
      weekEventsPromise.then((events) => getEventShoppingItems(supabase, events.map((e) => e.id))),
      getCategories(supabase, home.id),
      getShoppingItems(supabase, home.id),
      getShoppingHistorySessions(supabase, home.id),
      getMyAbsence(supabase, userId),
      getRotations(supabase, home.id),
      getHomeMembers(supabase),
      getMemberPermissions(supabase, userId, home.id),
    ]);

  const productSources = {
    categories,
    home: [...shopping.pending, ...shopping.purchased, ...historyProducts(historySessions)].map((i) => ({
      name: i.name,
      category_id: i.category_id,
      unit: i.unit,
    })),
  };

  const memberNamesMap = new Map(homeMembers.map((m) => [m.user_id, m.full_name]));
  const rotationInfoMap = buildRotationInfoMap(rotations, absentIds, memberNamesMap);

  const absenceRange: AbsenceRange =
    absence !== null ? { start: absence.absence_start, end: absence.absence_end } : null;

  const activeWeek = filterAbsenceOccurrences(
    weekOcc.filter((o) => o.task.status === "active" || o.task.status === "paused"),
    absenceRange,
  );
  const dayOcc = activeWeek.filter(
    (o) => o.scheduled_for === selectedDate && (o.status === "pending" || o.status === "completed"),
  );
  const overdue = filterAbsenceOccurrences(overdueOcc, absenceRange);

  const isAbsent =
    absence !== null &&
    absence.absence_start <= currentDate &&
    absence.absence_end >= currentDate;

  const absenceBanner = isAbsent ? (
    <AbsenceBanner absenceEnd={absence.absence_end} clearAbsenceAction={clearAbsence} />
  ) : undefined;

  return (
    <TaskList
      view={view}
      today={dayOcc}
      overdue={overdue}
      week={activeWeek}
      weekDates={weekDates}
      currentDate={currentDate}
      selectedDate={selectedDate}
      createTaskAction={createTask}
      rooms={home.rooms}
      absenceBanner={absenceBanner}
      events={weekEvents}
      productSources={productSources}
      eventItems={eventItems}
      removeEventItemAction={removeEventItem}
      canRemoveEventItems={perms.bypass || perms.can_manage_shopping}
      createEventAction={createEvent}
      updateEventAction={updateEvent}
      deleteEventAction={deleteEvent}
      initialFilters={filters}
      initialCreate={novo}
      userId={userId}
      rotationInfoMap={rotationInfoMap}
      rotations={rotations}
      homeMembers={homeMembers.map((m) => ({ id: m.user_id, name: m.full_name }))}
      updateTaskAction={updateTask}
    />
  );
}
