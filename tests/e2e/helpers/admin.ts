import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const E2E_EMAIL = "e2e@morano.test";
export const E2E_PASSWORD = "Morano123";

/**
 * Cliente com a chave secreta, só para os testes. Não usa `src/lib/supabase/admin.ts`
 * porque ele tem `server-only`, que falha fora do Next.
 */
export function createTestAdminClient(): SupabaseClient {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local. Rode `npm run db:status` e preencha o arquivo.",
    );
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Cria (ou atualiza) um usuário já confirmado. */
export async function ensureConfirmedUser(email: string, password: string) {
  const admin = createTestAdminClient();
  const metadata = { full_name: "Pessoa Teste", terms_accepted: "true" };
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (!created.error) return created.data.user;
  if (created.error.code !== "email_exists") throw created.error;

  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) {
      const updated = await admin.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
      });
      if (updated.error) throw updated.error;
      return updated.data.user;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`Não foi possível reutilizar o usuário ${email}.`);
}
