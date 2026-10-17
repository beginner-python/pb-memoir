import { expect, test } from "@playwright/test";

import { MARK, createEntry, deleteMarkedEntries, visible } from "./helpers";

test.beforeEach(async ({ request }) => {
  await deleteMarkedEntries(request);
  // 「去年の夏」= 2025-06-01〜08-31(質問例のキャッシュ)。期間内 1 件、期間外 1 件を用意する
  await createEntry(request, "2025-08-10", "家族で海に出かけた。息子が初めて波に触れた。");
  await createEntry(request, "2024-08-10", "家族で海に出かけた。去年と同じ浜辺。");
});

test.afterEach(async ({ request }) => {
  await deleteMarkedEntries(request);
});

test("ホームの質問欄からチャットへ引き継ぎ、時期で絞った根拠が表示される", async ({ page }) => {
  await page.goto("/");
  const ask = visible(page).locator("form").filter({ has: page.getByPlaceholder("思い出について質問する...") });
  await ask.getByPlaceholder("思い出について質問する...").fill("去年の夏、どこに出かけた?");
  await ask.getByRole("button", { name: "聞く" }).click();
  await page.waitForURL(/\/chat\?q=/);

  const log = page.locator("[role=log]:visible");
  // 回答文にも同じ文言が含まれるため、チップの要素に完全一致で絞る
  await expect(log.getByText("去年の夏", { exact: true })).toBeVisible();
  await expect(log.getByText("LLM_PROVIDER=openai")).toBeVisible(); // 生成(モック)が完了

  await log.getByRole("button", { name: /根拠 \d+ 件/ }).click();
  // 既存データがあっても成立するよう、件数ではなく「期間外が無い」「テストの日記が含まれる」で検証する
  const sources = log.locator("ol li");
  await expect(sources.first()).toBeVisible();
  await expect(sources.filter({ hasText: "2024年" })).toHaveCount(0);
  const mine = sources.filter({ hasText: MARK });
  await expect(mine).toHaveCount(1);
  await expect(mine).toContainText("2025年8月10日");

  // 根拠の日付から日記へ
  await mine.getByRole("link").click();
  await page.waitForURL(/\/diary\/[0-9a-f-]{36}$/);
  await expect(page.locator("article:visible")).toContainText("初めて波に触れた");
});

test("時期を含まない質問は全期間で検索される", async ({ page }) => {
  await page.goto("/chat");
  await visible(page).getByRole("button", { name: "はじめて歩いたのはいつ?" }).click();
  const log = page.locator("[role=log]:visible");
  await expect(log.getByText("全期間で検索")).toBeVisible();
  await expect(log.getByText("LLM_PROVIDER=openai")).toBeVisible();
});

test("Enter で送信、Shift+Enter で改行", async ({ page }) => {
  await page.goto("/chat");
  const input = visible(page).getByLabel("質問");
  await input.fill("一行目");
  await input.press("Shift+Enter");
  await input.type("二行目");
  await expect(input).toHaveValue("一行目\n二行目");
  await input.press("Enter");
  await expect(page.locator("[role=log]:visible").getByText("一行目")).toBeVisible();
  await expect(input).toHaveValue("");
});
