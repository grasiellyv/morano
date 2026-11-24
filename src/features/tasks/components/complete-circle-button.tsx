"use client";

import { useState, useTransition } from "react";
import { completeOccurrence } from "@/features/tasks/actions";
import { initialFormState } from "@/features/auth/form-state";

/**
 * Botão-bolinha de concluir com UI otimista: a marca de check aparece na hora
 * do clique e permanece enquanto a action roda no servidor. Como actions são
 * despachadas uma a uma (round-trip ao Supabase remoto), sem isso o botão
 * parece travado. Em caso de erro, volta ao estado vazio.
 */
export function CompleteCircleButton({
  occurrenceId,
  title,
}: {
  occurrenceId: string;
  title: string;
}) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const checked = done || pending;

  return (
    <button
      type="button"
      aria-label={`Concluir: ${title}`}
      disabled={checked}
      onClick={() => {
        setDone(true);
        startTransition(async () => {
          try {
            const fd = new FormData();
            fd.set("occurrence_id", occurrenceId);
            const res = await completeOccurrence(initialFormState, fd);
            if (res?.status === "error") setDone(false);
          } catch {
            // Reverte em qualquer falha inesperada para o botão não travar marcado
            setDone(false);
          }
        });
      }}
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: 26,
        height: 26,
        border: checked ? "none" : "1.5px solid var(--muted-foreground)",
        background: checked ? "var(--done-bg)" : "transparent",
        color: "var(--done-ink)",
        boxShadow: checked ? "inset 0 0 0 1.5px var(--done-ring)" : "none",
        cursor: checked ? "default" : "pointer",
        transition: "background 120ms ease",
      }}
    >
      {checked ? (
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : null}
    </button>
  );
}
