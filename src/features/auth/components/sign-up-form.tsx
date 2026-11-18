"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUp } from "@/features/auth/actions";
import { initialFormState } from "@/features/auth/form-state";
import { signUpSchema } from "@/features/auth/schemas";
import { Field, FormFeedback, SubmitButton } from "./form-parts";
import { useValidatedSubmit } from "./use-validated-submit";

const linkClass =
  "text-foreground font-medium underline underline-offset-4 focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialFormState);
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });
  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);
  const errors = form.formState.errors;
  const termsError = errors.termsAccepted?.message ?? state.fieldErrors?.termsAccepted;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormFeedback state={state} />
      <Field
        label="Nome"
        autoComplete="name"
        registration={form.register("fullName")}
        error={errors.fullName?.message ?? state.fieldErrors?.fullName}
      />
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
      <Field
        label="Senha"
        type="password"
        autoComplete="new-password"
        hint="Pelo menos 8 caracteres, com letras e números."
        registration={form.register("password")}
        error={errors.password?.message ?? state.fieldErrors?.password}
      />
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="-my-2.5 -ml-2.5 flex size-11 shrink-0 items-center justify-center">
            <input
              id="termsAccepted"
              type="checkbox"
              className="accent-graphite focus-visible:ring-ring size-5 rounded outline-none focus-visible:ring-2"
              aria-invalid={termsError ? true : undefined}
              aria-describedby={termsError ? "termsAccepted-erro" : undefined}
              {...form.register("termsAccepted")}
            />
          </span>
          <label htmlFor="termsAccepted" className="text-sm leading-6">
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className={linkClass}>
              Termos de Uso
              <span className="sr-only"> (abre em nova aba)</span>
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className={linkClass}>
              Política de Privacidade
              <span className="sr-only"> (abre em nova aba)</span>
            </Link>
            .
          </label>
        </div>
        {termsError ? (
          <p id="termsAccepted-erro" className="text-destructive text-sm">
            {termsError}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={pending} pendingLabel="Criando conta…">
        Criar conta
      </SubmitButton>
    </form>
  );
}
