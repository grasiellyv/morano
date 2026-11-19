"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { parseISO } from "date-fns";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import type { FormState } from "@/features/auth/form-state";
import { TaskOccurrenceRow } from "@/features/tasks/components/task-occurrence-row";
import { TaskForm } from "@/features/tasks/components/task-form";
import { Button } from "@/components/ui/button";
import { DailyProgressBar, calcProgress } from "@/features/tasks/components/daily-progress-bar";
import { CelebrationOverlay } from "@/features/tasks/components/celebration-overlay";

const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const MONTH_ABBR = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

function formatSelectedDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${DAY_ABBR[d.getDay()]}, ${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

type Props = {
  today: OccurrenceWithTask[];
  overdue?: OccurrenceWithTask[];
  upcoming?: OccurrenceWithTask[];
  currentDate: string;
  selectedDate: string;
  createTaskAction: (_: FormState, fd: FormData) => Promise<FormState>;
  rooms: Array<{ id: string; name: string }>;
  weekNav: React.ReactNode;
};

export function TaskList({
  today,
  overdue = [],
  upcoming = [],
  currentDate,
  selectedDate,
  createTaskAction,
  rooms,
  weekNav,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevDone = useRef<number | null>(null);
  const prevTotal = useRef<number>(0);
  const hasMounted = useRef(false);

  const progress = calcProgress(today);

  useEffect(() => {
    if (progress.total === 0) { prevDone.current = null; prevTotal.current = 0; hasMounted.current = false; return; }
    if (!hasMounted.current) {
      hasMounted.current = true;
      prevDone.current = progress.done;
      prevTotal.current = progress.total;
      return;
    }
    const isNow100 = progress.done === progress.total;
    const wasBefore100 = prevDone.current === prevTotal.current && prevTotal.current > 0;
    if (isNow100 && !wasBefore100) setCelebrate(true);
    prevDone.current = progress.done;
    prevTotal.current = progress.total;
  }, [progress.done, progress.total]);

  const handleCelebrateDismiss = useCallback(() => setCelebrate(false), []);

  const totalMinutes = today.reduce((s, o) => s + o.task.estimated_minutes, 0);

  return (
    <>
      {/* Page header with "Nova tarefa" button */}
      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Rotina</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/rotina/calendario"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Calendário
          </Link>
          <Link
            href="/rotina/historico"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Histórico
          </Link>
          <Button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "Cancelar" : "Nova tarefa"}
          </Button>
        </div>
      </header>

      {/* Create task form */}
      {showCreate ? (
        <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Nova tarefa</h2>
          <TaskForm
            mode="create"
            rooms={rooms}
            formAction={createTaskAction}
            initialValues={{ start_date: currentDate }}
            onSuccess={() => setShowCreate(false)}
          />
        </div>
      ) : null}

      <CelebrationOverlay show={celebrate} onDismiss={handleCelebrateDismiss} />

      {weekNav}

      <div className="space-y-8">
        {/* Atrasadas */}
        {overdue.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-semibold text-destructive">
              Atrasadas ({overdue.length})
            </h2>
            <div className="space-y-2">
              {overdue.map((o) => (
                <TaskOccurrenceRow key={o.id} occurrence={o} today={currentDate} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Dia selecionado */}
        <section>
          <DailyProgressBar occurrences={today} />
          <h2 className="mb-3 text-base font-semibold">
            {selectedDate === currentDate ? "Hoje" : formatSelectedDate(selectedDate)} —{" "}
            {today.length} {today.length === 1 ? "tarefa" : "tarefas"} · ~{totalMinutes} min
          </h2>
          {today.length > 0 ? (
            <div className="space-y-2">
              {today.map((o) => (
                <TaskOccurrenceRow key={o.id} occurrence={o} today={currentDate} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa para este dia.</p>
          )}
        </section>

        {/* Próximas 7 dias */}
        {upcoming.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-semibold">Próximas 7 dias</h2>
            <div className="space-y-2">
              {upcoming.map((o) => (
                <TaskOccurrenceRow key={o.id} occurrence={o} today={currentDate} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
