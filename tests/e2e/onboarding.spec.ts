import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser, createTestAdminClient } from "./helpers/admin";

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

/** Busca o id do usuário pelo e-mail usando o cliente admin. */
async function getUserId(email: string): Promise<string> {
  const admin = createTestAdminClient();
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`Usuário não encontrado: ${email}`);
}

// ---------------------------------------------------------------------------
// 1. Novo usuário é redirecionado para /onboarding/residencia
// ---------------------------------------------------------------------------

test("novo usuário vai para /onboarding/residencia ao acessar /inicio", async ({ page }) => {
  const email = uniqueEmail("onb-new");
  await ensureConfirmedUser(email, PASSWORD);

  await signIn(page, email, PASSWORD);
  // O login de um usuário sem onboarding concluído redireciona para /onboarding,
  // que por sua vez redireciona para /onboarding/residencia (step = 0).
  await expect(page).toHaveURL(/\/onboarding\/residencia$/);
});

// ---------------------------------------------------------------------------
// 2. Fluxo completo de onboarding → aterra em /inicio
// ---------------------------------------------------------------------------

test("fluxo completo de onboarding aterra em /inicio", async ({ page }) => {
  const email = uniqueEmail("onb-full");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);

  // — Passo 1: Residência —
  await expect(page).toHaveURL(/\/onboarding\/residencia$/);

  await page.getByLabel("Nome da residência").fill("Minha casa de teste");
  await page.getByLabel("Tipo de imóvel").selectOption("apartamento");
  await page.getByLabel("Situação do imóvel").selectOption("proprio");
  await page.getByLabel("Composição do lar").selectOption("sozinho");
  await page.getByLabel("Número de moradores").fill("1");
  await page.getByRole("button", { name: "Continuar" }).click();

  // — Passo 2: Cômodos —
  await expect(page).toHaveURL(/\/onboarding\/comodos$/);

  // Seleciona a Sala usando o chip (aria-pressed)
  await page.getByRole("button", { name: "Sala" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // — Passo 3: Rotina —
  await expect(page).toHaveURL(/\/onboarding\/rotina$/);

  // Seleciona a intensidade "Equilibrada" pelo botão
  await page.getByRole("button", { name: "Equilibrada" }).click();
  await page.getByLabel("Minutos disponíveis por semana").fill("120");
  await page.getByRole("button", { name: "Ver sugestões →" }).click();

  // — Passo 4: Revisão —
  await expect(page).toHaveURL(/\/onboarding\/revisao$/);

  await page.getByRole("button", { name: "Aprovar rotina" }).click();

  // Resultado final
  await expect(page).toHaveURL(/\/inicio$/);
});

// ---------------------------------------------------------------------------
// 3. Usuário com onboarding concluído NÃO é redirecionado
// ---------------------------------------------------------------------------

test("usuário com onboarding concluído não é redirecionado ao acessar /inicio", async ({
  page,
}) => {
  const email = uniqueEmail("onb-done");
  await ensureConfirmedUser(email, PASSWORD);
  const userId = await getUserId(email);

  // Marca onboarding como concluído diretamente no banco
  const admin = createTestAdminClient();
  await admin
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);

  await signIn(page, email, PASSWORD);
  // Deve ir direto para /inicio, sem passar por /onboarding
  await expect(page).toHaveURL(/\/inicio$/);
});

// ---------------------------------------------------------------------------
// 4. Retomar wizard no passo 2 (step = 2 → /onboarding/rotina)
// ---------------------------------------------------------------------------

test("usuário no passo 2 retoma o wizard em /onboarding/rotina", async ({ page }) => {
  const email = uniqueEmail("onb-resume");
  await ensureConfirmedUser(email, PASSWORD);
  const userId = await getUserId(email);

  // Avança para o passo 2 diretamente via banco
  const admin = createTestAdminClient();
  await admin
    .from("profiles")
    .update({ onboarding_step: 2 })
    .eq("id", userId);

  await signIn(page, email, PASSWORD);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/onboarding\/rotina$/);
});

// ---------------------------------------------------------------------------
// 5. Página /casa exibe os dados da residência após o onboarding
// ---------------------------------------------------------------------------

test("página /casa exibe o nome da residência após onboarding", async ({ page }) => {
  const email = uniqueEmail("onb-casa");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);

  // Passo 1
  await expect(page).toHaveURL(/\/onboarding\/residencia$/);
  await page.getByLabel("Nome da residência").fill("Casa Teste Visível");
  await page.getByLabel("Tipo de imóvel").selectOption("apartamento");
  await page.getByLabel("Situação do imóvel").selectOption("proprio");
  await page.getByLabel("Composição do lar").selectOption("sozinho");
  await page.getByLabel("Número de moradores").fill("1");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Passo 2
  await expect(page).toHaveURL(/\/onboarding\/comodos$/);
  await page.getByRole("button", { name: "Sala" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Passo 3
  await expect(page).toHaveURL(/\/onboarding\/rotina$/);
  await page.getByRole("button", { name: "Equilibrada" }).click();
  await page.getByLabel("Minutos disponíveis por semana").fill("120");
  await page.getByRole("button", { name: "Ver sugestões →" }).click();

  // Passo 4
  await expect(page).toHaveURL(/\/onboarding\/revisao$/);
  await page.getByRole("button", { name: "Aprovar rotina" }).click();
  await expect(page).toHaveURL(/\/inicio$/);

  // Visita /casa e verifica o nome
  await page.goto("/casa");
  await expect(page.getByText("Casa Teste Visível")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 6. Adicionar cômodo em /casa/comodos → aparece na lista
// ---------------------------------------------------------------------------

test("adicionar cômodo em /casa/comodos aparece na lista", async ({ page }) => {
  const email = uniqueEmail("onb-room");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);

  // Completa o onboarding rapidamente
  await expect(page).toHaveURL(/\/onboarding\/residencia$/);
  await page.getByLabel("Nome da residência").fill("Casa Novo Cômodo");
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
  await page.getByLabel("Minutos disponíveis por semana").fill("120");
  await page.getByRole("button", { name: "Ver sugestões →" }).click();

  await expect(page).toHaveURL(/\/onboarding\/revisao$/);
  await page.getByRole("button", { name: "Aprovar rotina" }).click();
  await expect(page).toHaveURL(/\/inicio$/);

  // Vai para a página de cômodos e adiciona um novo
  await page.goto("/casa/comodos");
  await page.getByLabel("Nome").fill("Escritório Novo");
  await page.getByLabel("Tipo").selectOption("escritorio");
  await page.getByRole("button", { name: "Adicionar cômodo" }).click();

  // O novo cômodo deve aparecer na lista
  await expect(page.getByText("Escritório Novo")).toBeVisible();
});
