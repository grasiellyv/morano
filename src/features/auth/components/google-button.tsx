"use client";

import { useActionState } from "react";
import { signInWithGoogle } from "@/features/auth/actions";
import { initialFormState } from "@/features/auth/form-state";
import { FormMessage, SubmitButton } from "./form-parts";

/** Renderizado apenas quando NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" (quem decide é a página). */
export function GoogleButton({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInWithGoogle, initialFormState);
  return (
    <form action={formAction} className="space-y-3">
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <SubmitButton variant="outline" pending={pending} pendingLabel="Abrindo o Google…">
        Continuar com Google
      </SubmitButton>
    </form>
  );
}
