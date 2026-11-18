import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { getSecretKey } from "@/lib/env.server";
import type { Database } from "@/types/database";

/** Cliente com a chave secreta: ignora RLS. Somente servidor, testes e tarefas internas. */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, getSecretKey(), {
    auth: { persistSession: false },
  });
}
