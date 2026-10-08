#!/usr/bin/env node
// Comic publishing helper. A comic is a folder src/comics/<id>/ holding comic.json and one
// complete HTML file per edition (<locale>.html). The site wraps those files at build time.
//
//   npm run comic -- add <file.html> --id <slug> [--locale zh] [--title ...] [--description ...]
//                        [--date YYYY-MM-DD] [--assets <dir>] [--draft]
//   npm run comic -- fonts <id> [--locale xx]   self-host and subset the edition's Google Fonts
//   npm run comic -- cover <id> [--locale xx]   render cover images for the list and link previews
//   npm run comic -- check [<id>]               validate sources, metadata, fonts and covers
//
// Steps that need the network (Google Fonts) run only here, never during the site build.
import { chromium } from "@playwright/test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import subsetFont from "subset-font";
import { SYSTEM_TEXT_FAMILIES, cleanComicSource, googleFontRequests, lintComicHtml, parseComicHtml } from "../src/lib/comic-html.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const comicsDir = join(root, "src", "comics");
const publicComicsDir = join(root, "public", "comics");
const fontCacheDir = join(root, "node_modules", ".cache", "comic-fonts");
const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"];
const htmlLang = { zh: "zh-CN", en: "en", ja: "ja", ko: "ko", th: "th", fr: "fr", de: "de", vi: "vi" };
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PREVIEW_ORIGIN = "http://comic.preview";
// Google Fonts answers browsers it does not recognise with complete TTF files, which we subset.
const FONT_FETCH_UA = "Mozilla/5.0";
// Always kept in a subset so small dynamic labels and punctuation still render.
const BASE_GLYPHS = `${Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("")}‘’“”–—…·•«»©®™°×→←↑↓✓★、。，．：；！？「」『』（）《》〈〉【】`;
const MIME = { ".woff2": "font/woff2", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".json": "application/json" };

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

const rel = (path) => relative(root, path);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const metaPath = (id) => join(comicsDir, id, "comic.json");
const editionPath = (id, locale) => join(comicsDir, id, `${locale}.html`);
const fontCssPath = (id, locale) => join(comicsDir, id, "fonts", `${locale}.css`);

function localeFromLang(lang) {
  const primary = String(lang ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return locales.includes(primary) ? primary : undefined;
}

function readMeta(id) {
  return JSON.parse(readFileSync(metaPath(id), "utf8"));
}

function writeMeta(id, meta) {
  const ordered = {
    publishedAt: meta.publishedAt,
    updatedAt: meta.updatedAt,
    sourceLocale: meta.sourceLocale,
    ...(meta.draft ? { draft: true } : {}),
    editions: Object.fromEntries(locales.filter((locale) => meta.editions[locale]).map((locale) => [locale, meta.editions[locale]])),
  };
  writeFileSync(metaPath(id), `${JSON.stringify(ordered, null, 2)}\n`);
}

function editionLocales(id, only) {
  if (only) return [only];
  return locales.filter((locale) => existsSync(editionPath(id, locale)));
}

function comicIds() {
  if (!existsSync(comicsDir)) return [];
  return readdirSync(comicsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(comicsDir, entry.name, "comic.json")))
    .map((entry) => entry.name)
    .sort();
}

