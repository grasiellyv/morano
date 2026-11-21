import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getHistory } from "@/features/tasks/queries";
import { TaskHistoryList } from "@/features/tasks/components/task-history-list";

export const metadata: Metadata = { title: "Histórico" };

const PAGE_SIZE = 50;
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
      aria-current={active ? "page" : undefined}
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
  searchParams: Promise<{ filter?: string; page?: string }>;
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

  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);
  const offset = page * PAGE_SIZE;

  const supabase = await createClient();
  const occurrences = await getHistory(supabase, home.id, PAGE_SIZE + 1, statusFilter, offset);
  const hasMore = occurrences.length > PAGE_SIZE;
  const displayOccurrences = hasMore ? occurrences.slice(0, PAGE_SIZE) : occurrences;

  const filterLabel = {
    completed: "Concluídas",
    skipped: "Puladas",
    missed: "Perdidas",
  };

  function buildHref(overrides: { filter?: string | null; page?: number }) {
    const p = new URLSearchParams();
    const f = "filter" in overrides ? overrides.filter : rawFilter;
    if (f) p.set("filter", f);
    const pg = "page" in overrides ? overrides.page : page;
    if (pg && pg > 0) p.set("page", String(pg));
    const qs = p.toString();
    return qs ? `?${qs}` : "/rotina/historico";
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 py-6 md:px-6">
        <h1 className="text-xl font-semibold text-graphite mb-4 font-heading">
          Histórico
        </h1>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterChip href={buildHref({ filter: null, page: 0 })} active={!statusFilter} label="Tudo" />
          <FilterChip href={buildHref({ filter: "completed", page: 0 })} active={statusFilter === "completed"} label="Concluídas" />
          <FilterChip href={buildHref({ filter: "skipped", page: 0 })} active={statusFilter === "skipped"} label="Puladas" />
          <FilterChip href={buildHref({ filter: "missed", page: 0 })} active={statusFilter === "missed"} label="Perdidas" />
        </div>

        {displayOccurrences.length === 0 ? (
          <div className="rounded-xl border border-sand bg-card py-12 text-center">
            <p className="text-sm text-sage-ink">
              {statusFilter
                ? `Nenhuma ocorrência ${filterLabel[statusFilter].toLowerCase()} ainda.`
                : "Nenhuma tarefa no histórico ainda."}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-xl border border-sand overflow-hidden">
              <TaskHistoryList occurrences={displayOccurrences} />
            </div>

            {/* Pagination */}
            {(page > 0 || hasMore) ? (
              <div className="mt-4 flex items-center justify-between gap-2">
                {page > 0 ? (
                  <Link
                    href={buildHref({ page: page - 1 })}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    ← Mais recentes
                  </Link>
                ) : <span />}
                <span className="text-xs text-muted-foreground">
                  Página {page + 1}
                </span>
                {hasMore ? (
                  <Link
                    href={buildHref({ page: page + 1 })}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    Mais antigas →
                  </Link>
                ) : <span />}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
