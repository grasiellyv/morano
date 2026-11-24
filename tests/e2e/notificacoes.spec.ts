/**
 * Validação funcional — Centro de notificações persistidas (/notificacoes)
 * 7 cenários (passos 2-8 do brief da Task 8) cobrindo RLS entre contas/casas,
 * consolidação por autor, preferências e o backfill de task_due_today —
 * contra Supabase local real.
 */
import { expect, test, type Page } from "@playwright/test";
import { createTestAdminClient, ensureConfirmedUser } from "./helpers/admin";

// Esta suíte toca muitas rotas (/compras, /manutencao, /rotina, /notificacoes,
// /onboarding/*) que, ao rodar este arquivo isoladamente, nunca foram
// compiladas pelo servidor de dev (Next compila sob demanda, por rota, na
// primeira requisição) — o timeout padrão de 30s por teste não sobra margem
// para isso em algumas rotas mais pesadas. 90s dá folga sem mascarar falha real.
test.describe.configure({ timeout: 90_000 });

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
  // Espera o redirect do login terminar (/inicio se já onboarded, /onboarding/*
  // senão) antes de seguir — sem isso, um `page.goto()` imediato pode disparar
  // antes do cookie de sessão ser aplicado e a navegação subsequente cai de
  // volta em /entrar (sessão ainda não existe).
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 30_000 });
}

async function completeOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding\/residencia$/, { timeout: 15_000 });
  await page.getByLabel("Nome da residência").fill(`Casa Notif E2E ${Date.now()}`);
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

/**
 * Step 1 do brief: adiciona um segundo morador à MESMA casa do primeiro
 * usuário, direto via admin client (bypassa RLS e a UI de convite — que já
 * tem cobertura própria em membros.spec.ts). Também marca
 * `onboarding_completed = true` para o segundo usuário: sem isso, o layout
 * de `(app)` (`src/app/(app)/layout.tsx`) redireciona para `/onboarding`
 * mesmo com `current_home_id` preenchido, porque ele checa a flag, não a
 * presença de casa.
 *
 * Pré-requisito: `ownerUserId` já completou o onboarding (tem
 * `current_home_id` preenchido).
 */
async function addSecondMemberToHome(ownerUserId: string, memberUserId: string): Promise<string> {
  const admin = createTestAdminClient();

  const { data: ownerProfile, error: ownerError } = await admin
    .from("profiles")
    .select("current_home_id")
    .eq("id", ownerUserId)
    .single();
  if (ownerError || !ownerProfile?.current_home_id) {
    throw new Error("current_home_id do morador 1 não encontrado — onboarding não completou?");
  }
  const homeId = ownerProfile.current_home_id;

  const { error: memberError } = await admin
    .from("home_members")
    .insert({ home_id: homeId, user_id: memberUserId, role: "member" });
  if (memberError) throw memberError;

  const { error: profileError } = await admin
    .from("profiles")
    .update({ current_home_id: homeId, onboarding_completed: true })
    .eq("id", memberUserId);
  if (profileError) throw profileError;

  return homeId;
}

/**
 * Abre o formulário de produto (se ainda fechado), adiciona e aguarda
 * aparecer na lista. O clique em "Adicionar produto" é repetido algumas
 * vezes se o campo não aparecer: sob carga (dev server ainda compilando a
 * rota/bundle na 1ª visita), um clique pode chegar antes da hidratação do
 * React terminar e não ter efeito nenhum — reenviar o clique até o campo
 * aparecer é mais robusto do que um `if (isVisible)` de checagem única.
 */
async function addShoppingItem(page: Page, name: string) {
  await page.goto("/compras");
  const nameField = page.getByLabel("Nome do produto", { exact: true });
  const toggle = page.getByRole("button", { name: "Adicionar produto" });

  for (let attempt = 0; attempt < 5; attempt++) {
    if (await nameField.isVisible().catch(() => false)) break;
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click().catch(() => {});
    }
    await page.waitForTimeout(1_000);
  }
  await expect(nameField).toBeVisible({ timeout: 30_000 });

  await nameField.fill(name);
  await page.getByRole("button", { name: "Adicionar à lista" }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
}

