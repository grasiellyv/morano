import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getHomeWithRooms } from "@/features/homes/queries";
import { getLocalDateString } from "@/lib/dates";
import {
  backfillDueTodayNotifications,
  getLastReadAt,
  getNotifications,
} from "@/features/notifications/queries";
import { groupByDay } from "@/features/notifications/group-by-day";
import { NotificationsList } from "@/features/notifications/components/notifications-list";

export const metadata: Metadata = { title: "Notificações" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const today = getLocalDateString(home.timezone);

  // Idempotente: garante que ocorrências pendentes de hoje/atrasadas já tenham
  // sua notificação `task_due_today` antes de montar a lista.
  await backfillDueTodayNotifications(supabase, home.id, today);

  const [notifications, lastReadAt] = await Promise.all([
    getNotifications(supabase, home.id, userId),
    getLastReadAt(supabase, home.id, userId),
  ]);

  const groups = groupByDay(notifications, home.timezone, today);

  return <NotificationsList groups={groups} lastReadAt={lastReadAt} />;
}
