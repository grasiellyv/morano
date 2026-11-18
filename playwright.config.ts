import { defineConfig, devices } from "@playwright/test";

const STORAGE_STATE = "tests/e2e/.auth/user.json";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Os links dos e-mails de teste precisam apontar para este servidor.
    env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3100", NEXT_DIST_DIR: ".next-e2e" },
  },
  projects: [
    {
      name: "mobile",
      testIgnore: /auth\.spec\.ts/,
      use: { ...devices["Pixel 7"], storageState: STORAGE_STATE },
    },
    {
      name: "desktop",
      testIgnore: /auth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: STORAGE_STATE,
      },
    },
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
