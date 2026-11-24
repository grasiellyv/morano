/**
 * Validação funcional — Membros da casa (/casa/membros): página única com as seções
 * Moradores, Convites pendentes e Histórico de convites; rotas antigas redirecionam.
 */
import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser } from "./helpers/admin";

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
  await page.getByLabel("Nome da residência").fill("Casa Membros E2E");
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
// 1. Página única: moradores, seções de convites e "Voltar" para Minha Casa
// ---------------------------------------------------------------------------
test("1. página de membros mostra o proprietário e as três seções", async ({ page }) => {
  const email = uniqueEmail("mbr-1-list");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/membros");
  await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible({ timeout: 10_000 });

  await expect(page.getByText("Proprietário")).toBeVisible();
  await expect(page.getByText("Moradores", { exact: true })).toBeVisible();
  await expect(page.getByText("Convites pendentes", { exact: true })).toBeVisible();
  await expect(page.getByText("Histórico de convites", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Convidar membro" })).toBeVisible();

  await page.getByRole("link", { name: "Voltar" }).click();
  await expect(page).toHaveURL(/\/casa$/, { timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 2. Rotas antigas redirecionam para a página única
// ---------------------------------------------------------------------------
test("2. /casa/membros/convites redireciona e abre a seção de convites", async ({ page }) => {
  const email = uniqueEmail("mbr-2-redirect");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/membros/convites");
  await expect(page).toHaveURL(/\/casa\/membros\?secao=convites/, { timeout: 10_000 });
  await expect(page.getByText("Nenhum convite pendente.")).toBeVisible({ timeout: 10_000 });

  await page.goto("/casa/membros/convidar");
  await expect(page).toHaveURL(/\/casa\/membros\?secao=convites&novo=1/, { timeout: 10_000 });
  await expect(page.getByLabel("E-mail do convidado")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. Criar convite e revogar: pendente → histórico como Revogado
// ---------------------------------------------------------------------------
test("3. criar convite e revogar move o convite para o histórico", async ({ page }) => {
  const email = uniqueEmail("mbr-3-invite");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/membros");
  await page.getByRole("link", { name: "Convidar membro" }).click();
  await expect(page.getByLabel("E-mail do convidado")).toBeVisible({ timeout: 10_000 });

  const inviteeEmail = uniqueEmail("convidado");
  await page.getByLabel("E-mail do convidado").fill(inviteeEmail);
  await page.getByRole("button", { name: "Criar convite" }).click();
  await expect(page.getByText("Convite criado!")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(inviteeEmail)).toBeVisible();

  await page.getByRole("button", { name: "Revogar" }).click();
  await expect(page.getByText("Nenhum convite pendente.")).toBeVisible({ timeout: 15_000 });

  await page.getByText("Histórico de convites", { exact: true }).click();
  await expect(page.getByText("Revogado")).toBeVisible();
});
