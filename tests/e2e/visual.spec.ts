import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const widths = [320, 390, 768, 1024, 1440] as const;
const themes = ["light", "dark"] as const;
const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"] as const;
type Locale = (typeof locales)[number];

const corePages = [
  { name: "home", suffix: "/" },
  { name: "about", suffix: "/about" },
  { name: "blog", suffix: "/blog" },
  { name: "favorites", suffix: "/favorites" },
  { name: "contact", suffix: "/contact" },
] as const;

function localizedPath(locale: Locale, suffix: string) {
  if (locale === "zh") return suffix;
  return suffix === "/" ? `/${locale}/` : `/${locale}${suffix}`;
}

function longestLocalizedPage(locale: Locale) {
  const dictionary = JSON.parse(readFileSync(join(process.cwd(), "src", "i18n", `${locale}.json`), "utf8"));
  const candidates = [
    { name: "home", path: localizedPath(locale, "/"), title: dictionary.home.greeting },
    { name: "about", path: localizedPath(locale, "/about"), title: dictionary.about.title },
    { name: "blog", path: localizedPath(locale, "/blog"), title: dictionary.blog.title },
    { name: "favorites", path: localizedPath(locale, "/favorites"), title: dictionary.favorites.title },
    { name: "contact", path: localizedPath(locale, "/contact"), title: dictionary.contact.title },
  ];
  return candidates.reduce((longest, candidate) => (
    [...candidate.title].length > [...longest.title].length ? candidate : longest
  ));
}

const longestPages = Object.fromEntries(locales.map((locale) => [locale, longestLocalizedPage(locale)])) as Record<Locale, ReturnType<typeof longestLocalizedPage>>;

async function gotoSuccessful(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `${path} returned HTTP ${response?.status() ?? "no response"}`).toBe(true);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function collectPublishedArticlePaths(page: Page, locale: Locale) {
  await gotoSuccessful(page, localizedPath(locale, "/blog"));
  const paths = await page.locator(".article-card:visible h2 a").evaluateAll((links) => (
    links.map((link) => new URL((link as HTMLAnchorElement).href).pathname)
  ));
  return [...new Set(paths)];
}

function staticPublishedArticlePaths(locale: Locale) {
  const directory = join(process.cwd(), "src", "content", "blog", locale);
  return readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .filter((name) => /^translationStatus:\s*"(?:reviewed|published)"\s*$/m
      .test(readFileSync(join(directory, name), "utf8")))
    .map((name) => localizedPath(locale, `/blog/${name.slice(0, -3)}`))
    .sort();
}

async function expectLayoutFits(page: Page, label: string) {
  const layout = await page.evaluate(() => {
    const interactiveSelector = [
      "a[href]",
      "button:not([disabled])",
      "summary",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[contenteditable='true']",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const meaningfulSelector = [
      interactiveSelector,
      "p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "dt", "dd", "blockquote", "figcaption", "label",
      ".article-card", ".favorite-item", ".contact-list > a", ".site-header__inner", ".site-header__tools",
      ".article-meta", ".page-intro", ".article-content", ".article-toc", "img", "table",
    ].join(",");
    const describe = (element: Element) => {
      const id = element.id ? `#${element.id}` : "";
      const classes = [...element.classList].slice(0, 3).map((name) => `.${name}`).join("");
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    const isVisuallyHidden = (element: Element) => {
      if (element.closest("[hidden], [inert]") || element.matches(".visually-hidden, .sr-only")) return true;
      if (element.closest("details:not([open])") && !element.closest("summary")) return true;
      if (element.matches(".skip-link") && !element.matches(":focus-visible")) return true;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const legacyClip = style.getPropertyValue("clip");
      const clipped = style.clipPath !== "none" || (legacyClip !== "auto" && legacyClip !== "rect(auto, auto, auto, auto)");
      return style.display === "none" || style.visibility === "hidden" || style.opacity === "0" || rect.width <= 0 || rect.height <= 0
        || (clipped && rect.width <= 2 && rect.height <= 2);
    };
    const allowsHorizontalOverflow = (element: Element) => {
      if (element.closest("pre, code, .filter-row, [data-allow-horizontal-scroll]")) return true;
      for (let current: Element | null = element; current; current = current.parentElement) {
        const overflow = getComputedStyle(current).overflowX;
        if (overflow === "auto" || overflow === "scroll") return true;
      }
      return false;
    };

    const meaningfulElements = [...document.querySelectorAll(meaningfulSelector)]
      .filter((element) => !isVisuallyHidden(element) && !allowsHorizontalOverflow(element));
    const clippedContent = meaningfulElements.flatMap((element) => (
      element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 4
        ? [`${describe(element)}: ${element.clientWidth}/${element.scrollWidth}`]
        : []
    ));
    const boundaryOverflow = meaningfulElements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1
        ? [`${describe(element)}: ${rect.left}/${rect.right}`]
        : [];
    });

    const controls = [...document.querySelectorAll(interactiveSelector)]
      .filter((element) => !isVisuallyHidden(element))
      .map((element) => ({ element, rects: [...element.getClientRects()] }));
    const interactiveOverlaps: string[] = [];
    for (let left = 0; left < controls.length; left += 1) {
      for (let right = left + 1; right < controls.length; right += 1) {
        const a = controls[left];
        const b = controls[right];
        if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
        if (a.element.matches("[data-allow-interactive-overlay]") || b.element.matches("[data-allow-interactive-overlay]")) continue;
        const overlaps = a.rects.some((aRect) => b.rects.some((bRect) => {
          const overlapX = Math.min(aRect.right, bRect.right) - Math.max(aRect.left, bRect.left);
          const overlapY = Math.min(aRect.bottom, bRect.bottom) - Math.max(aRect.top, bRect.top);
          return overlapX > 1 && overlapY > 1;
        }));
        if (overlaps) interactiveOverlaps.push(`${describe(a.element)} / ${describe(b.element)}`);
      }
    }

    return {
      rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clippedContent,
      boundaryOverflow,
      interactiveOverlaps,
    };
  });

  expect(layout.rootOverflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(1);
  expect(layout.clippedContent, `${label}: clipped text or control containers`).toEqual([]);
  expect(layout.boundaryOverflow, `${label}: elements outside viewport bounds`).toEqual([]);
  expect(layout.interactiveOverlaps, `${label}: overlapping interactive controls`).toEqual([]);
}

