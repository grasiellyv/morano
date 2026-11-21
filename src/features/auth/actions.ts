"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { hasRecoverySession } from "@/lib/auth/require-user";
import { safeNextPath } from "@/lib/auth/safe-next";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  authErrorMessage,
  LINK_INVALID_MESSAGE,
  PASSWORD_RESET_NEUTRAL_MESSAGE,
  unconfirmedSignInMessage,
} from "./errors";
import { fieldErrorsFrom, textField, type FormState } from "./form-state";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

const confirmUrl = () => `${publicEnv.siteUrl}/auth/confirm`;

/** Só o código e o status vão para o log: nada de e-mail, senha ou token. */
function logAuthError(action: string, error: { code?: string; status?: number }) {
  console.error(`[auth:${action}]`, { code: error.code, status: error.status });
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: textField(formData, "email"),
    password: textField(formData, "password"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // O Supabase só devolve email_not_confirmed depois de validar a senha,
    // então reenviar o link não revela a existência da conta a quem não a conhece.
    if (error.code === "email_not_confirmed") {
      const resend = await supabase.auth.resend({
        type: "signup",
        email: parsed.data.email,
        options: { emailRedirectTo: confirmUrl() },
      });
      if (resend.error) logAuthError("resend", resend.error);
      return { status: "error", message: unconfirmedSignInMessage(resend.error) };
    }
    if (error.code !== "invalid_credentials") {
      logAuthError("signIn", error);
    }
    return { status: "error", message: authErrorMessage(error.code) };
  }

  redirect(safeNextPath(textField(formData, "next")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const terms = textField(formData, "termsAccepted");
  const parsed = signUpSchema.safeParse({
    fullName: textField(formData, "fullName"),
    email: textField(formData, "email"),
    password: textField(formData, "password"),
    termsAccepted: terms === "on" || terms === "true",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmUrl(),
      data: { full_name: parsed.data.fullName, terms_accepted: "true" },
    },
  });
  // Conta existente e limite de envio de e-mail seguem o mesmo caminho do sucesso:
  // o GoTrue limita por usuário, então uma mensagem diferente revelaria contas existentes.
  const neutral =
    error?.code === "user_already_exists" || error?.code === "over_email_send_rate_limit";
  if (error) logAuthError("signUp", error);
  if (error && !neutral) {
    return { status: "error", message: authErrorMessage(error.code) };
  }

  redirect("/cadastro/confirme");
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: textField(formData, "email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${confirmUrl()}?next=/redefinir-senha`,
  });
  // A resposta é sempre a mesma, exista a conta ou não (inclusive em erro).
  if (error) logAuthError("requestPasswordReset", error);
  return { status: "success", message: PASSWORD_RESET_NEUTRAL_MESSAGE };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: textField(formData, "password"),
    confirmPassword: textField(formData, "confirmPassword"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  // Só uma sessão aberta pelo link de recuperação pode trocar a senha por aqui.
  if (!(await hasRecoverySession())) {
    return { status: "error", message: LINK_INVALID_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logAuthError("resetPassword", error);
    return { status: "error", message: authErrorMessage(error.code) };
  }

  (await cookies()).delete(RECOVERY_COOKIE);
  redirect("/inicio");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { requireUser } = await import("@/lib/auth/require-user");
  await requireUser();

  const parsed = resetPasswordSchema.safeParse({
    password: textField(formData, "password"),
    confirmPassword: textField(formData, "confirmPassword"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logAuthError("changePassword", error);
    return { status: "error", message: authErrorMessage(error.code) };
  }

  return { status: "success", message: "Senha atualizada com sucesso." };
}

// Assinatura sem parâmetros: compatível com useActionState (estado e FormData são ignorados).
export async function signOut(): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) logAuthError("signOut", error);
  (await cookies()).delete(RECOVERY_COOKIE);
  redirect("/entrar");
}

export async function signInWithGoogle(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!publicEnv.googleAuthEnabled)
    return { status: "error", message: authErrorMessage(undefined) };

  const next = safeNextPath(textField(formData, "next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    if (error) logAuthError("signInWithGoogle", error);
    return { status: "error", message: authErrorMessage(error?.code) };
  }

  redirect(data.url);
}
