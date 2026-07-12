import { expect, test } from "@playwright/test";

const locales = [
  ["/", "zh-CN"],
  ["/en/", "en"],
  ["/ja/", "ja"],
  ["/ko/", "ko"],
  ["/th/", "th"],
  ["/fr/", "fr"],
] as const;

for (const [path, lang] of locales) {
  test(`${lang} home has localized metadata and controls`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"]')).toHaveCount(7);
    await expect(page.locator(".language-menu")).toBeVisible();
    await expect(page.locator("[data-theme-toggle]")).toBeVisible();
  });
}

test("language menu switches locale while preserving the current page", async ({ page }) => {
  await page.goto("/about");
  await page.locator(".language-menu summary").click();
  await page.locator('.language-menu__popover a[lang="en"]').click();

  await expect(page).toHaveURL(/\/en\/about\/?$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.language-menu__popover a[lang="en"]')).toHaveAttribute("aria-current", "page");
});