/** Cria item de manutenção via UI e aguarda aparecer em "Em aberto". */
async function addMaintenanceItem(page: Page, title: string) {
  await page.goto("/manutencao");
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(
    page.locator("section").filter({ hasText: "Em aberto" }).getByText(title),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Conclui a PRIMEIRA ocorrência pendente de hoje em /rotina e retorna o
 * título da tarefa. Usa uma das ocorrências já geradas pela rotina sugerida
 * no onboarding (["Equilibrada"]) em vez de criar uma tarefa nova pela UI:
 * o botão "Criar tarefa ou compromisso" → "Nova tarefa" insere via
 * `createTask` (src/features/tasks/actions.ts), cujo INSERT inclui as
 * colunas `instructions` e `is_essential` — nenhuma das duas tem
 * `grant insert (...) on tasks to authenticated` em nenhuma migração
 * (`20261119050000_is_essential.sql` e `20261119060000_task_instructions.sql`
 * adicionam a coluna mas não o grant; o grant de colunas original, em
 * `20261118053554_routine.sql` linha 184, não as lista). Isso faz QUALQUER
 * criação de tarefa pela UI falhar com "permission denied for table tasks"
 * (confirmado via supabase-js direto, fora deste teste) — bug pré-existente,
 * fora do escopo desta suíte de notificações. As tarefas do onboarding são
 * inseridas por uma RPC `security definer` (bypassa esse grant), por isso
 * elas existem e servem para este teste sem depender do caminho quebrado.
 *
 * O botão de concluir tem `aria-label` = `Concluir: ${title}`
 * (src/features/tasks/components/task-occurrence-row.tsx). Ao concluir, a
 * ocorrência sai da lista de pendentes e vai para a seção "Concluídas"
 * (colapsada por padrão — `CollapsibleSection` com `defaultOpen={false}` em
 * task-list.tsx) — por isso a confirmação é pela AUSÊNCIA do botão
 * "Concluir: <título>", não pela aparição de um botão "Desfazer conclusão"
 * (que existiria, mas dentro da seção colapsada). "Marcar como concluída"/
 * "Concluída" (usados em tests/e2e/rotina.spec.ts) não correspondem à UI
 * atual.
 *
 * A rotina sugerida do onboarding pode repetir o mesmo título em cômodos
 * diferentes (ex.: duas ocorrências "Passar aspirador"). Escolhemos um
 * título que apareça exatamente 1 vez entre as pendentes, para que "não
 * aparece mais o botão Concluir: <título>" prove a conclusão desta
 * ocorrência especificamente, sem ambiguidade com outra ocorrência pendente
 * de título igual.
 */
async function completeFirstPendingOccurrence(page: Page): Promise<string> {
  await page.goto("/rotina");
  const completeButtons = page.getByRole("button", { name: /^Concluir: /, exact: false });
  await expect(completeButtons.first()).toBeVisible({ timeout: 30_000 });

  const labels = await completeButtons.evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label") ?? ""),
  );
  const titles = labels.map((l) => l.replace(/^Concluir:\s*/, ""));
  const counts = new Map<string, number>();
  for (const t of titles) counts.set(t, (counts.get(t) ?? 0) + 1);
  const uniqueTitle = titles.find((t) => counts.get(t) === 1);
  if (!uniqueTitle) {
    throw new Error("Nenhuma ocorrência pendente com título único encontrada em /rotina.");
  }

  const completeButton = page.getByRole("button", { name: `Concluir: ${uniqueTitle}`, exact: true });
  await completeButton.click();
  await expect(completeButton).toHaveCount(0, { timeout: 30_000 });

  return uniqueTitle;
}

// ---------------------------------------------------------------------------
// 1. Autor não vê a própria notificação; outro morador da mesma casa vê
// ---------------------------------------------------------------------------
test("1. item adicionado por um morador aparece para o outro, não para o autor", async ({
  page,
  browser,
}) => {
  const email1 = uniqueEmail("notif-1-autor");
  const email2 = uniqueEmail("notif-1-outro");
  const user1 = await ensureConfirmedUser(email1, PASSWORD);
  const user2 = await ensureConfirmedUser(email2, PASSWORD);

  await signIn(page, email1, PASSWORD);
  await completeOnboarding(page);
  await addSecondMemberToHome(user1.id, user2.id);

  const itemName = `Item Notif1 ${Date.now()}`;
  await addShoppingItem(page, itemName);

  // Autor (user1): não vê a própria notificação de adição.
  await page.goto("/notificacoes");
  await expect(page.getByRole("heading", { name: "Notificações" })).toBeVisible();
  await expect(page.getByText(itemName)).not.toBeVisible();

  // Outro morador (user2, outro contexto de browser): vê a notificação.
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await signIn(page2, email2, PASSWORD);
  await page2.goto("/notificacoes");
  await expect(page2.getByText("adicionou um item à lista")).toBeVisible({ timeout: 30_000 });
  await expect(page2.getByText(itemName)).toBeVisible();
  await ctx2.close();
});

// ---------------------------------------------------------------------------
// 2. Consolidação por autor: 2 itens do mesmo autor = 1 linha; outro autor
//    nunca entra na mesma linha (cada emit só consolida com o próprio actor_id)
// ---------------------------------------------------------------------------
test("2. dois itens do mesmo autor consolidam; item de outro autor não entra na mesma linha", async ({
  page,
  browser,
}) => {
  const email1 = uniqueEmail("notif-2-autor");
  const email2 = uniqueEmail("notif-2-outro");
  const user1 = await ensureConfirmedUser(email1, PASSWORD);
  const user2 = await ensureConfirmedUser(email2, PASSWORD);

  await signIn(page, email1, PASSWORD);
  await completeOnboarding(page);
  await addSecondMemberToHome(user1.id, user2.id);

  const itemA = `Item2A ${Date.now()}`;
  const itemB = `Item2B ${Date.now()}`;
  await addShoppingItem(page, itemA);
  await addShoppingItem(page, itemB);

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await signIn(page2, email2, PASSWORD);
  await page2.goto("/notificacoes");

  // Consolidado em 1 única linha: só 1 ocorrência do título, com o meta do
  // ÚLTIMO item (prova que a 2ª adição fez UPDATE na mesma linha, não INSERT).
  await expect(
    page2.getByRole("link").filter({ hasText: "adicionou um item à lista" }),
  ).toHaveCount(1, { timeout: 30_000 });
  await expect(page2.getByText(itemB, { exact: true })).toBeVisible();
  await expect(page2.getByText(itemA, { exact: true })).not.toBeVisible();

  // user2 adiciona 1 item próprio — não deve se misturar com a linha de user1.
  const itemC = `Item2C ${Date.now()}`;
  await addShoppingItem(page2, itemC);

  // user1 (autor dos itens A/B) recarrega /notificacoes: a própria linha não
  // aparece (é autor); a de user2 aparece separada, com o item C.
  await page.goto("/notificacoes");
  await expect(
    page.getByRole("link").filter({ hasText: "adicionou um item à lista" }),
  ).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByText(itemC, { exact: true })).toBeVisible();
  await expect(page.getByText(itemA, { exact: true })).not.toBeVisible();
  await expect(page.getByText(itemB, { exact: true })).not.toBeVisible();

  await ctx2.close();
});

