import "server-only";

/** Chave secreta (service role) do Supabase. Nunca importar em código de cliente. */
export function getSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("Variável de ambiente inválida: SUPABASE_SECRET_KEY");
  }
  return key;
}
