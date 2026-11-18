"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "@/features/auth/actions";
import { initialFormState } from "@/features/auth/form-state";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { Field, FormMessage, SubmitButton } from "./form-parts";
import { useValidatedSubmit } from "./use-validated-submit";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, initialFormState);
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);
  const errors = form.formState.errors;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <Field
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint="Pelo menos 8 caracteres, com letras e números."
        registration={form.register("password")}
        error={errors.password?.message ?? state.fieldErrors?.password}
      />
      <Field
        label="Repita a nova senha"
        type="password"
        autoComplete="new-password"
        registration={form.register("confirmPassword")}
        error={errors.confirmPassword?.message ?? state.fieldErrors?.confirmPassword}
      />
      <SubmitButton pending={pending} pendingLabel="Salvando…">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
