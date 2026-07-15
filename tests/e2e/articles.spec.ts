import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"] as const;
const htmlLanguages = { zh: "zh-CN", en: "en", ja: "ja", ko: "ko", th: "th", fr: "fr", de: "de", vi: "vi" } as const;
const articleSlug = "getting-started-with-loops";

function staticTranslationLocales(slug: string) {
  return locales.filter((locale) => {
    const path = join(process.cwd(), "src", "content", "blog", locale, `${slug}.md`);
    if (!existsSync(path)) return false;
    const source = readFileSync(path, "utf8");
    return /^translationStatus:\s*"(?:reviewed|published)"\s*$/m.test(source);
  });
}

function articlePath(locale: (typeof locales)[number], slug: string) {
  return locale === "zh" ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
}

function staticPublishedSources(collection: "blog" | "favorites", locale = "zh") {
  const directory = join(process.cwd(), "src", "content", collection, locale);
  const statusField = collection === "blog" ? "translationStatus" : "publicationStatus";
  return readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readFileSync(join(directory, name), "utf8"))
    .filter((source) => new RegExp(`^${statusField}:\\s*"(?:reviewed|published)"\\s*$`, "m").test(source));
}

function staticPublishedCount(collection: "blog" | "favorites", locale = "zh") {
  return staticPublishedSources(collection, locale).length;
}

function staticPublishedCategories(locale = "zh") {
  return new Set(staticPublishedSources("blog", locale).map((source) => (
    source.match(/^category:\s*"([^"]+)"\s*$/m)?.[1]
  )).filter((category): category is string => Boolean(category)));
}

test("Blog index opens a static article with source and contents", async ({ page }) => {
  await page.goto("/blog");
  const expectedArticles = staticPublishedCount("blog");
  expect(expectedArticles).toBeGreaterThan(0);
  await expect(page.locator(".article-card")).toHaveCount(expectedArticles);
  const first = page.locator(".article-card h2 a").first();
  await first.click();
  await expect(page).toHaveURL(/\/blog\/[^/?#]+\/?$/);
  await expect(page.locator("article h1")).toHaveCount(1);
  await expect(page.locator(".article-content")).toBeVisible();
  await expect(page.locator(".article-meta a[href^='http']")).toHaveCount(1);
});

test("Blog category controls are localized, keyboard reachable, and preserve locale", async ({ page }) => {
  await page.goto("/blog");
  const filters = page.locator(".filter-row");
  const development = filters.getByRole("link", { name: "开发" });
  const developmentCards = page.locator('.article-card[data-category="development"]');
  const expectedCategories = staticPublishedCategories();

  expect(expectedCategories.size).toBeGreaterThan(0);
  await expect(filters.getByRole("link")).toHaveCount(expectedCategories.size + 1);
  const linkedCategories = await filters.getByRole("link").evaluateAll((links) => links
    .map((link) => new URL((link as HTMLAnchorElement).href).searchParams.get("category"))
    .filter((category): category is string => Boolean(category)));
  expect(new Set(linkedCategories)).toEqual(expectedCategories);
  for (const category of expectedCategories) {
    expect(await page.locator(`.article-card[data-category="${category}"]`).count()).toBeGreaterThan(0);
  }
  expect(await developmentCards.count()).toBeGreaterThan(0);
  await expect(development).toHaveAttribute("href", "/blog?category=development");
  await development.focus();
  await expect(development).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/blog\?category=development$/);
  await expect(development).toHaveAttribute("aria-current", "page");
  const visibleCategories = await page.locator(".article-card:visible").evaluateAll((cards) => (
    cards.map((card) => card.getAttribute("data-category"))
  ));
  expect(visibleCategories.length).toBeGreaterThan(0);
  expect(new Set(visibleCategories)).toEqual(new Set(["development"]));
});

test("article language menu only offers published translations", async ({ page }) => {
  const expectedLocales = staticTranslationLocales(articleSlug);
  expect(expectedLocales.length).toBeGreaterThan(0);
  await page.goto(articlePath(expectedLocales[0], articleSlug));
  await page.locator(".language-menu summary").click();
  const translations = page.locator(".language-menu__popover a");

  await expect(translations).toHaveCount(expectedLocales.length);
  const actualLanguages = await translations.evaluateAll((links) => links.map((link) => link.getAttribute("lang")));
  expect(new Set(actualLanguages)).toEqual(new Set(expectedLocales.map((locale) => htmlLanguages[locale])));
  for (const locale of expectedLocales) {
    const link = page.locator(`.language-menu__popover a[lang="${htmlLanguages[locale]}"]`);
    await expect(link).toHaveAttribute("href", articlePath(locale, articleSlug));
  }
  await expect(page.locator('.language-menu__popover a[aria-current="page"]')).toHaveCount(1);
});

test("split Agent pattern articles offer all locales and keep structural diagrams readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/blog/ai-agent-patterns");
  await page.locator(".language-menu summary").click();

  const translations = page.locator(".language-menu__popover a");
  await expect(translations).toHaveCount(locales.length);
  for (const locale of locales) {
    await expect(page.locator(`.language-menu__popover a[lang="${htmlLanguages[locale]}"]`))
      .toHaveAttribute("href", articlePath(locale, "ai-agent-patterns"));
  }

  const labels = [
    "协调 Agent",
    "共享黑板",
    "输入护栏",
    "搜索请求",
    "执行任务",
    "生产级工程层",
  ];

  for (const label of labels) {
    const diagram = page.locator(".article-content pre").filter({ hasText: label });
    await expect(diagram, label).toHaveCount(1);
    await expect(diagram, label).toHaveCSS("overflow-x", "auto");
  }

  const blackboard = page.locator(".article-content pre").filter({ hasText: "共享黑板" });
  const width = await blackboard.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(width.scrollWidth).toBeGreaterThan(width.clientWidth);

  for (const locale of locales) {
    await page.goto(articlePath(locale, "ai-agent-patterns"));
    const overview = page.locator(".article-content pre").nth(5);
    await expect(overview, locale).toHaveCount(1);
    const metrics = await overview.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(metrics.scrollWidth, `${locale}: pattern overview must not require horizontal scrolling`).toBeLessThanOrEqual(metrics.clientWidth);
  }

  await page.goto("/blog/ai-agent-engineering-patterns");
  const stateFlow = page.locator(".article-content pre").filter({ hasText: "[PLANNING]" });
  await expect(stateFlow).toHaveCount(1);
  const stateMetrics = await stateFlow.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(stateMetrics.scrollWidth).toBeLessThanOrEqual(stateMetrics.clientWidth);
});

