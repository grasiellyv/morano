/**
 * Validação funcional — cron de manutenção: roda a manutenção das casas sem ninguém abrir o app,
 * e só com o segredo certo.
 */
import { expect, test } from "@playwright/test";
import { createTestAdminClient, ensureConfirmedUser } from "./helpers/admin";
import { completeOnboardingFor } from "./helpers/cron-onboarding";

const SECRET = "e2e-cron-secret";

test("sem o segredo certo a rota recusa (401)", async ({ request }) => {
  expect((await request.get("/api/cron/maintenance")).status()).toBe(401);
  expect((await request.get("/api/cron/maintenance", { headers: { authorization: "Bearer errado" } })).status()).toBe(401);
});

test("com o segredo, gera as ocorrências que faltam numa casa que ninguém abriu há dias", async ({ page, request }) => {
  const email = `cron-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
  await ensureConfirmedUser(email, "Morano123");
  await completeOnboardingFor(page, email);

  const admin = createTestAdminClient();
  let userId: string | null = null;
  for (let pg = 1; pg < 20 && !userId; pg++) {
    const { data } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    userId = data?.users.find((u) => u.email === email)?.id ?? null;
    if ((data?.users.length ?? 0) < 200) break;
  }
  const { data: profile } = await admin.from("profiles").select("current_home_id").eq("id", userId!).single();
  const homeId = profile!.current_home_id as string;

  // "Ninguém abriu há dias": manutenção antiga e janela de ocorrências esgotada.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() - 86_400_000));
  await admin.from("homes").update({ maintenance_ran_at: new Date(Date.now() - 2 * 86_400_000).toISOString() }).eq("id", homeId);
  await admin.from("routines").update({ generated_until: yesterday }).eq("home_id", homeId);

  // Pode haver outras casas devidas no banco local: repete até chegar na nossa.
  let last: Record<string, unknown> = {};
  for (let i = 0; i < 6; i++) {
    const res = await request.get("/api/cron/maintenance", { headers: { authorization: `Bearer ${SECRET}` } });
    expect(res.status()).toBe(200);
    last = await res.json();
    const { data: home } = await admin.from("homes").select("maintenance_ran_at").eq("id", homeId).single();
    if (Date.now() - new Date(home!.maintenance_ran_at as string).getTime() < 60_000) break;
  }
  expect(last).toHaveProperty("processed");

  const { data: routines } = await admin.from("routines").select("generated_until").eq("home_id", homeId);
  expect(routines!.length).toBeGreaterThan(0);
  const plus40 = new Date(Date.parse(today + "T00:00:00Z") + 40 * 86_400_000).toISOString().slice(0, 10);
  for (const r of routines!) expect(r.generated_until as string >= plus40).toBe(true);

  // E não repete: logo em seguida a casa já não está "devida".
  const again = await request.get("/api/cron/maintenance", { headers: { authorization: `Bearer ${SECRET}` } });
  const body = (await again.json()) as { due: number };
  const { data: after } = await admin.from("homes").select("maintenance_ran_at").eq("id", homeId).single();
  expect(Date.now() - new Date(after!.maintenance_ran_at as string).getTime()).toBeLessThan(5 * 60_000);
  expect(typeof body.due).toBe("number");
});
