/**
 * Validação funcional — Página de edição completa (/rotina/tarefas/[id]/editar)
 * 4 cenários: navegar à página, editar agendamento, arquivar com histórico,
 * arquivar sem histórico (exclui).
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
  await page.getByLabel("Nome da residência").fill("Casa Edição Completa E2E");
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

async function createTaskViaUI(page: Page, title: string) {
  await page.goto("/rotina");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible({ timeout: 10_000 });
}

async function openEditPageForTask(page: Page, title: string) {
  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();
  await row.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  // Painel inline abre — clicar no link "Editar agendamento →"
  await page.getByRole("link", { name: /Editar agendamento/i }).click();
  await expect(page).toHaveURL(/\/rotina\/tarefas\/.+\/editar$/, { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// 1. Navegar à página de edição via link no painel inline
// ---------------------------------------------------------------------------
test("1. link 'Editar agendamento' abre a página de edição completa", async ({ page }) => {
  const email = uniqueEmail("tep-1-nav");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Nav Edição ${Date.now()}`;
  await createTaskViaUI(page, title);

  await openEditPageForTask(page, title);

  // Página deve ter heading com o título da tarefa e seção Agendamento
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("heading", { name: "Agendamento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Detalhes" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Editar frequência de diária para semanal na página de edição
// ---------------------------------------------------------------------------
test("2. editar frequência para semanal na página de edição", async ({ page }) => {
  const email = uniqueEmail("tep-2-sched");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Freq ${Date.now()}`;
  // Criar tarefa diária
  await page.goto("/rotina");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Frequência").selectOption("daily");
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible({ timeout: 10_000 });

  await openEditPageForTask(page, title);

  // Alterar frequência para semanal
  const freqSelect = page.locator("#schedule-frequency");
  await expect(freqSelect).toBeVisible({ timeout: 5_000 });
  await freqSelect.selectOption("weekly");

  await page.getByRole("button", { name: "Salvar agendamento" }).click();

  // Mensagem de sucesso deve aparecer
  await expect(page.getByText(/atualizada|sucesso/i)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. Arquivar tarefa com histórico — task arquivada some da rotina
// ---------------------------------------------------------------------------
test("3. arquivar tarefa com histórico a remove da rotina", async ({ page }) => {
  const email = uniqueEmail("tep-3-archive");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Arquivar UI ${Date.now()}`;
  await createTaskViaUI(page, title);

  // Concluir para criar histórico
  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();
  await row.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Navegar à página de edição
  await openEditPageForTask(page, title);

  // Clicar em "Arquivar tarefa"
  await page.getByRole("button", { name: "Arquivar tarefa" }).click();

  // Confirmação aparece — clicar em "Confirmar"
  await expect(page.getByRole("button", { name: "Confirmar" })).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Confirmar" }).click();

  // Após arquivar, a tarefa não deve aparecer como pendente na rotina
  await page.goto("/rotina");
  const completeBtns = page
    .locator("div")
    .filter({ hasText: title })
    .getByRole("button", { name: "Marcar como concluída" });
  await expect(completeBtns).toHaveCount(0, { timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 4. Arquivar tarefa sem histórico — cancelar confirmação
// ---------------------------------------------------------------------------
test("4. cancelar confirmação de arquivamento mantém a tarefa ativa", async ({ page }) => {
  const email = uniqueEmail("tep-4-cancel");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Cancel Arquivo ${Date.now()}`;
  await createTaskViaUI(page, title);

  await openEditPageForTask(page, title);

  // Clicar em "Arquivar tarefa"
  await page.getByRole("button", { name: "Arquivar tarefa" }).click();
  await expect(page.getByRole("button", { name: "Confirmar" })).toBeVisible({ timeout: 5_000 });

  // Cancelar
  await page.getByRole("button", { name: "Cancelar" }).click();

  // O botão de confirmação some; o "Arquivar tarefa" volta
  await expect(page.getByRole("button", { name: "Confirmar" })).not.toBeVisible({ timeout: 3_000 });
  await expect(page.getByRole("button", { name: "Arquivar tarefa" })).toBeVisible();
});