test("Favorites entries link to their original sources", async ({ page }) => {
  await page.goto("/favorites");
  const items = page.locator(".favorite-item");
  const expectedFavorites = staticPublishedCount("favorites");
  expect(expectedFavorites).toBeGreaterThan(0);
  await expect(items).toHaveCount(expectedFavorites);

  for (const item of await items.all()) {
    const source = item.locator('a[href^="http"]');
    await expect(source).toHaveCount(1);
    await expect(source).toHaveAttribute("rel", /noopener/);
    await expect(source).toHaveAttribute("rel", /noreferrer/);
  }
});

test("category filters remain horizontally usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/blog");
  const filter = page.locator(".filter-row");
  await expect(filter).toBeVisible();
  const metrics = await filter.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth);
  await expect(filter).toHaveCSS("display", "flex");
  await expect(filter).toHaveCSS("overflow-x", "auto");
  await expect(filter.getByRole("link").first()).toHaveCSS("min-height", "44px");
});

for (const theme of ["light", "dark"] as const) {
  test(`mobile floating contents stay compact and navigate in ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
    await page.goto("/blog/loop-engineering");

    const desktopContents = page.locator(".article-toc--desktop");
    const trigger = page.locator("[data-mobile-toc-open]");
    const dialog = page.locator("[data-mobile-toc-dialog]");

    await expect(desktopContents).toBeHidden();
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveCSS("border-radius", "50%");
    await expect(trigger).toHaveCSS("width", "48px");
    await expect(trigger).toHaveCSS("height", "48px");
    const triggerMaterial = await trigger.evaluate((element) => {
      const style = getComputedStyle(element);
      const alpha = style.backgroundColor.match(/\/\s*([\d.]+)\)/)?.[1]
        ?? style.backgroundColor.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1];
      return {
        alpha: alpha ? Number(alpha) : 1,
        backgroundImage: style.backgroundImage,
        backdropFilter: style.backdropFilter !== "none"
          ? style.backdropFilter
          : style.getPropertyValue("-webkit-backdrop-filter"),
      };
    });
    expect(triggerMaterial.alpha).toBeGreaterThanOrEqual(0.18);
    expect(triggerMaterial.alpha).toBeLessThanOrEqual(0.26);
    expect(triggerMaterial.backgroundImage).toContain("linear-gradient");
    expect(triggerMaterial.backdropFilter).toContain("blur(32px)");

    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await expect(dialog.locator("[aria-current='location']")).toHaveCount(1);
    const material = await dialog.evaluate((element) => {
      const background = getComputedStyle(element).backgroundColor;
      const alpha = background.match(/\/\s*([\d.]+)\)/)?.[1]
        ?? background.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1];
      return { background, alpha: alpha ? Number(alpha) : 1 };
    });
    expect(material.alpha).toBeGreaterThanOrEqual(0.9);
    await expect(dialog.getByRole("link", { name: /Automations/ })).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(212, 216, 223)" : "rgb(63, 68, 77)",
    );

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

    await trigger.click();

    const target = dialog.getByRole("link", { name: /Skills/ });
    await expect(target).toBeVisible();
    const targetHash = await target.getAttribute("href");
    await target.click();

    await expect(dialog).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveCSS("outline-style", "none");
    expect(targetHash).toMatch(/^#.+/);
    await expect.poll(() => decodeURIComponent(new URL(page.url()).hash)).toBe(targetHash);
  });
}
