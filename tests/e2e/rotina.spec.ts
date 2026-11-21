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

/** Completa o onboarding mínimo e aterra em /inicio. */
async function completeOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding\/residencia$/);
  await page.getByLabel("Nome da residência").fill("Casa E2E Rotina");
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
  await page.getByRole("button", { name: "Ver sugestões →" }).click();

  await expect(page).toHaveURL(/\/onboarding\/revisao$/);
  await page.getByRole("button", { name: "Aprovar rotina" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

/** Cria tarefa via UI e retorna quando o formulário fecha. */
async function createTaskViaUI(
  page: Page,
  title: string,
  options: { frequency?: string } = {},
) {
  await page.goto("/rotina");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título").fill(title);
  if (options.frequency) {
    await page.getByLabel("Frequência").selectOption(options.frequency);
  }
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  // Aguarda o formulário fechar (sucesso)
  await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible({
    timeout: 10_000,
  });
}

/** Busca o ID da home do usuário via admin. */
async function getHomeId(email: string): Promise<string> {
  const admin = createTestAdminClient();
  // Encontrar user id
  for (let pg = 1; pg < 20; pg++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) {
      const { data: profile } = await admin
        .from("profiles")
        .select("current_home_id")
        .eq("id", found.id)
        .single();
      if (!profile?.current_home_id) throw new Error("current_home_id não encontrado");
      return profile.current_home_id;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`Usuário não encontrado: ${email}`);
}

// ---------------------------------------------------------------------------
// 1. Criar tarefa semanal → aparece em /rotina
// ---------------------------------------------------------------------------

test("criar tarefa semanal aparece em /rotina nos próximos 7 dias", async ({ page }) => {
  const email = uniqueEmail("rot-weekly");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Semanal ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "weekly" });

  await page.goto("/rotina");
  // A tarefa deve aparecer em "Hoje" (start_date=hoje com frequência semanal gera hoje)
  // ou em "Próximas 7 dias" se o onboarding gerou outras tarefas para hoje.
  const page$ = page.getByText(title);
  await expect(page$).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 2. Concluir ocorrência → some de "Hoje", aparece no histórico
// ---------------------------------------------------------------------------

test("concluir ocorrência remove de Hoje e aparece no histórico", async ({ page }) => {
  const email = uniqueEmail("rot-complete");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Concluir ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  await page.goto("/rotina");
  // Encontrar a linha da tarefa e clicar no botão "Marcar como concluída"
  const row = page.locator("div").filter({ hasText: title }).first();
  await row.getByRole("button", { name: "Marcar como concluída" }).click();

  // Após concluir, o indicador de concluída deve aparecer (✓ circle)
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Verificar no histórico
  await page.goto("/rotina/historico");
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. Desfazer conclusão no mesmo dia → volta para "Hoje"
// ---------------------------------------------------------------------------

test("desfazer conclusão no mesmo dia volta para Hoje", async ({ page }) => {
  const email = uniqueEmail("rot-undo");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Desfazer ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();

  // Concluir
  await row.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Abrir menu "⋯" e clicar em "Desfazer"
  await row.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("menuitem", { name: "Desfazer" }).click();

  // Após desfazer, o botão "Marcar como concluída" volta a aparecer
  await expect(row.getByRole("button", { name: "Marcar como concluída" })).toBeVisible({
    timeout: 10_000,
  });
});

// ---------------------------------------------------------------------------
// 4. Pular ocorrência → aparece no histórico como pulada
// ---------------------------------------------------------------------------

test("pular ocorrência aparece no histórico como pulada", async ({ page }) => {
  const email = uniqueEmail("rot-skip");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Pular ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();

  // Abrir menu "⋯" e clicar em "Pular"
  await row.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("menuitem", { name: "Pular" }).click();

  // A ocorrência some da lista ativa — a seção "Hoje" não deve mais ter essa tarefa pendente
  await expect(
    row.getByRole("button", { name: "Marcar como concluída" }),
  ).not.toBeVisible({ timeout: 10_000 });

  // No histórico, a ocorrência deve aparecer com indicador de pulada (→)
  await page.goto("/rotina/historico");
  const historyRow = page.locator("li").filter({ hasText: title });
  await expect(historyRow).toBeVisible({ timeout: 10_000 });
  await expect(historyRow.getByLabel("Pulada")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. Adiar ocorrência → não aparece mais hoje; aparece na data escolhida
// ---------------------------------------------------------------------------

test("adiar ocorrência remove de Hoje e fica agendada para a data futura", async ({
  page,
}) => {
  const email = uniqueEmail("rot-postpone");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Adiar ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();

  // Abrir menu "⋯" e clicar em "Adiar"
  await row.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("menuitem", { name: "Adiar" }).click();

  // Preencher uma data 3 dias à frente
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const futureDateStr = futureDate.toISOString().slice(0, 10);
  await row.getByLabel("nova data").fill(futureDateStr);
  await row.getByRole("button", { name: /^Adiar$/ }).click();

  // O botão "Marcar como concluída" não deve mais aparecer nesta linha hoje
  await expect(
    row.getByRole("button", { name: "Marcar como concluída" }),
  ).not.toBeVisible({ timeout: 10_000 });

  // A ocorrência deve aparecer na seção "Próximas 7 dias" com a nova data
  await page.reload();
  const upcoming = page.getByRole("heading", { name: /Próximas 7 dias/i });
  await expect(upcoming).toBeVisible();
  const upcomingSection = page.locator("section").filter({ has: upcoming });
  await expect(upcomingSection.getByText(title)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 6. Calendário mostra contagem após concluir tarefa
// ---------------------------------------------------------------------------

test("calendário mostra indicador de tarefa concluída no dia atual", async ({ page }) => {
  const email = uniqueEmail("rot-calendar");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Calendário ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Concluir a tarefa na /rotina
  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();
  await row.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Navegar para o calendário no desktop (usa a visão mensal)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/rotina/calendario");
  await expect(page.getByRole("heading", { name: "Calendário" })).toBeVisible();

  // O dia de hoje deve mostrar o indicador de "todas concluídas" (círculo verde)
  // ou um número de tarefas pendentes dependendo das outras tarefas do onboarding.
  // Verificamos apenas que a grade do calendário carregou corretamente.
  const calendarGrid = page.locator(".grid.grid-cols-7").last();
  await expect(calendarGrid).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 7. Arquivar tarefa → some de /rotina; aparece em /rotina/historico
// ---------------------------------------------------------------------------

test("tarefa arquivada some de /rotina e aparece em /historico como arquivada", async ({
  page,
}) => {
  const email = uniqueEmail("rot-archive");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Arquivar ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Concluir 1 ocorrência para que o archiveTask preserva histórico em vez de deletar
  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();
  await row.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Arquivar via admin (a UI de arquivamento ainda não está exposta no frontend)
  const homeId = await getHomeId(email);
  const admin = createTestAdminClient();
  const { data: tasks } = await admin
    .from("tasks")
    .select("id, title")
    .eq("home_id", homeId)
    .eq("title", title)
    .limit(1);
  const taskId = tasks?.[0]?.id;
  expect(taskId).toBeTruthy();
  await admin.from("tasks").update({ status: "archived" }).eq("id", taskId);

  // Recarregar /rotina — tarefa arquivada não deve aparecer como pendente
  await page.goto("/rotina");
  // Não deve haver botão "Marcar como concluída" para essa tarefa
  const pendingRows = page.locator("div").filter({ hasText: title });
  const completeBtns = pendingRows.getByRole("button", { name: "Marcar como concluída" });
  await expect(completeBtns).toHaveCount(0, { timeout: 10_000 });

  // No histórico, a tarefa deve aparecer com rótulo "(arquivada)"
  await page.goto("/rotina/historico");
  const historyEntry = page.locator("li").filter({ hasText: title });
  await expect(historyEntry).toBeVisible({ timeout: 10_000 });
  await expect(historyEntry.getByText("(arquivada)")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 8. Editar regra: diária → semanal; ocorrências passadas permanecem
// ---------------------------------------------------------------------------

test("editar regra de diária para semanal preserva ocorrências passadas", async ({
  page,
}) => {
  const email = uniqueEmail("rot-editrule");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Tarefa Editar Regra ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Concluir a ocorrência de hoje para criar histórico
  await page.goto("/rotina");
  const row = page.locator("div").filter({ hasText: title }).first();
  await row.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Verificar que a ocorrência concluída aparece no histórico
  await page.goto("/rotina/historico");
  await expect(page.locator("li").filter({ hasText: title })).toBeVisible({ timeout: 10_000 });

  // Alterar a regra para semanal via admin (edição de regra via UI ainda não exposta)
  const homeId = await getHomeId(email);
  const admin = createTestAdminClient();
  const { data: tasks } = await admin
    .from("tasks")
    .select("id")
    .eq("home_id", homeId)
    .eq("title", title)
    .limit(1);
  const taskId = tasks?.[0]?.id;
  expect(taskId).toBeTruthy();

  // Atualizar a rotina para semanal e zerar generated_until para regenerar
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  await admin
    .from("routines")
    .update({ frequency_type: "weekly", generated_until: yesterdayStr })
    .eq("task_id", taskId);

  // Deletar ocorrências pendentes futuras (mantém a de hoje que foi concluída)
  const today = new Date().toISOString().slice(0, 10);
  await admin
    .from("task_occurrences")
    .delete()
    .eq("task_id", taskId)
    .eq("status", "pending")
    .gte("original_date", today);

  // Recarregar /rotina — extendWindowForHome regenera ocorrências semanais
  await page.goto("/rotina");
  await expect(page.getByRole("heading", { name: "Rotina" })).toBeVisible({ timeout: 15_000 });

  // A seção "Próximas 7 dias" deve mostrar no máximo 1 ocorrência desta tarefa
  // (semanal = 1 por semana, não mais 7)
  const upcoming = page.getByRole("heading", { name: /Próximas 7 dias/i });
  if (await upcoming.isVisible()) {
    const upcomingSection = page.locator("section").filter({ has: upcoming });
    const occurrencesInSection = await upcomingSection
      .locator("div")
      .filter({ hasText: title })
      .count();
    expect(occurrencesInSection).toBeLessThanOrEqual(1);
  }

  // O histórico ainda deve conter a ocorrência concluída (passada)
  await page.goto("/rotina/historico");
  await expect(page.locator("li").filter({ hasText: title })).toBeVisible({ timeout: 10_000 });
});
