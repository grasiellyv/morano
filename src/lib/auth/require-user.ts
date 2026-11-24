import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRecoverySession, RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string };

/**
 * Exige uma sessão válida em Server Components e Server Actions.
 * Usa `getClaims()`, que verifica a assinatura do JWT; sem claims, vai para /entrar.
 *
 * Envolto em `cache()`: layout e página (mesmo request) compartilham uma única
 * verificação, em vez de validarem o JWT contra o Supabase remoto duas vezes.
 */
export const requireUser = cache(async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/entrar");
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

/**
 * Verdadeiro quando a sessão atual nasceu de um link de recuperação de senha
 * (ver `lib/auth/recovery.ts`). Usado por /redefinir-senha e pela action resetPassword.
 */
export async function hasRecoverySession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) return false;
  const cookieStore = await cookies();
  return isRecoverySession(data?.claims, cookieStore.get(RECOVERY_COOKIE)?.value);
}
