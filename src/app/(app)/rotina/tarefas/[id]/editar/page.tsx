import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getTaskWithRoutine } from "@/features/tasks/queries";
import { getRotations } from "@/features/tasks/queries-rotations";
import { getHomeMembers } from "@/features/members/queries";
import { updateTask, editTaskRule, archiveTask } from "@/features/tasks/actions";
import { TaskEditPanel } from "@/features/tasks/components/task-edit-panel";
import { ScheduleEditPanel } from "@/features/tasks/components/schedule-edit-panel";
import { RotationPanel } from "@/features/tasks/components/rotation-panel";
import { ArchiveTaskButton } from "@/features/tasks/components/archive-task-button";

export const metadata: Metadata = { title: "Editar tarefa" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);

  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const [task, rotations, homeMembers] = await Promise.all([
    getTaskWithRoutine(supabase, taskId),
    getRotations(supabase, home.id),
    getHomeMembers(supabase),
  ]);

  if (!task || task.status === "archived") notFound();

  return (
    <div className="mx-auto max-w-xl space-y-8 pb-16 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href="/rotina"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Rotina
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
      </header>

      {/* Metadata */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Detalhes</h2>
        <TaskEditPanel
          task={task}
          rooms={home.rooms}
          updateTaskAction={updateTask}
        />
      </section>

      {/* Schedule */}
      {task.routine ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Agendamento</h2>
          <ScheduleEditPanel
            taskId={task.id}
            routine={task.routine}
            editTaskRuleAction={editTaskRule}
          />
        </section>
      ) : null}

      {/* Rotation */}
      {rotations.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Rodízio</h2>
          <RotationPanel
            taskId={task.id}
            rotations={rotations}
            currentRotationId={task.rotation_id}
            homeMembers={homeMembers.map((m) => ({ id: m.user_id, name: m.full_name }))}
          />
        </section>
      ) : null}

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/30 bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-destructive">Zona de risco</h2>
        <ArchiveTaskButton taskId={task.id} archiveTaskAction={archiveTask} />
      </section>
    </div>
  );
}
