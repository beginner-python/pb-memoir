import { expect, test } from "@playwright/test";

import { visible } from "./helpers";

// ステージング・本番向けの読み取り専用スモーク。データを作らず、サンプル日記が入っている前提。

test("ホームにサンプル日記と質問例が表示される", async ({ page }) => {
  await page.goto("/");
  await expect(visible(page).getByText("最近の記録")).toBeVisible();
  await expect(visible(page).getByRole("link", { name: /すべて見る/ })).toBeVisible();
  // 読み取り専用のため投稿ボタンは無効
  const composer = visible(page).locator("form").filter({ hasText: "今日の出来事を記録する" });
  await expect(composer.getByRole("button", { name: "投稿する" })).toBeDisabled();
  await expect(visible(page).getByText("読み取り専用のデモのため投稿できません")).toBeVisible();
});

test("日記一覧に 100 件以上あり、詳細が開ける", async ({ page, request }) => {
  const res = await request.get("/api/entries?limit=1");
  expect(res.ok()).toBeTruthy();
  const { total } = (await res.json()) as { total: number };
  expect(total).toBeGreaterThanOrEqual(100);

  await page.goto("/diary");
  await expect(visible(page).getByText(`${total.toLocaleString()} 件の記録`)).toBeVisible();
  await visible(page).getByRole("link", { name: /日記|の出来事|公園|保育園|水瀬/ }).first().click();
  await page.waitForURL(/\/diary\/[0-9a-f-]{36}$/);
  await expect(page.locator("article:visible")).toBeVisible();
  await expect(page.locator("article:visible").getByText("このデモは読み取り専用です")).toBeVisible();
});

test("質問例で根拠と回答が返る(SSE が完了する)", async ({ page }) => {
  await page.goto("/chat");
  await visible(page).getByRole("button", { name: "去年の夏、どこに出かけた?" }).click();
  const log = page.locator("[role=log]:visible");
  await expect(log.getByText("去年の夏", { exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(log.getByText("LLM_PROVIDER=openai")).toBeVisible({ timeout: 60_000 });
  await log.getByRole("button", { name: /根拠 \d+ 件/ }).click();
  await expect(log.locator("ol li").first()).toBeVisible();
});

test("書き込み API は 403 を返す", async ({ request }) => {
  const res = await request.post("/api/entries", { data: { entry_date: "2026-01-01", body: "smoke" } });
  expect(res.status()).toBe(403);
});
