"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo, useTransition } from "react";
import Link from "next/link";
import { parseISO } from "date-fns";
import { addDaysStr } from "@/lib/dates";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { undoComplete } from "@/features/tasks/actions";
import type { Event } from "@/features/events/queries";
import { TaskOccurrenceRow } from "@/features/tasks/components/task-occurrence-row";
import { TaskForm } from "@/features/tasks/components/task-form";
import { calcProgress } from "@/features/tasks/components/daily-progress-bar";
import { CelebrationOverlay } from "@/features/tasks/components/celebration-overlay";
import { CompleteCircleButton } from "@/features/tasks/components/complete-circle-button";
import { EventChip } from "@/features/events/components/event-chip";
import type { RotationInfo, TaskRotation } from "@/features/tasks/queries-rotations";
import { ManageRotationsDialog } from "@/features/tasks/components/manage-rotations-dialog";
import { EventForm } from "@/features/events/components/event-form";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { LinkedEventItem } from "@/features/events/event-items";
import { TaskEditPanel } from "@/features/tasks/components/task-edit-panel";
import {
  RotinaHeader,
  RotinaTabs,
  IconButton,
  PlusIcon,
  FilterIcon,
} from "@/features/tasks/components/rotina-chrome";
import {
  PERIOD_LABEL,
  PERIOD_ORDER,
  WEEKDAY_INITIAL,
  WEEKDAY_SHORT,
  firstName,
  formatDayHeading,
  formatTime,
  formatWeekRange,
  formatShortDate,
  periodOf,
  summarizeWeek,
  groupWeekByCategory,
  groupEventsByDay,
  eventCovers,
  applyStatusOverrides,
  type StatusOverrides,
  type WeekTaskRow,
  timeSortKey,
  type DayPeriod,
  type WeekSummary,
} from "@/features/tasks/rotina-format";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type RotinaFilters = {
  /** null = todos · "mine" · "shared" (sem responsável) · id do morador */
  member: string | null;
  /** id do cômodo/categoria */
  room: string | null;
  essential: boolean;
};

type Member = { id: string; name: string | null };

type Props = {
  view: "dia" | "semana";
  /** Ocorrências (pendentes e concluídas) do dia aberto. */
  today: OccurrenceWithTask[];
  /** Pendências de dias anteriores (só quando o dia aberto é hoje). */
  overdue?: OccurrenceWithTask[];
  /** Todas as ocorrências da semana Seg–Dom do dia aberto. */
  week: OccurrenceWithTask[];
  weekDates: string[];
  currentDate: string;
  selectedDate: string;
  createTaskAction: (_: FormState, fd: FormData) => Promise<FormState>;
  rooms: Array<{ id: string; name: string }>;
  absenceBanner?: React.ReactNode;
  /** Eventos da semana. */
  events?: Event[];
  createEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  updateEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  deleteEventAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  /** Pode pedir itens de compras no evento (permissão de Compras). */
  canAddEventItems?: boolean;
  /** Itens de compras já vinculados, por id de evento. */
  eventItems?: Record<string, LinkedEventItem[]>;
  removeEventItemAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  /** false = sem permissão de Compras (não pode remover itens vinculados). */
  canRemoveEventItems?: boolean;
  initialFilters?: RotinaFilters;
  initialCreate?: "tarefa" | "evento" | null;
  userId?: string;
  rotationInfoMap?: Record<string, RotationInfo>;
  rotations?: TaskRotation[];
  homeMembers?: Member[];
  updateTaskAction?: (_: FormState, fd: FormData) => Promise<FormState>;
};

const NO_FILTERS: RotinaFilters = { member: null, room: null, essential: false };

// ── Componente ────────────────────────────────────────────────────────────────