function plainText(html) {
  return html
    .replace(/<(script|style|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentences(html, limit = 110) {
  const text = plainText(html);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const end = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf(". "), cut.lastIndexOf("！"), cut.lastIndexOf("？"));
  return end > limit * 0.5 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

function stripSiteSuffix(title) {
  return title.replace(/\s*[|·]\s*Shoa Lin\s*$/i, "").trim();
}

function attributes(record) {
  return Object.entries(record).map(([name, value]) => ` ${name}="${String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`).join("");
}

/** A browser page that serves the comic preview and files under public/comics/. */
async function previewPage(browser, id, html, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === PREVIEW_ORIGIN) {
      if (url.pathname === `/comics/${id}/`) return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
      const file = join(root, "public", decodeURIComponent(url.pathname));
      if (url.pathname.startsWith("/comics/") && existsSync(file)) {
        return route.fulfill({ status: 200, contentType: MIME[extname(file).toLowerCase()] ?? "application/octet-stream", body: readFileSync(file) });
      }
      return route.fulfill({ status: 404, body: "" });
    }
    if (/^fonts\.(?:googleapis|gstatic)\.com$/i.test(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.goto(`${PREVIEW_ORIGIN}/comics/${id}/`, { waitUntil: "load", timeout: 60_000 });
  return page;
}

/** Characters each font family actually renders on the page (text, pseudo-elements, placeholders). */
async function glyphsByFamily(browser, id, html) {
  const page = await previewPage(browser, id, html, { width: 1280, height: 900 });
  await page.waitForTimeout(800);
  const usage = await page.evaluate(() => {
    const families = {};
    const add = (fontFamily, text) => {
      if (!text) return;
      for (const part of fontFamily.split(",")) {
        const name = part.trim().replace(/^["']|["']$/g, "").toLowerCase();
        if (!name) continue;
        families[name] ??= new Set();
        for (const character of text) families[name].add(character);
      }
    };
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE"].includes(element.tagName)) continue;
      add(getComputedStyle(element).fontFamily, node.nodeValue);
    }
    for (const element of document.querySelectorAll("*")) {
      for (const pseudo of ["::before", "::after", "::marker"]) {
        const style = getComputedStyle(element, pseudo);
        const strings = [...(style.content ?? "").matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]);
        if (strings.length) add(style.fontFamily, strings.join(""));
      }
      if ("placeholder" in element && element.placeholder) add(getComputedStyle(element).fontFamily, element.placeholder);
    }
    return Object.fromEntries(Object.entries(families).map(([name, set]) => [name, [...set].join("")]));
  });
  await page.close();
  return usage;
}

function mergeRequests(requests) {
  const byFamily = new Map();
  for (const request of requests) {
    const previous = byFamily.get(request.family);
    if (!previous) {
      byFamily.set(request.family, { ...request });
      continue;
    }
    const weights = (axes) => (/^wght@([\d;]+)$/.exec(axes)?.[1] ?? (axes ? "" : "400")).split(";").filter(Boolean);
    const merged = [...new Set([...weights(previous.axes), ...weights(request.axes)])].sort();
    if (merged.length && (/^wght@/.test(previous.axes) || !previous.axes) && (/^wght@/.test(request.axes) || !request.axes)) {
      previous.axes = `wght@${merged.join(";")}`;
    }
  }
  return [...byFamily.values()];
}

async function fetchFaces(requests) {
  const query = requests.map((request) => `family=${encodeURIComponent(request.family).replace(/%20/g, "+")}${request.axes ? `:${request.axes}` : ""}`).join("&");
  const response = await fetch(`https://fonts.googleapis.com/css2?${query}&display=swap`, { headers: { "User-Agent": FONT_FETCH_UA } });
  if (!response.ok) throw new Error(`Google Fonts returned HTTP ${response.status} for ${query}`);
  const css = await response.text();
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, block]) => ({
    family: /font-family:\s*['"]?([^;'"]+)['"]?/.exec(block)?.[1]?.trim(),
    style: /font-style:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? "normal",
    weight: /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? "400",
    url: /src:\s*url\(([^)]+)\)/.exec(block)?.[1]?.trim(),
  })).filter((face) => face.family && face.url);
}