// ---------------------------------------------------------------------------
// 3. Nunca vaza notificação entre casas diferentes (RLS por home_id)
// ---------------------------------------------------------------------------
test("3. notificação de uma casa não aparece para usuário de outra casa", async ({ page, browser }) => {
  const email1 = uniqueEmail("notif-3-casa1");
  const email3 = uniqueEmail("notif-3-casa3");
  await ensureConfirmedUser(email1, PASSWORD);
  await ensureConfirmedUser(email3, PASSWORD);

  await signIn(page, email1, PASSWORD);
  await completeOnboarding(page);

  const itemName = `Item Isolado ${Date.now()}`;
  await addShoppingItem(page, itemName);

  // user3 tem casa PRÓPRIA, nunca ligada à de user1.
  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  await signIn(page3, email3, PASSWORD);
  await completeOnboarding(page3);

  await page3.goto("/notificacoes");
  await expect(page3.getByRole("heading", { name: "Notificações" })).toBeVisible();
  // Não é lista totalmente vazia (a própria rotina de user3 pode gerar
  // task_due_today), mas nada da casa de user1 deve aparecer.
  await expect(page3.getByText(itemName)).not.toBeVisible();
  await expect(page3.getByText("adicionou um item à lista")).not.toBeVisible();

  await ctx3.close();
});

// ---------------------------------------------------------------------------
// 4. Marcar todas como lidas remove o indicador de não lida
// ---------------------------------------------------------------------------
test("4. marcar todas como lidas remove o indicador de não lida", async ({ page, browser }) => {
  const email1 = uniqueEmail("notif-4-autor");
  const email2 = uniqueEmail("notif-4-leitor");
  const user1 = await ensureConfirmedUser(email1, PASSWORD);
  const user2 = await ensureConfirmedUser(email2, PASSWORD);

  await signIn(page, email1, PASSWORD);
  await completeOnboarding(page);
  await addSecondMemberToHome(user1.id, user2.id);

  const itemName = `Item Lido ${Date.now()}`;
  await addShoppingItem(page, itemName);

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await signIn(page2, email2, PASSWORD);
  await page2.goto("/notificacoes");

  await expect(page2.getByText(itemName)).toBeVisible({ timeout: 30_000 });
  await expect(page2.getByLabel("Não lida").first()).toBeVisible();

  await page2.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await page2.reload();

  await expect(page2.getByText(itemName)).toBeVisible();
  await expect(page2.getByLabel("Não lida")).toHaveCount(0, { timeout: 30_000 });

  await ctx2.close();
});

