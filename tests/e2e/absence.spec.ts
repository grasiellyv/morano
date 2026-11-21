/**
 * Validação funcional — Etapa 8: Modo Ausência
 * 12 cenários conforme especificado na revisão pré-Etapa-9.
 */
import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser, createTestAdminClient } from "./helpers/admin";

const PASSWORD = "Morano123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function signIn(page: Page, email: string, password: string) {
  // Clear existing session (storageState loads e2e@morano.test by default)
  await page.context().clearCookies();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function completeOnboarding(page: Page, homeName = "Casa Ausência E2E") {
  await expect(page).toHaveURL(/\/onboarding\/residencia$/, { timeout: 15_000 });
  await page.getByLabel("Nome da residência").fill(homeName);
  await page.getByLabel("Tipo de imóvel").selectOption("apartamento");
  await page.getByLabel("Situação do imóvel").selectOption("proprio");
  await page.getByLabel("Composição do lar").selectOption("sozinho");
  await page.getByLabel("Número de moradores").fill("1");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/comodos$/);
  // "Sala" may already be pre-selected; only click if not yet selected
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
  await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible({
    timeout: 10_000,
  });
}

async function getUserId(email: string): Promise<string> {
  const admin = createTestAdminClient();
  for (let pg = 1; pg < 20; pg++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`Usuário não encontrado: ${email}`);
}

async function getHomeId(email: string): Promise<string> {
  const admin = createTestAdminClient();
  const userId = await getUserId(email);
  const { data: profile } = await admin
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .single();
  if (!profile?.current_home_id) throw new Error("current_home_id não encontrado");
  return profile.current_home_id;
}

