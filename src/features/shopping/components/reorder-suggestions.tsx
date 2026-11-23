"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReorderSuggestion } from "@/features/shopping/queries-lists";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";

function ReorderButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
    >
      {pending ? "..." : "Repor"}
    </button>
  );
}

function ReorderItemRow({
  item,
  reorderAction,
}: {
  item: ReorderSuggestion;
  reorderAction: (_: FormState, fd: FormData) => Promise<FormState>;
}) {
  const [state, dispatch] = useActionState(reorderAction, initialFormState);

  if (state.status === "success") return null;

  return (
    <form
      action={dispatch}
      style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "10px 14px" }}
    >
      <input type="hidden" name="list_item_id" value={item.id} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} {item.unit} · {item.list_name}
          {item.overdue ? (
            <span className="ml-1 text-red-600"> · vencido</span>
          ) : null}
        </p>
        {state.status === "error" ? (
          <p className="mt-0.5 text-xs text-destructive">{state.message}</p>
        ) : null}
      </div>
      <ReorderButton />
    </form>
  );
}

export function ReorderSuggestions({
  suggestions,
  reorderAction,
}: {
  suggestions: ReorderSuggestion[];
  reorderAction: (_: FormState, fd: FormData) => Promise<FormState>;
}) {
  if (suggestions.length === 0) return null;

  return (
    <details open className="mb-6">
      <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 select-none">
        <h2 className="text-base font-semibold">Repor em breve</h2>
        <span style={{ borderRadius: 20, background: "var(--warn-bg)", color: "var(--warn-ink)", padding: "1px 8px", fontSize: 12, fontWeight: 500 }}>
          {suggestions.length}
        </span>
        <svg
          className="ml-auto h-4 w-4 transition-transform [[open]_&]:rotate-180 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="space-y-2">
        {suggestions.map((item) => (
          <ReorderItemRow key={item.id} item={item} reorderAction={reorderAction} />
        ))}
      </div>
    </details>
  );
}
