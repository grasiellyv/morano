"use client";

import { useActionState } from "react";
import type { FormState } from "@/features/auth/form-state";
import type { AbsenceInfo } from "@/features/absence/queries";
import { cn } from "@/lib/utils";

type Props = {
  currentAbsence: AbsenceInfo | null;
  setAbsenceAction: (_: FormState, fd: FormData) => Promise<FormState>;
  clearAbsenceAction: (_fd: FormData) => Promise<void>;
};

export function AbsenceForm({
  currentAbsence,
  setAbsenceAction,
  clearAbsenceAction,
}: Props) {
  const [state, action, pending] = useActionState(setAbsenceAction, {
    status: "idle",
  });

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="absence_start" className="text-sm font-medium">
            Data de início
          </label>
          <input
            id="absence_start"
            type="date"
            name="absence_start"
            required
            defaultValue={currentAbsence?.absence_start ?? ""}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {state.fieldErrors?.absence_start ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.absence_start}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="absence_end" className="text-sm font-medium">
            Data de fim
          </label>
          <input
            id="absence_end"
            type="date"
            name="absence_end"
            required
            defaultValue={currentAbsence?.absence_end ?? ""}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {state.fieldErrors?.absence_end ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.absence_end}
            </p>
          ) : null}
        </div>

        {state.message ? (
          <p
            className={cn("text-sm", state.status === "error" ? "text-destructive" : "text-green-600 dark:text-green-400")}
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar ausência"}
        </button>
      </form>

      {currentAbsence !== null ? (
        <form action={clearAbsenceAction}>
          <button
            type="submit"
            className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Encerrar ausência
          </button>
        </form>
      ) : null}
    </div>
  );
}
