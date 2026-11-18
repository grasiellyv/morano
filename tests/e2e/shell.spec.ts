import { expect, test } from "@playwright/test";

const LABELS = ["Início", "Rotina", "Casa", "Manutenção", "Compras"];
const ROUTES = ["/inicio", "/rotina", "/casa", "/manutencao", "/compras", "/configuracoes"];

test("root redirects to /inicio", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/inicio$/);
});

test("mobile: bottom nav shows 5 items and marks the active one", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/inicio");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(5);
  await expect(links).toHaveText(LABELS);
  await nav.getByRole("link", { name: "Rotina" }).click();
  await expect(page).toHaveURL(/\/rotina$/);
  await expect(page.getByRole("heading", { level: 1, name: "Rotina" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Rotina" })).toHaveAttribute("aria-current", "page");
});

test("mobile: avatar opens Configurações", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/inicio");
  await page.getByRole("link", { name: "Configurações" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
});

test("desktop: sidebar shows nav and settings", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/inicio");
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Configurações" })).toBeVisible();
});

test("no horizontal scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of ROUTES) {
    await page.goto(route);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, route).toBeLessThanOrEqual(320);
  }
  await page.goto("/inicio");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  for (const label of LABELS) {
    const link = nav.getByRole("link", { name: label });
    const text = link.getByText(label, { exact: true });
    const linkBox = await link.boundingBox();
    const textBox = await text.boundingBox();
    expect(linkBox, label).not.toBeNull();
    expect(textBox, label).not.toBeNull();
    expect(textBox!.x, label).toBeGreaterThanOrEqual(linkBox!.x - 0.5);
    expect(textBox!.x + textBox!.width, label).toBeLessThanOrEqual(
      linkBox!.x + linkBox!.width + 0.5,
    );
  }
});

test("viewport meta has viewport-fit=cover", async ({ page }) => {
  await page.goto("/inicio");
  const content = await page.locator("meta[name=viewport]").getAttribute("content");
  expect(content).toContain("viewport-fit=cover");
});

test("focus ring visible on nav link", async ({ page }) => {
  await page.goto("/inicio");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const inNav = await page.evaluate(
      () => !!document.activeElement?.closest('nav[aria-label="Navegação principal"]'),
    );
    if (inNav) break;
  }
  await expect(nav.getByRole("link").and(page.locator(":focus"))).toHaveCount(1);
  const focused = nav.locator("a:focus");
  const style = await focused.evaluate((el) => {
    const s = getComputedStyle(el);
    return { boxShadow: s.boxShadow, outlineStyle: s.outlineStyle };
  });
  expect(style.boxShadow !== "none" || style.outlineStyle !== "none").toBe(true);
});

test("/estilo shows DEMONSTRAÇÃO badge in dev", async ({ page }) => {
  await page.goto("/estilo");
  await expect(page.getByText("DEMONSTRAÇÃO")).toBeVisible();
});
