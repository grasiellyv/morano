import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getHistory } from "@/features/tasks/queries";
import { TaskHistoryList } from "@/features/tasks/components/task-history-list";

export const metadata: Metadata = { title: "Histórico" };

const VALID_FILTERS = ["completed", "skipped", "missed"] as const;
type StatusFilter = (typeof VALID_FILTERS)[number];

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        active
          ? "bg-graphite text-offwhite font-medium"
          : "bg-sand text-graphite hover:bg-stone/20"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);

  if (!home) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const rawFilter = params.filter;
  const statusFilter: StatusFilter | undefined = VALID_FILTERS.includes(rawFilter as StatusFilter)
    ? (rawFilter as StatusFilter)
    : undefined;

  const supabase = await createClient();
  const occurrences = await getHistory(supabase, home.id, 100, statusFilter);

  const filterLabel = {
    completed: "Concluídas",
    skipped: "Puladas",
    missed: "Perdidas",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 py-6 md:px-6">
        <h1 className="text-xl font-semibold text-graphite mb-4 font-heading">
          Histórico
        </h1>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterChip href="/rotina/historico" active={!statusFilter} label="Tudo" />
          <FilterChip href="?filter=completed" active={statusFilter === "completed"} label="Concluídas" />
          <FilterChip href="?filter=skipped" active={statusFilter === "skipped"} label="Puladas" />
          <FilterChip href="?filter=missed" active={statusFilter === "missed"} label="Perdidas" />
        </div>

        {occurrences.length === 0 ? (
          <div className="rounded-xl border border-sand bg-card py-12 text-center">
            <p className="text-sm text-sage-ink">
              {statusFilter
                ? `Nenhuma ocorrência ${filterLabel[statusFilter].toLowerCase()} ainda.`
                : "Nenhuma tarefa no histórico ainda."}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-sand overflow-hidden">
            <TaskHistoryList occurrences={occurrences} />
          </div>
        )}
      </div>
    </div>
  );
}
