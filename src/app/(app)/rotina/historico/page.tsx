import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getHistory } from "@/features/tasks/queries";
import { TaskHistoryList } from "@/features/tasks/components/task-history-list";

export const metadata: Metadata = { title: "Histórico" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);

  if (!home) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const occurrences = await getHistory(supabase, home.id, 50);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 py-6 md:px-6">
        <h1 className="text-xl font-semibold text-graphite mb-6 font-heading">
          Histórico
        </h1>
        <div className="bg-card rounded-xl border border-sand overflow-hidden">
          <TaskHistoryList occurrences={occurrences} />
        </div>
      </div>
    </div>
  );
}
