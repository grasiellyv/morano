const AUTH_PREFIXES = ["/entrar", "/cadastro", "/recuperar-senha", "/auth/"];

function isAuthRoute(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  return AUTH_PREFIXES.some((prefix) =>
    prefix.endsWith("/")
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Devolve `raw` apenas se for um caminho relativo do próprio site (evita open redirect).
 * Recusa `//host`, `/\host`, qualquer `://`, caracteres de controle e rotas de autenticação.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/inicio"): string {
  if (!raw || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("://")) return fallback;
  // Navegadores descartam tab/CR/LF em URLs: "/\t/evil.com" viraria "//evil.com".
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  if (hasDotSegment(raw)) return fallback;
  // Confirma com o parser do navegador: mesma origem e sem caminho "//host".
  const base = "http://morano.invalid";
  let parsed: URL;
  try {
    parsed = new URL(raw, base);
  } catch {
    return fallback;
  }
  if (parsed.origin !== base || parsed.pathname.startsWith("//")) return fallback;
  if (isAuthRoute(raw) || isAuthRoute(parsed.pathname)) return fallback;
  return raw;
}

/** "/." e "/.." (inclusive como %2e) são normalizados pelo navegador: "/..//x" vira "//x". */
function hasDotSegment(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  return pathname.split("/").some((segment) => {
    const decoded = segment.toLowerCase().replaceAll("%2e", ".");
    return decoded === "." || decoded === "..";
  });
}
