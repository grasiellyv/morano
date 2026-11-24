/**
 * Validação funcional — Calendário (/rotina/calendario)
 * 3 cenários: carregamento do mês atual, navegação para o próximo mês e anterior.
 */
import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser } from "./helpers/admin";

const PASSWORD = "Morano123";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
}

function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

function nextMonthLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${MONTH_NAMES[next.getMonth()]} ${next.getFullYear()}`;
}

function prevMonthLabel(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${MONTH_NAMES[prev.getMonth()]} ${prev.getFullYear()}`;
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
  await page.getByLabel("Nome da residência").fill("Casa Calendário E2E");
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

// ---------------------------------------------------------------------------
// 1. Carrega com o mês atual exibido
// ---------------------------------------------------------------------------
test("1. calendário carrega com o mês atual", async ({ page }) => {
  const email = uniqueEmail("cal-1-load");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina/calendario");
  await expect(page.getByRole("heading", { name: "Calendário" })).toBeVisible({ timeout: 10_000 });

  // O label do mês atual deve estar visível na view de mês (desktop) ou semana (mobile)
  await expect(page.getByText(currentMonthLabel())).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 2. Navegar para o mês seguinte
// ---------------------------------------------------------------------------
test("2. navegar para o próximo mês atualiza o label", async ({ page }) => {
  const email = uniqueEmail("cal-2-next");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina/calendario");
  await expect(page.getByText(currentMonthLabel())).toBeVisible({ timeout: 10_000 });

  // Clica no link "›" (próximo mês) — só visível em md+ (month view)
  // A página usa <Link href="?year=...&month=..."> com texto ›
  await page.getByRole("link", { name: "›" }).first().click();

  await expect(page.getByText(nextMonthLabel())).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. Navegar para o mês anterior
// ---------------------------------------------------------------------------
test("3. navegar para o mês anterior atualiza o label", async ({ page }) => {
  const email = uniqueEmail("cal-3-prev");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina/calendario");
  await expect(page.getByText(currentMonthLabel())).toBeVisible({ timeout: 10_000 });

  // Clica no link "‹" (mês anterior)
  await page.getByRole("link", { name: "‹" }).first().click();

  await expect(page.getByText(prevMonthLabel())).toBeVisible({ timeout: 10_000 });
});