export function TaskList({
  view,
  today: todayProp,
  overdue: overdueProp = [],
  week: weekProp,
  weekDates,
  currentDate,
  selectedDate,
  createTaskAction,
  rooms,
  absenceBanner,
  events = [],
  createEventAction,
  updateEventAction,
  deleteEventAction,
  canAddEventItems = false,
  eventItems = {},
  removeEventItemAction,
  canRemoveEventItems = true,
  initialFilters = NO_FILTERS,
  initialCreate = null,
  userId,
  rotationInfoMap,
  rotations,
  homeMembers = [],
  updateTaskAction,
}: Props) {
  // Concluir/desfazer é otimista: o que a pessoa fez aparece na hora, sem esperar o servidor nem
  // reler a página. Os overrides valem até chegarem dados novos do servidor (outra ação que
  // atualiza a página): aí as props mudam e o estado é zerado (padrão "ajustar estado na renderização").
  const [optimistic, setOptimistic] = useState<{
    today: OccurrenceWithTask[];
    overdue: OccurrenceWithTask[];
    week: OccurrenceWithTask[];
    map: StatusOverrides;
  }>({ today: todayProp, overdue: overdueProp, week: weekProp, map: {} });
  let overrides = optimistic.map;
  if (optimistic.today !== todayProp || optimistic.overdue !== overdueProp || optimistic.week !== weekProp) {
    overrides = {};
    setOptimistic({ today: todayProp, overdue: overdueProp, week: weekProp, map: overrides });
  }
  const today = useMemo(() => applyStatusOverrides(todayProp, overrides), [todayProp, overrides]);
  const week = useMemo(() => applyStatusOverrides(weekProp, overrides), [weekProp, overrides]);
  // Atrasada que foi concluída ou pulada sai da seção de atrasadas.
  const overdue = useMemo(
    () => overdueProp.filter((o) => overrides[o.id] !== "completed" && overrides[o.id] !== "skipped"),
    [overdueProp, overrides],
  );
  const setStatusOverride = useCallback((id: string, status: "completed" | "pending" | "skipped" | null) => {
    setOptimistic((prev) => {
      const map = { ...prev.map };
      if (status) map[id] = status;
      else delete map[id];
      return { ...prev, map };
    });
  }, []);

  const [creating, setCreating] = useState<"tarefa" | "evento" | null>(initialCreate);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<RotinaFilters>(initialFilters);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showManageRotations, setShowManageRotations] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [justDone, setJustDone] = useState<{ id: string; title: string } | null>(null);
  const clearJustDone = useCallback(() => setJustDone(null), []);

  // ── URL ────────────────────────────────────────────────────────────────────
  const buildHref = useCallback(
    (next: { view: "dia" | "semana"; date: string }) => {
      const sp = new URLSearchParams();
      if (next.view === "semana") sp.set("view", "semana");
      if (next.date !== currentDate) sp.set("date", next.date);
      if (filters.member) sp.set("quem", filters.member);
      if (filters.room) sp.set("cat", filters.room);
      if (filters.essential) sp.set("essenciais", "1");
      const qs = sp.toString();
      return qs ? `/rotina?${qs}` : "/rotina";
    },
    [currentDate, filters],
  );

  // Filtros refletidos na URL sem nova ida ao servidor (Next sincroniza replaceState).
  useEffect(() => {
    const href = buildHref({ view, date: selectedDate });
    if (window.location.pathname + window.location.search !== href) {
      window.history.replaceState(null, "", href);
    }
  }, [buildHref, view, selectedDate]);

  // ── Celebração quando o dia fecha ─────────────────────────────────────────
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

  // ── Filtros ───────────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (occs: OccurrenceWithTask[]) =>
      occs.filter((o) => {
        if (filters.essential && !o.task.is_essential) return false;
        if (filters.room && o.task.room_id !== filters.room) return false;
        if (filters.member === "mine") return o.assigned_to === userId;
        if (filters.member === "shared") return o.assigned_to === null;
        if (filters.member) return o.assigned_to === filters.member;
        return true;
      }),
    [filters, userId],
  );

  const activeFilterCount =
    (filters.member ? 1 : 0) + (filters.room ? 1 : 0) + (filters.essential ? 1 : 0);

  const displayToday = applyFilters(today);
  const displayOverdue = applyFilters(overdue);
  const displayWeek = applyFilters(week);
  const summary = useMemo(
    () => summarizeWeek(displayWeek, weekDates, currentDate),
    [displayWeek, weekDates, currentDate],
  );

  const dayEvents = events.filter((e) => eventCovers(e, selectedDate));

  // ── Navegação ─────────────────────────────────────────────────────────────
  const isToday = selectedDate === currentDate;
  const sel = parseISO(selectedDate);
  const tabHrefs = {
    dia: buildHref({ view: "dia", date: view === "dia" ? currentDate : selectedDate }),
    semana: buildHref({ view: "semana", date: selectedDate }),
    calendario: "/rotina/calendario",
  };
  const dayLabel = view === "dia" && !isToday ? `${WEEKDAY_SHORT[sel.getDay()]}, ${sel.getDate()}` : "Hoje";

  // ── Helpers de render ─────────────────────────────────────────────────────
  function renderOccurrence(o: OccurrenceWithTask) {
    return (
      <li key={o.id}>
        <TaskOccurrenceRow
          occurrence={o}
          today={currentDate}
          userId={userId}
          rotationInfo={rotationInfoMap?.[o.task.rotation_id ?? ""]}
          onEdit={updateTaskAction ? () => setEditingTaskId(o.task.id) : undefined}
          onCompleted={(done) => setJustDone({ id: done.id, title: done.task.title })}
          onStatusChange={setStatusOverride}
          rooms={rooms}
          homeMembers={homeMembers}
        />
        {editingTaskId === o.task.id && updateTaskAction ? (
          <div className="mt-2 rounded-2xl border border-border bg-card p-5">
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
      </li>
    );
  }

  function renderEvent(e: Event) {
    return (
      <li key={`ev-${e.id}`}>
        <button
          type="button"
          className="w-full text-left"
          aria-expanded={editingEventId === e.id}
          onClick={() => setEditingEventId((prev) => (prev === e.id ? null : e.id))}
        >
          <EventChip event={e} />
        </button>
        {editingEventId === e.id ? (
          <div className="mt-2 rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold">Editar compromisso</h3>
            <EventForm
              mode="edit"
              initialValues={e}
              updateAction={updateEventAction}
              deleteAction={deleteEventAction}
              canAddItems={canAddEventItems}
              linkedItems={eventItems[e.id] ?? []}
              removeItemAction={removeEventItemAction}
              canRemoveItems={canRemoveEventItems}
              onSuccess={() => setEditingEventId(null)}
            />
          </div>
        ) : null}
      </li>
    );
  }

  // ── Cabeçalho, alternador, criação e filtros (comuns às duas visões) ─────
  const chrome = (
    <>
      <RotinaHeader
        actions={
          <>
            <IconButton
              label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ativos)` : "Filtrar"}
              onClick={() => setFiltersOpen((v) => !v)}
              pressed={filtersOpen}
              badge={filtersOpen ? 0 : activeFilterCount}
            >
              <FilterIcon />
            </IconButton>
            <div style={{ position: "relative" }}>
              <IconButton
                label={creating ? "Fechar criação" : "Criar tarefa ou compromisso"}
                dark={creating !== null}
                add={creating === null}
                onClick={() => {
                  if (creating) { setCreating(null); return; }
                  setCreateMenuOpen((v) => !v);
                }}
              >
                <span style={{ display: "flex", transform: creating ? "rotate(45deg)" : "none", transition: "transform 160ms ease" }}>
                  <PlusIcon />
                </span>
              </IconButton>
              {createMenuOpen ? (
                <CreateMenu
                  onClose={() => setCreateMenuOpen(false)}
                  onPick={(k) => { setCreating(k); setCreateMenuOpen(false); setFiltersOpen(false); }}
                  canCreateEvent={!!createEventAction}
                />
              ) : null}
            </div>
          </>
        }
      />

      <RotinaTabs active={view} hrefs={tabHrefs} dayLabel={dayLabel} />

      {creating === "tarefa" ? (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5" aria-label="Nova tarefa">
          <h2 className="mb-4" style={{ fontSize: 15, fontWeight: 600 }}>Nova tarefa</h2>
          <TaskForm
            mode="create"
            rooms={rooms}
            formAction={createTaskAction}
            initialValues={{ start_date: selectedDate }}
            onSuccess={() => setCreating(null)}
            rotations={rotations}
            homeMembers={homeMembers}
          />
        </section>
      ) : null}

      {creating === "evento" && createEventAction ? (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5" aria-label="Novo compromisso">
          <h2 className="mb-4" style={{ fontSize: 15, fontWeight: 600 }}>Novo compromisso</h2>
          <EventForm
            mode="create"
            createAction={createEventAction}
            canAddItems={canAddEventItems}
            initialValues={{ start_date: selectedDate }}
            onSuccess={() => setCreating(null)}
          />
        </section>
      ) : null}

      {filtersOpen ? (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          members={homeMembers}
          userId={userId}
          rooms={rooms}
        />
      ) : activeFilterCount > 0 ? (
        <ActiveFilters
          filters={filters}
          members={homeMembers}
          rooms={rooms}
          onClear={() => setFilters(NO_FILTERS)}
          onOpen={() => setFiltersOpen(true)}
        />
      ) : null}

      {absenceBanner}
    </>
  );

  const footer = (
    <nav aria-label="Mais da rotina" className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2" style={{ fontSize: 13 }}>
      <Link href="/rotina/historico" className="text-muted-foreground underline-offset-4 hover:underline">
        Histórico de execução
      </Link>
      <Link href="/rotina/tarefas" className="text-muted-foreground underline-offset-4 hover:underline">
        Todas as tarefas
      </Link>
      {rotations != null ? (
        <button
          type="button"
          onClick={() => setShowManageRotations(true)}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Rodízios
        </button>
      ) : null}
    </nav>
  );

  const dialogs = (
    <>
      <CelebrationOverlay show={celebrate} onDismiss={handleCelebrateDismiss} />
      <UndoToast item={justDone} onDone={clearJustDone} />
      {rotations != null ? (
        <ManageRotationsDialog
          rotations={rotations}
          homeMembers={homeMembers}
          open={showManageRotations}
          onClose={() => setShowManageRotations(false)}
        />
      ) : null}
    </>
  );

  // ══ Visão SEMANA ══════════════════════════════════════════════════════════
  // Uma linha por tarefa, agrupada por categoria (cômodo). Dias viram pontinhos.
  if (view === "semana") {
    const weekStart = weekDates[0]!;
    const weekEnd = weekDates[6]!;
    const thisWeek = weekDates.includes(currentDate);
    const categories = groupWeekByCategory(displayWeek, rooms);
    const eventDays = groupEventsByDay(events, weekDates);
    const firstOpen = categories.find((c) => c.done < c.total)?.key ?? null;

    return (
      <>
        {chrome}

        <div className="mb-4 flex items-center gap-2">
          <h2 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{formatWeekRange(weekStart, weekEnd)}</h2>
          {!thisWeek ? (
            <Link href={buildHref({ view: "semana", date: currentDate })} style={{ fontSize: 12.5 }} className="text-muted-foreground underline-offset-4 hover:underline">
              Esta semana
            </Link>
          ) : null}
          <StepLink href={buildHref({ view: "semana", date: addDaysStr(selectedDate, -7) })} label="Semana anterior" dir="prev" />
          <StepLink href={buildHref({ view: "semana", date: addDaysStr(selectedDate, 7) })} label="Próxima semana" dir="next" />
        </div>

        <WeekOverview
          summary={summary}
          currentDate={currentDate}
          selectedDate={null}
          hrefForDay={(d) => buildHref({ view: "dia", date: d })}
        />

        {eventDays.length > 0 ? (
          <section aria-labelledby="eventos-semana" className="mt-4 rounded-2xl border border-border bg-card p-3">
            <h3 id="eventos-semana" className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
              <CalendarDays size={15} strokeWidth={1.75} aria-hidden className="text-muted-foreground" />
              Eventos da semana
            </h3>
            <ul className="space-y-2">
              {eventDays.map((d) => (
                <li key={d.date}>
                  <Link
                    href={buildHref({ view: "dia", date: d.date })}
                    className="mb-1 inline-block text-xs font-medium text-muted-foreground no-underline hover:underline"
                  >
                    {formatShortDate(d.date)}
                  </Link>
                  <div className="space-y-1.5">
                    {d.events.map((e) => (
                      <Link key={e.id} href={buildHref({ view: "dia", date: d.date })} className="block no-underline">
                        <EventChip event={e} showKindTag />
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {categories.length === 0 && eventDays.length === 0 ? (
          <div className="mt-4">
            <EmptyCard>
              {activeFilterCount > 0 ? "Nenhuma tarefa com esses filtros nesta semana." : "Nada planejado para esta semana."}
            </EmptyCard>
          </div>
        ) : categories.length === 0 ? null : (
          <div className="mt-4 space-y-2">
            {categories.map((c) => (
              <CollapsibleSection
                key={c.key}
                storageKey={`rotina:semana:${c.key}`}
                defaultOpen={c.key === firstOpen}
                card
                muted={c.done === c.total}
                title={c.name}
                meta={`${c.tasks.length} ${c.tasks.length === 1 ? "tarefa" : "tarefas"} · ${c.done} de ${c.total} feitas`}
              >
                <ul className="px-2 pb-2">
                  {c.tasks.map((t) => (
                    <WeekTaskRowItem
                      key={t.taskId}
                      row={t}
                      weekDates={weekDates}
                      currentDate={currentDate}
                      dayHref={(d) => buildHref({ view: "dia", date: d })}
                    />
                  ))}
                </ul>
              </CollapsibleSection>
            ))}
          </div>
        )}

        {footer}
        {dialogs}
      </>
    );
  }

  // ══ Visão DIA ═════════════════════════════════════════════════════════════
  // Só pendentes ficam nos períodos; concluídas descem para "Concluídas", recolhida.
  type Item =
    | { kind: "task"; key: string; o: OccurrenceWithTask }
    | { kind: "event"; key: string; e: Event };

  const pendingToday = displayToday.filter((o) => o.status === "pending");
  const doneToday = displayToday.filter((o) => o.status === "completed");

  const groups = new Map<DayPeriod, Item[]>();
  for (const o of pendingToday) {
    const p = periodOf(o.task.due_time);
    const list = groups.get(p) ?? [];
    list.push({ kind: "task", key: timeSortKey(o.task.due_time) + o.task.title, o });
    groups.set(p, list);
  }
  for (const e of dayEvents) {
    const p = periodOf(e.start_time);
    const list = groups.get(p) ?? [];
    list.push({ kind: "event", key: timeSortKey(e.start_time) + e.title, e });
    groups.set(p, list);
  }
  for (const list of groups.values()) list.sort((a, b) => a.key.localeCompare(b.key));

  const taskCount = displayToday.length;
  const doneCount = doneToday.length;
  const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <>
      {chrome}

      {/* Dia aberto */}
      <div className="flex items-center gap-1">
        <h2 style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0 }}>
          {formatDayHeading(selectedDate)}
        </h2>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)", marginRight: 6 }}>
          {taskCount === 0 ? "Nada planejado" : `${doneCount} de ${taskCount} feitas`}
        </span>
        <StepLink href={buildHref({ view: "dia", date: addDaysStr(selectedDate, -1) })} label="Dia anterior" dir="prev" />
        <StepLink href={buildHref({ view: "dia", date: addDaysStr(selectedDate, 1) })} label="Próximo dia" dir="next" />
      </div>
      {taskCount > 0 ? (
        <div
          role="progressbar"
          aria-label="Tarefas do dia feitas"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={taskCount}
          style={{ marginTop: 10, height: 4, borderRadius: 2, background: "var(--secondary)", overflow: "hidden" }}
        >
          <div style={{ height: "100%", width: `${pct}%`, background: "#D98A2B", borderRadius: 2, transition: "width 400ms cubic-bezier(.2,.7,.2,1)" }} />
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {/* Pendências de dias anteriores: recolhidas, visíveis pela contagem, sem pressão */}
        {displayOverdue.length > 0 ? (
          <CollapsibleSection
            storageKey="rotina:dia:atras"
            defaultOpen={false}
            icon={<PeriodIcon kind="atras" />}
            title="Ficaram para trás"
            meta={String(displayOverdue.length)}
            tone="warn"
          >
            <ul className="space-y-2 pt-1">{displayOverdue.map(renderOccurrence)}</ul>
          </CollapsibleSection>
        ) : null}

        {taskCount === 0 && dayEvents.length === 0 ? (
          <EmptyCard>
            {activeFilterCount > 0 ? (
              <>
                <p>Nenhuma tarefa com esses filtros neste dia.</p>
                <button type="button" onClick={() => setFilters(NO_FILTERS)} className="mt-3 font-medium text-foreground underline underline-offset-4">
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <p>Nada planejado para este dia.</p>
                <button type="button" onClick={() => setCreating("tarefa")} className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-add px-4 font-semibold text-add-foreground hover:bg-add-hover">
                  <Plus size={16} aria-hidden />
                  Criar uma tarefa
                </button>
              </>
            )}
          </EmptyCard>
        ) : pendingToday.length === 0 && dayEvents.length === 0 ? (
          <EmptyCard>
            <p style={{ color: "var(--foreground)", fontWeight: 500 }}>Tudo feito por hoje.</p>
            <p className="mt-1">O que foi concluído está logo abaixo.</p>
          </EmptyCard>
        ) : (
          PERIOD_ORDER.filter((p) => groups.has(p)).map((p) => (
            <section key={p} aria-labelledby={`sec-${p}`}>
              <PeriodHeading id={`sec-${p}`} icon={p} label={PERIOD_LABEL[p]} />
              <ul className="space-y-2">
                {groups.get(p)!.map((it) => (it.kind === "task" ? renderOccurrence(it.o) : renderEvent(it.e)))}
              </ul>
            </section>
          ))
        )}

        {doneToday.length > 0 ? (
          <CollapsibleSection
            storageKey="rotina:dia:concluidas"
            defaultOpen={false}
            icon={<CheckDot />}
            title="Concluídas"
            meta={String(doneToday.length)}
          >
            <ul className="space-y-2 pt-1">{doneToday.map(renderOccurrence)}</ul>
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          storageKey="rotina:dia:semana"
          defaultOpen={false}
          icon={<WeekIcon />}
          title="Visão da semana"
          meta={`${summary.done} de ${summary.planned} feitas`}
        >
          <div className="pt-1">
            <WeekOverview
              summary={summary}
              currentDate={currentDate}
              selectedDate={selectedDate}
              hrefForDay={(d) => buildHref({ view: "dia", date: d })}
              weekHref={buildHref({ view: "semana", date: selectedDate })}
              bare
            />
          </div>
        </CollapsibleSection>
      </div>

      {footer}
      {dialogs}
    </>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

const baseIconProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function PeriodIcon({ kind, small = false }: { kind: DayPeriod | "atras"; small?: boolean }) {
  const iconProps = small ? { ...baseIconProps, width: 12, height: 12 } : baseIconProps;
  switch (kind) {
    case "manha":
      return (
        <svg {...iconProps}>
          <path d="M12 2v6M8 5l4-3 4 3M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M16 18a4 4 0 0 0-8 0" />
        </svg>
      );
    case "tarde":
      return (
        <svg {...iconProps}>
          <path d="M12 8V2M8 5l4 3 4-3M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M16 18a4 4 0 0 0-8 0" />
        </svg>
      );
    case "noite":
      return (
        <svg {...iconProps}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      );
    case "atras":
      return (
        <svg {...iconProps}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5M12 7v5l3 2" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}

function PeriodHeading({ id, icon, label, count }: { id: string; icon: DayPeriod | "atras"; label: string; count?: number }) {
  return (
    <h3
      id={id}
      className="mb-2 flex items-center gap-2"
      style={{ fontSize: 14, fontWeight: 600, color: icon === "atras" ? "var(--warn-ink)" : "var(--foreground)" }}
    >
      <span style={{ color: icon === "atras" ? "var(--warn-ink)" : "var(--muted-foreground)", display: "flex" }}>
        <PeriodIcon kind={icon} />
      </span>
      {label}
      {count != null ? (
        <span style={{ fontWeight: 500, color: "var(--muted-foreground)", fontSize: 12.5 }}>{count}</span>
      ) : null}
    </h3>
  );
}

function StepLink({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex shrink-0 items-center justify-center rounded-full border border-border focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ width: 32, height: 32, background: "var(--card)", color: "var(--muted-foreground)" }}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </Link>
  );
}

/**
 * "Visão da semana": sete colunas que enchem de âmbar conforme as tarefas do dia
 * são concluídas, mais a contagem planejadas / concluídas / pendentes / futuras.
 */
function WeekOverview({
  summary,
  currentDate,
  selectedDate,
  hrefForDay,
  weekHref,
  bare = false,
}: {
  summary: WeekSummary;
  currentDate: string;
  selectedDate: string | null;
  hrefForDay: (date: string) => string;
  weekHref?: string;
  /** Dentro de uma seção recolhível: sem cartão nem título próprios. */
  bare?: boolean;
}) {
  const parts = [
    `${summary.planned} ${summary.planned === 1 ? "tarefa planejada" : "tarefas planejadas"}`,
    `${summary.done} ${summary.done === 1 ? "concluída" : "concluídas"}`,
    `${summary.pending} ${summary.pending === 1 ? "pendente" : "pendentes"}`,
    `${summary.future} ${summary.future === 1 ? "futura" : "futuras"}`,
  ];

  return (
    <section
      aria-label={bare ? "Progresso da semana" : undefined}
      aria-labelledby={bare ? undefined : "visao-semana"}
      className="rounded-2xl border border-border"
      style={{ background: "var(--card)", padding: bare ? "4px 16px 14px" : "16px 16px 14px" }}
    >
      {bare ? null : (
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="visao-semana" style={{ fontSize: 15, fontWeight: 600 }}>Visão da semana</h2>
        </div>
      )}

      <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Progresso por dia">
        {summary.days.map((day) => {
          const d = parseISO(day.date);
          const ratio = day.total > 0 ? day.done / day.total : 0;
          const isTodayCol = day.date === currentDate;
          const isSel = day.date === selectedDate;
          const label = `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()}: ${
            day.total === 0 ? "nada planejado" : `${day.done} de ${day.total} concluídas`
          }`;
          return (
            <li key={day.date}>
              <Link
                href={hrefForDay(day.date)}
                aria-label={label}
                aria-current={isSel ? "date" : undefined}
                title={label}
                className="flex flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-offset-1"
              >
                <span
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: 26,
                    height: 40,
                    borderRadius: 8,
                    background: "var(--secondary)",
                    overflow: "hidden",
                    opacity: day.total === 0 ? 0.55 : 1,
                    outline: isSel ? "1.5px solid var(--foreground)" : "none",
                    outlineOffset: 2,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: `${Math.round(ratio * 100)}%`,
                      background: "#D98A2B",
                      transition: "height 400ms cubic-bezier(.2,.7,.2,1)",
                    }}
                  />
                </span>
                <span
                  style={{
                    fontSize: 11,
                    lineHeight: 1,
                    fontWeight: isTodayCol ? 700 : 500,
                    color: isTodayCol ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {WEEKDAY_INITIAL[d.getDay()]}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 10, lineHeight: 1.5 }}>
        {parts.join(" · ")}
      </p>
      {weekHref ? (
        <Link href={weekHref} className="mt-2 inline-block font-medium underline underline-offset-4" style={{ fontSize: 12.5 }}>
          Ver semana por categoria
        </Link>
      ) : null}
    </section>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border px-5 py-6 text-center"
      style={{ fontSize: 13.5, color: "var(--muted-foreground)" }}
    >
      {children}
    </div>
  );
}

function CheckDot() {
  return (
    <span
      style={{
        width: 17, height: 17, borderRadius: 9, background: "var(--done-bg)", color: "var(--done-ink)", boxShadow: "inset 0 0 0 1.5px var(--done-ring)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

function WeekIcon() {
  return (
    <svg {...baseIconProps}>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  );
}

const PERIOD_SHORT: Record<DayPeriod, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  livre: "Livre",
};

/**
 * Linha da semana: título, período ao lado e 7 pontinhos (Seg–Dom).
 * Cheio = feito · vazio = planejado · tracinho = não acontece nesse dia · anel = hoje.
 * Tocar abre os dias da tarefa para concluir ali mesmo.
 */
function WeekTaskRowItem({
  row,
  weekDates,
  currentDate,
  dayHref,
}: {
  row: WeekTaskRow;
  weekDates: string[];
  currentDate: string;
  dayHref: (date: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const time = formatTime(row.dueTime);
  const allDone = row.done === row.total;

  return (
    <li style={{ borderTop: "1px solid var(--border)" }} className="first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
        style={{ minHeight: 48 }}
      >
        <span className="min-w-0 flex-1">
          <span
            className="block truncate"
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: allDone ? "var(--muted-foreground)" : "var(--foreground)",
            }}
          >
            {row.title}
          </span>
          <span className="flex items-center gap-1" style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 1 }}>
            <PeriodIcon kind={row.period} small />
            {PERIOD_SHORT[row.period]}
            {time ? ` · ${time}` : ""}
          </span>
        </span>
        <span
          className="flex shrink-0 items-center gap-[5px]"
          aria-label={`${row.done} de ${row.total} feitas nesta semana`}
          role="img"
        >
          {weekDates.map((d) => {
            const o = row.byDate[d];
            const isTodayDot = d === currentDate;
            const base: React.CSSProperties = { width: 8, height: 8, borderRadius: 4, flexShrink: 0 };
            if (!o) {
              return <span key={d} style={{ ...base, height: 2, borderRadius: 1, background: "var(--border)" }} />;
            }
            const done = o.status === "completed";
            return (
              <span
                key={d}
                style={{
                  ...base,
                  background: done ? "var(--done-bg)" : "transparent",
                  border: done ? "1.5px solid var(--done-ring)" : "1.5px solid var(--muted-foreground)",
                  boxShadow: isTodayDot ? "0 0 0 2px var(--card), 0 0 0 3.5px var(--foreground)" : "none",
                  opacity: o.status === "missed" ? 0.45 : 1,
                }}
              />
            );
          })}
        </span>
      </button>

      {open ? (
        <ul className="flex flex-wrap gap-1.5 px-2 pb-3">
          {weekDates.map((d) => {
            const o = row.byDate[d];
            if (!o) return null;
            const dd = parseISO(d);
            const label = `${WEEKDAY_SHORT[dd.getDay()]} ${dd.getDate()}`;
            return (
              <li
                key={d}
                className="flex items-center gap-1.5 rounded-xl border border-border"
                style={{ padding: "3px 10px 3px 4px", background: "var(--background)" }}
              >
                {o.status === "pending" ? (
                  <CompleteCircleButton occurrenceId={o.id} title={`${row.title} (${label})`} />
                ) : o.status === "completed" ? (
                  <span role="img" aria-label="Feita" style={{ display: "flex", width: 26, justifyContent: "center" }}>
                    <CheckDot />
                  </span>
                ) : (
                  <span role="img" aria-label="Não feita" style={{ width: 26, display: "flex", justifyContent: "center" }}>
                    <span style={{ width: 17, height: 17, borderRadius: 9, border: "1.5px dashed var(--muted-foreground)", opacity: 0.6 }} />
                  </span>
                )}
                <Link
                  href={dayHref(d)}
                  className="underline-offset-4 hover:underline"
                  style={{ fontSize: 12.5, fontWeight: d === currentDate ? 600 : 500 }}
                >
                  {d === currentDate ? "Hoje" : label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/** Aviso flutuante depois de concluir: a tarefa saiu da lista, mas dá para voltar atrás. */
function UndoToast({ item, onDone }: { item: { id: string; title: string } | null; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [item, onDone]);

  if (!item) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl"
      style={{
        bottom: 96,
        width: "min(360px, calc(100vw - 40px))",
        padding: "10px 10px 10px 16px",
        background: "var(--nav-active)",
        color: "var(--nav-active-ink)",
        boxShadow: "0 10px 30px rgba(40,20,10,0.25)",
        fontSize: 13.5,
      }}
    >
      <span className="min-w-0 flex-1 truncate">Concluída: {item.title}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const fd = new FormData();
            fd.set("occurrence_id", item.id);
            await undoComplete(initialFormState, fd);
            onDone();
          })
        }
        className="shrink-0 rounded-lg px-3 focus-visible:outline-2"
        style={{ height: 32, fontWeight: 600, color: "#F2C48D" }}
      >
        {pending ? "Desfazendo…" : "Desfazer"}
      </button>
    </div>
  );
}

function CreateMenu({
  onClose,
  onPick,
  canCreateEvent,
}: {
  onClose: () => void;
  onPick: (k: "tarefa" | "evento") => void;
  canCreateEvent: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    function onPointer(e: PointerEvent) {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !ref.current.parentElement?.contains(t)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const item = "flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card py-1"
      style={{ boxShadow: "0 10px 30px rgba(60,35,15,0.16)" }}
    >
      <button role="menuitem" type="button" className={item} onClick={() => onPick("tarefa")}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Nova tarefa</span>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Uma vez ou recorrente</span>
      </button>
      {canCreateEvent ? (
        <button role="menuitem" type="button" className={item} onClick={() => onPick("evento")}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Novo compromisso</span>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Consulta, visita, aniversário…</span>
        </button>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        height: 32,
        borderRadius: 10,
        padding: "0 12px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        border: `1px solid ${active ? "transparent" : "var(--border)"}`,
        background: active ? "var(--nav-active)" : "var(--card)",
        color: active ? "var(--nav-active-ink)" : "var(--foreground)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function FilterPanel({
  filters,
  onChange,
  members,
  userId,
  rooms,
}: {
  filters: RotinaFilters;
  onChange: (f: RotinaFilters) => void;
  members: Member[];
  userId?: string;
  rooms: Array<{ id: string; name: string }>;
}) {
  const setMember = (m: string | null) => onChange({ ...filters, member: filters.member === m ? null : m });
  const setRoom = (r: string | null) => onChange({ ...filters, room: filters.room === r ? null : r });
  const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8 };

  return (
    <section
      aria-label="Filtros"
      className="mb-5 rounded-2xl border border-border"
      style={{ background: "var(--card)", padding: 16 }}
    >
      <fieldset>
        <legend style={labelStyle}>Quem faz</legend>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filters.member === null} onClick={() => setMember(null)}>Todos</Chip>
          {userId ? <Chip active={filters.member === "mine"} onClick={() => setMember("mine")}>Minhas</Chip> : null}
          <Chip active={filters.member === "shared"} onClick={() => setMember("shared")}>Compartilhadas</Chip>
          {members.filter((m) => m.id !== userId).map((m) => (
            <Chip key={m.id} active={filters.member === m.id} onClick={() => setMember(m.id)}>
              {firstName(m.name)}
            </Chip>
          ))}
        </div>
      </fieldset>

      {rooms.length > 0 ? (
        <fieldset className="mt-4">
          <legend style={labelStyle}>Categoria</legend>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={filters.room === null} onClick={() => setRoom(null)}>Todas</Chip>
            {rooms.map((r) => (
              <Chip key={r.id} active={filters.room === r.id} onClick={() => setRoom(r.id)}>
                {r.name}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3" style={{ fontSize: 13.5 }}>
        <span>
          Só essenciais
          <span className="block" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            O mínimo para a casa funcionar em dias corridos
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={filters.essential}
          onClick={() => onChange({ ...filters, essential: !filters.essential })}
          className="focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            width: 44, height: 26, borderRadius: 13, flexShrink: 0, position: "relative",
            background: filters.essential ? "var(--nav-active)" : "var(--secondary)",
            border: filters.essential ? "none" : "1px solid var(--border)",
            transition: "background 140ms ease",
          }}
        >
          <span
            style={{
              position: "absolute", top: 3, left: filters.essential ? 21 : 3,
              width: 20, height: 20, borderRadius: 10,
              background: filters.essential ? "var(--nav-active-ink)" : "var(--card)",
              boxShadow: "0 1px 2px rgba(0,0,0,.15)",
              transition: "left 140ms ease",
            }}
          />
        </button>
      </label>
    </section>
  );
}

function ActiveFilters({
  filters,
  members,
  rooms,
  onClear,
  onOpen,
}: {
  filters: RotinaFilters;
  members: Member[];
  rooms: Array<{ id: string; name: string }>;
  onClear: () => void;
  onOpen: () => void;
}) {
  const labels: string[] = [];
  if (filters.member === "mine") labels.push("Minhas");
  else if (filters.member === "shared") labels.push("Compartilhadas");
  else if (filters.member) labels.push(firstName(members.find((m) => m.id === filters.member)?.name));
  if (filters.room) labels.push(rooms.find((r) => r.id === filters.room)?.name ?? "Categoria");
  if (filters.essential) labels.push("Só essenciais");

  return (
    <div className="mb-4 flex items-center gap-2" style={{ fontSize: 12.5 }}>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 truncate text-left"
        style={{
          height: 30, borderRadius: 10, padding: "0 10px",
          background: "var(--secondary)", color: "var(--foreground)", fontWeight: 500,
        }}
      >
        Filtrando: {labels.join(", ")}
      </button>
      <button type="button" onClick={onClear} className="shrink-0 text-muted-foreground underline underline-offset-4">
        Limpar
      </button>
    </div>
  );
}
