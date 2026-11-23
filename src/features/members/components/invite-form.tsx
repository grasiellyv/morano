"use client";

import { useActionState } from "react";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";
import { cn } from "@/lib/utils";

type Props = {
  inviteMemberAction: (_: FormState, fd: FormData) => Promise<FormState>;
};

export function InviteForm({ inviteMemberAction }: Props) {
  const [state, action, pending] = useActionState(inviteMemberAction, initialFormState);

  const token = state.meta?.token;
  const inviteUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${token}`
    : null;

  return (
    <div className="space-y-4">
      {state.status === "success" && inviteUrl ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20 space-y-2">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Convite criado!</p>
          <p className="text-xs text-muted-foreground">Compartilhe o link abaixo com o convidado:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded border border-input bg-background px-3 py-1.5 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              Copiar
            </button>
          </div>
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail do convidado
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            placeholder="email@exemplo.com"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {state.fieldErrors?.email ? (
            <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium">
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        {state.status === "error" && state.message ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
          )}
        >
          {pending ? "Enviando..." : "Criar convite"}
        </button>
      </form>
    </div>
  );
}
