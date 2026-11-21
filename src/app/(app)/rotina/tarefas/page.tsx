import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveTasks } from "@/features/tasks/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABEL, PRIORITY_BADGE_CLASS } from "@/features/tasks/labels";

export const metadata: Metadata = { title: "Todas as tarefas" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const tasks = await getActiveTasks(supabase, home.id);

  const active = tasks.filter((t) => t.status === "active");
  const paused = tasks.filter((t) => t.status === "paused");

  return (
    <>
      <PageHeader
        title="Todas as tarefas"
        description={`${active.length} ativa${active.length !== 1 ? "s" : ""}${paused.length > 0 ? ` · ${paused.length} pausada${paused.length !== 1 ? "s" : ""}` : ""}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/rotina">Voltar à rotina</Link>
          </Button>
        }
      />

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma tarefa ainda. Crie uma na página Rotina.
        </div>
      ) : null}

      {active.length > 0 ? (
        <section className="space-y-2">
          {paused.length > 0 ? (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Ativas
            </h2>
          ) : null}
          {active.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      ) : null}

      {paused.length > 0 ? (
        <section className="mt-6 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Pausadas
          </h2>
          {paused.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      ) : null}
    </>
  );
}

function TaskCard({
  task,
}: {
  task: Awaited<ReturnType<typeof getActiveTasks>>[number];
}) {
  return (
    <Link
      href={`/rotina/tarefas/${task.id}/editar`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{task.title}</span>
          {task.is_essential ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Essencial
            </span>
          ) : null}
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASS[task.priority]}`}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
        </div>
        {task.room ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{task.room.name}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">Editar →</span>
    </Link>
  );
}
