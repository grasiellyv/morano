"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  completeOccurrence,
  undoComplete,
  skipOccurrence,
  postponeOccurrence,
  claimOccurrence,
  unclaimOccurrence,
  updateOccurrenceNotes,
} from "@/features/tasks/actions";
import { toast } from "sonner";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import type { RotationInfo } from "@/features/tasks/queries-rotations";
import { FREQUENCY_SHORT, formatTime, formatShortDate, firstName } from "@/features/tasks/rotina-format";
import { ChecklistList, checklistProgress } from "@/features/tasks/components/checklist-list";

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  occurrence: OccurrenceWithTask;
  today: string;
  userId?: string;
  rotationInfo?: RotationInfo;
  onEdit?: () => void;
  /** Chamado quando a conclusão é confirmada pelo servidor (para o aviso "Desfazer"). */
  onCompleted?: (o: OccurrenceWithTask) => void;
  /**
   * Concluir/desfazer é otimista: a lista pai troca o status na hora ("completed"/"pending")
   * e volta ao que era (`null`) se o servidor recusar ou a rede falhar.
   */
  onStatusChange?: (id: string, status: "completed" | "pending" | null) => void;
  rooms?: Array<{ id: string; name: string }>;
  homeMembers?: Array<{ id: string; name: string | null }>;
};

/**
 * Linha de tarefa da visão diária.
 * [ bolinha de concluir ] título / quem · horário · cômodo · recorrência [ ⋯ ]
 * Concluir afeta só esta ocorrência — a recorrência continua gerando as próximas.
 */
