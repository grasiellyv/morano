"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OccurrenceWithTask } from "@/features/tasks/queries";

type Props = {
  occurrences: OccurrenceWithTask[];
};

function StatusIcon({ status }: { status: OccurrenceWithTask["status"] }) {
  switch (status) {
    case "completed":
      return (
        <span className="text-sage-ink font-semibold" aria-label="Concluída">
          ✓
        </span>
      );
    case "skipped":
      return (
        <span className="text-stone" aria-label="Pulada">
          →
        </span>
      );
    case "missed":
      return (
        <span className="text-alert-ink" aria-label="Perdida">
          ✗
        </span>
      );
    default:
      return null;
  }
}

export function TaskHistoryList({ occurrences }: Props) {
  if (occurrences.length === 0) {
    return (
      <div className="text-center py-16 text-sage-ink">
        <p className="text-sm">Nenhuma tarefa no histórico ainda.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-sand">
      {occurrences.map((occ) => (
        <li key={occ.id} className="flex items-start gap-3 px-4 py-3">
          <div className="mt-0.5 w-5 flex-shrink-0 text-center text-sm">
            <StatusIcon status={occ.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`text-sm font-medium ${
                  occ.task.status === "archived"
                    ? "text-sage-ink"
                    : "text-graphite"
                }`}
              >
                {occ.task.title}
              </span>
              {occ.task.status === "archived" && (
                <span className="text-xs text-stone">(arquivada)</span>
              )}
            </div>
            <div className="text-xs text-sage-ink mt-0.5">
              {format(parseISO(occ.scheduled_for), "d 'de' MMMM", {
                locale: ptBR,
              })}
              {" · "}
              {occ.task.estimated_minutes} min
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
