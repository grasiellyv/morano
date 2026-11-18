import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { E2E_EMAIL, E2E_PASSWORD, ensureConfirmedUser } from "./helpers/admin";

export const STORAGE_STATE = path.join(__dirname, ".auth", "user.json");

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  try {
    await fetch(`${supabaseUrl}/auth/v1/health`, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new Error(
      "O Supabase local não está rodando. Abra o Docker Desktop e rode `npm run db:start` antes dos testes.",
    );
  }

  await ensureConfirmedUser(E2E_EMAIL, E2E_PASSWORD);

  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(E2E_EMAIL);
    await page.getByLabel("Senha").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/inicio$/, { timeout: 30_000 });
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
