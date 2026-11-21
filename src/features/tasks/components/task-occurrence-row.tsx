"use client";

import { useActionState, useState } from "react";
import {
  completeOccurrence,
  undoComplete,
  skipOccurrence,
  postponeOccurrence,
  claimOccurrence,
  unclaimOccurrence,
} from "@/features/tasks/actions";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import type { RotationInfo } from "@/features/tasks/queries-rotations";

function daysBetween(dateFrom: string, dateTo: string): number {
  const msPerDay = 86_400_000;
  const a = new Date(dateFrom + "T00:00:00Z").getTime();
  const b = new Date(dateTo + "T00:00:00Z").getTime();
  return Math.round((b - a) / msPerDay);
}

function priorityBadgeClass(priority: "alta" | "media" | "baixa"): string {
  switch (priority) {
    case "alta":
      return "bg-red-100 text-red-700";
    case "media":
      return "bg-yellow-100 text-yellow-700";
    case "baixa":
      return "bg-muted text-muted-foreground";
  }
}

function priorityLabel(priority: "alta" | "media" | "baixa"): string {
  switch (priority) {
    case "alta":
      return "Alta";
    case "media":
      return "Média";
    case "baixa":
      return "Baixa";
  }
}

type Props = {
  occurrence: OccurrenceWithTask;
  today: string;
  userId?: string;
  rotationInfo?: RotationInfo;
  onEdit?: () => void;
};

export function TaskOccurrenceRow({ occurrence, today, userId, rotationInfo, onEdit }: Props) {
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
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${priorityBadgeClass(pKey)}`}
          >
            {priorityLabel(pKey)}
          </span>
          {occurrence.task.is_essential ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Essencial
            </span>
          ) : null}
        </div>

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
              <span className="text-xs text-muted-foreground">Atribuída a outro membro</span>
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
      <div className="relative shrink-0">
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


