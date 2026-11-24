/**
 * Validação funcional — Notas em ocorrências de tarefas
 * Adicionar nota via menu ⋯ → aparece na linha e no histórico.
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
  await page.getByLabel("Nome da residência").fill("Casa Notas E2E");
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
// 1. Adicionar nota em uma ocorrência aparece na linha da tarefa
// ---------------------------------------------------------------------------
test("1. adicionar nota em ocorrência aparece na linha da tarefa", async ({ page }) => {
  const email = uniqueEmail("notas-1-add");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");

  // Aguarda ao menos uma tarefa pendente
  const moreBtn = page.getByRole("button", { name: "Mais opções" }).first();
  await expect(moreBtn).toBeVisible({ timeout: 10_000 });

  // Abrir menu ⋯
  await moreBtn.click();

  // Clicar em "Adicionar nota"
  const addNoteItem = page.getByRole("menuitem", { name: /nota/i });
  await expect(addNoteItem).toBeVisible({ timeout: 5_000 });
  await addNoteItem.click();

  // Preencher a nota
  const noteText = `Nota de teste ${Date.now()}`;
  const textarea = page.getByRole("textbox", { name: /nota/i }).or(page.locator("textarea")).first();
  await expect(textarea).toBeVisible({ timeout: 5_000 });
  await textarea.fill(noteText);

  // Salvar
  await page.getByRole("button", { name: /salvar/i }).click();

  // A nota deve aparecer em itálico na linha da tarefa
  await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 2. Nota aparece no histórico após concluir a ocorrência
// ---------------------------------------------------------------------------
test("2. nota aparece no histórico após concluir a ocorrência", async ({ page }) => {
  const email = uniqueEmail("notas-2-hist");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");

  const moreBtn = page.getByRole("button", { name: "Mais opções" }).first();
  await expect(moreBtn).toBeVisible({ timeout: 10_000 });

  // Capturar o nome da tarefa antes de editar
  const taskCard = moreBtn.locator("../../..");
  const taskTitle = await page
    .locator(".bg-card")
    .filter({ has: moreBtn })
    .locator("span.font-medium, p.text-sm")
    .first()
    .textContent();

  // Adicionar nota
  await moreBtn.click();
  const addNoteItem = page.getByRole("menuitem", { name: /nota/i });
  await expect(addNoteItem).toBeVisible({ timeout: 5_000 });
  await addNoteItem.click();

  const noteText = `Nota histórico ${Date.now()}`;
  const textarea = page.getByRole("textbox", { name: /nota/i }).or(page.locator("textarea")).first();
  await textarea.fill(noteText);
  await page.getByRole("button", { name: /salvar/i }).click();
  await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 });

  // Concluir a ocorrência
  const completeBtn = page.getByRole("button", { name: "Marcar como concluída" }).first();
  await completeBtn.click();
  await expect(page.getByLabel("Concluída").first()).toBeVisible({ timeout: 10_000 });

  // A nota deve aparecer no histórico
  await page.goto("/rotina/historico");
  await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 });
});
