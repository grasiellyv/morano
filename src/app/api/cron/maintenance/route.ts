import { createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMaintenanceForDueHomes } from "@/features/tasks/cron-maintenance";

// Até 60 s: o orçamento interno (45 s) para antes e o resto fica para a próxima execução.
export const maxDuration = 60;

function secretMatches(authorization: string | null, secret: string): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  // Compara hashes (mesmo tamanho) em tempo constante.
  const a = createHash("sha256").update(authorization.slice("Bearer ".length)).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/**
 * Manutenção diária das casas (Vercel Cron, ver vercel.json). A Vercel envia
 * `Authorization: Bearer $CRON_SECRET` quando a variável CRON_SECRET existe no projeto.
 * Sem a variável, a rota fica DESLIGADA (503): nunca aberta.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "cron_not_configured" }, { status: 503 });
  if (!secretMatches(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runMaintenanceForDueHomes(createAdminClient());
    return Response.json(result);
  } catch {
    return Response.json({ error: "maintenance_failed" }, { status: 500 });
  }
}
