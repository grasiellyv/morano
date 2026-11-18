import { expect, test, type Page } from "@playwright/test";
import { ensureConfirmedUser } from "./helpers/admin";
import { latestLinkFor, pathOf } from "./helpers/mailpit";

const PASSWORD = "Morano123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@morano.test`;
}

async function signIn(page: Page, email: string, password: string, from = "/entrar") {
  await page.goto(from);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function signUp(page: Page, email: string) {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Pessoa Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
}

test("anonymous user is sent to /entrar with next", async ({ page }) => {
  await page.goto("/rotina");
  await expect(page).toHaveURL(/\/entrar\?next=%2Frotina$/);
});

test("sign up, confirm by email, land in app", async ({ page }) => {
  const email = uniqueEmail("cadastro");
  await signUp(page, email);
  await expect(page).toHaveURL(/\/cadastro\/confirme$/);
  const link = await latestLinkFor(email);
  await page.goto(pathOf(link));
  await expect(page).toHaveURL(/\/inicio$/);
});

test("unconfirmed user cannot enter app", async ({ page }) => {
  const email = uniqueEmail("pendente");
  await signUp(page, email);
  await expect(page).toHaveURL(/\/cadastro\/confirme$/);
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar/);
  await signIn(page, email, PASSWORD);
  await expect(page.locator("p[role=alert]")).toContainText("Confirme seu e-mail antes de entrar.");
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar/);
});

test("wrong password shows friendly error", async ({ page }) => {
  const email = uniqueEmail("senha");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, "SenhaErrada1");
  await expect(page.locator("p[role=alert]")).toHaveText("E-mail ou senha incorretos.");
  await expect(page).toHaveURL(/\/entrar/);
});

test("open redirect blocked", async ({ page }) => {
  const email = uniqueEmail("redirect");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD, "/entrar?next=https://evil.com");
  await expect(page).toHaveURL(/localhost:3100\/inicio$/);
});

test("forgot password flow", async ({ page }) => {
  const email = uniqueEmail("recuperar");
  const newPassword = "NovaSenha456";
  await ensureConfirmedUser(email, PASSWORD);

  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(
    page.getByText("Se houver uma conta com esse e-mail, enviamos um link."),
  ).toBeVisible();

  const link = await latestLinkFor(email);
  await page.goto(pathOf(link));
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
  await page.getByLabel("Repita a nova senha").fill(newPassword);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/\/inicio$/);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await signIn(page, email, newPassword);
  await expect(page).toHaveURL(/\/inicio$/);
});

test("sign out returns to /entrar and protects routes again", async ({ page }) => {
  const email = uniqueEmail("sair");
  await ensureConfirmedUser(email, PASSWORD);
  await signIn(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/casa");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fcasa$/);
});

test("Google button hidden when flag off", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
});

test("terms checkbox required", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Pessoa Teste");
  await page.getByLabel("E-mail").fill(uniqueEmail("termos"));
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Aceite os termos para continuar.")).toBeVisible();
  await expect(page).toHaveURL(/\/cadastro$/);
});
