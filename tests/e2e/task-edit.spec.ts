/**
 * Validação funcional — Edição inline de tarefas (/rotina)
 * 4 cenários: editar título, editar prioridade, marcar essencial, cancelar.
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
  await page.getByLabel("Nome da residência").fill("Casa Edit E2E");
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

async function createTaskViaUI(page: Page, title: string) {
  await page.goto("/rotina");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible({ timeout: 10_000 });
}

/** Abre o menu ⋯ da linha que contém `title` e clica em "Editar". */
async function openEditPanel(page: Page, title: string) {
  const row = page.locator("div").filter({ hasText: title }).first();
  await row.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
}

// ---------------------------------------------------------------------------
// 1. Editar título da tarefa → novo título aparece na rotina
// ---------------------------------------------------------------------------
test("1. editar título da tarefa exibe o novo nome na rotina", async ({ page }) => {
  const email = uniqueEmail("tedit-1-title");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const original = `Tarefa Original ${Date.now()}`;
  const updated = `Tarefa Editada ${Date.now()}`;
  await createTaskViaUI(page, original);

  await page.goto("/rotina");
  await expect(page.getByText(original)).toBeVisible({ timeout: 10_000 });

  await openEditPanel(page, original);

  // Painel de edição deve estar visível
  const titleInput = page.getByLabel("Título");
  await expect(titleInput).toBeVisible({ timeout: 5_000 });

  // Limpa e digita novo título
  await titleInput.fill(updated);
  await page.getByRole("button", { name: "Salvar" }).click();

  // Após salvar, o novo título deve aparecer na rotina
  await expect(page.getByText(updated)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(original)).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Editar prioridade → badge de prioridade atualizado na linha
// ---------------------------------------------------------------------------
test("2. editar prioridade de baixa para alta atualiza o badge na linha", async ({ page }) => {
  const email = uniqueEmail("tedit-2-prio");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Prioridade ${Date.now()}`;
  await createTaskViaUI(page, title);

  await page.goto("/rotina");
  await openEditPanel(page, title);

  const prioSelect = page.locator("#edit-task-priority");
  await expect(prioSelect).toBeVisible({ timeout: 5_000 });
  await prioSelect.selectOption("alta");
  await page.getByRole("button", { name: "Salvar" }).click();

  // Badge "Alta" deve aparecer na linha da tarefa
  const row = page.locator("div").filter({ hasText: title }).first();
  await expect(row.getByText("Alta")).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. Marcar como essencial → badge "Essencial" aparece na linha
// ---------------------------------------------------------------------------
test("3. marcar tarefa como essencial exibe badge Essencial", async ({ page }) => {
  const email = uniqueEmail("tedit-3-essential");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Essencial ${Date.now()}`;
  await createTaskViaUI(page, title);

  await page.goto("/rotina");
  await openEditPanel(page, title);

  const checkbox = page.locator("#edit-task-essential");
  await expect(checkbox).toBeVisible({ timeout: 5_000 });
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
  }
  await page.getByRole("button", { name: "Salvar" }).click();

  const row = page.locator("div").filter({ hasText: title }).first();
  await expect(row.getByText("Essencial")).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 4. Cancelar edição → painel fecha sem alterar o título
// ---------------------------------------------------------------------------
test("4. cancelar edição fecha o painel sem alterar a tarefa", async ({ page }) => {
  const email = uniqueEmail("tedit-4-cancel");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Cancelar ${Date.now()}`;
  await createTaskViaUI(page, title);

  await page.goto("/rotina");
  await openEditPanel(page, title);

  const titleInput = page.getByLabel("Título");
  await expect(titleInput).toBeVisible({ timeout: 5_000 });

  // Muda o título mas clica em Cancelar
  await titleInput.fill("Título que não deve ser salvo");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // O painel deve fechar e o título original deve persistir
  await expect(page.getByLabel("Título")).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(title)).toBeVisible();
});
