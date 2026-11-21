"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";

type Props = {
  taskId: string;
  archiveTaskAction: (_: FormState, fd: FormData) => Promise<FormState>;
};

export function ArchiveTaskButton({ taskId, archiveTaskAction }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [state, dispatch, pending] = useActionState(archiveTaskAction, initialFormState);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => setConfirming(true)}
      >
        Arquivar tarefa
      </Button>
    );
  }

  return (
    <form action={dispatch} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={taskId} />
      <p className="w-full text-sm text-muted-foreground">
        Tem certeza? Tarefas com histórico são arquivadas; sem histórico são excluídas permanentemente.
      </p>
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {pending ? "Arquivando…" : "Confirmar"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Cancelar
      </Button>
      {state.status === "error" ? (
        <p className="w-full text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
