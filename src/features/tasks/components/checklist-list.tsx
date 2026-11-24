"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addChecklistItem,
  removeChecklistItem,
  setChecklistItemState,
} from "@/features/tasks/actions-checklist";
import { initialFormState } from "@/features/auth/form-state";
import { Plus } from "lucide-react";
import type { ChecklistItem, ChecklistState } from "@/features/tasks/queries";

type Status = "open" | "done" | "skipped";

export function checklistProgress(items: ChecklistItem[], states: ChecklistState[] = []) {
  const ids = new Set(items.map((i) => i.id));
  let done = 0, skipped = 0;
  for (const s of states) {
    if (!ids.has(s.item_id)) continue;
    if (s.status === "done") done++;
    else skipped++;
  }
  return { done, skipped, total: items.length, open: items.length - done - skipped };
}

/**
 * Subtarefas de uma ocorrência. Feito / pulado vale só para hoje:
 * a próxima vez da tarefa começa com tudo em aberto.
 */
export function ChecklistList({
  occurrenceId,
  taskId,
  items,
  states,
  editable = false,
  disabled = false,
  size = "regular",
}: {
  occurrenceId: string;
  taskId: string;
  items: ChecklistItem[];
  states: ChecklistState[];
  /** Mostra "Adicionar item" e o modo de editar (remover). */
  editable?: boolean;
  /** Ocorrência concluída: itens só para leitura. */
  disabled?: boolean;
  size?: "regular" | "compact";
}) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [optimistic, setOptimistic] = useOptimistic(
    new Map(states.map((s) => [s.item_id, s.status as Status])),
    (current: Map<string, Status>, next: { itemId: string; status: Status }) => {
      const m = new Map(current);
      if (next.status === "open") m.delete(next.itemId);
      else m.set(next.itemId, next.status);
      return m;
    },
  );

  function setStatus(itemId: string, status: Status) {
    startTransition(async () => {
      setOptimistic({ itemId, status });
      const fd = new FormData();
      fd.set("occurrence_id", occurrenceId);
      fd.set("item_id", itemId);
      fd.set("status", status === "open" ? "clear" : status);
      await setChecklistItemState(initialFormState, fd);
    });
  }

  const compact = size === "compact";
  const rowHeight = compact ? 40 : 46;

  return (
    <div>
      {items.length > 0 ? (
        <ul>
          {[...items].sort((a, b) => a.position - b.position).map((item) => {
            const status: Status = optimistic.get(item.id) ?? "open";
            return (
              <li key={item.id} className="flex items-center gap-1" style={{ minHeight: rowHeight }}>
                <button
                  type="button"
                  disabled={disabled || editing}
                  onClick={() => setStatus(item.id, status === "done" ? "open" : "done")}
                  aria-label={status === "done" ? `Desmarcar: ${item.title}` : `Marcar como feito: ${item.title}`}
                  aria-pressed={status === "done"}
                  className="flex shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-6px] disabled:cursor-default"
                  style={{ width: 40, height: 40 }}
                >
                  <ItemCircle status={status} small={compact} />
                </button>
                <span
                  className="min-w-0 flex-1"
                  style={{
                    fontSize: compact ? 13.5 : 15,
                    color: status === "open" ? "var(--foreground)" : "var(--muted-foreground)",
                    textDecoration: status === "done" ? "line-through" : "none",
                    lineHeight: 1.3,
                  }}
                >
                  {item.title}
                  {status === "skipped" ? (
                    <span style={{ fontSize: 11.5, marginLeft: 6, fontStyle: "italic" }}>pulado hoje</span>
                  ) : null}
                </span>
                {editing ? (
                  <RemoveItemButton itemId={item.id} title={item.title} />
                ) : !disabled && status !== "done" ? (
                  <button
                    type="button"
                    onClick={() => setStatus(item.id, status === "skipped" ? "open" : "skipped")}
                    className="shrink-0 rounded-lg px-2 text-muted-foreground hover:text-foreground focus-visible:outline-2"
                    style={{ height: 32, fontSize: 12.5 }}
                    aria-label={status === "skipped" ? `Retomar: ${item.title}` : `Pular hoje: ${item.title}`}
                  >
                    {status === "skipped" ? "Retomar" : "Pular"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : editable ? (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "4px 0 8px" }}>
          Divida a tarefa em passos menores. Cada passo pode ser feito ou pulado só hoje.
        </p>
      ) : null}

      {editable ? (
        <div className="mt-1">
          {editing ? null : <AddItemForm taskId={taskId} />}
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="mt-1 ml-2 text-muted-foreground underline-offset-4 hover:underline"
              style={{ fontSize: 12.5 }}
            >
              {editing ? "Pronto" : "Editar itens"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ItemCircle({ status, small }: { status: Status; small?: boolean }) {
  const size = small ? 20 : 22;
  if (status === "done") {
    return (
      <span
        style={{
          width: size, height: size, borderRadius: size / 2, background: "var(--done-bg)", color: "var(--done-ink)", boxShadow: "inset 0 0 0 1.5px var(--done-ring)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size / 2,
        border: `1.5px ${status === "skipped" ? "dashed" : "solid"} var(--muted-foreground)`,
        opacity: status === "skipped" ? 0.55 : 1,
      }}
    />
  );
}

function RemoveItemButton({ itemId, title }: { itemId: string; title: string }) {
  const [, dispatch, pending] = useActionState(removeChecklistItem, initialFormState);
  return (
    <form action={dispatch} className="shrink-0">
      <input type="hidden" name="item_id" value={itemId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remover: ${title}`}
        className="flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 disabled:opacity-50"
        style={{ width: 36, height: 36 }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </form>
  );
}

function AddItemForm({ taskId }: { taskId: string }) {
  const [state, dispatch, pending] = useActionState(addChecklistItem, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [state]);

  return (
    <>
    <form ref={formRef} action={dispatch} className="flex items-center gap-1">
      <input type="hidden" name="task_id" value={taskId} />
      <span aria-hidden className="flex shrink-0 items-center justify-center" style={{ width: 40, height: 40, color: "var(--muted-foreground)" }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <input
        ref={inputRef}
        name="title"
        required
        maxLength={120}
        placeholder="Adicionar item"
        aria-label="Novo item da checklist"
        aria-invalid={state.fieldErrors?.title ? true : undefined}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        style={{ fontSize: 15, height: 40 }}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-add px-3 font-semibold text-add-foreground hover:bg-add-hover focus-visible:outline-2 disabled:opacity-50"
        style={{ height: 34, fontSize: 13 }}
      >
        <Plus size={15} strokeWidth={1.75} aria-hidden />
        {pending ? "…" : "Adicionar"}
      </button>
    </form>
    {state.status === "error" ? (
      <p role="alert" className="text-destructive" style={{ fontSize: 12, paddingLeft: 44 }}>
        {state.fieldErrors?.title ?? state.message}
      </p>
    ) : null}
    </>
  );
}
