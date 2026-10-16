import { expect, test } from "@playwright/test";

import { MARK, deleteMarkedEntries, visible } from "./helpers";

test.afterEach(async ({ request }) => {
  await deleteMarkedEntries(request);
});

test("ホームから投稿し、詳細で編集・削除できる", async ({ page }) => {
  await page.goto("/");
  const composer = visible(page).locator("form").filter({ hasText: "今日の出来事を記録する" });

  // 投稿(日付を変更して過去日に)
  await composer.getByRole("button", { name: "日付を変更" }).click();
  await composer.getByLabel("日付").fill("2026-10-10");
  await composer.getByLabel("今日の出来事を記録する").fill(`${MARK} 公園で息子と木の実を拾った。\n夕方は少し肌寒かった。`);
  await composer.getByRole("button", { name: "投稿する" }).click();
  await expect(composer.getByText("保存しました")).toBeVisible();
  await expect(visible(page).getByRole("link", { name: /木の実を拾った/ }).first()).toBeVisible();

  // 詳細へ
  await composer.getByRole("link", { name: "開く" }).click();
  await page.waitForURL(/\/diary\/[0-9a-f-]{36}$/);
  const detailUrl = page.url();
  const article = page.locator("article:visible");
  await expect(article.getByText("公園で息子と木の実を拾った")).toBeVisible();
  await expect(article.getByText("2026年10月10日(土)")).toBeVisible();

  // 編集
  await article.getByRole("button", { name: "編集" }).click();
  const form = page.locator("form:visible");
  await form.getByLabel("本文").fill(`${MARK} 公園で息子とどんぐりを拾った。`);
  await form.getByRole("button", { name: "更新する" }).click();
  await expect(page.locator("article:visible").getByText("どんぐりを拾った")).toBeVisible();

  // 一覧に反映(月見出しつき)
  await page.goto("/diary");
  await expect(visible(page).getByRole("link", { name: /どんぐりを拾った/ }).first()).toBeVisible();
  await expect(visible(page).getByRole("heading", { name: "2026年10月" }).first()).toBeVisible();

  // 削除 → 一覧へ → 404 表示
  await page.goto(detailUrl);
  await page.locator("article:visible").getByRole("button", { name: "削除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "削除する" }).click();
  await page.waitForURL(/\/diary$/);
  await page.goto(detailUrl);
  await expect(visible(page).getByText("この日記は見つかりませんでした")).toBeVisible();
});

test("本文が空のときは投稿できない", async ({ page }) => {
  await page.goto("/");
  const composer = visible(page).locator("form").filter({ hasText: "今日の出来事を記録する" });
  await expect(composer.getByRole("button", { name: "投稿する" })).toBeDisabled();
  await composer.getByLabel("今日の出来事を記録する").fill("   ");
  await expect(composer.getByRole("button", { name: "投稿する" })).toBeDisabled();
});
