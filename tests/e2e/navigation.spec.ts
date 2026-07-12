import { expect, test } from "@playwright/test";

test("desktop navigation and contact channels work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "主要导航" }).getByRole("link", { name: "关于" }).click();
  await expect(page).toHaveURL(/\/about\/?$/);
  await page.goto("/contact");
  await expect(page.locator('.contact-list a[href="mailto:shoa_lin@outlook.com"]')).toHaveCount(1);
  await expect(page.locator('.contact-list a[href="https://x.com/pand_lin"]')).toHaveCount(1);
});

test("mobile navigation traps focus and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "打开导航" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const navigation = page.getByRole("navigation", { name: "移动端导航" });
  const closeButton = page.getByRole("button", { name: "关闭导航" });
  const lastLink = navigation.getByRole("link").last();
  await expect(navigation).toBeVisible();
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await expect(page.locator("body")).toHaveClass(/nav-open/);
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/nav-open/);
});

test("custom 404 is served for unknown pages", async ({ page }) => {
  const response = await page.goto("/missing-page-for-playwright");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("main a[href='/']")).toBeVisible();
});

test("projects navigation and routes remain absent", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('a[href*="/projects"]')).toHaveCount(0);

  for (const route of ["/projects", "/en/projects", "/fr/projects/example"]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
  }
});
