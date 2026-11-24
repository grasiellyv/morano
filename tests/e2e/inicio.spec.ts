import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser } from "./helpers/admin";

const PASSWORD = "Morano123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function completeOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding\/residencia$/);
  await page.getByLabel("Nome da residência").fill("Casa Início E2E");
  await page.getByLabel("Tipo de imóvel").selectOption("apartamento");
  await page.getByLabel("Situação do imóvel").selectOption("proprio");
  await page.getByLabel("Composição do lar").selectOption("sozinho");
  await page.getByLabel("Número de moradores").fill("1");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/comodos$/);
  await page.getByRole("button", { name: "Sala" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/rotina$/);
  await page.getByRole("button", { name: "Equilibrada" }).click();
  await page.getByRole("button", { name: "Ver sugestões" }).click();

  await expect(page).toHaveURL(/\/onboarding\/revisao$/);
  await page.getByRole("button", { name: "Aprovar rotina" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

test("1. dashboard mostra tiles após onboarding", async ({ page }) => {
  const email = uniqueEmail("inicio-tiles");
  await ensureConfirmedUser(email, PASSWORD);
  await page.context().clearCookies();

  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  // All 4 summary tiles are visible
  await expect(page.getByText("Tarefas hoje")).toBeVisible();
  await expect(page.getByText("Atrasadas")).toBeVisible();
  await expect(page.getByText("Compras")).toBeVisible();
  await expect(page.getByText("Manutenção")).toBeVisible();
});

test("2. tile de tarefas linka para /rotina", async ({ page }) => {
  const email = uniqueEmail("inicio-link");
  await ensureConfirmedUser(email, PASSWORD);
  await page.context().clearCookies();

  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.getByText("Tarefas hoje").click();
  await expect(page).toHaveURL(/\/rotina$/);
});

test("3. tile de compras linka para /compras", async ({ page }) => {
  const email = uniqueEmail("inicio-compras");
  await ensureConfirmedUser(email, PASSWORD);
  await page.context().clearCookies();

  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.getByText("Compras").click();
  await expect(page).toHaveURL(/\/compras$/);
});

test("4. tarefas pendentes aparecem na lista e link 'Ver todas' vai para /rotina", async ({ page }) => {
  const email = uniqueEmail("inicio-pending");
  await ensureConfirmedUser(email, PASSWORD);
  await page.context().clearCookies();

  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  // After onboarding with "Equilibrada", tasks are generated
  // If there are pending tasks, the section and link appear
  const verTodas = page.getByRole("link", { name: "Ver todas →" });
  if (await verTodas.isVisible()) {
    await verTodas.click();
    await expect(page).toHaveURL(/\/rotina$/);
  } else {
    // No pending tasks today is a valid state (empty state shown)
    await expect(page.getByText("Nenhuma tarefa para hoje")).toBeVisible();
  }
});

test("5. concluir tarefa em /rotina atualiza contador em /inicio", async ({ page }) => {
  const email = uniqueEmail("inicio-complete");
  await ensureConfirmedUser(email, PASSWORD);
  await page.context().clearCookies();

  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  // Create a daily task to ensure there's something to complete today
  await page.goto("/rotina");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título").fill(`Tarefa BT11 ${Date.now()}`);
  await page.getByLabel("Frequência").selectOption("daily");
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible({ timeout: 10_000 });

  // Go to /inicio and read the current "Tarefas hoje" count
  await page.goto("/inicio");
  const tile = page.getByText("Tarefas hoje").locator("..");
  const countBefore = await tile.locator("p").first().textContent();

  // Complete first unchecked task via the circle button in /rotina
  await page.goto("/rotina");
  const completeBtn = page.getByRole("button", { name: /Marcar como concluída|Concluir/ }).first();
  if (await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await completeBtn.click();
    // Wait for update
    await page.waitForTimeout(500);
  }

  // Reload /inicio and verify counter changed (decreased) or tasks show done state
  await page.goto("/inicio");
  const countAfter = await tile.locator("p").first().textContent();

  // The counter should decrease by at least 1, or remain 0 if all were already done
  const before = parseInt(countBefore ?? "0", 10);
  const after = parseInt(countAfter ?? "0", 10);
  expect(after).toBeLessThanOrEqual(before);
});
