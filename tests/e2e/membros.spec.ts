/**
 * Validação funcional — Membros da casa (/casa/membros, /casa/membros/convidar)
 * 3 cenários: listar membros, acessar convites pendentes, enviar convite.
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
  await page.getByLabel("Nome da residência").fill("Casa Membros E2E");
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
// 1. /casa/membros lista o usuário atual como Proprietário
// ---------------------------------------------------------------------------
test("1. lista de membros exibe o usuário atual como Proprietário", async ({ page }) => {
  const email = uniqueEmail("mbr-1-list");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/membros");
  await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible({ timeout: 10_000 });

  // Proprietário é o único membro e deve ter o badge "Proprietário"
  await expect(page.getByText("Proprietário")).toBeVisible();

  // Botões de gestão aparecem para o owner
  await expect(page.getByRole("link", { name: "Convidar membro" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Convites pendentes" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Convites pendentes exibe lista vazia
// ---------------------------------------------------------------------------
test("2. página de convites pendentes carrega sem erro", async ({ page }) => {
  const email = uniqueEmail("mbr-2-invites");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/membros/convites");
  await expect(page).toHaveURL(/\/casa\/membros\/convites/, { timeout: 10_000 });
  // A página deve carregar sem redirecionar ou errar
  // Sem convites → mensagem de estado vazio esperada
  await expect(
    page.getByText(/nenhum convite|sem convites|convite pendente/i).or(
      page.getByRole("heading", { name: /convite/i }),
    ),
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. Formulário de convite envia email válido
// ---------------------------------------------------------------------------
test("3. formulário de convite aceita email e exibe confirmação", async ({ page }) => {
  const email = uniqueEmail("mbr-3-invite");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/casa/membros/convidar");
  await expect(page.getByRole("heading", { name: "Convidar membro" })).toBeVisible({
    timeout: 10_000,
  });

  // Preenche o formulário com um email de teste fictício
  const inviteeEmail = uniqueEmail("convidado");
  await page.getByLabel("E-mail").fill(inviteeEmail);
  await page.getByRole("button", { name: "Enviar convite" }).click();

  // Deve exibir mensagem de sucesso ou redirecionar para membros
  await expect(
    page.getByText(/convite.*enviado|enviado com sucesso/i).or(
      page.getByRole("heading", { name: "Membros" }),
    ),
  ).toBeVisible({ timeout: 15_000 });
});
