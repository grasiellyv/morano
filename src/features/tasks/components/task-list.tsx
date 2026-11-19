"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { parseISO } from "date-fns";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import type { FormState } from "@/features/auth/form-state";
import type { Event } from "@/features/events/queries";
import { TaskOccurrenceRow } from "@/features/tasks/components/task-occurrence-row";
import { TaskForm } from "@/features/tasks/components/task-form";
import { Button } from "@/components/ui/button";
import { DailyProgressBar, calcProgress } from "@/features/tasks/components/daily-progress-bar";
import { CelebrationOverlay } from "@/features/tasks/components/celebration-overlay";
import { EventChip } from "@/features/events/components/event-chip";
import { EventForm } from "@/features/events/components/event-form";

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
  absenceBanner?: React.ReactNode;
  events?: Event[];
  createEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  updateEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  deleteEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  filterEssencial?: boolean;
  userId?: string;
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
  absenceBanner,
  events = [],
  createEventAction,
  updateEventAction,
  deleteEventAction,
  filterEssencial = false,
  userId,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
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

  const displayToday = filterEssencial ? today.filter((o) => o.task.is_essential) : today;
  const displayOverdue = filterEssencial ? overdue.filter((o) => o.task.is_essential) : overdue;
  const displayUpcoming = filterEssencial ? upcoming.filter((o) => o.task.is_essential) : upcoming;

  const totalMinutes = displayToday.reduce((s, o) => s + o.task.estimated_minutes, 0);

  const dateParam = selectedDate !== currentDate ? `date=${selectedDate}&` : "";
  const filterToggleHref = filterEssencial
    ? selectedDate !== currentDate ? `?date=${selectedDate}` : "/rotina"
    : `?${dateParam}filter=essenciais`;

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
          <Link
            href={filterToggleHref}
            className={`text-sm underline-offset-4 hover:underline ${filterEssencial ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
          >
            {filterEssencial ? "Ver todas" : "Essenciais"}
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
            initialValues={{ start_date: selectedDate }}
            onSuccess={() => setShowCreate(false)}
          />
        </div>
      ) : null}

      <CelebrationOverlay show={celebrate} onDismiss={handleCelebrateDismiss} />

      {absenceBanner}

      {weekNav}

      {(events.length > 0 || showCreateEvent) ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Eventos</h2>
            {createEventAction ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setShowCreateEvent((v) => !v); setEditingEventId(null); }}
              >
                {showCreateEvent ? "Cancelar" : "Novo evento"}
              </Button>
            ) : null}
          </div>

          {showCreateEvent && createEventAction ? (
            <div className="mb-4 rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold">Novo evento</h3>
              <EventForm
                mode="create"
                createAction={createEventAction}
                initialValues={{ start_date: selectedDate }}
                onSuccess={() => setShowCreateEvent(false)}
              />
            </div>
          ) : null}

          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setShowCreateEvent(false);
                      setEditingEventId((prev) =>
                        prev === event.id ? null : event.id,
                      );
                    }}
                  >
                    <EventChip event={event} />
                  </button>
                  {editingEventId === event.id ? (
                    <div className="mt-2 rounded-xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="mb-4 text-sm font-semibold">Editar evento</h3>
                      <EventForm
                        mode="edit"
                        initialValues={event}
                        updateAction={updateEventAction}
                        deleteAction={deleteEventAction}
                        onSuccess={() => setEditingEventId(null)}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {createEventAction && events.length === 0 && !showCreateEvent ? (
        <div className="mb-6 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreateEvent(true)}
          >
            Novo evento
          </Button>
        </div>
      ) : null}

      <div className="space-y-8">
        {/* Atrasadas */}
        {displayOverdue.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-semibold text-destructive">
              Atrasadas ({displayOverdue.length})
            </h2>
            <div className="space-y-2">
              {displayOverdue.map((o) => (
                <TaskOccurrenceRow key={o.id} occurrence={o} today={currentDate} userId={userId} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Dia selecionado */}
        <section>
          <DailyProgressBar occurrences={displayToday} />
          <h2 className="mb-3 text-base font-semibold">
            {selectedDate === currentDate ? "Hoje" : formatSelectedDate(selectedDate)} —{" "}
            {displayToday.length} {displayToday.length === 1 ? "tarefa" : "tarefas"} · ~{totalMinutes} min
          </h2>
          {displayToday.length > 0 ? (
            <div className="space-y-2">
              {displayToday.map((o) => (
                <TaskOccurrenceRow key={o.id} occurrence={o} today={currentDate} userId={userId} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {filterEssencial ? "Nenhuma tarefa essencial para este dia." : "Nenhuma tarefa para este dia."}
            </p>
          )}
        </section>

        {/* Próximas 7 dias */}
        {displayUpcoming.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-semibold">Próximas 7 dias</h2>
            <div className="space-y-2">
              {displayUpcoming.map((o) => (
                <TaskOccurrenceRow key={o.id} occurrence={o} today={currentDate} userId={userId} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
