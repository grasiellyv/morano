import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: z.string().optional(),
});

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
  googleAuthEnabled: boolean;
};

/** Valida as variáveis públicas. Função pura, fácil de testar. */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  // Texto vazio (ex.: linha `NEXT_PUBLIC_SITE_URL=` no .env) conta como ausente.
  const cleaned = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
  const result = publicEnvSchema.safeParse(cleaned);
  if (!result.success) {
    const name = String(result.error.issues[0]?.path[0] ?? "desconhecida");
    throw new Error(`Variável de ambiente inválida: ${name}`);
  }
  const env = result.data;
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    googleAuthEnabled: env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
  };
}

// O Next só substitui `process.env.NEXT_PUBLIC_*` quando o acesso é literal,
// por isso cada variável é listada explicitamente (sem repassar process.env).
export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
});
