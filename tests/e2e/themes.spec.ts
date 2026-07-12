import { expect, test } from "@playwright/test";

test("theme toggle persists across reloads and pages", async ({ page }) => {
  await page.goto("/");
  const initial = await page.locator("html").getAttribute("data-theme");
  await page.locator("[data-theme-toggle]").click();
  const next = initial === "dark" ? "light" : "dark";
  await expect(page.locator("html")).toHaveAttribute("data-theme", next);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", next);
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", next);
});
