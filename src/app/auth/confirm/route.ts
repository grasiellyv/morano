import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE, recoveryCookieOptions } from "@/lib/auth/recovery";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery", "email_change"];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Links de e-mail (confirmação de cadastro e recuperação de senha).
 * Os templates enviam `token_hash` + `type`; `code` é aceito como alternativa
 * caso o projeto use os templates padrão (fluxo PKCE, mesmo navegador).
 * Os cookies gravados por verifyOtp/exchangeCodeForSession seguem no redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && isOtpType(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error("[auth:confirm]", { code: error.code, status: error.status });
    if (!error && type === "recovery" && data.session) {
      // Marca esta sessão como de recuperação (o amr do JWT vem como "otp").
      const { data: verified } = await supabase.auth.getClaims(data.session.access_token);
      const sessionId = verified?.claims?.session_id;
      if (typeof sessionId === "string") {
        const cookieStore = await cookies();
        cookieStore.set(RECOVERY_COOKIE, sessionId, recoveryCookieOptions);
      }
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("[auth:confirm]", { code: error.code, status: error.status });
  }

  return NextResponse.redirect(new URL(ok ? next : "/entrar?erro=link", request.url));
}
