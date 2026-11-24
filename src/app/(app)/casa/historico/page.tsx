import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  CircleCheck,
  History,
  PawPrint,
  ShoppingBasket,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import { getHomeMembers } from "@/features/members/queries";
import { getActivitySources } from "@/features/casa/queries";
import {
  ACTIVITY_FILTERS,
  ACTIVITY_FILTER_LABELS,
  dayHeading,
  groupByDay,
  localTime,
  mergeActivities,
  parseActivityFilter,
  type ActivityKind,
} from "@/features/casa/logic";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Histórico da casa" };

const KIND: Record<ActivityKind, { Icon: LucideIcon; bg: string; fg: string }> = {
  task: { Icon: CircleCheck, bg: "var(--done-bg)", fg: "var(--done-ink)" },
  shopping: { Icon: ShoppingBasket, bg: "#F6DDB9", fg: "#6E420F" },
  maintenance: { Icon: Wrench, bg: "var(--warn-icon)", fg: "var(--warn-ink)" },
  member: { Icon: UserPlus, bg: "var(--secondary)", fg: "var(--foreground)" },
  pet: { Icon: PawPrint, bg: "#F6DDB9", fg: "#6E420F" },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);
  if (!home) redirect("/onboarding");

  const filter = parseActivityFilter((await searchParams).tipo);
  const supabase = await createClient();
  const members = await getHomeMembers(supabase);
  const sources = await getActivitySources(supabase, home.id, members);

  const today = getLocalDateString(home.timezone);
  const activities = mergeActivities(sources, filter);
  const groups = groupByDay(activities, home.timezone);
  const nameOf = new Map(
    members.map((m) => [m.user_id, m.full_name ? m.full_name.trim().split(/\s+/)[0] : null]),
  );

  return (
    <>
      <PageHeader
        title="Histórico"
        description="Atividades da casa"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/casa" className="inline-flex items-center gap-1">
              <ArrowLeft size={16} aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />

      <nav aria-label="Filtrar atividades" className="mb-4 flex flex-wrap gap-2">
        {ACTIVITY_FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Link
              key={f}
              href={f === "tudo" ? "/casa/historico" : `/casa/historico?tipo=${f}`}
              aria-current={active ? "page" : undefined}
              className="inline-flex h-9 items-center rounded-[10px] border px-3 text-[13px] font-medium no-underline transition-colors"
              style={
                active
                  ? { background: "var(--nav-active)", color: "var(--nav-active-ink)", borderColor: "transparent" }
                  : { background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }
              }
            >
              {ACTIVITY_FILTER_LABELS[f]}
            </Link>
          );
        })}
      </nav>

      {groups.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border px-4 py-8 text-center"
          style={{ background: "var(--card)" }}
        >
          <span className="flex size-11 items-center justify-center rounded-full" style={{ background: "var(--secondary)" }}>
            <History size={22} aria-hidden />
          </span>
          <p className="text-[15px] font-semibold">Nada por aqui ainda</p>
          <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
            Tarefas concluídas, compras e cuidados vão aparecendo conforme a casa for usada.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.day} aria-label={dayHeading(g.day, today)}>
              <h2 className="mb-2 text-[13px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                {dayHeading(g.day, today)}
              </h2>
              <ul
                className="overflow-hidden rounded-[16px] border border-border"
                style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
              >
                {g.items.map((a, i) => {
                  const k = KIND[a.kind];
                  const who = a.actorId ? nameOf.get(a.actorId) : null;
                  const meta = [a.detail, who, localTime(a.at, home.timezone)].filter(Boolean).join(" · ");
                  return (
                    <li
                      key={a.key}
                      className="flex items-center gap-3 px-3.5 py-3"
                      style={{ borderBottom: i < g.items.length - 1 ? "1px solid var(--border)" : undefined }}
                    >
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                        style={{ background: k.bg, color: k.fg }}
                      >
                        <k.Icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">{a.title}</p>
                        <p className="truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>{meta}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Link
        href="/rotina/historico"
        className="mt-6 flex items-center gap-3 rounded-xl border border-border p-3.5 no-underline"
        style={{ background: "var(--card)", boxShadow: "var(--shadow)", color: "var(--foreground)" }}
      >
        <History size={18} aria-hidden />
        <span className="flex-1 text-sm font-medium">Histórico completo de tarefas</span>
        <ChevronRight size={16} aria-hidden style={{ color: "var(--muted-foreground)" }} />
      </Link>
    </>
  );
}
