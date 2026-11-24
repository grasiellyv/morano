/**
 * Validação funcional — concluir tarefa é otimista: a tela muda na hora, mesmo com o servidor
 * lento, e o estado final continua certo quando a resposta chega.
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
  await page.getByLabel("Nome da residência").fill("Casa Otimista E2E");
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


/** Cria uma tarefa de hoje direto no banco (o onboarding nem sempre gera tarefa para o dia). */
async function seedTodayTask(email: string, title: string) {
  const admin = createTestAdminClient();
  let userId: string | null = null;
  for (let pg = 1; pg < 20 && !userId; pg++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email === email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!userId) throw new Error(`Usuário não encontrado: ${email}`);
  const { data: profile } = await admin.from("profiles").select("current_home_id").eq("id", userId).single();
  const homeId = profile!.current_home_id as string;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const { data: task, error } = await admin.from("tasks").insert({ home_id: homeId, title, created_by: userId }).select("id").single();
  if (error) throw error;
  const { error: occErr } = await admin
    .from("task_occurrences")
    .insert({ task_id: task.id, home_id: homeId, original_date: today, scheduled_for: today });
  if (occErr) throw occErr;
}

test("concluir muda a tela na hora (servidor lento) e desfazer também", async ({ page }) => {
  const email = uniqueEmail("otm-1");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Otimista ${Date.now()}`;
  await seedTodayTask(email, title);
  await page.goto("/rotina");
  const concluir = page.getByRole("button", { name: `Concluir: ${title}` });
  await expect(concluir).toBeVisible({ timeout: 10_000 });

  // Server Actions são POSTs na própria rota: segura todas por 4 s para provar que a UI não espera.
  await page.route("**/rotina**", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 4_000));
    await route.continue();
  });

  const t0 = Date.now();
  await concluir.click();
  // A tarefa sai de "pendentes" na hora (vai para a seção "Concluídas", que fica recolhida).
  await expect(page.getByRole("button", { name: `Concluir: ${title}` })).toHaveCount(0, { timeout: 1_500 });
  expect(Date.now() - t0).toBeLessThan(2_500);
  await page.getByText("Concluídas", { exact: true }).click();
  await expect(page.getByRole("button", { name: `Desfazer conclusão: ${title}` })).toBeVisible({ timeout: 1_500 });

  // Resposta chega: continua concluída (sem piscar de volta).
  await page.waitForTimeout(5_000);
  await expect(page.getByRole("button", { name: `Desfazer conclusão: ${title}` })).toBeVisible();

  // Desfazer também é imediato.
  await page.getByRole("button", { name: `Desfazer conclusão: ${title}` }).click();
  await expect(page.getByRole("button", { name: `Concluir: ${title}` })).toBeVisible({ timeout: 1_500 });
  await page.waitForTimeout(5_000);
  await expect(page.getByRole("button", { name: `Concluir: ${title}` })).toBeVisible();

  // E o servidor guardou: depois de recarregar, o estado final bate.
  await page.unroute("**/rotina**");
  await page.reload();
  await expect(page.getByRole("button", { name: `Concluir: ${title}` })).toBeVisible({ timeout: 10_000 });
});
