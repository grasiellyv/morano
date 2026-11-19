"use client";

import type { OccurrenceWithTask } from "@/features/tasks/queries";

export function calcProgress(occurrences: OccurrenceWithTask[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const occ of occurrences) {
    if (occ.task.status !== "active") continue;
    if (occ.status === "pending" || occ.status === "completed") total++;
    if (occ.status === "completed") done++;
  }
  return { done, total };
}

export function DailyProgressBar({ occurrences }: { occurrences: OccurrenceWithTask[] }) {
  const { done, total } = calcProgress(occurrences);

  if (total === 0) return null;

  const percent = Math.round((done / total) * 100);
  const label = total === 1 ? "tarefa" : "tarefas";

  return (
    <div className="mb-4 space-y-1">
      <p className="text-sm text-muted-foreground">
        {done} de {total} {label} {total === 1 ? "concluída" : "concluídas"}
      </p>
      <div className="bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
