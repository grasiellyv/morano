/**
 * Validação funcional — Minha Casa (/casa, /casa/editar, /casa/comodos)
 * 5 cenários cobrindo dados da residência, edição e gerenciamento de cômodos.
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

async function completeOnboarding(page: Page, homeName = "Casa Teste E2E") {
  await expect(page).toHaveURL(/\/onboarding\/residencia$/, { timeout: 15_000 });
  await page.getByLabel("Nome da residência").fill(homeName);
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
// 1. /casa exibe os dados da residência criada no onboarding
// ---------------------------------------------------------------------------
test("1. /casa exibe dados da residência", async ({ page }) => {
  const email = uniqueEmail("casa-1-view");
  const homeName = `Apt ${Date.now()}`;
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page, homeName);

  await page.goto("/casa");

  // Nome da casa deve aparecer como título da página
  await expect(page.getByRole("heading", { name: homeName })).toBeVisible({ timeout: 10_000 });

  // Dados de tipo e cômodos devem estar visíveis
  await expect(page.getByText("Apartamento", { exact: true })).toBeVisible();
  await expect(page.getByText("Cômodos", { exact: true })).toBeVisible();
  await expect(page.getByText("Tarefas da rotina", { exact: true })).toBeVisible();

  // Organização da casa: atalhos para as telas de Animais, Produtos e Histórico
  await expect(page.getByRole("heading", { name: "Quem faz parte" })).toBeVisible();
  for (const name of ["Moradores", "Animais", "Produtos", "Histórico"]) {
    await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// 1b. Animais: adicionar e remover; Produtos e Histórico abrem
// ---------------------------------------------------------------------------
test("1b. animais: adiciona, lista e remove; produtos e histórico abrem", async ({ page }) => {
  const email = uniqueEmail("casa-1b-pets");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page, `Pets ${Date.now()}`);

  await page.goto("/casa");
  await page.getByRole("link", { name: /^Animais/ }).click();
  await expect(page).toHaveURL(/\/casa\/animais$/);
  await expect(page.getByText("Nenhum animal ainda")).toBeVisible();

  await page.getByLabel("Nome").fill("Thor");
  await page.getByRole("radio", { name: "Gato" }).click();
  await page.getByRole("button", { name: "Adicionar animal" }).click();
  await expect(page.getByText("Thor", { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Remover Thor" }).click();
  await page.getByRole("button", { name: "Remover", exact: true }).last().click();
  await expect(page.getByText("Nenhum animal ainda")).toBeVisible({ timeout: 10_000 });

  await page.goto("/casa/produtos");
  await expect(page.getByRole("heading", { level: 1, name: "Produtos" })).toBeVisible();
  await page.goto("/casa/historico");
  await expect(page.getByRole("heading", { level: 1, name: "Histórico" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. /casa/editar salva novo nome da residência
// ---------------------------------------------------------------------------
test("2. editar nome da residência atualiza /casa", async ({ page }) => {
  const email = uniqueEmail("casa-2-edit");
  const originalName = `Original ${Date.now()}`;
  const newName = `Renomeado ${Date.now()}`;
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page, originalName);

  await page.goto("/casa/editar");
  await expect(page.getByRole("heading", { name: "Editar dados" })).toBeVisible({ timeout: 10_000 });

  // Altera o nome
  const nameInput = page.getByLabel("Nome da residência");
  await nameInput.clear();
  await nameInput.fill(newName);
  await page.getByRole("button", { name: "Salvar alterações" }).click();

  // Deve redirecionar ou permanecer com sucesso — navega para /casa e verifica
  await page.goto("/casa");
  await expect(page.getByRole("heading", { name: newName })).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. /casa/comodos adiciona novo cômodo
// ---------------------------------------------------------------------------
test("3. adicionar cômodo aparece na lista", async ({ page }) => {
  const email = uniqueEmail("casa-3-addroom");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/comodos");
  await expect(page.getByRole("heading", { name: "Cômodos" })).toBeVisible({ timeout: 10_000 });

  const roomName = `Escritório ${Date.now()}`;
  await page.getByLabel("Nome").fill(roomName);
  await page.getByLabel("Tipo").selectOption("escritorio");
  await page.getByRole("button", { name: "Adicionar cômodo" }).click();

  await expect(page.getByText(roomName)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Escritório").first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. editar nome de cômodo existente
// ---------------------------------------------------------------------------
test("4. editar cômodo atualiza o nome na lista", async ({ page }) => {
  const email = uniqueEmail("casa-4-editroom");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/comodos");

  // Adiciona um cômodo para editar
  const roomName = `Varanda ${Date.now()}`;
  const newRoomName = `Varanda Gourmet ${Date.now()}`;
  await page.getByLabel("Nome").fill(roomName);
  await page.getByLabel("Tipo").selectOption("varanda");
  await page.getByRole("button", { name: "Adicionar cômodo" }).click();
  await expect(page.getByText(roomName)).toBeVisible({ timeout: 10_000 });

  // Clica em Editar no li que contém o cômodo
  const row = page.locator("li").filter({ hasText: roomName });
  await row.getByRole("button", { name: "Editar" }).click();

  // O input de edição aparece — limpa e preenche o novo nome
  // O input tem id dinâmico (edit-name-{id}), mas está visível como input de texto
  const editInput = row.locator("input[type='text']").first();
  await expect(editInput).toBeVisible({ timeout: 5_000 });
  await editInput.clear();
  await editInput.fill(newRoomName);
  await row.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByText(newRoomName)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(roomName, { exact: true })).not.toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 5. remover cômodo — desaparece da lista
// ---------------------------------------------------------------------------
test("5. remover cômodo desaparece da lista", async ({ page }) => {
  const email = uniqueEmail("casa-5-removeroom");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/comodos");

  // Adiciona um cômodo para remover
  const roomName = `Garagem ${Date.now()}`;
  await page.getByLabel("Nome").fill(roomName);
  await page.getByLabel("Tipo").selectOption("garagem");
  await page.getByRole("button", { name: "Adicionar cômodo" }).click();
  await expect(page.getByText(roomName)).toBeVisible({ timeout: 10_000 });

  // Remove
  const row = page.locator("li").filter({ hasText: roomName });
  await row.getByRole("button", { name: "Remover" }).click();

  await expect(page.getByText(roomName)).not.toBeVisible({ timeout: 10_000 });
});
