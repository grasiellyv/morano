"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OccurrenceWithRoom } from "@/features/tasks/queries";
import { Check, SkipForward, X } from "lucide-react";

type Props = {
  occurrences: OccurrenceWithRoom[];
};

function StatusIcon({ status }: { status: OccurrenceWithRoom["status"] }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex text-muted-foreground" aria-label="Concluída">
          <Check size={15} strokeWidth={1.75} aria-hidden />
        </span>
      );
    case "skipped":
      return (
        <span className="inline-flex text-stone" aria-label="Pulada">
          <SkipForward size={15} strokeWidth={1.75} aria-hidden />
        </span>
      );
    case "missed":
      return (
        <span className="inline-flex text-alert-ink" aria-label="Perdida">
          <X size={15} strokeWidth={1.75} aria-hidden />
        </span>
      );
    default:
      return null;
  }
}

export function TaskHistoryList({ occurrences }: Props) {
  if (occurrences.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
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
                    ? "text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {occ.task.title}
              </span>
              {occ.task.status === "archived" && (
                <span className="text-xs text-stone">(arquivada)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {format(parseISO(occ.scheduled_for), "d 'de' MMMM", { locale: ptBR })}
              {occ.task.room ? (
                <span className="ml-1 text-stone">· {occ.task.room.name}</span>
              ) : null}
            </div>
            {occ.notes ? (
              <div className="mt-0.5 text-xs text-muted-foreground italic">
                &ldquo;{occ.notes}&rdquo;
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