export function TaskOccurrenceRow({
  occurrence,
  today,
  userId,
  rotationInfo,
  onEdit,
  onCompleted,
  onStatusChange,
  rooms,
  homeMembers,
}: Props) {
  const roomName = rooms?.find((r) => r.id === occurrence.task.room_id)?.name ?? null;
  const assignedMember =
    occurrence.assigned_to && homeMembers
      ? (homeMembers.find((m) => m.id === occurrence.assigned_to) ?? null)
      : null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showPostpone, setShowPostpone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // Concluir/desfazer: o status muda na tela ANTES da resposta do servidor (no onSubmit do
  // formulário, fora da transição da action — setState dentro de uma action assíncrona só
  // aparece quando ela termina) e a action roda com `no_refresh` (sem reler a página inteira).
  // Erro ou queda de rede reverte e avisa.
  const [, completeDispatch, completePending] = useActionState(
    async (prev: Awaited<ReturnType<typeof completeOccurrence>>, fd: FormData) => {
      fd.set("no_refresh", "1");
      try {
        const res = await completeOccurrence(prev, fd);
        if (res.status === "error") {
          onStatusChange?.(occurrence.id, null);
          toast.error(res.message ?? "Não foi possível concluir. Tente novamente.");
        } else {
          onCompleted?.(occurrence);
        }
        return res;
      } catch {
        // Não relança: erro em action vai para o error boundary e derrubaria a página.
        onStatusChange?.(occurrence.id, null);
        toast.error("Não foi possível concluir. Verifique a conexão e tente novamente.");
        return { status: "error" as const, message: "Falha de conexão." };
      }
    },
    initialFormState,
  );
  const [undoState, undoDispatch, undoPending] = useActionState(
    async (prev: Awaited<ReturnType<typeof undoComplete>>, fd: FormData) => {
      fd.set("no_refresh", "1");
      try {
        const res = await undoComplete(prev, fd);
        if (res.status === "error") {
          onStatusChange?.(occurrence.id, null);
          toast.error(res.message ?? "Não foi possível desfazer. Tente novamente.");
        }
        return res;
      } catch {
        onStatusChange?.(occurrence.id, null);
        toast.error("Não foi possível desfazer. Verifique a conexão e tente novamente.");
        return { status: "error" as const, message: "Falha de conexão." };
      }
    },
    initialFormState,
  );
  // Ações disparadas pelo menu fecham o menu quando terminam. Não fechamos no
  // clique: desmontar o <form> antes do submit cancelaria o envio.
  const closingAfter =
    (action: typeof skipOccurrence) =>
    async (prev: Awaited<ReturnType<typeof skipOccurrence>>, fd: FormData) => {
      const res = await action(prev, fd);
      setMenuOpen(false);
      return res;
    };
  const [, skipDispatch, skipPending] = useActionState(closingAfter(skipOccurrence), initialFormState);
  const [postponeState, postponeDispatch, postponePending] = useActionState(postponeOccurrence, initialFormState);
  const [claimState, claimDispatch, claimPending] = useActionState(closingAfter(claimOccurrence), initialFormState);
  const [, unclaimDispatch, unclaimPending] = useActionState(closingAfter(unclaimOccurrence), initialFormState);
  const [notesState, notesDispatch, notesPending] = useActionState(updateOccurrenceNotes, initialFormState);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setMenuOpen(false); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    }
    function handlePointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
  const isOverdue = !isCompleted && occurrence.scheduled_for < today;
  const isMine = !!userId && occurrence.assigned_to === userId;
  const isShared = occurrence.assigned_to === null;
  const time = formatTime(occurrence.task.due_time);
  const freq = occurrence.task.routine?.frequency_type;
  const isHigh = occurrence.task.priority === "alta";

  // Quem: responsável, ou "Compartilhada" quando ninguém pegou (qualquer morador pode fazer).
  const who = isMine
    ? "Você"
    : assignedMember
      ? firstName(assignedMember.name)
      : rotationInfo?.currentMemberName
        ? firstName(rotationInfo.currentMemberName)
        : "Compartilhada";

  const metaParts: string[] = [who];
  if (isOverdue) metaParts.push(`desde ${formatShortDate(occurrence.scheduled_for)}`);
  if (time) metaParts.push(time);
  if (roomName) metaParts.push(roomName);

  const checklist = occurrence.task.checklist ?? [];
  const cl = checklistProgress(checklist, occurrence.checklist_states);
  const detailHref = `/rotina/ocorrencia/${occurrence.id}`;

  const showExpanded =
    showChecklist ||
    showPostpone ||
    showNoteEditor ||
    showInstructions ||
    (!!occurrence.notes && !showNoteEditor) ||
    (undoState.status === "error" && !!undoState.message) ||
    (claimState.status === "error" && !!claimState.message);

  const checked = isCompleted || completePending;

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--card)",
      }}
    >
      <div style={{ minHeight: 58, display: "flex", alignItems: "center", gap: 4, padding: "0 4px 0 2px" }}>
        {/* Concluir / desfazer — área de toque 44, bolinha visual 24 */}
        <form
          action={isCompleted ? undoDispatch : completeDispatch}
          onSubmit={() => onStatusChange?.(occurrence.id, isCompleted ? "pending" : "completed")}
          style={{ flexShrink: 0 }}
        >
          <input type="hidden" name="occurrence_id" value={occurrence.id} />
          <button
            type="submit"
            disabled={completePending || undoPending}
            aria-label={isCompleted ? `Desfazer conclusão: ${occurrence.task.title}` : `Concluir: ${occurrence.task.title}`}
            aria-pressed={isCompleted}
            className="group focus-visible:outline-2 focus-visible:outline-offset-[-4px] rounded-full"
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              cursor: completePending || undoPending ? "default" : "pointer",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: checked ? "var(--done-bg)" : "transparent",
                color: "var(--done-ink)",
                boxShadow: checked ? "inset 0 0 0 1.5px var(--done-ring)" : "none",
                border: checked ? "none" : "1.5px solid var(--muted-foreground)",
                opacity: undoPending ? 0.5 : 1,
                transition: "background 140ms ease, transform 140ms ease",
                transform: completePending ? "scale(0.92)" : "none",
              }}
            >
              {checked ? (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </span>
          </button>
        </form>

        {/* Título + meta */}
        <div style={{ flex: 1, minWidth: 0, padding: "9px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: isCompleted ? "var(--muted-foreground)" : "var(--foreground)",
                textDecoration: isCompleted ? "line-through" : "none",
                textDecorationThickness: 1.5,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <Link href={detailHref} className="hover:underline focus-visible:underline focus-visible:outline-none underline-offset-4">
                {occurrence.task.title}
              </Link>
            </span>
            {isHigh && !isCompleted ? (
              <span
                title="Prioridade alta"
                style={{ width: 6, height: 6, borderRadius: 3, background: "#C8643C", flexShrink: 0 }}
              >
                <span className="sr-only">Prioridade alta</span>
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 2,
              color: isOverdue ? "var(--warn-ink)" : "var(--muted-foreground)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {metaParts.join(" · ")}
            </span>
            {freq && freq !== "once" ? (
              <span
                title={rotationInfo ? `${FREQUENCY_SHORT[freq]} · rodízio ${rotationInfo.name}` : FREQUENCY_SHORT[freq]}
                style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}
              >
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 2l3 3-3 3" />
                  <path d="M4 11v-1a5 5 0 0 1 5-5h11" />
                  <path d="M7 22l-3-3 3-3" />
                  <path d="M20 13v1a5 5 0 0 1-5 5H4" />
                </svg>
                {FREQUENCY_SHORT[freq]}
              </span>
            ) : null}
          </div>
        </div>

        {/* Subtarefas: progresso + abrir/recolher */}
        {checklist.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowChecklist((v) => !v)}
            aria-expanded={showChecklist}
            aria-label={`Checklist: ${cl.done} de ${cl.total} feitos. ${showChecklist ? "Recolher" : "Mostrar"}`}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 focus-visible:outline-2"
            style={{ height: 32, fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", background: "var(--secondary)" }}
          >
            {cl.done}/{cl.total}
            <svg
              width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden
              style={{ transform: showChecklist ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        ) : null}

        {/* ⋯ Menu */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => { setMenuOpen((v) => !v); setShowPostpone(false); }}
            aria-label={`Mais opções: ${occurrence.task.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
            style={{
              width: 44,
              height: 44,
              background: "transparent",
              border: "none",
              color: "var(--muted-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-1 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-border bg-card py-1"
              style={{ boxShadow: "0 10px 30px rgba(60,35,15,0.14)" }}
            >
              <Link
                role="menuitem"
                href={detailHref}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                Abrir tarefa
              </Link>
              {!isCompleted && isShared ? (
                <form action={claimDispatch}>
                  <input type="hidden" name="occurrence_id" value={occurrence.id} />
                  <MenuItem type="submit" disabled={claimPending}>
                    {claimPending ? "Aguarde…" : "Eu pego"}
                  </MenuItem>
                </form>
              ) : null}
              {!isCompleted && isMine ? (
                <form action={unclaimDispatch}>
                  <input type="hidden" name="occurrence_id" value={occurrence.id} />
                  <MenuItem type="submit" disabled={unclaimPending}>
                    Liberar para a casa
                  </MenuItem>
                </form>
              ) : null}
              {!isCompleted ? (
                <MenuItem onClick={() => { setShowPostpone(true); setMenuOpen(false); }}>Adiar</MenuItem>
              ) : null}
              {!isCompleted ? (
                <form action={skipDispatch}>
                  <input type="hidden" name="occurrence_id" value={occurrence.id} />
                  <MenuItem type="submit" disabled={skipPending}>
                    {skipPending ? "Pulando…" : "Pular desta vez"}
                  </MenuItem>
                </form>
              ) : null}
              {occurrence.task.instructions ? (
                <MenuItem onClick={() => { setShowInstructions((v) => !v); setMenuOpen(false); }}>
                  {showInstructions ? "Ocultar instruções" : "Como fazer"}
                </MenuItem>
              ) : null}
              <MenuItem onClick={() => { setShowNoteEditor(true); setMenuOpen(false); }}>
                {occurrence.notes ? "Editar nota" : "Adicionar nota"}
              </MenuItem>
              <div role="separator" style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              {onEdit ? (
                <MenuItem onClick={() => { onEdit(); setMenuOpen(false); }}>Editar tarefa</MenuItem>
              ) : null}
              <Link
                role="menuitem"
                href={`/rotina/tarefas/${occurrence.task.id}/editar`}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                Editar recorrência
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Detalhes (alinhados ao título: 2 + 44 + 4 = 50px) ─────────────── */}
      {showExpanded ? (
        <div style={{ padding: "0 14px 12px 50px", display: "flex", flexDirection: "column", gap: 8 }}>
          {showChecklist ? (
            <div style={{ marginLeft: -10, borderTop: "1px solid var(--border)", paddingTop: 4 }}>
              <ChecklistList
                occurrenceId={occurrence.id}
                taskId={occurrence.task.id}
                items={checklist}
                states={occurrence.checklist_states ?? []}
                disabled={isCompleted}
                size="compact"
              />
              <Link href={detailHref} className="ml-2.5 inline-block text-muted-foreground underline-offset-4 hover:underline" style={{ fontSize: 12.5, marginTop: 2 }}>
                Abrir tarefa
              </Link>
            </div>
          ) : null}
          {claimState.status === "error" && claimState.message ? (
            <p style={{ fontSize: 12, color: "var(--destructive)" }}>{claimState.message}</p>
          ) : null}

          {showInstructions && occurrence.task.instructions ? (
            <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {occurrence.task.instructions}
            </p>
          ) : null}

          {occurrence.notes && !showNoteEditor ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
              &ldquo;{occurrence.notes}&rdquo;
            </p>
          ) : null}

          {showNoteEditor ? (
            <form action={notesDispatch}>
              <input type="hidden" name="occurrence_id" value={occurrence.id} />
              <textarea
                name="notes"
                aria-label="Nota da ocorrência"
                defaultValue={occurrence.notes ?? ""}
                maxLength={2000}
                rows={2}
                autoFocus
                placeholder="Ex.: faltou sabão, comprar amanhã"
                className="w-full resize-none rounded-lg border border-input bg-background px-2 py-1 text-sm"
              />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Button type="submit" size="sm" disabled={notesPending}>
                  {notesPending ? "Salvando…" : "Salvar nota"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowNoteEditor(false)}>
                  Cancelar
                </Button>
                {notesState.status === "error" ? (
                  <span className="text-xs text-destructive">{notesState.message}</span>
                ) : null}
              </div>
            </form>
          ) : null}

          {showPostpone ? (
            <form action={postponeDispatch} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="occurrence_id" value={occurrence.id} />
              <input
                type="date"
                name="new_date"
                min={today}
                required
                aria-label="Nova data"
                className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
              />
              <Button type="submit" size="sm" disabled={postponePending}>
                {postponePending ? "Adiando…" : "Adiar"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPostpone(false)}>
                Cancelar
              </Button>
              {postponeState.status === "error" ? (
                <span className="w-full text-xs text-destructive">
                  {postponeState.fieldErrors?.new_date ?? postponeState.message}
                </span>
              ) : null}
            </form>
          ) : null}

          {undoState.status === "error" && undoState.message ? (
            <p style={{ fontSize: 12, color: "var(--destructive)" }}>{undoState.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}
