import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const routes = [
  ["Home", "/"],
  ["About", "/about"],
  ["Blog", "/blog"],
  ["article", "/blog/getting-started-with-loops"],
  ["Favorites", "/favorites"],
  ["Contact", "/contact"],
  ["404", "/404"],
] as const;

for (const theme of ["light", "dark"] as const) {
  for (const [name, route] of routes) {
    test(`${name} has no serious accessibility violations in ${theme} theme`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}

const focusRoutes = [
  ["Home", "/"],
  ["Blog", "/blog"],
  ["article", "/blog/getting-started-with-loops"],
] as const;
const focusViewports = [
  { name: "desktop", width: 1024, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function markVisibleFocusableElements(page: Page) {
  return page.evaluate(() => {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "summary",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[contenteditable='true']",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const elements = [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
      if (element.closest("[hidden], [inert]")) return false;
      const closedDetails = element.closest("details:not([open])");
      if (closedDetails && element.tagName !== "SUMMARY") return false;
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0 && element.tabIndex >= 0;
    });
    elements.forEach((element, index) => element.dataset.e2eFocusIndex = String(index));
    return elements.length;
  });
}

async function expectCompleteFocusOrder(page: Page) {
  const focusableCount = await markVisibleFocusableElements(page);
  expect(focusableCount).toBeGreaterThan(4);

  for (let index = 0; index < focusableCount; index += 1) {
    await page.keyboard.press("Tab");
    const target = page.locator(`[data-e2e-focus-index="${index}"]`);
    await expect(target).toBeFocused();
    await expect.poll(() => target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    })).toBe(true);
    expect(await target.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  }

  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.locator('[data-e2e-focus-index="0"]')).toBeFocused();
}

for (const [name, route] of focusRoutes) {
  for (const viewport of focusViewports) {
    test(`${name} follows complete focus order on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(route);
      const mobileTrigger = page.locator("[data-mobile-nav-open]");
      const mobilePanel = page.locator("[data-mobile-nav-panel]");
      if (viewport.name === "mobile") {
        await expect(mobileTrigger).toBeVisible();
        await expect(mobilePanel).toBeHidden();
      } else {
        await expect(mobileTrigger).toBeHidden();
      }
      await expectCompleteFocusOrder(page);
    });
  }
}

test("mobile navigation traps focus and restores it to the trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.locator("[data-mobile-nav-open]");
  const panel = page.locator("[data-mobile-nav-panel]");
  const closeButton = page.locator("[data-mobile-nav-close]");
  const lastLink = panel.locator("a").last();

  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

async function expectReducedMotionState(page: Page, state: string) {
  const result = await page.evaluate(() => {
    const toSeconds = (value: string) => value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
    const timings = (value: string) => value.split(",").map((part) => toSeconds(part.trim())).filter(Number.isFinite);
    const elements = [document.documentElement, document.body, ...document.querySelectorAll<HTMLElement>("body *")];
    const offenders = elements.flatMap((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return [];
      const longest = Math.max(
        0,
        ...timings(style.transitionDuration),
        ...timings(style.transitionDelay),
        ...timings(style.animationDuration),
        ...timings(style.animationDelay),
      );
      return longest > 0.001 ? [`${element.tagName.toLowerCase()}.${element.className}: ${longest}s`] : [];
    });
    return { scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior, offenders };
  });

  expect(result.scrollBehavior, `${state}: scroll behavior`).toBe("auto");
  expect(result.offenders, `${state}: long motion`).toEqual([]);
}

test("Home limits motion with the language menu open", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/");
  await expectReducedMotionState(page, "Home baseline");
  await page.locator(".language-menu summary").click();
  await expect(page.locator(".language-menu")).toHaveAttribute("open", "");
  await expectReducedMotionState(page, "Home language menu open");
});

test("Blog limits motion while the mobile navigation opens and closes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog");
  await expectReducedMotionState(page, "Blog mobile baseline");
  const trigger = page.locator("[data-mobile-nav-open]");
  const panel = page.locator("[data-mobile-nav-panel]");
  await trigger.click();
  await expect(panel).toBeVisible();
  await expectReducedMotionState(page, "Blog mobile navigation open");
  await page.locator("[data-mobile-nav-close]").click();
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await expectReducedMotionState(page, "Blog mobile navigation closed");
});

test("article limits motion when the theme changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/blog/getting-started-with-loops");
  await expectReducedMotionState(page, "article baseline");
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  const nextTheme = initialTheme === "dark" ? "light" : "dark";
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", nextTheme);
  await expectReducedMotionState(page, "article theme changed");
});
