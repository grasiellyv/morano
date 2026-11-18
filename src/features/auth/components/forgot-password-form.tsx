"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "@/features/auth/actions";
import { initialFormState } from "@/features/auth/form-state";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { Field, FormFeedback, SubmitButton } from "./form-parts";
import { useValidatedSubmit } from "./use-validated-submit";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialFormState);
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);
  const errors = form.formState.errors;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormFeedback state={state} />
      <Field
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        registration={form.register("email")}
        error={errors.email?.message ?? state.fieldErrors?.email}
      />
      <SubmitButton pending={pending} pendingLabel="Enviando…">
        Enviar link
      </SubmitButton>
    </form>
  );
}
