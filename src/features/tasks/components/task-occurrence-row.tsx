"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  completeOccurrence,
  undoComplete,
  skipOccurrence,
  postponeOccurrence,
  claimOccurrence,
  unclaimOccurrence,
  updateOccurrenceNotes,
} from "@/features/tasks/actions";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import type { RotationInfo } from "@/features/tasks/queries-rotations";
import { PRIORITY_LABEL, PRIORITY_BADGE_CLASS } from "@/features/tasks/labels";

function daysBetween(dateFrom: string, dateTo: string): number {
  const msPerDay = 86_400_000;
  const a = new Date(dateFrom + "T00:00:00Z").getTime();
  const b = new Date(dateTo + "T00:00:00Z").getTime();
  return Math.round((b - a) / msPerDay);
}

type Props = {
  occurrence: OccurrenceWithTask;
  today: string;
  userId?: string;
  rotationInfo?: RotationInfo;
  onEdit?: () => void;
  rooms?: Array<{ id: string; name: string }>;
  homeMembers?: Array<{ id: string; name: string | null }>;
};

export function TaskOccurrenceRow({ occurrence, today, userId, rotationInfo, onEdit, rooms, homeMembers }: Props) {
  const roomName = rooms?.find((r) => r.id === occurrence.task.room_id)?.name ?? null;
  const assignedMemberName = occurrence.assigned_to && homeMembers
    ? (homeMembers.find((m) => m.id === occurrence.assigned_to)?.name ?? null)
    : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPostpone, setShowPostpone] = useState(false);

  const [, completeDispatch, completePending] = useActionState(
    completeOccurrence,
    initialFormState,
  );
  const [undoState, undoDispatch, undoPending] = useActionState(
    undoComplete,
    initialFormState,
  );
  const [, skipDispatch, skipPending] = useActionState(
    skipOccurrence,
    initialFormState,
  );
  const [postponeState, postponeDispatch, postponePending] = useActionState(
    postponeOccurrence,
    initialFormState,
  );
  const [claimState, claimDispatch, claimPending] = useActionState(
    claimOccurrence,
    initialFormState,
  );
  const [, unclaimDispatch, unclaimPending] = useActionState(
    unclaimOccurrence,
    initialFormState,
  );

  const [showInstructions, setShowInstructions] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [notesState, notesDispatch, notesPending] = useActionState(
    updateOccurrenceNotes,
    initialFormState,
  );

  useEffect(() => {
    if (!menuOpen) return;

    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
        );
        if (items.length === 0) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? (idx + 1) % items.length
            : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    }
    function handlePointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (notesState.status === "success") setShowNoteEditor(false);
  }, [notesState.status]);

  const isCompleted = occurrence.status === "completed";
  const isOverdue = occurrence.scheduled_for < today;
  const daysOverdue = isOverdue ? daysBetween(occurrence.scheduled_for, today) : 0;
  const pKey = occurrence.task.priority;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {/* Complete / Completed indicator */}
      {isCompleted ? (
        <span
          aria-label="Concluída"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage text-xs text-white"
        >
          ✓
        </span>
      ) : (
        <form action={completeDispatch} className="mt-0.5 shrink-0">
          <input type="hidden" name="occurrence_id" value={occurrence.id} />
          <button
            type="submit"
            disabled={completePending}
            aria-label="Marcar como concluída"
            className="h-5 w-5 rounded-full border-2 border-stone transition-colors hover:bg-muted disabled:opacity-50"
          />
        </form>
      )}

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium leading-snug ${
              isCompleted ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {occurrence.task.title}
          </span>
          {rotationInfo && (
            <span
              title={`Rodízio: ${rotationInfo.name}${rotationInfo.currentMemberName ? ` · Responsável: ${rotationInfo.currentMemberName}` : ""}${rotationInfo.nextMemberName ? ` · Próximo: ${rotationInfo.nextMemberName}` : ""}`}
              className="ml-1 text-xs text-muted-foreground"
              aria-label="tarefa em rodízio"
            >
              {String.fromCodePoint(0x267B)}
            </span>
          )}
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASS[pKey]}`}
          >
            {PRIORITY_LABEL[pKey]}
          </span>
          {occurrence.task.is_essential ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Essencial
            </span>
          ) : null}
        </div>

        {roomName ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{roomName}</p>
        ) : null}

        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {isOverdue && !isCompleted ? (
            <span className="text-destructive">
              Atrasada · há {daysOverdue} {daysOverdue === 1 ? "dia" : "dias"}
            </span>
          ) : null}
          {occurrence.task.instructions ? (
            <button
              type="button"
              onClick={() => setShowInstructions((v) => !v)}
              className="underline-offset-2 hover:underline"
            >
              {showInstructions ? "Ocultar instruções" : "Como fazer"}
            </button>
          ) : null}
        </div>

        {/* Instructions */}
        {showInstructions && occurrence.task.instructions ? (
          <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
            {occurrence.task.instructions}
          </p>
        ) : null}

        {/* Note display */}
        {occurrence.notes && !showNoteEditor ? (
          <p className="mt-1 text-xs text-muted-foreground italic">
            &ldquo;{occurrence.notes}&rdquo;
          </p>
        ) : null}

        {/* Note editor */}
        {showNoteEditor ? (
          <form action={notesDispatch} className="mt-2">
            <input type="hidden" name="occurrence_id" value={occurrence.id} />
            <textarea
              name="notes"
              aria-label="Nota da ocorrência"
              defaultValue={occurrence.notes ?? ""}
              maxLength={2000}
              rows={2}
              autoFocus
              placeholder="Adicione uma nota..."
              className="w-full resize-none rounded border border-input bg-background px-2 py-1 text-sm"
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={notesPending}>
                {notesPending ? "Salvando…" : "Salvar nota"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNoteEditor(false)}
              >
                Cancelar
              </Button>
              {notesState.status === "error" ? (
                <span className="text-xs text-destructive">{notesState.message}</span>
              ) : null}
            </div>
          </form>
        ) : null}

        {/* Assignment */}
        {!isCompleted ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {occurrence.assigned_to === null ? (
              <form action={claimDispatch}>
                <input type="hidden" name="occurrence_id" value={occurrence.id} />
                <Button type="submit" variant="outline" size="sm" disabled={claimPending}>
                  {claimPending ? "Aguarde…" : "Eu pego"}
                </Button>
              </form>
            ) : occurrence.assigned_to === userId ? (
              <>
                <span className="text-xs font-medium text-primary">Você pegou</span>
                <form action={unclaimDispatch}>
                  <input type="hidden" name="occurrence_id" value={occurrence.id} />
                  <Button type="submit" variant="ghost" size="sm" disabled={unclaimPending}>
                    Liberar
                  </Button>
                </form>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {assignedMemberName ? `Atribuída a ${assignedMemberName}` : "Atribuída a outro membro"}
              </span>
            )}
            {claimState.status === "error" && claimState.message ? (
              <p className="text-xs text-destructive">{claimState.message}</p>
            ) : null}
          </div>
        ) : null}

        {/* Undo error */}
        {undoState.status === "error" && undoState.message ? (
          <p className="mt-1 text-xs text-destructive">{undoState.message}</p>
        ) : null}

        {/* Postpone inline form */}
        {showPostpone ? (
          <form action={postponeDispatch} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="occurrence_id" value={occurrence.id} />
            <input
              type="date"
              name="new_date"
              min={today}
              required
              aria-label="nova data"
              className="rounded border border-input bg-background px-2 py-1 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={postponePending}
            >
              {postponePending ? "Adiando…" : "Adiar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPostpone(false)}
            >
              Cancelar
            </Button>
            {postponeState.status === "error" ? (
              <span className="w-full text-xs text-destructive">
                {postponeState.fieldErrors?.new_date ?? postponeState.message}
              </span>
            ) : null}
          </form>
        ) : null}
      </div>

      {/* Menu "⋯" */}
      <div ref={menuRef} className="relative shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setMenuOpen((v) => !v);
            setShowPostpone(false);
          }}
          aria-label="Mais opções"
          aria-expanded={menuOpen}
        >
          ⋯
        </Button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          >
            {/* Editar — always available */}
            {onEdit ? (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  onEdit();
                  closeMenu();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                Editar
              </button>
            ) : null}

            {/* Adiar — only when not completed */}
            {!isCompleted ? (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setShowPostpone(true);
                  closeMenu();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                Adiar
              </button>
            ) : null}

            {/* Pular — only when not completed */}
            {!isCompleted ? (
              <form action={skipDispatch}>
                <input type="hidden" name="occurrence_id" value={occurrence.id} />
                <button
                  role="menuitem"
                  type="submit"
                  disabled={skipPending}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  {skipPending ? "Pulando…" : "Pular"}
                </button>
              </form>
            ) : null}

            {/* Nota — always available */}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setShowNoteEditor(true);
                closeMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
            >
              {occurrence.notes ? "Editar nota" : "Adicionar nota"}
            </button>

            {/* Desfazer — only when completed */}
            {isCompleted ? (
              <form action={undoDispatch}>
                <input type="hidden" name="occurrence_id" value={occurrence.id} />
                <button
                  role="menuitem"
                  type="submit"
                  disabled={undoPending}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  {undoPending ? "Desfazendo…" : "Desfazer"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}


