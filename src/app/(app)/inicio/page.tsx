import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/feedback/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import { extendWindowForHome } from "@/features/tasks/actions";
import {
  markMissedOccurrences,
  getTodayOccurrences,
  getOverdueOccurrences,
} from "@/features/tasks/queries";
import { getShoppingItems } from "@/features/shopping/queries";
import { getReorderSuggestions } from "@/features/shopping/queries-lists";
import { getMaintenanceItems } from "@/features/manutencao/queries";
import { getEventsForRange } from "@/features/events/queries";

export const metadata: Metadata = { title: "Início" };

const EVENT_ICON: Record<string, string> = {
  aniversario: "🎂",
  viagem: "✈️",
  jantar: "🍽️",
  consulta_medica: "🏥",
  visita: "👥",
  manutencao: "🔧",
  feriado: "🎉",
  outros: "📅",
};

const PRIORITY_DOT: Record<string, string> = {
  alta: "bg-red-500",
  media: "bg-yellow-500",
  baixa: "bg-muted-foreground",
};

function SummaryCard({
  href,
  label,
  value,
  subtitle,
  accent = "default",
}: {
  href: string;
  label: string;
  value: string;
  subtitle: string;
  accent?: "default" | "green" | "red" | "yellow";
}) {
  const valueClass = {
    default: "text-foreground",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-amber-600",
  }[accent];

  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </Link>
  );
}

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const today = getLocalDateString(home.timezone);

  await extendWindowForHome(home.id, home.timezone).catch(() => {});
  await markMissedOccurrences(supabase, home.id, today).catch(() => {});

  const [todayOcc, overdueOcc, shopping, maintenance, events, reorderSuggestions] = await Promise.all([
    getTodayOccurrences(supabase, home.id, today),
    getOverdueOccurrences(supabase, home.id, today),
    getShoppingItems(supabase, home.id),
    getMaintenanceItems(supabase, home.id),
    getEventsForRange(supabase, home.id, today, today),
    getReorderSuggestions(supabase, home.id, today),
  ]);

  const completedToday = todayOcc.filter((o) => o.status === "completed").length;
  const totalToday = todayOcc.length;
  const pendingToday = totalToday - completedToday;
  const overdueCount = overdueOcc.length;
  const shoppingPending = shopping.pending.length;
  const reorderCount = reorderSuggestions.length;
  const maintenanceActive = maintenance.filter(
    (m) => m.status === "pendente" || m.status === "em_andamento",
  ).length;

  const topTasks = todayOcc.filter((o) => o.status === "pending").slice(0, 5);

  const dateLabel = format(parseISO(today), "EEEE, d 'de' MMMM", { locale: ptBR });
  const dateLabelCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <>
      <PageHeader title="Início" description={dateLabelCapitalized} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          href="/rotina"
          label="Tarefas hoje"
          value={totalToday === 0 ? "—" : `${completedToday}/${totalToday}`}
          subtitle={
            totalToday === 0
              ? "Sem tarefas"
              : completedToday === totalToday
                ? "Tudo feito!"
                : `${pendingToday} pendente${pendingToday !== 1 ? "s" : ""}`
          }
          accent={completedToday === totalToday && totalToday > 0 ? "green" : "default"}
        />
        <SummaryCard
          href="/rotina"
          label="Atrasadas"
          value={overdueCount === 0 ? "—" : String(overdueCount)}
          subtitle={overdueCount === 0 ? "Em dia" : `tarefa${overdueCount !== 1 ? "s" : ""}`}
          accent={overdueCount > 0 ? "red" : "default"}
        />
        <SummaryCard
          href="/compras"
          label="Compras"
          value={shoppingPending === 0 ? "—" : String(shoppingPending)}
          subtitle={
            shoppingPending === 0 && reorderCount === 0
              ? "Lista vazia"
              : shoppingPending === 0
                ? `${reorderCount} para repor`
                : reorderCount > 0
                  ? `${shoppingPending} item${shoppingPending !== 1 ? "ns" : ""} · ${reorderCount} repor`
                  : `${shoppingPending} item${shoppingPending !== 1 ? "ns" : ""}`
          }
          accent={reorderCount > 0 ? "yellow" : "default"}
        />
        <SummaryCard
          href="/manutencao"
          label="Manutenção"
          value={maintenanceActive === 0 ? "—" : String(maintenanceActive)}
          subtitle={maintenanceActive === 0 ? "Tudo ok" : `ativo${maintenanceActive !== 1 ? "s" : ""}`}
          accent={maintenanceActive > 0 ? "yellow" : "default"}
        />
      </div>

      {events.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Eventos hoje
          </h2>
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="shrink-0 text-base">
                  {EVENT_ICON[event.event_type] ?? "📅"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  {event.start_time && (
                    <p className="text-xs text-muted-foreground">
                      {event.start_time.slice(0, 5)}
                      {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {topTasks.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tarefas pendentes
            </h2>
            <Link href="/rotina" className="text-xs text-primary hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {topTasks.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[o.task.priority] ?? "bg-muted-foreground"}`}
                />
                <p className="min-w-0 flex-1 truncate text-sm">{o.task.title}</p>
                {o.task.is_essential && (
                  <span className="shrink-0 text-xs font-medium text-amber-600">Essencial</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {totalToday === 0 && overdueCount === 0 && events.length === 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje. Aproveite!</p>
        </div>
      )}
    </>
  );
}
