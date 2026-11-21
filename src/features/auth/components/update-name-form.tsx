"use client";

import { useActionState, useEffect, useState } from "react";
import { updateDisplayName } from "@/features/auth/actions";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UpdateNameForm({ currentName }: { currentName: string | null }) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(currentName ?? "");

  const [state, dispatch, pending] = useActionState(updateDisplayName, initialFormState);

  useEffect(() => {
    if (state.status === "success") setEditing(false);
  }, [state.status]);

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{currentName ?? "—"}</span>
        <button
          type="button"
          onClick={() => {
            setNameValue(currentName ?? "");
            setEditing(true);
          }}
          className="text-xs text-primary hover:underline"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <form action={dispatch} className="flex flex-wrap items-start gap-2">
      <div className="flex-1 min-w-48">
        <Input
          name="full_name"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          placeholder="Seu nome"
          autoFocus
          required
          disabled={pending}
          aria-invalid={!!state.fieldErrors?.full_name}
        />
        {state.fieldErrors?.full_name ? (
          <p className="mt-1 text-xs text-destructive">{state.fieldErrors.full_name}</p>
        ) : null}
        {state.status === "error" && state.message ? (
          <p className="mt-1 text-xs text-destructive">{state.message}</p>
        ) : null}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
        Cancelar
      </Button>
    </form>
  );
}
