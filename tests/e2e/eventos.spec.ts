/**
 * Validação funcional — Eventos
 * 6 cenários cobrindo criação, edição, exclusão e validação de eventos em /rotina.
 */
import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser } from "./helpers/admin";

const PASSWORD = "Morano123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
  await page.getByLabel("Nome da residência").fill("Casa Eventos E2E");
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
  await page.getByRole("button", { name: "Ver sugestões →" }).click();

  await expect(page).toHaveURL(/\/onboarding\/revisao$/);
  await page.getByRole("button", { name: "Aprovar rotina" }).click();
  await expect(page).toHaveURL(/\/inicio$/, { timeout: 20_000 });
}

/** Abre o formulário de novo evento e preenche os campos obrigatórios. */
async function openCreateForm(page: Page) {
  await page.getByRole("button", { name: "Novo evento" }).click();
  await expect(page.getByRole("heading", { name: "Novo evento" })).toBeVisible({
    timeout: 5_000,
  });
}

// ---------------------------------------------------------------------------
// 1. Criar evento simples — chip aparece na rotina
// ---------------------------------------------------------------------------
test("1. criar evento simples aparece como chip na rotina", async ({ page }) => {
  const email = uniqueEmail("evt-1-create");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openCreateForm(page);

  const title = `Aniversário ${Date.now()}`;
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Data de início").fill(today());
  await page.getByRole("button", { name: "Criar evento" }).click();

  // Chip com o título deve aparecer na seção de eventos
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 2. Criar evento com tipo específico — label aparece no chip
// ---------------------------------------------------------------------------
test("2. tipo do evento aparece no chip", async ({ page }) => {
  const email = uniqueEmail("evt-2-type");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openCreateForm(page);

  const title = `Consulta ${Date.now()}`;
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Tipo").selectOption("consulta_medica");
  await page.getByLabel("Data de início").fill(today());
  await page.getByRole("button", { name: "Criar evento" }).click();

  // Chip deve exibir o label do tipo "Consulta"
  const chip = page.locator("div").filter({ hasText: title }).first();
  await expect(chip).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Consulta").first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. Editar evento — chip atualizado com novo título
// ---------------------------------------------------------------------------
test("3. editar evento atualiza o chip", async ({ page }) => {
  const email = uniqueEmail("evt-3-edit");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openCreateForm(page);

  const title = `Jantar ${Date.now()}`;
  const newTitle = `Jantar Editado ${Date.now()}`;
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Data de início").fill(today());
  await page.getByRole("button", { name: "Criar evento" }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

  // Clica no chip para abrir formulário de edição
  await page.getByText(title).click();
  await expect(page.getByRole("heading", { name: "Editar evento" })).toBeVisible({
    timeout: 5_000,
  });

  // Altera o título
  const titleInput = page.getByLabel("Título");
  await titleInput.clear();
  await titleInput.fill(newTitle);
  await page.getByRole("button", { name: "Salvar" }).click();

  // Novo título visível, antigo sumiu
  await expect(page.getByText(newTitle)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(title, { exact: true })).not.toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 4. Excluir evento — chip some da rotina
// ---------------------------------------------------------------------------
test("4. excluir evento remove o chip da rotina", async ({ page }) => {
  const email = uniqueEmail("evt-4-delete");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openCreateForm(page);

  const title = `Visita ${Date.now()}`;
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Data de início").fill(today());
  await page.getByRole("button", { name: "Criar evento" }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

  // Abre edição e exclui
  await page.getByText(title).click();
  await expect(page.getByRole("heading", { name: "Editar evento" })).toBeVisible({
    timeout: 5_000,
  });
  await page.getByRole("button", { name: "Excluir" }).click();

  // Chip deve desaparecer
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 5. Data de fim anterior à inicial → erro de validação
// ---------------------------------------------------------------------------
test("5. data de fim anterior à inicial exibe erro", async ({ page }) => {
  const email = uniqueEmail("evt-5-invalid");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openCreateForm(page);

  await page.getByLabel("Título").fill(`Feriado ${Date.now()}`);
  await page.getByLabel("Data de início").fill(dateOffset(3));
  await page.getByLabel("Data de fim").fill(dateOffset(1));
  await page.getByRole("button", { name: "Criar evento" }).click();

  // Deve exibir mensagem de erro de validação
  await expect(
    page.getByText(/data de fim|end_date|após a data de início/i),
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 6. Título vazio → campo obrigatório (validação nativa)
// ---------------------------------------------------------------------------
test("6. título vazio impede submissão", async ({ page }) => {
  const email = uniqueEmail("evt-6-empty");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openCreateForm(page);

  // Deixa o título vazio mas preenche a data
  await page.getByLabel("Data de início").fill(today());
  await page.getByRole("button", { name: "Criar evento" }).click();

  // Formulário não deve fechar — o heading "Novo evento" ainda deve estar visível
  await expect(page.getByRole("heading", { name: "Novo evento" })).toBeVisible({
    timeout: 5_000,
  });
});
