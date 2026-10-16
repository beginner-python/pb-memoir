import { expect, test } from "@playwright/test";

const PAGES = ["/", "/diary", "/chat"];

for (const path of PAGES) {
  test(`スマホ幅で横スクロールが出ない: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    // 下部ナビが見える
    await expect(page.getByRole("navigation", { name: "メイン" }).last()).toBeVisible();
  });
}
