import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const PRIVATE_PREFIXES = [
  "/inicio",
  "/rotina",
  "/casa",
  "/manutencao",
  "/compras",
  "/notificacoes",
  "/configuracoes",
  "/onboarding",
];
const AUTH_ONLY = ["/entrar", "/cadastro", "/recuperar-senha"];

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Renova a sessão do Supabase (gravando os cookies novos na requisição e na resposta)
 * e aplica as regras de rota. O usuário vem de `getClaims()`, que valida o JWT,
 * nunca da leitura crua do cookie.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          cacheHeaders = headers;
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Nada deve rodar entre createServerClient e getClaims (recomendação do @supabase/ssr).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;

  // Redireciona preservando os cookies que a renovação acabou de gravar.
  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(cacheHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
    return redirect;
  };

  if (pathname === "/" && signedIn) {
    return redirectTo(new URL("/inicio", request.url));
  }

  if (!signedIn && matches(pathname, PRIVATE_PREFIXES)) {
    const target = new URL("/entrar", request.url);
    target.searchParams.set("next", `${pathname}${search}`);
    return redirectTo(target);
  }

  if (signedIn && matches(pathname, AUTH_ONLY)) {
    return redirectTo(new URL("/inicio", request.url));
  }

  return response;
}
