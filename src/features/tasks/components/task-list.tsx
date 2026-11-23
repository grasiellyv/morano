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
import type { RotationInfo, TaskRotation } from "@/features/tasks/queries-rotations";
import { ManageRotationsDialog } from "@/features/tasks/components/manage-rotations-dialog";
import { EventForm } from "@/features/events/components/event-form";
import { TaskEditPanel } from "@/features/tasks/components/task-edit-panel";

const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const MONTH_ABBR = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

function formatSelectedDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${DAY_ABBR[d.getDay()]}, ${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

function formatUpcomingDate(dateStr: string, currentDate: string): string {
  const d = new Date(currentDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const tomorrow = d.toISOString().slice(0, 10);
  if (dateStr === tomorrow) return "Amanhã";
  const parsed = parseISO(dateStr);
  return `${DAY_ABBR[parsed.getDay()]}, ${parsed.getDate()} ${MONTH_ABBR[parsed.getMonth()]}`;
}

function formatNextEventDate(event: Event, currentDate: string): string {
  const a = new Date(currentDate + "T00:00:00Z").getTime();
  const b = new Date(event.start_date + "T00:00:00Z").getTime();
  const diff = Math.round((b - a) / 86_400_000);
  const d = parseISO(event.start_date);
  const dateStr = `${DAY_ABBR[d.getDay()]}, ${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
  const timeStr = event.start_time ? ` · ${event.start_time.slice(0, 5).replace(":", "h").replace(/h00$/, "h")}` : "";
  const daysStr = diff === 1 ? " · amanhã" : diff > 1 ? ` · em ${diff} dias` : "";
  return `${dateStr}${timeStr}${daysStr}`;
}

// ── Shared avatar helpers ─────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  { bg: "#EBD5BE", text: "#6B3A17" },
  { bg: "#F3CFCF", text: "#8A2F3A" },
  { bg: "#D5DEEA", text: "#2C4A6E" },
  { bg: "#F5E4D2", text: "#7A5030" },
  { bg: "#E0EADB", text: "#2C5633" },
];

function memberColor(id: string) {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length] ?? AVATAR_PALETTES[0]!;
}

function MiniAvatar({ id, name, size }: { id: string; name: string | null; size: number }) {
  const palette = memberColor(id);
  const initials = name
    ? (() => { const p = name.trim().split(/\s+/); return p.length >= 2 ? ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase() : p[0]?.slice(0, 2).toUpperCase() ?? "?"; })()
    : "?";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: palette.bg, color: palette.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 600, fontSize: Math.round(size * 0.44), flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
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
  nextEvent?: Event | null;
  createEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  updateEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  deleteEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  filterEssencial?: boolean;
  userId?: string;
  rotationInfoMap?: Record<string, RotationInfo>;
  rotations?: TaskRotation[];
  homeMembers?: { id: string; name: string | null }[];
  updateTaskAction?: (_: FormState, fd: FormData) => Promise<FormState>;
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
  nextEvent,
  createEventAction,
  updateEventAction,
  deleteEventAction,
  filterEssencial = false,
  userId,
  rotationInfoMap,
  rotations,
  homeMembers,
  updateTaskAction,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [filterRoomId, setFilterRoomId] = useState<string | null>(null);
  const [filterMemberId, setFilterMemberId] = useState<string | "mine" | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showManageRotations, setShowManageRotations] = useState(false);
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

  const byEssential = (occs: OccurrenceWithTask[]) =>
    filterEssencial ? occs.filter((o) => o.task.is_essential) : occs;
  const byRoom = (occs: OccurrenceWithTask[]) =>
    filterRoomId ? occs.filter((o) => o.task.room_id === filterRoomId) : occs;
  const byMember = (occs: OccurrenceWithTask[]) => {
    if (!filterMemberId) return occs;
    if (filterMemberId === "mine") return occs.filter((o) => o.assigned_to === userId);
    return occs.filter((o) => o.assigned_to === filterMemberId);
  };

  const displayToday = byMember(byRoom(byEssential(today)));
  const displayOverdue = byMember(byRoom(byEssential(overdue)));
  const displayUpcoming = byMember(byRoom(byEssential(upcoming)));

  // Member filter progress counts (from today only, pre-room-filter)
  const memberScopedToday = byMember(byEssential(today));
  const memberTotal = memberScopedToday.length;
  const memberDone = memberScopedToday.filter((o) => o.status !== "pending").length;
  const memberPct = memberTotal > 0 ? Math.round((memberDone / memberTotal) * 100) : 0;

  const todayPending = displayToday.filter((o) => o.status === "pending");
  const todayDone = displayToday.filter((o) => o.status !== "pending");

  const upcomingByDate = displayUpcoming.reduce<Map<string, typeof displayUpcoming>>((acc, o) => {
    const existing = acc.get(o.scheduled_for) ?? [];
    existing.push(o);
    acc.set(o.scheduled_for, existing);
    return acc;
  }, new Map());

  const dateParam = selectedDate !== currentDate ? `date=${selectedDate}&` : "";
  const filterToggleHref = filterEssencial
    ? selectedDate !== currentDate ? `?date=${selectedDate}` : "/rotina"
    : `?${dateParam}filter=essenciais`;

  function renderOccurrence(o: OccurrenceWithTask) {
    return (
      <div key={o.id}>
        <TaskOccurrenceRow
          occurrence={o}
          today={currentDate}
          userId={userId}
          rotationInfo={rotationInfoMap?.[o.task.rotation_id ?? ""]}
          onEdit={updateTaskAction ? () => setEditingTaskId(o.task.id) : undefined}
          rooms={rooms}
          homeMembers={homeMembers}
        />
        {editingTaskId === o.task.id && updateTaskAction ? (
          <div className="mt-2 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Editar tarefa</h3>
            <TaskEditPanel
              task={o.task}
              rooms={rooms}
              updateTaskAction={updateTaskAction}
              onSuccess={() => setEditingTaskId(null)}
              onCancel={() => setEditingTaskId(null)}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <header className="flex items-center justify-between pb-5">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: "-0.4px",
            color: "var(--foreground)",
            lineHeight: 1.2,
          }}
        >
          Rotina
        </h1>
        <div className="flex items-center gap-2">
          {rotations != null ? (
            <button
              type="button"
              onClick={() => setShowManageRotations(true)}
              className="flex items-center justify-center rounded-full border border-border"
              style={{
                width: 40,
                height: 40,
                background: "var(--card)",
                color: "var(--muted-foreground)",
                fontSize: 13,
              }}
              title="Rodízios"
            >
              ↺
            </button>
          ) : null}
          <Link
            href={filterToggleHref}
            className="flex items-center justify-center rounded-full border border-border"
            style={{
              width: 40,
              height: 40,
              background: filterEssencial ? "var(--nav-active)" : "var(--card)",
              color: filterEssencial ? "var(--nav-active-ink)" : "var(--muted-foreground)",
            }}
            title={filterEssencial ? "Ver todas" : "Essenciais"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: showCreate ? "var(--muted)" : "var(--nav-active)",
              color: showCreate ? "var(--muted-foreground)" : "var(--nav-active-ink)",
              fontSize: 22,
              fontWeight: 300,
              lineHeight: 1,
            }}
            title={showCreate ? "Cancelar" : "Nova tarefa"}
          >
            {showCreate ? "×" : "+"}
          </button>
        </div>
      </header>

      {/* Segmented control */}
      <div
        style={{
          height: 42,
          borderRadius: 12,
          background: "var(--secondary)",
          display: "flex",
          padding: 3,
          gap: 3,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            flex: 1,
            borderRadius: 9,
            background: "var(--card)",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13.5,
            fontWeight: 500,
            color: "var(--foreground)",
          }}
        >
          Tarefas
        </div>
        <Link
          href="/rotina/calendario"
          style={{
            flex: 1,
            borderRadius: 9,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13.5,
            fontWeight: 400,
            color: "var(--muted-foreground)",
            textDecoration: "none",
          }}
        >
          Calendário
        </Link>
      </div>

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
            rotations={rotations}
            homeMembers={homeMembers}
          />
        </div>
      ) : null}

      <CelebrationOverlay show={celebrate} onDismiss={handleCelebrateDismiss} />

      {absenceBanner}

      {weekNav}

      {/* Next event banner */}
      {nextEvent ? (
        <Link
          href="/rotina/calendario"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 56,
            borderRadius: 14,
            background: "var(--warn-bg)",
            color: "var(--warn-ink)",
            padding: "0 14px",
            marginTop: 12,
            marginBottom: 4,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--warn-icon)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="3"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nextEvent.title}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {formatNextEventDate(nextEvent, currentDate)}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.6 }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Link>
      ) : null}

      {/* Member filter chips */}
      {homeMembers && homeMembers.length >= 2 ? (
        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setFilterMemberId(null)}
              style={{
                height: 32, borderRadius: 10, padding: "0 12px",
                fontSize: 13, fontWeight: filterMemberId === null ? 500 : 400,
                border: `1px solid ${filterMemberId === null ? "transparent" : "var(--border)"}`,
                background: filterMemberId === null ? "var(--nav-active)" : "var(--card)",
                color: filterMemberId === null ? "var(--nav-active-ink)" : "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              Todas
            </button>
            {userId ? (
              <button
                type="button"
                onClick={() => setFilterMemberId(filterMemberId === "mine" ? null : "mine")}
                style={{
                  height: 32, borderRadius: 10, padding: "0 12px",
                  fontSize: 13, fontWeight: filterMemberId === "mine" ? 500 : 400,
                  border: `1px solid ${filterMemberId === "mine" ? "transparent" : "var(--border)"}`,
                  background: filterMemberId === "mine" ? "var(--nav-active)" : "var(--card)",
                  color: filterMemberId === "mine" ? "var(--nav-active-ink)" : "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                Minhas
              </button>
            ) : null}
            {homeMembers.filter((m) => m.id !== userId).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
                style={{
                  height: 32, borderRadius: 10, padding: "0 10px 0 6px",
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 13, fontWeight: filterMemberId === m.id ? 500 : 400,
                  border: `1px solid ${filterMemberId === m.id ? "transparent" : "var(--border)"}`,
                  background: filterMemberId === m.id ? "var(--nav-active)" : "var(--card)",
                  color: filterMemberId === m.id ? "var(--nav-active-ink)" : "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                <MiniAvatar id={m.id} name={m.name} size={22} />
                <span>{m.name ? m.name.trim().split(/\s+/)[0] : "?"}</span>
              </button>
            ))}
            {memberTotal > 0 ? (
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                {memberDone} de {memberTotal}
              </span>
            ) : null}
          </div>
          {memberTotal > 0 ? (
            <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#D97706", width: `${memberPct}%`, transition: "width 0.3s" }} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Room filter chips — only when there are 2+ rooms with tasks */}
      {rooms.length > 1 ? (() => {
        const allOccs = [...today, ...overdue, ...upcoming];
        const roomsWithTasks = rooms.filter((r) => allOccs.some((o) => o.task.room_id === r.id));
        if (roomsWithTasks.length < 2) return null;
        return (
          <div style={{ marginTop: 12, marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              onClick={() => setFilterRoomId(null)}
              style={{
                height: 32, borderRadius: 10, padding: "0 12px",
                fontSize: 12, fontWeight: filterRoomId === null ? 500 : 400,
                border: `1px solid ${filterRoomId === null ? "transparent" : "var(--border)"}`,
                background: filterRoomId === null ? "var(--nav-active)" : "var(--card)",
                color: filterRoomId === null ? "var(--nav-active-ink)" : "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              Todos
            </button>
            {roomsWithTasks.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setFilterRoomId(filterRoomId === room.id ? null : room.id)}
                style={{
                  height: 32, borderRadius: 10, padding: "0 12px",
                  fontSize: 12, fontWeight: filterRoomId === room.id ? 500 : 400,
                  border: `1px solid ${filterRoomId === room.id ? "transparent" : "var(--border)"}`,
                  background: filterRoomId === room.id ? "var(--nav-active)" : "var(--card)",
                  color: filterRoomId === room.id ? "var(--nav-active-ink)" : "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                {room.name}
              </button>
            ))}
          </div>
        );
      })() : null}

      {(events.length > 0 || showCreateEvent || createEventAction) ? (
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
      <div className="space-y-8">
        {/* Atrasadas */}
        {displayOverdue.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-semibold text-destructive">
              Atrasadas ({displayOverdue.length})
            </h2>
            <div className="space-y-2">
              {displayOverdue.map(renderOccurrence)}
            </div>
          </section>
        ) : null}

        {/* Dia selecionado */}
        <section>
          <DailyProgressBar occurrences={displayToday} />
          <h2 className="mb-3 text-base font-semibold">
            {selectedDate === currentDate ? "Hoje" : formatSelectedDate(selectedDate)} —{" "}
            {todayPending.length} {todayPending.length === 1 ? "pendente" : "pendentes"}
            {todayDone.length > 0 ? `, ${todayDone.length} ${todayDone.length === 1 ? "concluída" : "concluídas"}` : ""}
          </h2>
          {todayPending.length > 0 ? (
            <div className="space-y-2">
              {todayPending.map(renderOccurrence)}
            </div>
          ) : displayToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filterEssencial ? "Nenhuma tarefa essencial para este dia." : "Nenhuma tarefa para este dia."}
            </p>
          ) : null}
          {todayDone.length > 0 ? (
            <details className="mt-4" open={todayPending.length === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 select-none">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs font-semibold">
                  {todayDone.length}
                </span>
                Concluídas
                <svg className="ml-auto h-4 w-4 transition-transform [[open]_&]:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="mt-2 space-y-2 opacity-60">
                {todayDone.map(renderOccurrence)}
              </div>
            </details>
          ) : null}
        </section>

        {/* Próximas 7 dias */}
        {displayUpcoming.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-semibold">Próximas 7 dias</h2>
            <div className="space-y-6">
              {Array.from(upcomingByDate.entries()).map(([date, occs]) => (
                <div key={date}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatUpcomingDate(date, currentDate)}
                  </p>
                  <div className="space-y-2">
                    {occs.map(renderOccurrence)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    {rotations != null && homeMembers != null ? (
        <ManageRotationsDialog
          rotations={rotations}
          homeMembers={homeMembers}
          open={showManageRotations}
          onClose={() => setShowManageRotations(false)}
        />
      ) : null}
    </>
  );
}


