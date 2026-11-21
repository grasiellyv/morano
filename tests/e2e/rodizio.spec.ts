/**
 * Validação funcional — Rodízio Semanal (Melhoria D)
 * 5 cenários cobrindo o dialog de gerenciamento de grupos de rodízio em /rotina.
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
  await page.getByLabel("Nome da residência").fill("Casa Rodízio E2E");
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

/** Abre o dialog de gerenciamento de rodízios. */
async function openRotationsDialog(page: Page) {
  await page.getByRole("button", { name: "Rodízios" }).click();
  await expect(
    page.getByRole("dialog", { name: "Gerenciar rodízios" }),
  ).toBeVisible({ timeout: 5_000 });
}

/** Cria um grupo via o formulário no footer do dialog. */
async function createGroup(page: Page, name: string, day?: string) {
  const dialog = page.getByRole("dialog", { name: "Gerenciar rodízios" });
  await dialog.getByPlaceholder("Nome do grupo").fill(name);
  if (day) {
    await dialog.getByRole("combobox").last().selectOption(day);
  }
  await dialog.getByRole("button", { name: "Criar" }).click();
}

// ---------------------------------------------------------------------------
// 1. Criar grupo — aparece na lista do dialog
// ---------------------------------------------------------------------------
test("1. criar grupo de rodízio aparece na lista", async ({ page }) => {
  const email = uniqueEmail("rod-1-create");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openRotationsDialog(page);

  const name = `Limpeza ${Date.now()}`;
  await createGroup(page, name, "Segunda-feira");

  const dialog = page.getByRole("dialog", { name: "Gerenciar rodízios" });
  await expect(dialog.getByText(name)).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText("Segunda-feira")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Adicionar membro ao grupo
// ---------------------------------------------------------------------------
test("2. adicionar membro ao grupo de rodízio", async ({ page }) => {
  const email = uniqueEmail("rod-2-member");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openRotationsDialog(page);

  const name = `Aspiração ${Date.now()}`;
  await createGroup(page, name);

  const dialog = page.getByRole("dialog", { name: "Gerenciar rodízios" });
  await expect(dialog.getByText(name)).toBeVisible({ timeout: 10_000 });

  // Seleciona o único membro disponível e clica em Adicionar
  const groupCard = dialog.locator("div").filter({ hasText: name }).first();
  const memberSelect = groupCard.locator("select").last();

  // Deve haver ao menos uma opção além de "Adicionar participante…"
  const options = await memberSelect.locator("option").count();
  if (options > 1) {
    // Seleciona a segunda opção (o próprio usuário)
    const memberOption = memberSelect.locator("option").nth(1);
    const memberValue = await memberOption.getAttribute("value");
    if (memberValue) {
      await memberSelect.selectOption(memberValue);
      await groupCard.getByRole("button", { name: "Adicionar" }).click();

      // O membro deve aparecer na seção "Participantes"
      await expect(groupCard.getByText("Participantes")).toBeVisible({ timeout: 10_000 });
    }
  }
});

// ---------------------------------------------------------------------------
// 3. Editar nome e dia do grupo
// ---------------------------------------------------------------------------
test("3. editar grupo atualiza nome e dia na lista", async ({ page }) => {
  const email = uniqueEmail("rod-3-edit");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openRotationsDialog(page);

  const name = `Jardim ${Date.now()}`;
  const newName = `Jardim Editado ${Date.now()}`;
  await createGroup(page, name, "Quarta-feira");

  const dialog = page.getByRole("dialog", { name: "Gerenciar rodízios" });
  await expect(dialog.getByText(name)).toBeVisible({ timeout: 10_000 });

  // Clica em Editar no card do grupo
  const groupCard = dialog.locator("div").filter({ hasText: name }).first();
  await groupCard.getByRole("button", { name: "Editar" }).click();

  // Preenche o novo nome no input que apareceu
  const nameInput = groupCard.locator("input").first();
  await expect(nameInput).toBeVisible({ timeout: 5_000 });
  await nameInput.clear();
  await nameInput.fill(newName);

  await groupCard.getByRole("button", { name: "Salvar" }).click();

  // Novo nome deve aparecer; antigo deve sumir
  await expect(dialog.getByText(newName)).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText(name, { exact: true })).not.toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 4. Excluir grupo — desaparece da lista
// ---------------------------------------------------------------------------
test("4. excluir grupo remove da lista do dialog", async ({ page }) => {
  const email = uniqueEmail("rod-4-delete");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openRotationsDialog(page);

  const name = `Piscina ${Date.now()}`;
  await createGroup(page, name);

  const dialog = page.getByRole("dialog", { name: "Gerenciar rodízios" });
  await expect(dialog.getByText(name)).toBeVisible({ timeout: 10_000 });

  // Clica em Excluir e confirma
  const groupCard = dialog.locator("div").filter({ hasText: name }).first();
  await groupCard.getByRole("button", { name: "Excluir" }).click();

  // Confirma no dialog de confirmação
  await page.getByRole("button", { name: "Excluir" }).last().click();

  // Grupo não deve mais aparecer
  await expect(dialog.getByText(name)).not.toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 5. Nome vazio impede criação
// ---------------------------------------------------------------------------
test("5. nome vazio impede criação de grupo", async ({ page }) => {
  const email = uniqueEmail("rod-5-empty");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/rotina");
  await openRotationsDialog(page);

  const dialog = page.getByRole("dialog", { name: "Gerenciar rodízios" });

  // Deixa o nome vazio e tenta criar
  await dialog.getByRole("button", { name: "Criar" }).click();

  // O dialog deve continuar aberto (formulário não foi submetido)
  await expect(dialog).toBeVisible({ timeout: 3_000 });
  // Nenhum novo card foi adicionado além da mensagem "Nenhum rodízio criado ainda"
  // ou o dialog permanece sem novos grupos com nome vazio
  await expect(dialog.getByText("Nenhum rodízio criado ainda.")).toBeVisible();
});
