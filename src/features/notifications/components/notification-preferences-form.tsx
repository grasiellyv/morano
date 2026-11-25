"use client";

import { useActionState } from "react";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";
import { NOTIFICATION_TYPE_LABEL } from "@/features/notifications/schemas";
import type { NotificationType } from "@/features/notifications/display";

type Props = {
  preferences: Record<NotificationType, boolean>;
  action: (_: FormState, fd: FormData) => Promise<FormState>;
};

export function NotificationPreferencesForm({ preferences, action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        {(Object.entries(NOTIFICATION_TYPE_LABEL) as [NotificationType, string][]).map(
          ([type, label]) => (
            <label key={type} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name={type}
                value="true"
                defaultChecked={preferences[type]}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">{label}</span>
            </label>
          ),
        )}
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-green-600 dark:text-green-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
