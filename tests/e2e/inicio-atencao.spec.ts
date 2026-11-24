/**
 * Validação funcional — Início: "Mostrar menos" fica DEPOIS do último item da lista de atenção.
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
  await page.getByLabel("Nome da residência").fill("Casa Atencao E2E");
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


async function seedOverdueTasks(email: string, titles: string[]) {
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
  for (const title of titles) {
    const { data: task, error } = await admin.from("tasks").insert({ home_id: homeId, title, created_by: userId }).select("id").single();
    if (error) throw error;
    const { error: occErr } = await admin
      .from("task_occurrences")
      .insert({ task_id: task.id, home_id: homeId, original_date: yesterday, scheduled_for: yesterday });
    if (occErr) throw occErr;
  }
}

test("'Mostrar menos' fica no fim da lista expandida", async ({ page }) => {
  const email = uniqueEmail("att-1");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);
  const stamp = Date.now();
  await seedOverdueTasks(email, [1, 2, 3, 4, 5].map((n) => `Atrasada ${stamp} #${n}`));

  await page.goto("/inicio");
  const toggle = page.getByRole("button", { name: /Ver tudo \(\d+ a mais\)/ });
  await expect(toggle).toBeVisible({ timeout: 15_000 });
  await toggle.click();

  const less = page.getByRole("button", { name: "Mostrar menos" });
  await expect(less).toBeVisible();
  const lessBox = (await less.boundingBox())!;
  // Só as linhas da própria lista de atenção (a mesma tarefa também aparece em "Rotina de hoje", mais abaixo).
  const rows = less.locator("..").getByRole("link", { name: new RegExp(`Atrasada ${stamp}`) });
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(4);
  const lastBox = (await rows.nth(count - 1).boundingBox())!;
  expect(lessBox.y).toBeGreaterThan(lastBox.y + lastBox.height - 1);

  await less.click();
  await expect(page.getByRole("button", { name: /Ver tudo \(\d+ a mais\)/ })).toBeVisible();
});
