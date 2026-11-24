/**
 * Validação funcional — Listas inteligentes: criar a partir dos "Mais pedidos", renomear,
 * editar itens, vincular missão/categoria e jogar tudo na lista ativa com um toque.
 */
import { expect, test, type Page } from "@playwright/test";
import { createTestAdminClient, ensureConfirmedUser } from "./helpers/admin";

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
  await page.getByLabel("Nome da residência").fill("Casa Listas E2E");
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


async function seedHistory(email: string) {
  const admin = createTestAdminClient();
  let userId: string | null = null;
  for (let pg = 1; pg < 20 && !userId; pg++) {
    const { data } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    userId = data?.users.find((u) => u.email === email)?.id ?? null;
    if ((data?.users.length ?? 0) < 200) break;
  }
  const { data: profile } = await admin.from("profiles").select("current_home_id").eq("id", userId!).single();
  const homeId = profile!.current_home_id as string;
  const sessions = [
    ["2026-10-01T10:00:00Z", [{ name: "Carvao", quantity: 2, unit: "kg" }, { name: "Cerveja", quantity: 12, unit: "un" }, { name: "Pao de alho", quantity: 1, unit: "pacote" }]],
    ["2026-10-20T10:00:00Z", [{ name: "Carvao", quantity: 2, unit: "kg" }, { name: "Cerveja", quantity: 12, unit: "un" }]],
    ["2026-11-10T10:00:00Z", [{ name: "Carvao", quantity: 3, unit: "kg" }]],
  ] as const;
  for (const [finished_at, items] of sessions) {
    const { error } = await admin
      .from("shopping_sessions")
      .insert({ home_id: homeId, finished_by: userId, items_count: items.length, items, finished_at });
    if (error) throw error;
  }
}

test("criar lista inteligente dos mais pedidos, renomear, editar e aplicar na lista ativa", async ({ page }) => {
  const email = uniqueEmail("smart-1");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);
  await seedHistory(email);

  await page.goto("/compras");
  await page.getByRole("button", { name: /Mais pedidos/ }).click();

  // os mais pedidos vêm primeiro: Carvao (3x) e Cerveja (2x)
  await expect(page.getByText(/comprado 3×/)).toBeVisible();
  await page.getByRole("checkbox", { name: "Selecionar Carvao" }).check();
  await page.getByRole("checkbox", { name: "Selecionar Cerveja" }).check();
  await page.getByRole("button", { name: "Criar lista inteligente com 2 itens" }).click();
  await page.getByLabel("Nome da lista inteligente").fill("Churrasco");
  await page.getByLabel("Missão ou ocasião").selectOption("ocasioes");
  await page.getByRole("button", { name: "Criar lista", exact: true }).click();

  // a lista aparece em "Listas inteligentes", com a missão
  const card = page.locator("details", { hasText: "Churrasco" }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByText("2 itens")).toBeVisible();
  await expect(card.getByText("Ocasiões")).toBeVisible();
  await card.locator("summary").click();

  // renomear
  await card.getByRole("button", { name: "Editar lista" }).click();
  await card.getByLabel("Nome da lista").fill("Churrasco de domingo");
  await card.getByRole("button", { name: "Salvar" }).click();
  const renamed = page.locator("details", { hasText: "Churrasco de domingo" }).first();
  await expect(renamed).toBeVisible({ timeout: 15_000 });
  if (!(await renamed.evaluate((el) => (el as HTMLDetailsElement).open))) await renamed.locator("summary").click();

  // jogar para a lista ativa com um toque: entram com a missão da lista
  await renamed.getByRole("button", { name: "Adicionar à lista de compras" }).click();
  await expect(renamed.getByRole("status")).toContainText("2 itens adicionados", { timeout: 15_000 });
  await page.reload();
  await expect(page.getByText("Carvao").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Ocasiões").first()).toBeVisible();
});
