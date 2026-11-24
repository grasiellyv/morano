/**
 * Compras: anti-duplicação, link público de visualização (sem login), revogação
 * e atualização em tempo real entre duas sessões da mesma casa.
 */
import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser } from "./helpers/admin";

const PASSWORD = "Morano123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
}

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function completeOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding\/residencia$/, { timeout: 15_000 });
  await page.getByLabel("Nome da residência").fill(`Compras ${Date.now()}`);
  await page.getByLabel("Tipo de imóvel").selectOption("apartamento");
  await page.getByLabel("Situação do imóvel").selectOption("proprio");
  await page.getByLabel("Composição do lar").selectOption("sozinho");
  await page.getByLabel("Número de moradores").fill("1");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/onboarding\/comodos$/);
  const sala = page.getByRole("button", { name: "Sala", exact: true });
  if ((await sala.getAttribute("aria-pressed")) !== "true") await sala.click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/onboarding\/rotina$/);
  await page.getByRole("button", { name: "Equilibrada" }).click();
  await page.getByRole("button", { name: "Ver sugestões" }).click();
  await expect(page).toHaveURL(/\/onboarding\/revisao$/);
  await page.getByRole("button", { name: "Aprovar rotina" }).click();
  await expect(page).toHaveURL(/\/inicio$/, { timeout: 20_000 });
}

async function addProduct(page: Page, name: string, quantity = "1") {
  await page.getByLabel("Nome do produto", { exact: true }).fill(name);
  await page.getByLabel("Quantidade").fill(quantity);
  await page.getByRole("button", { name: "Adicionar à lista" }).click();
}

test("compras: duplicado soma, link público só leitura, revogar e tempo real", async ({ page, browser }) => {
  const email = uniqueEmail("compras-share");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email);
  await completeOnboarding(page);

  await page.goto("/compras");
  await expect(page.getByRole("heading", { level: 1, name: "Lista da casa" })).toBeVisible();

  // ── Adicionar sem sair da lista; o formulário continua aberto
  await page.getByRole("button", { name: "Adicionar produto" }).click();
  await addProduct(page, "Leite", "1");
  await expect(page.getByText("Leite", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Nome do produto", { exact: true })).toBeVisible();

  // ── Duplicado: mesmo nome (outra caixa/acento) soma a quantidade, sem segunda linha
  await page.getByLabel("Nome do produto", { exact: true }).fill("leite");
  await expect(page.getByRole("status").filter({ hasText: "já está na lista" })).toBeVisible();
  await page.getByLabel("Quantidade").fill("2");
  await page.getByRole("button", { name: "Adicionar à lista" }).click();
  await expect(page.getByText(/quantidade somada \(3 un\)/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Leite", { exact: true })).toHaveCount(1);
  await expect(page.getByText("3 un").first()).toBeVisible();

  // ── Compartilhar: cria o link
  await page.getByRole("button", { name: "Compartilhar lista" }).click();
  await page.getByRole("button", { name: "Criar link de visualização" }).click();
  const linkInput = page.getByLabel("Link de visualização");
  await expect(linkInput).toBeVisible({ timeout: 10_000 });
  const url = await linkInput.inputValue();
  expect(url).toMatch(/\/lista\/[a-f0-9]{64}$/);

  // ── Visitante sem conta (contexto limpo) vê a lista, só leitura
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await guest.goto(url);
  await expect(guest.getByRole("heading", { level: 1, name: "Lista da casa" })).toBeVisible();
  await expect(guest.getByText("Somente visualização")).toBeVisible();
  await expect(guest.getByText("Leite", { exact: false }).first()).toBeVisible();
  await expect(guest.locator("main").getByRole("button")).toHaveCount(0); // nenhuma ação de edição
  await expect(guest.locator("main").getByRole("textbox")).toHaveCount(0);

  // ── Tempo real: outra sessão do mesmo usuário adiciona; a primeira vê sem recarregar
  const second = await page.context().newPage();
  await second.goto("/compras");
  await second.getByRole("button", { name: "Adicionar produto" }).click();
  await addProduct(second, "Café", "1");
  await expect(second.getByText("Café", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Café", { exact: true })).toBeVisible({ timeout: 15_000 });

  // ── Revogar: o link deixa de funcionar
  await page.getByRole("button", { name: "Desativar link" }).click();
  await page.getByRole("button", { name: "Desativar", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Criar link de visualização" })).toBeVisible({ timeout: 10_000 });
  await guest.reload();
  await expect(guest.getByRole("heading", { name: "Link indisponível" })).toBeVisible();
  await guestCtx.close();
});

test("link com token inválido mostra 'Link indisponível' sem erro", async ({ page }) => {
  await page.goto(`/lista/${"a".repeat(64)}`);
  await expect(page.getByRole("heading", { name: "Link indisponível" })).toBeVisible();
  await page.goto("/lista/curto");
  await expect(page.getByRole("heading", { name: "Link indisponível" })).toBeVisible();
});