async function expectTypographyFits(page: Page, label: string) {
  const clippedText = await page.evaluate(() => {
    const selectors = [
      ".home-hero__copy h1", ".page-intro h1", ".article-header h1", ".article-card h2",
      ".article-content h2", ".article-content h3", ".article-content p",
    ].join(",");
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`;

    return [...document.querySelectorAll(selectors)]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none"
          && style.visibility !== "hidden"
          && ["hidden", "clip"].includes(style.overflowY)
          && rect.width > 0
          && rect.height > 0;
      })
      .flatMap((element) => element.scrollHeight > element.clientHeight + 2
        ? [`${describe(element)}: ${element.clientHeight}/${element.scrollHeight}`]
        : []);
  });

  expect(clippedText, `${label}: vertically clipped typography`).toEqual([]);
}

for (const width of widths) {
  for (const theme of themes) {
    test(`${width}px ${theme} core page matrix fits all locales`, async ({ page }) => {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
      for (const locale of locales) {
        for (const corePage of corePages) {
          const path = localizedPath(locale, corePage.suffix);
          await gotoSuccessful(page, path);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("h1")).toHaveCount(1);
          await expectLayoutFits(page, `${locale}/${corePage.name}/${theme}/${width}`);
          await expectTypographyFits(page, `${locale}/${corePage.name}/${theme}/${width}`);
        }
      }
    });
  }
}

for (const theme of themes) {
  test(`longest localized page titles fit every width in ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
    for (const width of widths) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      for (const locale of locales) {
        const longest = longestPages[locale];
        await gotoSuccessful(page, longest.path);
        await expect(page.locator("h1")).toHaveText(longest.title);
        await expectLayoutFits(page, `${locale}/${longest.name}/longest-page/${theme}/${width}`);
        await expectTypographyFits(page, `${locale}/${longest.name}/longest-page/${theme}/${width}`);
      }
    }
  });
}

test("home portrait remains circular at every responsive width", async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await gotoSuccessful(page, "/");
    const portrait = page.locator(".home-hero__portrait img");
    const dimensions = await portrait.evaluate((image) => {
      const rect = image.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    expect(dimensions.width, `${width}px portrait width`).toBeCloseTo(dimensions.height, 0);
    await expect(portrait).toHaveCSS("border-radius", "50%");
  }
});

for (const width of [320, 390] as const) {
  test(`${width}px home hero centers its portrait, copy, and contact links`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await gotoSuccessful(page, "/");

    await expect(page.locator(".home-hero__portrait")).toHaveCSS("justify-self", "center");
    await expect(page.locator(".home-hero__copy")).toHaveCSS("text-align", "center");
    await expect(page.locator(".inline-links")).toHaveCSS("justify-content", "center");

    const linkGroup = await page.locator(".inline-links").evaluate((element) => {
      const links = [...element.querySelectorAll("a")].map((link) => link.getBoundingClientRect());
      return {
        left: Math.min(...links.map((rect) => rect.left)),
        right: Math.max(...links.map((rect) => rect.right)),
        viewport: window.innerWidth,
      };
    });
    expect((linkGroup.left + linkGroup.right) / 2).toBeCloseTo(linkGroup.viewport / 2, 0);
  });
}

for (const theme of themes) {
  test(`mobile header tool hovers share the same surface treatment in ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
    await gotoSuccessful(page, "/about");

    const controls = [
      page.locator(".language-menu summary"),
      page.locator("[data-theme-toggle]"),
      page.locator("[data-mobile-nav-open]"),
    ];
    const hoverStyles = [];
    for (const control of controls) {
      await control.hover();
      hoverStyles.push(await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return { backgroundColor: style.backgroundColor, borderColor: style.borderColor };
      }));
    }

    expect(hoverStyles).toEqual([hoverStyles[0], hoverStyles[0], hoverStyles[0]]);
  });
}

for (const locale of locales) {
  for (const theme of themes) {
    test(`${locale} published articles fit every width in ${theme} theme`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
      const articlePaths = staticPublishedArticlePaths(locale);
      const linkedArticlePaths = (await collectPublishedArticlePaths(page, locale)).sort();
      expect(articlePaths.length, `${locale} publishable articles`).toBeGreaterThan(0);
      expect(linkedArticlePaths, `${locale} Blog index article paths`).toEqual(articlePaths);
      for (const width of widths) {
        await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
        for (const articlePath of articlePaths) {
          await gotoSuccessful(page, articlePath);
          await expect(page.locator(".article-header h1")).toHaveCount(1);
          await expectLayoutFits(page, `${locale}/${articlePath}/${theme}/${width}`);
          await expectTypographyFits(page, `${locale}/${articlePath}/${theme}/${width}`);
        }
      }
    });
  }
}
