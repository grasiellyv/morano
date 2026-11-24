/**
 * Validação funcional — Compras (Shopping V2)
 * 8 cenários cobrindo o fluxo principal da lista de compras.
 */
import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser, createTestAdminClient } from "./helpers/admin";

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
  await page.getByLabel("Nome da residência").fill("Casa Compras E2E");
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

/** Adiciona item na lista principal via UI e aguarda aparecer em Pendentes. */
async function addItem(page: Page, name: string) {
  await page.getByLabel("Nome do item").fill(name);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(
    page.locator("section").filter({ hasText: "Pendentes" }).getByText(name),
  ).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// 1. Adicionar item simples
// ---------------------------------------------------------------------------
test("1. adicionar item simples aparece em Pendentes", async ({ page }) => {
  const email = uniqueEmail("cmp-1-add");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const name = `Item ${Date.now()}`;
  await addItem(page, name);

  await expect(
    page.locator("section").filter({ hasText: "Pendentes" }).getByText(name),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Autocomplete do catálogo preenche o campo
// ---------------------------------------------------------------------------
test("2. autocomplete preenche o campo ao selecionar sugestão", async ({ page }) => {
  const email = uniqueEmail("cmp-2-autocomplete");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const input = page.getByLabel("Nome do item");
  await input.fill("arr");

  // O dropdown de sugestões é uma <ul> com class "absolute" posicionada sob o input
  const suggestionList = page.locator("ul.absolute");
  await expect(suggestionList).toBeVisible({ timeout: 5_000 });

  // Clica na primeira sugestão
  await suggestionList.locator("button").first().click();

  // O campo deve estar preenchido (sugestão selecionada)
  const val = await input.inputValue();
  expect(val.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// 3. Marcar item como comprado
// ---------------------------------------------------------------------------
test("3. marcar item como comprado move para Comprados", async ({ page }) => {
  const email = uniqueEmail("cmp-3-toggle");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const name = `Comprar ${Date.now()}`;
  await addItem(page, name);

  // Clica no checkbox para marcar como comprado
  const row = page.locator(".bg-card").filter({ hasText: name }).first();
  await row.getByRole("button", { name: "Marcar como comprado" }).click();

  // Item deve aparecer em Comprados
  await expect(
    page.locator("section").filter({ hasText: "Comprados" }).getByText(name),
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 4. Desmarcar item comprado volta para Pendentes
// ---------------------------------------------------------------------------
test("4. desmarcar item comprado volta para Pendentes", async ({ page }) => {
  const email = uniqueEmail("cmp-4-uncheck");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const name = `Desmarcar ${Date.now()}`;
  await addItem(page, name);

  const row = page.locator(".bg-card").filter({ hasText: name }).first();
  await row.getByRole("button", { name: "Marcar como comprado" }).click();
  await expect(
    page.locator("section").filter({ hasText: "Comprados" }).getByText(name),
  ).toBeVisible({ timeout: 10_000 });

  // Desmarca
  const purchasedRow = page.locator(".bg-card").filter({ hasText: name }).first();
  await purchasedRow.getByRole("button", { name: "Desmarcar como comprado" }).click();

  // Item volta para Pendentes
  await expect(
    page.locator("section").filter({ hasText: "Pendentes" }).getByText(name),
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 5. Editar nome do item
// ---------------------------------------------------------------------------
test("5. editar item atualiza o nome na lista", async ({ page }) => {
  const email = uniqueEmail("cmp-5-edit");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const name = `Editar ${Date.now()}`;
  const newName = `Editado ${Date.now()}`;
  await addItem(page, name);

  // Abre menu "Mais opções" e clica em Editar
  const row = page.locator(".bg-card").filter({ hasText: name }).first();
  await row.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();

  // Edita o nome
  const nameInput = page.locator("input[name='name']").first();
  await nameInput.clear();
  await nameInput.fill(newName);
  await page.getByRole("button", { name: "Salvar" }).click();

  // Novo nome deve aparecer em Pendentes
  await expect(
    page.locator("section").filter({ hasText: "Pendentes" }).getByText(newName),
  ).toBeVisible({ timeout: 10_000 });
  // Nome antigo não deve estar mais visível
  await expect(
    page.locator("section").filter({ hasText: "Pendentes" }).getByText(name, { exact: true }),
  ).not.toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 6. Deletar item com confirmação
// ---------------------------------------------------------------------------
test("6. excluir item remove da lista", async ({ page }) => {
  const email = uniqueEmail("cmp-6-delete");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const name = `Excluir ${Date.now()}`;
  await addItem(page, name);

  // Abre menu e clica em Excluir
  const row = page.locator(".bg-card").filter({ hasText: name }).first();
  await row.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();

  // Confirma no dialog
  await page.getByRole("button", { name: "Excluir" }).last().click();

  // Item não deve mais estar visível
  await expect(
    page.locator("section").filter({ hasText: "Pendentes" }).getByText(name),
  ).not.toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 7. Criar lista nomeada
// ---------------------------------------------------------------------------
test("7. criar lista nomeada aparece em Listas salvas", async ({ page }) => {
  const email = uniqueEmail("cmp-7-list");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const listName = `Lista ${Date.now()}`;

  // Clica em "+ Nova lista" e preenche o nome
  await page.getByRole("button", { name: "+ Nova lista" }).click();
  await page.getByLabel("Nome da nova lista").fill(listName);
  await page.getByRole("button", { name: "Salvar" }).first().click();

  // Nova lista deve aparecer na seção Listas salvas
  await expect(
    page.locator("section, div").filter({ hasText: "Listas salvas" }).getByText(listName),
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 8. Adicionar item a uma lista nomeada
// ---------------------------------------------------------------------------
test("8. adicionar item a lista nomeada aparece na lista", async ({ page }) => {
  const email = uniqueEmail("cmp-8-listitem");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/compras");
  const listName = `Lista Item ${Date.now()}`;
  const itemName = `Item Lista ${Date.now()}`;

  // Cria a lista
  await page.getByRole("button", { name: "+ Nova lista" }).click();
  await page.getByLabel("Nome da nova lista").fill(listName);
  await page.getByRole("button", { name: "Salvar" }).first().click();
  await expect(
    page.locator("section, div").filter({ hasText: "Listas salvas" }).getByText(listName),
  ).toBeVisible({ timeout: 10_000 });

  // Localiza o painel da lista e adiciona item
  const listPanel = page.locator("div, section").filter({ hasText: listName });
  const addListItemInput = listPanel.getByLabel("Nome do item").first();
  await addListItemInput.fill(itemName);

  // Submete pelo Enter ou pelo botão Adicionar dentro do painel
  const addButton = listPanel.getByRole("button", { name: "Adicionar" }).first();
  await addButton.click();

  // Item deve aparecer dentro do painel da lista
  await expect(listPanel.getByText(itemName)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// Helpers: limpeza de usuários de teste não é necessária pois
// os emails únicos garantem isolamento entre runs.
// ---------------------------------------------------------------------------
