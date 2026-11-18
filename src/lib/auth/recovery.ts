/**
 * Marca de sessão de recuperação de senha.
 *
 * O link de recuperação usa `verifyOtp`, e o JWT resultante traz `amr: otp` (o mesmo
 * da confirmação de cadastro), então o claim sozinho não prova que a sessão veio da
 * recuperação. /auth/confirm grava este cookie httpOnly com o `session_id` da sessão
 * recém-criada; /redefinir-senha só aceita quando o cookie bate com a sessão atual.
 */
export const RECOVERY_COOKIE = "morano-recovery";
export const RECOVERY_MAX_AGE_SECONDS = 15 * 60;

export const recoveryCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: RECOVERY_MAX_AGE_SECONDS,
};

type Claims = { sub?: string; session_id?: unknown; amr?: unknown } | null | undefined;

export function isRecoverySession(claims: Claims, markerSessionId: string | undefined): boolean {
  if (!claims?.sub) return false;
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const viaAmr = amr.some((entry: unknown) =>
    typeof entry === "string"
      ? entry === "recovery"
      : (entry as { method?: unknown } | null)?.method === "recovery",
  );
  if (viaAmr) return true;
  return (
    typeof claims.session_id === "string" &&
    claims.session_id.length > 0 &&
    markerSessionId === claims.session_id
  );
}
