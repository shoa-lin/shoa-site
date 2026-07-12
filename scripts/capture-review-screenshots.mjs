import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4321";
const artifacts = fileURLToPath(new URL("../artifacts/", import.meta.url));
const output = join(artifacts, "visual-review");
const temporaryOutput = join(artifacts, `.visual-review-${process.pid}.tmp`);
const backupOutput = join(artifacts, `.visual-review-${process.pid}.bak`);
const coreRoutes = {
  zh: [["home", "/"], ["about", "/about"], ["blog", "/blog"], ["favorites", "/favorites"], ["contact", "/contact"]],
  en: [["home", "/en/"], ["about", "/en/about"], ["blog", "/en/blog"], ["favorites", "/en/favorites"], ["contact", "/en/contact"]],
  ja: [["home", "/ja/"], ["about", "/ja/about"], ["blog", "/ja/blog"], ["favorites", "/ja/favorites"], ["contact", "/ja/contact"]],
  ko: [["home", "/ko/"], ["about", "/ko/about"], ["blog", "/ko/blog"], ["favorites", "/ko/favorites"], ["contact", "/ko/contact"]],
  th: [["home", "/th/"], ["about", "/th/about"], ["blog", "/th/blog"], ["favorites", "/th/favorites"], ["contact", "/th/contact"]],
  fr: [["home", "/fr/"], ["about", "/fr/about"], ["blog", "/fr/blog"], ["favorites", "/fr/favorites"], ["contact", "/fr/contact"]],
};
const viewports = [
  { name: "320", width: 320, height: 844 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "1440", width: 1440, height: 1000 },
];

rmSync(temporaryOutput, { recursive: true, force: true });
rmSync(backupOutput, { recursive: true, force: true });

async function gotoSuccessful(page, path) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "load" });
  if (!response?.ok()) {
    throw new Error(`${path} returned HTTP ${response?.status() ?? "no response"}`);
  }
}

async function discoverArticlePath(page, locale, paths) {
  const blogPath = paths.find(([name]) => name === "blog")?.[1];
  if (!blogPath) throw new Error(`${locale} has no Blog route configured`);
  await gotoSuccessful(page, blogPath);
  const href = await page.locator(".article-card:visible h2 a").first().getAttribute("href");
  if (!href) throw new Error(`${locale} Blog index has no publishable article`);
  const url = new URL(href, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) throw new Error(`${locale} article link is not local: ${href}`);
  return `${url.pathname}${url.search}`;
}

const browser = await chromium.launch();
let captured = 0;
let promoted = false;
try {
  const preflightContext = await browser.newContext();
  const preflightPage = await preflightContext.newPage();
  const routes = {};
  for (const [locale, paths] of Object.entries(coreRoutes)) {
    const articlePath = await discoverArticlePath(preflightPage, locale, paths);
    routes[locale] = [...paths, ["article", articlePath]];
    for (const [, path] of routes[locale]) await gotoSuccessful(preflightPage, path);
  }
  await preflightContext.close();

  for (const [locale, paths] of Object.entries(routes)) {
    for (const theme of ["light", "dark"]) {
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport });
        await context.addInitScript((value) => localStorage.setItem("shoa-theme", value), theme);
        const page = await context.newPage();
        const directory = join(temporaryOutput, locale, theme, viewport.name);
        mkdirSync(directory, { recursive: true });
        for (const [name, path] of paths) {
          await gotoSuccessful(page, path);
          await page.screenshot({ path: join(directory, `${name}.png`), fullPage: true });
          captured += 1;
        }
        await context.close();
      }
    }
  }

  const expected = Object.values(routes).reduce((total, paths) => total + paths.length, 0)
    * 2 * viewports.length;
  if (captured !== expected) throw new Error(`Expected ${expected} screenshots, captured ${captured}`);

  if (existsSync(output)) renameSync(output, backupOutput);
  try {
    renameSync(temporaryOutput, output);
    promoted = true;
    rmSync(backupOutput, { recursive: true, force: true });
  } catch (error) {
    if (existsSync(backupOutput)) renameSync(backupOutput, output);
    throw error;
  }
} finally {
  await browser.close();
  if (!promoted) rmSync(temporaryOutput, { recursive: true, force: true });
}

console.log(`Screenshots saved to artifacts/visual-review (${captured} files).`);
