/**
 * Validação funcional — Evento ↔ Compras: itens pedidos no evento entram na lista de
 * compras com o selo "Vinculado a"; remover o item na edição o tira da lista; excluir o
 * evento apaga os itens pendentes.
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
  await page.getByLabel("Nome da residência").fill("Casa Evento Compras E2E");
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


async function createEventWithItem(page: Page, title: string, product: string) {
  await page.goto("/rotina?novo=evento");
  await expect(page.getByLabel("Nome", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Nome", { exact: true }).fill(title);
  await page.getByLabel("Produto do evento").fill(product);
  await page.getByLabel("Produto do evento").press("Enter");
  await expect(page.getByText(`${product} · 1 un`)).toBeVisible();
  await page.getByRole("button", { name: "Criar evento" }).click();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
}

test("1. item pedido no evento aparece em Compras com o selo do evento", async ({ page }) => {
  const email = uniqueEmail("evc-1");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Visita ${Date.now()}`;
  await createEventWithItem(page, title, "Leite de amendoas");

  await page.goto("/compras");
  await expect(page.getByText("Leite de amendoas")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel(`Vinculado a: ${title}`)).toBeVisible();
});

test("2. remover o item na edição do evento tira da lista de compras", async ({ page }) => {
  const email = uniqueEmail("evc-2");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Jantar ${Date.now()}`;
  await createEventWithItem(page, title, "Vinho tinto");

  await page.goto("/rotina");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await page.getByRole("button", { name: "Remover Vinho tinto da lista de compras" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remover" }).click();
  await expect(page.getByText(/Vinho tinto · 1 un/)).toHaveCount(0, { timeout: 10_000 });

  await page.goto("/compras");
  await expect(page.getByText("Vinho tinto")).toHaveCount(0);
});

test("3. excluir o evento apaga os itens pendentes da lista", async ({ page }) => {
  const email = uniqueEmail("evc-3");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Churrasco ${Date.now()}`;
  await createEventWithItem(page, title, "Carvao");

  await page.goto("/rotina");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("O 1 item pendente deste evento sai da lista de compras.");
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText(title)).toHaveCount(0, { timeout: 10_000 });

  await page.goto("/compras");
  await expect(page.getByText("Carvao")).toHaveCount(0);
});
