import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import { getOccurrenceDetail } from "@/features/tasks/queries";
import { getHomeMembers } from "@/features/members/queries";
import { OccurrenceDetailView } from "@/features/tasks/components/occurrence-detail";

export const metadata: Metadata = { title: "Tarefa" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const [occurrence, members] = await Promise.all([
    getOccurrenceDetail(supabase, id),
    getHomeMembers(supabase),
  ]);
  if (!occurrence || occurrence.task.status === "archived") notFound();

  return (
    <OccurrenceDetailView
      occurrence={occurrence}
      today={getLocalDateString(home.timezone)}
      userId={userId}
      members={members.map((m) => ({ id: m.user_id, name: m.full_name }))}
    />
  );
}
