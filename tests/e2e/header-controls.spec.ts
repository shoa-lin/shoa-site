import { expect, test, type Page } from "@playwright/test";

// The main site header: theme toggle, language menu and mobile navigation (src/scripts/site-header.ts).

function iconOffset(page: Page, selector: string) {
  return page.locator(selector).evaluate((button) => {
    const box = button.getBoundingClientRect();
    const icon = [...button.querySelectorAll("svg")].find((svg) => svg.getBoundingClientRect().width > 0)!.getBoundingClientRect();
    return Math.max(
      Math.abs(icon.left + icon.width / 2 - (box.left + box.width / 2)),
      Math.abs(icon.top + icon.height / 2 - (box.top + box.height / 2)),
    );
  });
}

for (const theme of ["light", "dark"]) {
  test(`header icons sit in the centre of their buttons in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/about");
    expect(await iconOffset(page, "[data-theme-toggle]"), "theme toggle").toBeLessThanOrEqual(0.5);
    expect(await iconOffset(page, "[data-mobile-nav-open]"), "menu button").toBeLessThanOrEqual(0.5);
    await page.locator("[data-mobile-nav-open]").click();
    expect(await iconOffset(page, "[data-mobile-nav-close]"), "close button").toBeLessThanOrEqual(0.5);
  });
}

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("the language menu and the mobile menu close each other, each with a single tap", async ({ page }) => {
    await page.goto("/about");
    const languages = page.locator(".language-menu");
    const panel = page.locator("[data-mobile-nav-panel]");

    await page.locator(".language-menu summary").tap();
    await expect(languages).toHaveAttribute("open", "");
    await page.locator("[data-mobile-nav-open]").tap();
    await expect(panel).toBeVisible();
    await expect(languages).not.toHaveAttribute("open", "");

    await page.locator(".language-menu summary").tap();
    await expect(languages).toHaveAttribute("open", "");
    await expect(panel).toBeHidden();
  });

  test("a tap outside closes the open menu", async ({ page }) => {
    await page.goto("/about");
    // Empty header space between the brand and the buttons, outside both menus.
    const outside = { x: 170, y: 34 };
    await page.locator(".language-menu summary").tap();
    await page.touchscreen.tap(outside.x, outside.y);
    await expect(page.locator(".language-menu")).not.toHaveAttribute("open", "");

    await page.locator("[data-mobile-nav-open]").tap();
    await page.touchscreen.tap(outside.x, outside.y);
    await expect(page.locator("[data-mobile-nav-panel]")).toBeHidden();
    await expect(page.locator("[data-mobile-nav-open]")).toHaveAttribute("aria-expanded", "false");
  });

  test("the theme toggle works while the mobile menu is open", async ({ page }) => {
    await page.goto("/about");
    const initial = await page.locator("html").getAttribute("data-theme");
    await page.locator("[data-mobile-nav-open]").tap();
    await page.locator("[data-theme-toggle]").tap();
    await expect(page.locator("html")).toHaveAttribute("data-theme", initial === "dark" ? "light" : "dark");
    await expect(page.locator("[data-mobile-nav-panel]")).toBeHidden();
  });
});

test("Escape closes the language menu and returns focus to its button", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/about");
  const summary = page.locator(".language-menu summary");
  await summary.click();
  await expect(page.locator(".language-menu")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(page.locator(".language-menu")).not.toHaveAttribute("open", "");
  await expect(summary).toBeFocused();
});

test("the mobile menu closes when the layout grows past the mobile breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  await page.locator("[data-mobile-nav-open]").click();
  await expect(page.locator("[data-mobile-nav-panel]")).toBeVisible();
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(page.locator("[data-mobile-nav-panel]")).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/nav-open/);
});

test("the browser bar colour and native controls follow the chosen theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/about");
  const state = () => page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    barColours: [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((meta) => meta.content),
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  expect(await state()).toEqual({ theme: "light", barColours: ["#f7f8fa", "#f7f8fa"], colorScheme: "light" });
  await page.locator("[data-theme-toggle]").click();
  expect(await state()).toEqual({ theme: "dark", barColours: ["#111317", "#111317"], colorScheme: "dark" });
  await page.reload();
  expect(await state()).toEqual({ theme: "dark", barColours: ["#111317", "#111317"], colorScheme: "dark" });
});

test("without a saved choice the theme follows the system setting, also when it changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // Once the reader picks a theme, a later system change no longer overrides it.
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(200);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("the header still works when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});
