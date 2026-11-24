/**
 * Validação funcional — Histórico de tarefas (/rotina/historico)
 * 2 cenários: estado vazio e tarefa concluída aparece no histórico.
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
  await page.getByLabel("Nome da residência").fill("Casa Histórico E2E");
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
// 1. Histórico vazio exibe mensagem adequada
// ---------------------------------------------------------------------------
test("1. histórico vazio exibe mensagem de estado vazio", async ({ page }) => {
  const email = uniqueEmail("hist-1-empty");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina/historico");
  await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Nenhuma tarefa no histórico ainda.")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Tarefa concluída aparece no histórico
// ---------------------------------------------------------------------------
test("2. tarefa concluída aparece no histórico", async ({ page }) => {
  const email = uniqueEmail("hist-2-complete");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  // Vai para /rotina e conclui a primeira tarefa pendente disponível
  await page.goto("/rotina");

  // Aguarda ao menos uma tarefa pendente e marca como concluída
  const completeBtn = page.getByRole("button", { name: "Marcar como concluída" }).first();
  await expect(completeBtn).toBeVisible({ timeout: 10_000 });

  // Captura o nome da tarefa antes de clicar
  const taskRow = completeBtn.locator("../../.."); // navega para o container da tarefa
  const taskTitle = await page
    .locator(".bg-card")
    .filter({ has: completeBtn })
    .locator("span.font-medium")
    .first()
    .textContent();

  await completeBtn.click();

  // Navega para o histórico e verifica que a tarefa aparece
  await page.goto("/rotina/historico");
  await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible({ timeout: 10_000 });

  if (taskTitle) {
    await expect(page.getByText(taskTitle.trim())).toBeVisible({ timeout: 10_000 });
  } else {
    // Se não conseguimos capturar o título, verifica que a lista não está vazia
    await expect(page.getByText("Nenhuma tarefa no histórico ainda.")).not.toBeVisible({ timeout: 10_000 });
  }

  // O ícone ✓ (Concluída) deve estar visível na lista
  await expect(page.getByRole("list").locator("[aria-label='Concluída']").first()).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. Filtros de status (chips) funcionam
// ---------------------------------------------------------------------------
test("3. filtros de status filtram corretamente o histórico", async ({ page }) => {
  const email = uniqueEmail("hist-3-filter");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  // Concluir uma tarefa e pular outra
  await page.goto("/rotina");

  const completeBtns = page.getByRole("button", { name: "Marcar como concluída" });
  await expect(completeBtns.first()).toBeVisible({ timeout: 10_000 });

  // Concluir a primeira
  await completeBtns.first().click();
  await expect(page.getByLabel("Concluída").first()).toBeVisible({ timeout: 10_000 });

  // Pular a segunda (se existir)
  const skipable = page.getByRole("button", { name: "Mais opções" }).first();
  if (await skipable.isVisible()) {
    await skipable.click();
    const skipItem = page.getByRole("menuitem", { name: "Pular" });
    if (await skipItem.isVisible()) {
      await skipItem.click();
    } else {
      await page.keyboard.press("Escape");
    }
  }

  // Verificar filtro "Concluídas"
  await page.goto("/rotina/historico?filter=completed");
  await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible({ timeout: 10_000 });
  // Chips presentes
  await expect(page.getByRole("link", { name: "Concluídas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Puladas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Perdidas" })).toBeVisible();

  // Com filtro "completed", ícones ✗ (perdidas) não devem aparecer
  await expect(page.getByLabel("Perdida")).not.toBeVisible();

  // Verificar filtro "Tudo" (sem filtro) volta para a lista completa
  await page.getByRole("link", { name: "Tudo" }).click();
  await expect(page).toHaveURL(/\/rotina\/historico$/, { timeout: 5_000 });
  await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible();
});