async function download(url) {
  mkdirSync(fontCacheDir, { recursive: true });
  const cached = join(fontCacheDir, url.replace(/^https?:\/\//, "").replace(/[^a-z0-9.]+/gi, "_"));
  if (existsSync(cached)) return readFileSync(cached);
  const response = await fetch(url, { headers: { "User-Agent": FONT_FETCH_UA } });
  if (!response.ok) throw new Error(`font download failed (HTTP ${response.status}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(cached, buffer);
  return buffer;
}

async function buildFonts(id, only) {
  const browser = await chromium.launch();
  try {
    for (const locale of editionLocales(id, only)) {
      const html = readFileSync(editionPath(id, locale), "utf8");
      const requested = mergeRequests(parseComicHtml(html).googleFontUrls.flatMap(googleFontRequests));
      const requests = requested.filter((request) => !SYSTEM_TEXT_FAMILIES.test(request.family));
      const skipped = requested.filter((request) => SYSTEM_TEXT_FAMILIES.test(request.family)).map((request) => request.family);
      if (!requests.length) {
        console.log(`${id}/${locale}: no web fonts to self-host${skipped.length ? ` (system fonts used for ${skipped.join(", ")})` : ""}`);
        if (existsSync(fontCssPath(id, locale))) console.log(`  note: ${rel(fontCssPath(id, locale))} is no longer needed and can be deleted`);
        continue;
      }
      let faces;
      try {
        faces = await fetchFaces(requests);
      } catch (error) {
        console.warn(`${id}/${locale}: could not reach Google Fonts (${error.message}); the page will load them without blocking instead`);
        continue;
      }
      const usage = await glyphsByFamily(browser, id, html);
      const outDir = join(publicComicsDir, id, "fonts", locale);
      mkdirSync(outDir, { recursive: true });
      const rules = [];
      console.log(`${id}/${locale}: self-hosting ${requests.map((request) => request.family).join(", ")}${skipped.length ? `; system fonts for ${skipped.join(", ")}` : ""}`);
      for (const face of faces) {
        const used = usage[face.family.toLowerCase()] ?? "";
        if (!used.trim()) continue;
        const text = [...new Set([...BASE_GLYPHS, ...used, ...used.toUpperCase(), ...used.toLowerCase()])].join("");
        const woff2 = await subsetFont(await download(face.url), text, { targetFormat: "woff2" });
        const name = `${slug(face.family)}-${face.weight.replace(/\s+/g, "-")}${face.style === "italic" ? "-italic" : ""}.woff2`;
        writeFileSync(join(outDir, name), woff2);
        rules.push(`@font-face{font-family:${JSON.stringify(face.family)};font-style:${face.style};font-weight:${face.weight};font-display:swap;src:url(/comics/${id}/fonts/${locale}/${name}) format("woff2")}`);
        console.log(`  ${face.family} ${face.weight}${face.style === "italic" ? " italic" : ""}: ${[...new Set(used)].length} characters, ${kb(woff2.length)}`);
      }
      mkdirSync(dirname(fontCssPath(id, locale)), { recursive: true });
      writeFileSync(
        fontCssPath(id, locale),
        `/* Generated by scripts/comics.mjs; rerun "npm run comic -- fonts ${id} --locale ${locale}" after editing ${locale}.html. */\n${rules.join("\n")}\n`,
      );
    }
  } finally {
    await browser.close();
  }
}

/** The edition as the site shows it, without the site header and footer. */
function previewDocument(id, locale) {
  const html = readFileSync(editionPath(id, locale), "utf8");
  const fontCss = existsSync(fontCssPath(id, locale)) ? readFileSync(fontCssPath(id, locale), "utf8") : "";
  const doc = parseComicHtml(html, { hasLocalFonts: Boolean(fontCss.includes("@font-face")), assetBase: `/comics/${id}/assets/` });
  return `<!doctype html><html lang="${htmlLang[locale]}"${attributes(doc.htmlAttrs)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fontCss}</style>${doc.head}</head><body${attributes(doc.bodyAttrs)}>${doc.body}</body></html>`;
}

async function buildCovers(id, only) {
  const browser = await chromium.launch();
  try {
    const outDir = join(publicComicsDir, id, "covers");
    mkdirSync(outDir, { recursive: true });
    for (const locale of editionLocales(id, only)) {
      const page = await previewPage(browser, id, previewDocument(id, locale), { width: 1200, height: 630 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.waitForTimeout(1800);
      const png = await page.screenshot({ type: "png" });
      await page.close();
      const jpg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      const webp = await sharp(png).resize({ width: 960 }).webp({ quality: 80 }).toBuffer();
      writeFileSync(join(outDir, `${locale}.jpg`), jpg);
      writeFileSync(join(outDir, `${locale}.webp`), webp);
      console.log(`${id}/${locale}: cover ${kb(webp.length)} (list), ${kb(jpg.length)} (link preview)`);
    }
  } finally {
    await browser.close();
  }
}

async function add(args) {
  const file = args._[0];
  if (!file || !existsSync(file)) fail("usage: npm run comic -- add <file.html> --id <slug> [--locale zh]");
  const id = args.id;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) fail("--id must be lowercase letters/digits joined by hyphens, for example gpt-6-astra");
  const raw = readFileSync(file, "utf8");
  const { html, removed } = cleanComicSource(raw);
  const lang = typeof args.locale === "string" ? args.locale : /<html[^>]*\slang=["']?([\w-]+)/i.exec(raw)?.[1];
  const locale = localeFromLang(lang);
  if (!locale) fail(`cannot tell the edition language from lang="${lang ?? ""}"; pass --locale (${locales.join(", ")})`);
  if (typeof args.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) fail("--date must look like 2026-10-08");

  mkdirSync(join(comicsDir, id), { recursive: true });
  writeFileSync(editionPath(id, locale), html);
  const doc = parseComicHtml(html);
  const today = typeof args.date === "string" ? args.date : new Date().toISOString().slice(0, 10);
  const meta = existsSync(metaPath(id)) ? readMeta(id) : { publishedAt: today, updatedAt: today, sourceLocale: locale, editions: {} };
  const previous = meta.editions[locale] ?? {};
  const title = typeof args.title === "string" ? args.title : stripSiteSuffix(doc.title) || previous.title;
  if (!title) fail("the HTML has no <title>; pass --title");
  const description = typeof args.description === "string"
    ? args.description
    : doc.description || previous.description || firstSentences(doc.body);
  meta.editions[locale] = { title, description };
  meta.updatedAt = today;
  if (args.draft) meta.draft = true;
  writeMeta(id, meta);
  if (typeof args.assets === "string") cpSync(args.assets, join(publicComicsDir, id, "assets"), { recursive: true });

  console.log(`${id}/${locale}: saved ${rel(editionPath(id, locale))}${removed ? ` (removed ${removed} site-shell leftovers)` : ""}`);
  if (!doc.description && typeof args.description !== "string" && !previous.description) {
    console.log(`  description taken from the first lines of the comic; review it in ${rel(metaPath(id))}`);
  }
  for (const warning of lintComicHtml(html)) console.log(`  warning: ${warning}`);
  await buildFonts(id, locale);
  await buildCovers(id, locale);
  const path = locale === "zh" ? `/comics/${id}/` : `/${locale}/comics/${id}/`;
  console.log(`\nNext: npm run comic -- check ${id} && npm run build, then open ${path}`);
}

function check(onlyId) {
  const ids = onlyId ? [onlyId] : comicIds();
  const errors = [];
  const warnings = [];
  for (const id of ids) {
    if (!ID_PATTERN.test(id)) errors.push(`${id}: folder name must be lowercase words joined by hyphens`);
    if (!existsSync(metaPath(id))) {
      errors.push(`${id}: missing comic.json`);
      continue;
    }
    let meta;
    try {
      meta = readMeta(id);
    } catch (error) {
      errors.push(`${id}: comic.json is not valid JSON (${error.message})`);
      continue;
    }
    for (const key of ["publishedAt", "updatedAt"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(meta[key] ?? "")) errors.push(`${id}: ${key} must be YYYY-MM-DD`);
    }
    if (!meta.editions?.[meta.sourceLocale]) errors.push(`${id}: sourceLocale "${meta.sourceLocale}" has no edition`);
    const sourceHtml = existsSync(editionPath(id, meta.sourceLocale)) ? readFileSync(editionPath(id, meta.sourceLocale), "utf8") : "";
    for (const [locale, edition] of Object.entries(meta.editions ?? {})) {
      const label = `${id}/${locale}`;
      if (!locales.includes(locale)) {
        errors.push(`${label}: unsupported locale`);
        continue;
      }
      if (!edition?.title?.trim() || !edition?.description?.trim()) errors.push(`${label}: title and description are required`);
      if (!existsSync(editionPath(id, locale))) {
        errors.push(`${label}: missing ${rel(editionPath(id, locale))}`);
        continue;
      }
      const html = readFileSync(editionPath(id, locale), "utf8");
      if (cleanComicSource(html).removed) errors.push(`${label}: contains site-shell leftovers; re-add it with "npm run comic -- add"`);
      const requested = parseComicHtml(html).googleFontUrls.flatMap(googleFontRequests).filter((request) => !SYSTEM_TEXT_FAMILIES.test(request.family));
      if (requested.length) {
        const css = existsSync(fontCssPath(id, locale)) ? readFileSync(fontCssPath(id, locale), "utf8") : "";
        if (!css.includes("@font-face")) errors.push(`${label}: Google Fonts are not self-hosted yet; run "npm run comic -- fonts ${id} --locale ${locale}"`);
        for (const [, url] of css.matchAll(/url\((\/comics\/[^)]+)\)/g)) {
          if (!existsSync(join(root, "public", url))) errors.push(`${label}: font file missing for ${url}`);
        }
      }
      for (const extension of ["jpg", "webp"]) {
        if (!existsSync(join(publicComicsDir, id, "covers", `${locale}.${extension}`))) {
          errors.push(`${label}: missing cover ${locale}.${extension}; run "npm run comic -- cover ${id} --locale ${locale}"`);
        }
      }
      for (const warning of lintComicHtml(html)) warnings.push(`${label}: ${warning}`);
      if (locale !== meta.sourceLocale && sourceHtml) {
        const count = (text, pattern) => (text.match(pattern) ?? []).length;
        for (const [name, pattern] of [["h1", /<h1\b/gi], ["h2", /<h2\b/gi], ["h3", /<h3\b/gi], ["img", /<img\b/gi], ["pre", /<pre\b/gi], ["table", /<table\b/gi]]) {
          if (count(html, pattern) !== count(sourceHtml, pattern)) warnings.push(`${label}: <${name}> count ${count(html, pattern)} differs from the ${meta.sourceLocale} source (${count(sourceHtml, pattern)})`);
        }
        if (["zh", "ja"].includes(meta.sourceLocale) && !["zh", "ja"].includes(locale)) {
          const leftover = (plainText(html.replace(/<(pre|code)[\s\S]*?<\/\1>/gi, " ")).match(/[一-鿿]+/g) ?? []).filter((run) => run.length > 1);
          if (leftover.length) warnings.push(`${label}: ${leftover.length} untranslated Chinese runs, e.g. ${leftover.slice(0, 3).join(" / ")}`);
        }
      }
    }
  }
  for (const warning of warnings) console.log(`warning: ${warning}`);
  if (errors.length) {
    console.error(errors.map((error) => `error: ${error}`).join("\n"));
    process.exit(1);
  }
  console.log(`Comics check passed (${ids.length} comic${ids.length === 1 ? "" : "s"}).`);
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const locale = typeof args.locale === "string" ? localeFromLang(args.locale) : undefined;
if (typeof args.locale === "string" && !locale) fail(`unsupported --locale ${args.locale}`);

if (command === "add") await add(args);
else if (command === "fonts" || command === "cover") {
  const id = args._[0];
  if (!id || !existsSync(metaPath(id))) fail(`usage: npm run comic -- ${command} <id> [--locale xx]; known comics: ${comicIds().join(", ") || "none"}`);
  if (command === "fonts") await buildFonts(id, locale);
  else await buildCovers(id, locale);
} else if (command === "check") check(args._[0]);
else fail("commands: add, fonts, cover, check (see the header of scripts/comics.mjs)");