// ---------------------------------------------------------------------------
// 5. Desligar preferência oculta o tipo sem apagar o histórico
//
// Observação: a UI de preferências (/perfil) ainda não existe (Task 10) —
// `setNotificationPreferences` já existe e funciona, mas sem formulário que a
// chame. Para exercitar o efeito real (a leitura filtrando por
// `notification_preferences`, em `getDisabledTypes`/`applyVisibilityFilter`
// em src/features/notifications/queries.ts), este teste escreve direto na
// tabela via admin client — exatamente o que a action faria no `upsert`/
// `delete` dela — e verifica o resultado na página real.
// ---------------------------------------------------------------------------
test("5. desligar um tipo de notificação oculta da lista sem apagar o histórico", async ({
  page,
  browser,
}) => {
  const email1 = uniqueEmail("notif-5-autor");
  const email2 = uniqueEmail("notif-5-leitor");
  const user1 = await ensureConfirmedUser(email1, PASSWORD);
  const user2 = await ensureConfirmedUser(email2, PASSWORD);

  await signIn(page, email1, PASSWORD);
  await completeOnboarding(page);
  await addSecondMemberToHome(user1.id, user2.id);

  const maintTitle = `Manutenção Pref ${Date.now()}`;
  await addMaintenanceItem(page, maintTitle);

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await signIn(page2, email2, PASSWORD);
  await page2.goto("/notificacoes");
  await expect(page2.getByText(maintTitle)).toBeVisible({ timeout: 30_000 });

  // Desliga a preferência para user2 (equivalente ao que a action faria).
  const admin = createTestAdminClient();
  const { error: disableError } = await admin
    .from("notification_preferences")
    .upsert({ user_id: user2.id, type: "maintenance_registered", enabled: false }, { onConflict: "user_id,type" });
  expect(disableError).toBeNull();

  await page2.reload();
  await expect(page2.getByText(maintTitle)).not.toBeVisible({ timeout: 30_000 });

  // Religa (remove a exceção) — nada foi deletado da tabela `notifications`,
  // a notificação antiga deve voltar a aparecer.
  const { error: enableError } = await admin
    .from("notification_preferences")
    .delete()
    .eq("user_id", user2.id)
    .eq("type", "maintenance_registered");
  expect(enableError).toBeNull();

  await page2.reload();
  await expect(page2.getByText(maintTitle)).toBeVisible({ timeout: 30_000 });

  await ctx2.close();
});

// ---------------------------------------------------------------------------
// 6. Usuário sem casa (onboarding incompleto) é redirecionado, sem erro 500
// ---------------------------------------------------------------------------
test("6. usuário que ainda não completou o onboarding é redirecionado ao acessar /notificacoes direto", async ({
  page,
}) => {
  const email = uniqueEmail("notif-6-sem-casa");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);

  // NÃO completa o onboarding — current_home_id e onboarding_completed ficam
  // no padrão (null / false).
  await expect(page).toHaveURL(/\/onboarding\/residencia$/, { timeout: 15_000 });

  await page.goto("/notificacoes");
  await expect(page).not.toHaveURL(/\/notificacoes$/);
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
  // Nenhum erro de servidor — a página de onboarding carrega normalmente.
  await expect(page.locator("body")).not.toContainText("Application error");
});

// ---------------------------------------------------------------------------
// 7. Ocorrência concluída não gera task_due_today (cobre status='pending' do backfill)
// ---------------------------------------------------------------------------
test("7. tarefa concluída hoje não aparece como vencendo em /notificacoes", async ({ page }) => {
  const email = uniqueEmail("notif-7-concluida");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await completeOnboarding(page);

  // Conclui a ocorrência de hoje ANTES de visitar /notificacoes pela primeira
  // vez — importante: o backfill só roda lá, então se tivéssemos visitado
  // /notificacoes antes de concluir, uma notificação (pending) já teria sido
  // gravada e não seria removida depois (não há delete/update para esse caso).
  const title = await completeFirstPendingOccurrence(page);

  await page.goto("/notificacoes");
  await expect(page.getByRole("heading", { name: "Notificações" })).toBeVisible();
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 30_000 });
});
