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

function daysBetween(dateFrom: string, dateTo: string): number {
  const a = new Date(dateFrom + "T00:00:00Z").getTime();
  const b = new Date(dateTo + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

// ── Avatar ────────────────────────────────────────────────────────────────────

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

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
    : parts[0]?.slice(0, 2).toUpperCase() ?? "?";
}

function MemberAvatar({ id, name, size }: { id: string; name: string | null; size: number }) {
  const { bg, text } = memberColor(id);
  return (
    <div
      title={name ?? undefined}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: bg,
        color: text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: Math.round(size * 0.44),
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

// ── Category icon ─────────────────────────────────────────────────────────────

function CategoryIcon({ roomName }: { roomName: string | null }) {
  const n = (roomName ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const sw = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

  if (n.includes("cozinha") || n.includes("kitchen")) {
    // Plate / double circle
    return <svg {...sw}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></svg>;
  }
  if (n.includes("sala") || n.includes("living")) {
    // Sofa
    return <svg {...sw}><path d="M5 11V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M4 13a2 2 0 0 1 4 0v1h8v-1a2 2 0 0 1 4 0v4H4zM6 18v2M18 18v2"/></svg>;
  }
  if (n.includes("quarto") || n.includes("dormitorio") || n.includes("bedroom")) {
    // Bed
    return <svg {...sw}><path d="M3 19v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15h18M7 9V7h4v2"/></svg>;
  }
  if (n.includes("banhe") || n.includes("lavabo") || n.includes("wc")) {
    // Wash / appliance
    return <svg {...sw}><rect x="5" y="3" width="14" height="18" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M8 6.5h.01M11 6.5h.01"/></svg>;
  }
  if (n.includes("varanda") || n.includes("jardim") || n.includes("terraco") || n.includes("planta")) {
    // Sprout
    return <svg {...sw}><path d="M12 20v-8M12 12c0-4 3-6 6-6 0 4-2 6-6 6zM12 15c0-3-2-5-5-5 0 3 2 5 5 5zM8 20h8"/></svg>;
  }
  if (n.includes("servico") || n.includes("lavanderia") || n.includes("area")) {
    // Washing machine
    return <svg {...sw}><rect x="5" y="3" width="14" height="18" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M8 6.5h.01M11 6.5h.01"/></svg>;
  }
  if (n.includes("garagem") || n.includes("garage")) {
    // Wrench
    return <svg {...sw}><path d="M15 5a4 4 0 0 0-4.5 5.4L4 17l3 3 6.6-6.5A4 4 0 0 0 19 9l-2.5 2.5-2.5-.5-.5-2.5z"/></svg>;
  }
  // Default: list
  return <svg {...sw}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  occurrence: OccurrenceWithTask;
  today: string;
  userId?: string;
  rotationInfo?: RotationInfo;
  onEdit?: () => void;
  rooms?: Array<{ id: string; name: string }>;
  homeMembers?: Array<{ id: string; name: string | null }>;
};

export function TaskOccurrenceRow({
  occurrence,
  today,
  userId,
  rotationInfo,
  onEdit,
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

  const [, completeDispatch, completePending] = useActionState(completeOccurrence, initialFormState);
  const [undoState, undoDispatch, undoPending] = useActionState(undoComplete, initialFormState);
  const [, skipDispatch, skipPending] = useActionState(skipOccurrence, initialFormState);
  const [postponeState, postponeDispatch, postponePending] = useActionState(postponeOccurrence, initialFormState);
  const [claimState, claimDispatch, claimPending] = useActionState(claimOccurrence, initialFormState);
  const [, unclaimDispatch, unclaimPending] = useActionState(unclaimOccurrence, initialFormState);
  const [notesState, notesDispatch, notesPending] = useActionState(updateOccurrenceNotes, initialFormState);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { closeMenu(); return; }
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

  function closeMenu() { setMenuOpen(false); }

  // Meta line parts
  const metaParts: string[] = [];
  if (isOverdue && !isCompleted) metaParts.push(`Atrasada ${daysOverdue}${daysOverdue === 1 ? " dia" : " dias"}`);
  if (roomName) metaParts.push(roomName);
  if (rotationInfo) metaParts.push("↺");

  // Whether to render the expanded section
  const showExpanded =
    (!isCompleted && occurrence.assigned_to === null) ||
    (!isCompleted && occurrence.assigned_to === userId) ||
    showPostpone ||
    showNoteEditor ||
    showInstructions ||
    (!!occurrence.notes && !showNoteEditor) ||
    (undoState.status === "error" && !!undoState.message) ||
    (claimState.status === "error" && !!claimState.message);

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      {/* ── 54 px main row ─────────────────────────────────────────────── */}
      <div
        style={{
          minHeight: 54,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
        }}
      >
        {/* Category icon tile */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--secondary)",
            color: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CategoryIcon roomName={roomName} />
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: isCompleted ? "var(--muted-foreground)" : "var(--foreground)",
              textDecoration: isCompleted ? "line-through" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {occurrence.task.title}
          </div>
          {metaParts.length > 0 ? (
            <div
              style={{
                fontSize: 12,
                color:
                  isOverdue && !isCompleted
                    ? "var(--destructive)"
                    : "var(--muted-foreground)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {metaParts.join(" · ")}
              </span>
            </div>
          ) : null}
        </div>

        {/* Assigned member avatar */}
        {assignedMember ? (
          <MemberAvatar id={assignedMember.id} name={assignedMember.name} size={24} />
        ) : null}

        {/* Complete / Undo button */}
        {isCompleted ? (
          <form action={undoDispatch}>
            <input type="hidden" name="occurrence_id" value={occurrence.id} />
            <button
              type="submit"
              disabled={undoPending}
              aria-label="Desfazer conclusão"
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                background: "var(--foreground)",
                color: "var(--background)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: undoPending ? 0.5 : 1,
                cursor: undoPending ? "not-allowed" : "pointer",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </button>
          </form>
        ) : (
          <form action={completeDispatch}>
            <input type="hidden" name="occurrence_id" value={occurrence.id} />
            <button
              type="submit"
              disabled={completePending}
              aria-label={`Concluir: ${occurrence.task.title}`}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                background: "transparent",
                border: "1.5px solid var(--muted-foreground)",
                display: "block",
                flexShrink: 0,
                opacity: completePending ? 0.4 : 1,
                cursor: completePending ? "not-allowed" : "pointer",
              }}
            />
          </form>
        )}

        {/* ⋯ Menu */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => { setMenuOpen((v) => !v); setShowPostpone(false); }}
            aria-label="Mais opções"
            aria-expanded={menuOpen}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: "transparent",
              border: "none",
              color: "var(--muted-foreground)",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ⋯
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            >
              {onEdit ? (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { onEdit(); closeMenu(); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                >
                  Editar
                </button>
              ) : null}
              {!isCompleted ? (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { setShowPostpone(true); closeMenu(); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                >
                  Adiar
                </button>
              ) : null}
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
              {occurrence.task.instructions ? (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { setShowInstructions((v) => !v); closeMenu(); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                >
                  {showInstructions ? "Ocultar instruções" : "Como fazer"}
                </button>
              ) : null}
              <button
                role="menuitem"
                type="button"
                onClick={() => { setShowNoteEditor(true); closeMenu(); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                {occurrence.notes ? "Editar nota" : "Adicionar nota"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Expanded section (60px indent = 12 pad + 36 tile + 12 gap) ─── */}
      {showExpanded ? (
        <div
          style={{
            padding: "0 12px 12px 60px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Claim / Unclaim */}
          {!isCompleted ? (
            occurrence.assigned_to === null ? (
              <div>
                <form action={claimDispatch}>
                  <input type="hidden" name="occurrence_id" value={occurrence.id} />
                  <button
                    type="submit"
                    disabled={claimPending}
                    style={{
                      height: 28,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--foreground)",
                      cursor: claimPending ? "not-allowed" : "pointer",
                      opacity: claimPending ? 0.6 : 1,
                    }}
                  >
                    {claimPending ? "Aguarde…" : "Eu pego"}
                  </button>
                </form>
                {claimState.status === "error" && claimState.message ? (
                  <p style={{ fontSize: 12, color: "var(--destructive)" }}>
                    {claimState.message}
                  </p>
                ) : null}
              </div>
            ) : occurrence.assigned_to === userId ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>
                  Você pegou
                </span>
                <form action={unclaimDispatch}>
                  <input type="hidden" name="occurrence_id" value={occurrence.id} />
                  <button
                    type="submit"
                    disabled={unclaimPending}
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Liberar
                  </button>
                </form>
              </div>
            ) : null
          ) : null}

          {/* Instructions */}
          {showInstructions && occurrence.task.instructions ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "pre-wrap" }}>
              {occurrence.task.instructions}
            </p>
          ) : null}

          {/* Note display */}
          {occurrence.notes && !showNoteEditor ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
              &ldquo;{occurrence.notes}&rdquo;
            </p>
          ) : null}

          {/* Note editor */}
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

          {/* Postpone form */}
          {showPostpone ? (
            <form action={postponeDispatch} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="occurrence_id" value={occurrence.id} />
              <input
                type="date"
                name="new_date"
                min={today}
                required
                aria-label="nova data"
                className="rounded border border-input bg-background px-2 py-1 text-sm"
              />
              <Button type="submit" size="sm" disabled={postponePending}>
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

          {/* Undo error */}
          {undoState.status === "error" && undoState.message ? (
            <p style={{ fontSize: 12, color: "var(--destructive)" }}>{undoState.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
