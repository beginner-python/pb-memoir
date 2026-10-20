import { defineConfig, devices } from "@playwright/test";

// ローカル / CI: docker compose --profile e2e run --rm e2e      (専用スタックに対して全テスト)
// ステージング: SMOKE=1 E2E_BASE_URL=https://... npx playwright test --project=smoke
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "ja-JP",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  globalSetup: "./e2e/global-setup.ts",
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testIgnore: [/mobile\.spec\.ts/, /smoke\.spec\.ts/],
    },
    { name: "mobile", use: { ...devices["iPhone 13"] }, testMatch: /mobile\.spec\.ts/ },
    {
      // 読み取り専用のスモーク。ステージング(READ_ONLY=true)に対して実行する
      name: "smoke",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testMatch: /smoke\.spec\.ts/,
      timeout: 120_000, // Render の休止からの復帰を見込む
    },
  ],
});
