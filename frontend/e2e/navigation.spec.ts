import { expect, test } from "@playwright/test";

import { visible } from "./helpers";

test("ホームの質問欄は、他の画面へ行って戻ると空になる", async ({ page }) => {
  await page.goto("/");
  const input = visible(page).getByPlaceholder("思い出について質問する...");
  await input.fill("去年の夏、どこに出かけた?");
  await page.getByRole("navigation", { name: "メイン" }).first().getByRole("link", { name: "思い出を聞く" }).click();
  await page.waitForURL(/\/chat$/);
  await page.getByRole("navigation", { name: "メイン" }).first().getByRole("link", { name: "ホーム" }).click();
  await page.waitForURL(/\/$/);
  await expect(visible(page).getByPlaceholder("思い出について質問する...")).toHaveValue("");
});

test("チャットは、他の画面へ行って戻ると初期状態に戻る", async ({ page }) => {
  await page.goto("/chat");
  await visible(page).getByRole("button", { name: "はじめて歩いたのはいつ?" }).click();
  await expect(page.locator("[role=log]:visible").getByText("LLM_PROVIDER=openai")).toBeVisible();

  await page.getByRole("navigation", { name: "メイン" }).first().getByRole("link", { name: "日記" }).click();
  await page.waitForURL(/\/diary$/);
  await page.getByRole("navigation", { name: "メイン" }).first().getByRole("link", { name: "思い出を聞く" }).click();
  await page.waitForURL(/\/chat$/);

  await expect(page.locator("[role=log]")).toHaveCount(0);
  await expect(visible(page).getByRole("button", { name: "はじめて歩いたのはいつ?" })).toBeVisible();
  await expect(visible(page).getByLabel("質問")).toHaveValue("");
});
