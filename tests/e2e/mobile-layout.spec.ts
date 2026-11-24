/**
 * Validação funcional — layout no celular: barra de navegação cabe em telas pequenas,
 * a pílula ativa é compacta, "← Lista" tem área de toque de 44px e as notificações são compactas.
 * (A área segura do iPhone, `env(safe-area-inset-*)`, é 0 no Chromium: coberta por teste de classe.)
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
  await page.getByLabel("Nome da residência").fill("Casa Mobile E2E");
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


const ROUTES = ["/inicio", "/rotina", "/compras", "/manutencao", "/casa"];

async function expectNavFits(page: Page, route: string) {
  await page.goto(route);
  const nav = page.getByRole("navigation", { name: "Navegação principal" }).last();
  await expect(nav).toBeVisible({ timeout: 15_000 });
  const navBox = (await nav.boundingBox())!;
  const links = nav.getByRole("link");
  const n = await links.count();
  expect(n).toBe(5);
  let previousRight = navBox.x;
  for (let i = 0; i < n; i++) {
    const box = (await links.nth(i).boundingBox())!;
    expect(box.x, `${route}: item ${i} vaza pela esquerda`).toBeGreaterThanOrEqual(navBox.x + 2);
    expect(box.x + box.width, `${route}: item ${i} vaza pela direita`).toBeLessThanOrEqual(navBox.x + navBox.width - 2);
    expect(box.x, `${route}: item ${i} sobrepõe o anterior`).toBeGreaterThanOrEqual(previousRight - 0.5);
    previousRight = box.x + box.width;
  }
  const active = (await nav.locator('a[aria-current="page"]').boundingBox())!;
  expect(active.height, `${route}: pílula ativa grande demais`).toBeLessThanOrEqual(44);
}

for (const width of [320, 360, 375, 390]) {
  test.describe(`barra de navegação em ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test(`todos os ícones cabem dentro da pílula em todas as abas`, async ({ page }) => {
      const email = uniqueEmail(`nav-${width}`);
      await ensureConfirmedUser(email, PASSWORD);
      await signIn(page, email, PASSWORD);
      await completeOnboarding(page);
      for (const route of ROUTES) await expectNavFits(page, route);
    });
  });
}

test.describe("Modo compra e notificações", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("'← Lista' tem área de toque de pelo menos 44x44", async ({ page }) => {
    const email = uniqueEmail("mobile-modo");
    await ensureConfirmedUser(email, PASSWORD);
    await signIn(page, email, PASSWORD);
    await completeOnboarding(page);
    await page.goto("/compras/modo");
    const back = page.getByRole("link", { name: "Voltar para compras" });
    await expect(back).toBeVisible({ timeout: 15_000 });
    const box = (await back.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test("notificações: cards compactos (mais itens por tela)", async ({ page }) => {
    const email = uniqueEmail("mobile-notif");
    await ensureConfirmedUser(email, PASSWORD);
    await signIn(page, email, PASSWORD);
    await completeOnboarding(page);

    const admin = createTestAdminClient();
    let userId: string | null = null;
    for (let pg = 1; pg < 20 && !userId; pg++) {
      const { data } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
      userId = data?.users.find((u) => u.email === email)?.id ?? null;
      if ((data?.users.length ?? 0) < 200) break;
    }
    const { data: profile } = await admin.from("profiles").select("current_home_id").eq("id", userId!).single();
    const homeId = profile!.current_home_id as string;
    const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() - 86_400_000));
    const stamp = Date.now();
    for (let i = 1; i <= 8; i++) {
      const { data: task } = await admin.from("tasks").insert({ home_id: homeId, title: `Notif ${stamp} #${i}`, created_by: userId }).select("id").single();
      await admin.from("task_occurrences").insert({ task_id: task!.id, home_id: homeId, original_date: yesterday, scheduled_for: yesterday });
    }

    await page.goto("/inicio");
    await page.getByRole("button", { name: /^Notificações/ }).click();
    const dialog = page.getByRole("dialog", { name: "Notificações" });
    await expect(dialog).toBeVisible();
    const rows = dialog.getByRole("link", { name: new RegExp(`Notif ${stamp}`) });
    expect(await rows.count()).toBe(8);
    const first = (await rows.first().boundingBox())!;
    expect(first.height).toBeLessThanOrEqual(52);
    // 6 itens cabem na tela sem rolar o painel
    const sixth = (await rows.nth(5).boundingBox())!;
    const panel = (await dialog.boundingBox())!;
    expect(sixth.y + sixth.height).toBeLessThanOrEqual(panel.y + panel.height);
  });
});
