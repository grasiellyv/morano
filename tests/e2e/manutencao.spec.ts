/**
 * Validação funcional — Módulo Manutenção (/manutencao)
 * 7 cenários cobrindo o ciclo de vida de itens de manutenção.
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
  await page.getByLabel("Nome da residência").fill("Casa Manutenção E2E");
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

/** Adiciona item e aguarda aparecer em "Em aberto". */
async function addItem(page: Page, title: string) {
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(
    page.locator("section").filter({ hasText: "Em aberto" }).getByText(title),
  ).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// 1. Adicionar item simples — badge "Pendente" em "Em aberto"
// ---------------------------------------------------------------------------
test("1. adicionar item aparece em Em aberto com badge Pendente", async ({ page }) => {
  const email = uniqueEmail("man-1-add");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/manutencao");
  const title = `Vazamento ${Date.now()}`;
  await addItem(page, title);

  const card = page.locator(".bg-card").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText("Pendente")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Iniciar item — badge muda para "Em andamento"
// ---------------------------------------------------------------------------
test("2. iniciar item muda badge para Em andamento", async ({ page }) => {
  const email = uniqueEmail("man-2-iniciar");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/manutencao");
  const title = `Pintura ${Date.now()}`;
  await addItem(page, title);

  const card = page.locator(".bg-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Iniciar" }).click();

  await expect(card.getByText("Em andamento")).toBeVisible({ timeout: 10_000 });
  // Botão "Iniciar" desaparece; agora deve ter "Concluir"
  await expect(card.getByRole("button", { name: "Concluir" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. Concluir item — aparece em Histórico com badge "Concluído"
// ---------------------------------------------------------------------------
test("3. concluir item move para Histórico com badge Concluído", async ({ page }) => {
  const email = uniqueEmail("man-3-concluir");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/manutencao");
  const title = `Hidráulica ${Date.now()}`;
  await addItem(page, title);

  // Iniciar → Concluir
  const card = page.locator(".bg-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Iniciar" }).click();
  await expect(card.getByRole("button", { name: "Concluir" })).toBeVisible({ timeout: 10_000 });
  await card.getByRole("button", { name: "Concluir" }).click();

  // O CelebrationOverlay aparece — dispensa ele se aparecer
  const celebration = page.locator("[role='dialog'], .fixed").filter({ hasText: /concluído/i });
  if (await celebration.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await page.keyboard.press("Escape");
  }

  // Item deve estar no Histórico com badge "Concluído"
  const history = page.locator("details").filter({ hasText: "Histórico" });
  await expect(history.getByText(title)).toBeVisible({ timeout: 10_000 });
  await expect(history.locator(".bg-card").filter({ hasText: title }).getByText("Concluído")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. Cancelar item — aparece em Histórico com badge "Cancelado"
// ---------------------------------------------------------------------------
test("4. cancelar item move para Histórico com badge Cancelado", async ({ page }) => {
  const email = uniqueEmail("man-4-cancelar");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/manutencao");
  const title = `Elétrica ${Date.now()}`;
  await addItem(page, title);

  const card = page.locator(".bg-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Cancelar" }).click();

  const history = page.locator("details").filter({ hasText: "Histórico" });
  await expect(history.getByText(title)).toBeVisible({ timeout: 10_000 });
  await expect(history.locator(".bg-card").filter({ hasText: title }).getByText("Cancelado")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. Editar título do item
// ---------------------------------------------------------------------------
test("5. editar item atualiza o título", async ({ page }) => {
  const email = uniqueEmail("man-5-edit");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/manutencao");
  const title = `Infiltração ${Date.now()}`;
  const newTitle = `Infiltração Corrigida ${Date.now()}`;
  await addItem(page, title);

  const card = page.locator(".bg-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Editar" }).click();

  // O card vira formulário de edição — usa locator de página pois o valor
  // de input não conta como texto visível para o filter
  const titleInput = page.locator("input[name='title']").first();
  await expect(titleInput).toBeVisible({ timeout: 5_000 });
  await titleInput.clear();
  await titleInput.fill(newTitle);
  await page.getByRole("button", { name: "Salvar" }).first().click();

  // Novo título visível em "Em aberto"
  await expect(
    page.locator("section").filter({ hasText: "Em aberto" }).getByText(newTitle),
  ).toBeVisible({ timeout: 10_000 });
  // Título antigo sumiu
  await expect(
    page.locator("section").filter({ hasText: "Em aberto" }).getByText(title, { exact: true }),
  ).not.toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 6. Excluir item com confirmação
// ---------------------------------------------------------------------------
test("6. excluir item remove da lista", async ({ page }) => {
  const email = uniqueEmail("man-6-delete");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/manutencao");
  const title = `Telha ${Date.now()}`;
  await addItem(page, title);

  const card = page.locator(".bg-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Excluir" }).click();

  // Confirm dialog
  await page.getByRole("button", { name: "Excluir" }).last().click();

  // Item não deve mais aparecer
  await expect(
    page.locator("section").filter({ hasText: "Em aberto" }).getByText(title),
  ).not.toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 7. Adicionar item com descrição (expandir "Mais opções")
// ---------------------------------------------------------------------------
test("7. adicionar item com descrição exibe descrição no card", async ({ page }) => {
  const email = uniqueEmail("man-7-desc");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/manutencao");
  const title = `Manchas ${Date.now()}`;
  const description = "Manchas de umidade no teto do quarto";

  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Mais opções (descrição, cômodo, notas)" }).click();
  await page.locator("textarea[name='description']").fill(description);
  await page.getByRole("button", { name: "Adicionar" }).click();

  // Card deve exibir descrição
  const card = page.locator(".bg-card").filter({ hasText: title });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card.getByText(description)).toBeVisible();
});
