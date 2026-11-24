"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  postponeOccurrence,
  assignOccurrence,
  updateOccurrenceNotes,
  skipOccurrence,
} from "@/features/tasks/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { firstName, formatLongDate } from "@/features/tasks/rotina-format";

type Member = { id: string; name: string | null };

const fieldClass =
  "w-full rounded-xl border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Botão de lápis que abre a escolha "Só esta vez" × "Esta e as próximas". */
export function EditOccurrenceButton(props: {
  occurrenceId: string;
  taskId: string;
  scheduledFor: string;
  today: string;
  status: "pending" | "completed" | "skipped" | "missed";
  assignedTo: string | null;
  notes: string | null;
  userId: string;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Editar tarefa"
        aria-haspopup="dialog"
        className="flex items-center justify-center rounded-full focus-visible:outline-2"
        style={{ width: 44, height: 44, color: "var(--foreground)" }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
          <path d="M13.5 8.5l3 3" />
        </svg>
      </button>
      {open ? (
        <EditSheet
          {...props}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function EditSheet({
  occurrenceId,
  taskId,
  scheduledFor,
  today,
  status,
  assignedTo,
  notes,
  userId,
  members,
  onClose,
}: {
  occurrenceId: string;
  taskId: string;
  scheduledFor: string;
  today: string;
  status: "pending" | "completed" | "skipped" | "missed";
  assignedTo: string | null;
  notes: string | null;
  userId: string;
  members: Member[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"escolha" | "so-esta">("escolha");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const isPending = status === "pending";

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("a, button, input, select, textarea")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Mantém o foco dentro do painel
      if (e.key === "Tab" && panelRef.current) {
        const els = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>("a, button:not([disabled]), input, select, textarea"),
        );
        if (els.length === 0) return;
        const first = els[0]!, last = els[els.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, step]);

  function saveThisTime(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const call = async (fn: (s: FormState, f: FormData) => Promise<FormState>, fields: Record<string, string>) => {
        const f = new FormData();
        f.set("occurrence_id", occurrenceId);
        for (const [k, v] of Object.entries(fields)) f.set(k, v);
        const res = await fn(initialFormState, f);
        if (res.status === "error") {
          throw new Error(res.message || Object.values(res.fieldErrors ?? {})[0] || "Não foi possível salvar.");
        }
      };
      try {
        const newDate = String(fd.get("new_date") ?? "");
        const newAssignee = String(fd.get("assigned_to") ?? "");
        const newNotes = String(fd.get("notes") ?? "").trim();
        if (isPending && newAssignee !== (assignedTo ?? "")) {
          await call(assignOccurrence, { assigned_to: newAssignee });
        }
        if (newNotes !== (notes ?? "")) {
          await call(updateOccurrenceNotes, { notes: newNotes });
        }
        // Por último: adiar muda a data e pode mover a tarefa para outro dia.
        if (isPending && newDate && newDate !== scheduledFor) {
          await call(postponeOccurrence, { new_date: newDate });
        }
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  function skipThisTime() {
    setError(null);
    startTransition(async () => {
      const f = new FormData();
      f.set("occurrence_id", occurrenceId);
      const res = await skipOccurrence(initialFormState, f);
      if (res.status === "error") setError(res.message ?? "Não foi possível pular.");
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(42,27,18,0.38)" }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-sheet-title"
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl"
        style={{ background: "var(--background)", padding: "10px 20px calc(24px + env(safe-area-inset-bottom))", maxHeight: "90dvh", overflowY: "auto" }}
      >
        <div aria-hidden className="mx-auto mb-3 sm:hidden" style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />

        {step === "escolha" ? (
          <>
            <h2 id="edit-sheet-title" style={{ fontSize: 18, fontWeight: 600 }}>O que você quer editar?</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
              Esta tarefa se repete. Escolha até onde a mudança vale.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setStep("so-esta")}
                className="w-full rounded-2xl border border-border text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: "var(--card)", padding: "14px 16px" }}
              >
                <span className="flex items-center justify-between" style={{ fontSize: 15, fontWeight: 600 }}>
                  Só esta vez
                  <Chevron />
                </span>
                <span className="block" style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3, lineHeight: 1.45 }}>
                  Só {formatLongDate(scheduledFor)}: data, responsável e observação. As próximas continuam iguais.
                </span>
              </button>

              <Link
                href={`/rotina/tarefas/${taskId}/editar`}
                className="block w-full rounded-2xl border border-border focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: "var(--card)", padding: "14px 16px" }}
              >
                <span className="flex items-center justify-between" style={{ fontSize: 15, fontWeight: 600 }}>
                  Esta e as próximas
                  <Chevron />
                </span>
                <span className="block" style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3, lineHeight: 1.45 }}>
                  Nome, descrição, horário, prioridade, cômodo e recorrência. O que já foi feito não muda.
                </span>
              </Link>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl font-medium focus-visible:outline-2"
              style={{ height: 46, fontSize: 14.5 }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <form action={saveThisTime}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setStep("escolha"); setError(null); }}
                aria-label="Voltar"
                className="-ml-2 flex items-center justify-center rounded-full focus-visible:outline-2"
                style={{ width: 40, height: 40 }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h2 id="edit-sheet-title" style={{ fontSize: 18, fontWeight: 600 }}>Só esta vez</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
              Vale só para {formatLongDate(scheduledFor)}.
            </p>

            <div className="mt-4 space-y-4">
              {isPending ? (
                <>
                  <label className="block">
                    <span className="mb-1.5 block" style={{ fontSize: 13.5, fontWeight: 600 }}>Data</span>
                    <input
                      type="date"
                      name="new_date"
                      defaultValue={scheduledFor}
                      min={today}
                      className={fieldClass}
                      style={{ height: 44, fontSize: 15, background: "var(--card)" }}
                    />
                    <span className="mt-1 block" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      Mudar a data adia só esta vez.
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block" style={{ fontSize: 13.5, fontWeight: 600 }}>Responsável</span>
                    <select
                      name="assigned_to"
                      defaultValue={assignedTo ?? ""}
                      className={fieldClass}
                      style={{ height: 44, fontSize: 15, background: "var(--card)" }}
                    >
                      <option value="">Compartilhada (qualquer morador)</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id === userId ? "Você" : firstName(m.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block" style={{ fontSize: 13.5, fontWeight: 600 }}>Observação</span>
                <textarea
                  name="notes"
                  defaultValue={notes ?? ""}
                  maxLength={2000}
                  rows={3}
                  placeholder="Ex.: faltou sabão, comprar amanhã"
                  className={`${fieldClass} resize-none py-2`}
                  style={{ fontSize: 15, background: "var(--card)" }}
                />
              </label>
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-destructive" style={{ fontSize: 13 }}>{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-5 w-full rounded-xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              style={{ height: 50, fontSize: 15, background: "var(--nav-active)", color: "var(--nav-active-ink)" }}
            >
              {pending ? "Salvando…" : "Salvar só esta vez"}
            </button>
            {isPending ? (
              <button
                type="button"
                onClick={skipThisTime}
                disabled={pending}
                className="mt-2 w-full rounded-xl font-medium focus-visible:outline-2 disabled:opacity-60"
                style={{ height: 46, fontSize: 14.5, color: "var(--muted-foreground)" }}
              >
                Pular esta vez
              </button>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--muted-foreground)" }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
