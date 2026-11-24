/**
 * Validação funcional — a manutenção da casa (gerar ocorrências, marcar atrasadas, rodízio)
 * roda na primeira visita e NÃO a cada visita: a segunda abertura de Início/Rotina não repete.
 */
import { expect, test, type Page } from "@playwright/test";
import { createTestAdminClient, ensureConfirmedUser } from "./helpers/admin";

const PASSWORD = "Morano123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function completeOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding\/residencia$/, { timeout: 15_000 });
  await page.getByLabel("Nome da residência").fill("Casa Manutencao E2E");
  await page.getByLabel("Tipo de imóvel").selectOption("apartamento");
  await page.getByLabel("Situação do imóvel").selectOption("proprio");
  await page.getByLabel("Composição do lar").selectOption("sozinho");
  await page.getByLabel("Número de moradores").fill("1");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/comodos$/);
  const salaButton = page.getByRole("button", { name: "Sala", exact: true });
  if ((await salaButton.getAttribute("aria-pressed")) !== "true") {
    await salaButton.click();
  }
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/rotina$/);
  await page.getByRole("button", { name: "Equilibrada" }).click();
  await page.getByRole("button", { name: "Ver sugestões" }).click();

  await expect(page).toHaveURL(/\/onboarding\/revisao$/);
  await page.getByRole("button", { name: "Aprovar rotina" }).click();
  await expect(page).toHaveURL(/\/inicio$/, { timeout: 20_000 });
}


async function ranAt(email: string): Promise<string | null> {
  const admin = createTestAdminClient();
  let userId: string | null = null;
  for (let pg = 1; pg < 20 && !userId; pg++) {
    const { data } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    userId = data?.users.find((u) => u.email === email)?.id ?? null;
    if ((data?.users.length ?? 0) < 200) break;
  }
  const { data: profile } = await admin.from("profiles").select("current_home_id").eq("id", userId!).single();
  const { data: home } = await admin.from("homes").select("maintenance_ran_at").eq("id", profile!.current_home_id as string).single();
  return (home?.maintenance_ran_at as string | null) ?? null;
}

test("manutenção roda na primeira visita e não se repete na segunda", async ({ page }) => {
  const email = uniqueEmail("man-1");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await expect(page.getByRole("heading", { name: "Rotina" }).first()).toBeVisible({ timeout: 15_000 });
  const first = await ranAt(email);
  expect(first).not.toBeNull();

  await page.goto("/inicio");
  await expect(page.getByText("Resumo da casa")).toBeVisible({ timeout: 15_000 });
  await page.goto("/rotina");
  await expect(page.getByRole("heading", { name: "Rotina" }).first()).toBeVisible({ timeout: 15_000 });
  expect(await ranAt(email)).toBe(first);
});