/** Define ausência via admin (service_role bypassa RLS e políticas de coluna). */
async function setAbsenceViaAdmin(email: string, start: string, end: string) {
  const admin = createTestAdminClient();
  const userId = await getUserId(email);
  const homeId = await getHomeId(email);
  const { error } = await admin
    .from("home_members")
    .update({ absence_start: start, absence_end: end })
    .eq("user_id", userId)
    .eq("home_id", homeId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// 1. Sem ausência — rotina funciona normalmente
// ---------------------------------------------------------------------------
test("1. sem ausência — rotina funciona normalmente", async ({ page }) => {
  const email = uniqueEmail("aus-1-normal");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Normal ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  await page.goto("/rotina");
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  // Sem banner de ausência
  await expect(page.getByRole("alert")).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Cadastro de ausência com datas válidas
// ---------------------------------------------------------------------------
test("2. cadastro de ausência com datas válidas", async ({ page }) => {
  const email = uniqueEmail("aus-2-cadastro");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/configuracoes");
  await page.getByLabel("Data de início").fill(today());
  await page.getByLabel("Data de fim").fill(dateOffset(7));
  await page.getByRole("button", { name: "Salvar ausência" }).click();

  // Aguarda mensagem de sucesso retornada pela server action
  await expect(page.getByText(/modo ausência ativado/i)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 3. Data final anterior à inicial → erro de validação
// ---------------------------------------------------------------------------
test("3. data final anterior à inicial mostra erro", async ({ page }) => {
  const email = uniqueEmail("aus-3-invalid");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await page.goto("/configuracoes");
  await page.getByLabel("Data de início").fill(dateOffset(5));
  await page.getByLabel("Data de fim").fill(dateOffset(2));
  await page.getByRole("button", { name: "Salvar ausência" }).click();

  await expect(
    page.getByText(/data de término deve ser igual ou posterior/i)
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 4. Banner de ausência aparece na /rotina quando hoje está no período
// ---------------------------------------------------------------------------
test("4. banner de ausência aparece na rotina", async ({ page }) => {
  const email = uniqueEmail("aus-4-banner");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  await setAbsenceViaAdmin(email, today(), dateOffset(7));

  await page.goto("/rotina");
  const banner = page.getByRole("alert");
  await expect(banner).toBeVisible({ timeout: 10_000 });
  await expect(banner).toContainText(/ausência/i);
  await expect(banner).toContainText("Encerrar ausência");
});

// ---------------------------------------------------------------------------
// 5. Tarefas pendentes dentro do período são ocultadas
// ---------------------------------------------------------------------------
test("5. tarefas pendentes dentro do período não aparecem", async ({ page }) => {
  const email = uniqueEmail("aus-5-filter");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Ocultar ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Sem ausência: tarefa aparece
  await page.goto("/rotina");
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

  // Define ausência cobrindo hoje
  await setAbsenceViaAdmin(email, today(), dateOffset(7));

  await page.goto("/rotina");
  // Tarefa pendente não deve aparecer
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 6. Progresso diário não contabiliza tarefas ocultadas
// ---------------------------------------------------------------------------
test("6. progresso não contabiliza tarefas ocultadas", async ({ page }) => {
  const email = uniqueEmail("aus-6-progresso");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Progresso ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Captura texto da barra antes da ausência (formato: "N de M tarefa(s) concluída(s)")
  await page.goto("/rotina");
  const progressText = page.getByText(/\d+ de \d+ tarefa/i);
  await expect(progressText).toBeVisible({ timeout: 10_000 });
  const textBefore = await progressText.textContent();

  // Define ausência cobrindo hoje — todas as tarefas pendentes são filtradas
  await setAbsenceViaAdmin(email, today(), dateOffset(7));
  await page.goto("/rotina");

  // Com ausência, total=0, então a barra desaparece (DailyProgressBar retorna null)
  // Verifica que a página renderizou sem crashes
  await expect(page.locator("h2")).toBeVisible({ timeout: 10_000 });
  // Barra de progresso não deve estar visível (nenhuma tarefa no denominador)
  await expect(progressText).not.toBeVisible({ timeout: 5_000 });
  // O texto antes da ausência deve ser diferente (havia tarefas)
  expect(textBefore).toMatch(/\d+ de \d+ tarefa/i);
});

// ---------------------------------------------------------------------------
// 7. Tarefas concluídas continuam visíveis durante ausência
// ---------------------------------------------------------------------------
test("7. tarefas concluídas continuam visíveis durante ausência", async ({ page }) => {
  const email = uniqueEmail("aus-7-completed");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Concluída ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Conclui a tarefa (cada task card tem classe bg-card)
  await page.goto("/rotina");
  const row = page.locator(".bg-card").filter({ hasText: title });
  await row.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Define ausência cobrindo hoje
  await setAbsenceViaAdmin(email, today(), dateOffset(7));

  await page.goto("/rotina");
  // Tarefa concluída deve continuar visível (Strategy C: completed sempre passa)
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 8. Calendário exibe visão coletiva sem filtro de ausência
// ---------------------------------------------------------------------------
test("8. calendário exibe visão coletiva sem filtro de ausência", async ({ page }) => {
  const email = uniqueEmail("aus-8-calendar");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Calendário ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Conclui a tarefa para ter algo no calendário
  await page.goto("/rotina");
  const row = page.locator(".bg-card").filter({ hasText: title });
  await row.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });

  // Define ausência cobrindo hoje
  await setAbsenceViaAdmin(email, today(), dateOffset(7));

  // Calendário não deve ter banner de ausência
  await page.goto("/rotina/calendario");
  await expect(page.getByRole("heading", { name: "Calendário" })).toBeVisible({
    timeout: 10_000,
  });

  // Grade do calendário carrega normalmente
  const calendarGrid = page.locator(".grid.grid-cols-7").last();
  await expect(calendarGrid).toBeVisible({ timeout: 10_000 });

  // Sem banner de ausência no calendário (exclui o route-announcer do Next.js)
  const absenceBannerCount = await page
    .getByRole("alert")
    .filter({ hasText: /ausência/i })
    .count();
  expect(absenceBannerCount).toBe(0);
});

// ---------------------------------------------------------------------------
// 9. Outro membro da residência executa tarefas normalmente
// ---------------------------------------------------------------------------
test("9. outro membro da residência executa tarefas normalmente", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const email1 = uniqueEmail("aus-9a-owner");
  const email2 = uniqueEmail("aus-9b-member");

  await ensureConfirmedUser(email1, PASSWORD);
  await ensureConfirmedUser(email2, PASSWORD);

  // Usuário 1: onboarding e criação de tarefa
  await signIn(page, email1, PASSWORD);
  await completeOnboarding(page, "Casa Dois Membros E2E");
  const title = `Membro2 ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Define ausência para usuário 1
  await setAbsenceViaAdmin(email1, today(), dateOffset(7));

  // Adiciona usuário 2 à mesma residência via admin
  const admin = createTestAdminClient();
  const homeId = await getHomeId(email1);
  const userId2 = await getUserId(email2);

  await admin.from("home_members").upsert({
    home_id: homeId,
    user_id: userId2,
    role: "member",
  });
  // upsert garante que a linha existe mesmo se o trigger ainda não a criou
  await admin.from("profiles").upsert({
    id: userId2,
    current_home_id: homeId,
    onboarding_completed: true,
    full_name: "Membro E2E",
  });

  // Entra como usuário 2 no mesmo contexto (signIn limpa cookies do usuário 1)
  await signIn(page, email2, PASSWORD);
  await page.waitForURL(/\/inicio$/, { timeout: 20_000 });

  await page.goto("/rotina");
  // Usuário 2 deve ver a tarefa (não filtrada pela ausência do usuário 1)
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

  // Usuário 2 não tem banner de ausência
  await expect(
    page.getByRole("alert").filter({ hasText: /ausência/i })
  ).not.toBeVisible();

  // Usuário 2 consegue concluir a tarefa
  const row2 = page.locator(".bg-card").filter({ hasText: title });
  await row2.getByRole("button", { name: "Marcar como concluída" }).click();
  await expect(row2.getByLabel("Concluída")).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 10. Alterar data final da ausência atualiza comportamento
// ---------------------------------------------------------------------------
test("10. alterar data final restaura tarefas quando ausência termina", async ({
  page,
}) => {
  const email = uniqueEmail("aus-10-change");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Mudar Data ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Ausência cobrindo hoje — tarefa some
  await setAbsenceViaAdmin(email, today(), dateOffset(7));
  await page.goto("/rotina");
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 10_000 });

  // Encurta ausência para terminar ontem (via /configuracoes UI)
  await page.goto("/configuracoes");
  await page.getByLabel("Data de início").fill(dateOffset(-2));
  await page.getByLabel("Data de fim").fill(dateOffset(-1));
  await page.getByRole("button", { name: "Salvar ausência" }).click();

  // Confirma que salvou (mensagem de sucesso da server action)
  await expect(page.getByText(/modo ausência ativado/i)).toBeVisible({ timeout: 10_000 });

  // Agora a ausência não cobre hoje — tarefa volta
  await page.goto("/rotina");
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  // Sem banner (ausência no passado)
  await expect(page.getByRole("alert")).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// 11. Encerramento antecipado da ausência restaura visualização normal
// ---------------------------------------------------------------------------
test("11. encerrar ausência pelo banner restaura visualização", async ({ page }) => {
  const email = uniqueEmail("aus-11-clear");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Encerrar ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Define ausência ativa
  await setAbsenceViaAdmin(email, today(), dateOffset(7));

  await page.goto("/rotina");
  // Tarefa oculta e banner visível
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });

  // Clica "Encerrar ausência" no banner
  await page.getByRole("button", { name: "Encerrar ausência" }).click();

  // Banner some e tarefa volta (filtra pelo conteúdo para evitar route-announcer do Next.js)
  await expect(
    page.getByRole("alert").filter({ hasText: /ausência/i })
  ).not.toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 12. Ausência encerrada não interfere em períodos futuros
// ---------------------------------------------------------------------------
test("12. ausência passada não interfere em datas futuras", async ({ page }) => {
  const email = uniqueEmail("aus-12-future");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  const title = `Futuro ${Date.now()}`;
  await createTaskViaUI(page, title, { frequency: "daily" });

  // Define ausência inteiramente no passado
  await setAbsenceViaAdmin(email, dateOffset(-5), dateOffset(-1));

  await page.goto("/rotina");
  // Tarefa de hoje deve aparecer (ausência terminou ontem)
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  // Sem banner (ausência no passado)
  await expect(page.getByRole("alert")).not.toBeVisible();
});
