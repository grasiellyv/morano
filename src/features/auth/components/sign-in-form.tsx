"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "@/features/auth/actions";
import { initialFormState } from "@/features/auth/form-state";
import { signInSchema } from "@/features/auth/schemas";
import { Field, FormMessage, SubmitButton } from "./form-parts";
import { useValidatedSubmit } from "./use-validated-submit";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialFormState);
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);
  const errors = form.formState.errors;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
      <div className="space-y-2">
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          registration={form.register("password")}
          error={errors.password?.message ?? state.fieldErrors?.password}
        />
        <Link
          href="/recuperar-senha"
          className="text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-2"
        >
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton pending={pending} pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
