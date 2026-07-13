import { expect, test } from "@playwright/test";

const locales = [
  ["/", "zh-CN", "Noto Sans SC Variable"],
  ["/en/", "en", "Noto Sans Variable"],
  ["/ja/", "ja", "Noto Sans JP Variable"],
  ["/ko/", "ko", "Noto Sans KR Variable"],
  ["/th/", "th", "Noto Sans Thai Looped Variable"],
  ["/fr/", "fr", "Noto Sans Variable"],
] as const;

for (const [path, lang, fontFamily] of locales) {
  test(`${lang} home has localized metadata and controls`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("html")).toHaveCSS("font-family", new RegExp(fontFamily));
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"]')).toHaveCount(7);
    await expect(page.locator(".language-menu")).toBeVisible();
    await expect(page.locator("[data-theme-toggle]")).toBeVisible();

    const externalFontRequests = await page.evaluate(() => performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => /fonts\.(?:googleapis|gstatic)\.com/i.test(url)));
    expect(externalFontRequests).toEqual([]);
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
