/**
 * Validação funcional — ações de tarefa em uma chamada ao banco, contra o banco real:
 * assumir ("Eu pego"), liberar, anotar, adiar e marcar item de checklist.
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
  await page.getByLabel("Nome da residência").fill("Casa Acoes E2E");
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


async function seedTask(email: string, title: string, withChecklist = false) {
  const admin = createTestAdminClient();
  let userId: string | null = null;
  for (let pg = 1; pg < 20 && !userId; pg++) {
    const { data } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    userId = data?.users.find((u) => u.email === email)?.id ?? null;
    if ((data?.users.length ?? 0) < 200) break;
  }
  const { data: profile } = await admin.from("profiles").select("current_home_id").eq("id", userId!).single();
  const homeId = profile!.current_home_id as string;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const { data: task, error } = await admin.from("tasks").insert({ home_id: homeId, title, created_by: userId }).select("id").single();
  if (error) throw error;
  const { data: occ, error: occErr } = await admin
    .from("task_occurrences")
    .insert({ task_id: task.id, home_id: homeId, original_date: today, scheduled_for: today })
    .select("id")
    .single();
  if (occErr) throw occErr;
  if (withChecklist) {
    await admin.from("task_checklist_items").insert([
      { task_id: task.id, home_id: homeId, title: "Passo um", position: 0 },
      { task_id: task.id, home_id: homeId, title: "Passo dois", position: 1 },
    ]);
  }
  return { occurrenceId: occ.id as string, homeId };
}

async function row(page: Page, title: string) {
  return page.locator("li", { has: page.getByRole("button", { name: `Concluir: ${title}` }) }).first();
}

test("assumir, liberar, anotar e adiar uma tarefa (banco real)", async ({ page }) => {
  const email = uniqueEmail("acoes-1");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);
  const title = `Tarefa Acoes ${Date.now()}`;
  await seedTask(email, title);

  await page.goto("/rotina");
  const r = await row(page, title);
  await expect(r).toContainText("Compartilhada", { timeout: 15_000 });

  // Eu pego → "Você"
  await page.getByRole("button", { name: `Mais opções: ${title}` }).click();
  await page.getByRole("menuitem", { name: "Eu pego" }).click();
  await expect(await row(page, title)).toContainText("Você", { timeout: 15_000 });

  // Liberar para a casa → "Compartilhada"
  await page.getByRole("button", { name: `Mais opções: ${title}` }).click();
  await page.getByRole("menuitem", { name: "Liberar para a casa" }).click();
  await expect(await row(page, title)).toContainText("Compartilhada", { timeout: 15_000 });

  // Nota: salva e continua depois de recarregar
  await page.getByRole("button", { name: `Mais opções: ${title}` }).click();
  await page.getByRole("menuitem", { name: "Adicionar nota" }).click();
  await page.getByLabel("Nota da ocorrência").fill("Faltou sabão");
  await page.getByRole("button", { name: "Salvar nota" }).click();
  await expect(page.getByText("Faltou sabão")).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByText("Faltou sabão")).toBeVisible({ timeout: 15_000 });

  // Adiar para daqui a 3 dias: some de hoje
  const in3 = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 3 * 86_400_000));
  await page.getByRole("button", { name: `Mais opções: ${title}` }).click();
  await page.getByRole("menuitem", { name: "Adiar" }).click();
  await page.getByLabel("Nova data").fill(in3);
  await page.getByRole("button", { name: "Adiar", exact: true }).click();
  await expect(page.getByRole("button", { name: `Concluir: ${title}` })).toHaveCount(0, { timeout: 15_000 });
});

test("adiar para hoje ou data inválida mostra o erro de data (regras no banco)", async ({ page }) => {
  const email = uniqueEmail("acoes-2");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);
  const title = `Tarefa Data ${Date.now()}`;
  await seedTask(email, title);

  await page.goto("/rotina");
  await expect(page.getByRole("button", { name: `Concluir: ${title}` })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: `Mais opções: ${title}` }).click();
  await page.getByRole("menuitem", { name: "Adiar" }).click();
  // o campo tem min=hoje; o banco recusa hoje mesmo assim ("deve ser no futuro")
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  await page.getByLabel("Nova data").fill(today);
  await page.getByRole("button", { name: "Adiar", exact: true }).click();
  await expect(page.getByText("A nova data deve ser no futuro.")).toBeVisible({ timeout: 15_000 });
});

test("checklist: marcar item na tela da tarefa continua depois de recarregar", async ({ page }) => {
  const email = uniqueEmail("acoes-3");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);
  const title = `Tarefa Checklist ${Date.now()}`;
  const { occurrenceId } = await seedTask(email, title, true);

  await page.goto(`/rotina/ocorrencia/${occurrenceId}`);
  await expect(page.getByText("Passo um")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("0 de 2 feitos")).toBeVisible();
  await page.getByRole("button", { name: "Marcar como feito: Passo um" }).click();
  await expect(page.getByText("1 de 2 feitos")).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByText("1 de 2 feitos")).toBeVisible({ timeout: 15_000 });
});
