#!/usr/bin/env node
// Comic publishing helper. A comic is a folder src/comics/<id>/ holding comic.json and one
// complete HTML file per edition (<locale>.html). The site wraps those files at build time.
//
//   npm run comic -- add <file.html> --id <slug> [--locale zh] [--title ...] [--description ...]
//                        [--date YYYY-MM-DD] [--assets <dir>] [--shell-theme light|dark] [--draft] [--no-vendor]
//   npm run comic -- fonts <id> [--locale xx]   self-host and subset the edition's Google Fonts
//   npm run comic -- cover <id> [--locale xx]   render cover images for the list and link previews
//   npm run comic -- check [<id>]               validate sources, metadata, fonts, assets and covers
//
// Network access (Google Fonts, CDN downloads) happens only here, never during the site build.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ICON_FAMILIES,
  SYSTEM_TEXT_FAMILIES,
  cleanComicSource,
  collectComicReferences,
  googleFontRequests,
  lintComicHtml,
  mapCssRefs,
  mergeFontRequests,
  normalizeAssetRef,
  parseComicHtml,
  stripBom,
} from "../src/lib/comic-html.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const comicsDir = join(root, "src", "comics");
const publicDir = join(root, "public");
const publicComicsDir = join(publicDir, "comics");
const fontCacheDir = join(root, "node_modules", ".cache", "comic-fonts");
const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"];
const htmlLang = { zh: "zh-CN", en: "en", ja: "ja", ko: "ko", th: "th", fr: "fr", de: "de", vi: "vi" };
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PREVIEW_ORIGIN = "http://comic.preview";
const BOOLEAN_FLAGS = new Set(["draft", "no-vendor"]);
// Google Fonts answers browsers it does not recognise with complete TTF files, which we subset.
const FONT_FETCH_UA = "Mozilla/5.0";
const DOWNLOAD_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
// Always kept in a subset so small dynamic labels and punctuation still render.
const BASE_GLYPHS = `${Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("")}‘’“”–—…·•«»©®™°×→←↑↓✓★、。，．：；！？「」『』（）《》〈〉【】〔〕［］～・％＋－＝／　`;
const MIME = { ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".pdf": "application/pdf" };

class UsageError extends Error {}

function fail(message) {
  throw new UsageError(message);
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
    if (BOOLEAN_FLAGS.has(key) || next === undefined || next.startsWith("--")) args[key] = true;
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
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex").slice(0, 10);
const metaPath = (id) => join(comicsDir, id, "comic.json");
const editionPath = (id, locale) => join(comicsDir, id, `${locale}.html`);
const fontCssPath = (id, locale) => join(comicsDir, id, "fonts", `${locale}.css`);
const assetsManifestPath = (id) => join(comicsDir, id, "assets.json");
const vendorManifestPath = (id) => join(comicsDir, id, "vendor.json");

function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function localeFromLang(lang) {
  const primary = String(lang ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return locales.includes(primary) ? primary : undefined;
}

/** Read an HTML file as UTF-8, refusing files in other encodings. */
function readHtml(path) {
  const html = stripBom(readFileSync(path, "utf8"));
  const charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(html)?.[1];
  if (charset && !/^utf-?8$/i.test(charset)) fail(`${path} declares charset ${charset}; save it as UTF-8 first`);
  if (html.includes("�")) fail(`${path} is not valid UTF-8 (it contains replacement characters); save it as UTF-8 first`);
  return html;
}

function readMeta(id) {
  return readJson(metaPath(id), undefined);
}

function writeMeta(id, meta) {
  writeJson(metaPath(id), {
    publishedAt: meta.publishedAt,
    updatedAt: meta.updatedAt,
    sourceLocale: meta.sourceLocale,
    ...(meta.draft ? { draft: true } : {}),
    ...(meta.shellTheme ? { shellTheme: meta.shellTheme } : {}),
    editions: Object.fromEntries(locales.filter((locale) => meta.editions[locale]).map((locale) => [locale, meta.editions[locale]])),
  });
}

function editionLocales(id, only) {
  if (only) {
    if (!existsSync(editionPath(id, only))) fail(`${id} has no ${only} edition (${rel(editionPath(id, only))})`);
    return [only];
  }
  return locales.filter((locale) => existsSync(editionPath(id, locale)));
}

function comicFolders() {
  if (!existsSync(comicsDir)) return [];
  return readdirSync(comicsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function plainText(html) {
  return html
    .replace(/<(script|style|template|noscript)[\s\S]*?<\/\1>/gi, " ")
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

function visibleText(html) {
  const attributes = [...html.matchAll(/\s(?:alt|title|aria-label|placeholder)=["']([^"']*)["']/gi)].map((match) => match[1]).join(" ");
  return `${plainText(html)} ${attributes}`;
}

/** Title for the comics list: the HTML title without "| Shoa Lin" or a "· comic edition" tail. */
function listTitle(title) {
  const withoutSite = title.replace(/\s*[|·｜]\s*Shoa Lin\s*$/i, "").trim();
  const withoutTail = withoutSite.replace(/\s*[·|｜–—-]\s*[^·|｜–—-]*(?:漫画|漫畫|マンガ|만화|comic|bande dessinée|truyện tranh|การ์ตูน)[^·|｜–—-]*$/i, "").trim();
  return withoutTail || withoutSite;
}

/** A one- or two-sentence summary for comic.json when the HTML has no meta description. */
function derivedDescription(body, limit = 120) {
  const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => plainText(match[1] ?? "")).filter((text) => text.length >= 20);
  const text = paragraphs[0] ?? plainText(body);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const end = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf(". "), cut.lastIndexOf("！"), cut.lastIndexOf("？"));
  return end > limit * 0.5 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

function attributes(record) {
  return Object.entries(record).map(([name, value]) => ` ${name}="${String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`).join("");
}

// ---------------------------------------------------------------------------------------
// Heavy dependencies are loaded only by the commands that need them.

async function launchBrowser() {
  const { chromium } = await import("@playwright/test");
  return chromium.launch();
}

async function loadSharp() {
  return (await import("sharp")).default;
}

async function loadSubsetFont() {
  return (await import("subset-font")).default;
}

// ---------------------------------------------------------------------------------------
// Assets and downloads

function editionAssets(id, locale, meta) {
  const manifest = readJson(assetsManifestPath(id), {});
  return { ...(manifest[meta?.sourceLocale] ?? {}), ...(manifest[locale] ?? {}) };
}

function copyHashed(id, folder, name, buffer) {
  const fileName = `${hash(buffer)}-${name.replace(/[^\w.-]+/g, "-")}`;
  const target = join(publicComicsDir, id, folder, fileName);
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target)) writeFileSync(target, buffer);
  return `/comics/${id}/${folder}/${fileName}`;
}

/** Copy the files an edition references (and files its CSS references) into public/comics/<id>/assets/. */
function syncAssets(id, locale, html, assetRoot, meta) {
  const manifest = readJson(assetsManifestPath(id), {});
  const inherited = manifest[meta.sourceLocale] ?? {};
  const previous = manifest[locale] ?? {};
  const map = {};
  const missing = [];
  const skipped = [];
  const pendingCss = [];
  const queue = [...collectComicReferences(html).assets];
  const seen = new Set();
  const rootPath = resolve(assetRoot);
  while (queue.length) {
    const ref = queue.shift();
    if (seen.has(ref)) continue;
    seen.add(ref);
    const file = resolve(rootPath, ref);
    const inside = file.startsWith(rootPath + sep);
    if (inside && existsSync(file) && statSync(file).isFile()) {
      if (/\.html?$/i.test(ref)) {
        skipped.push(ref);
        continue;
      }
      if (/\.css$/i.test(ref)) {
        const css = readFileSync(file, "utf8");
        const nested = [];
        mapCssRefs(css, (nestedRef) => {
          const key = normalizeAssetRef(posix.join(posix.dirname(ref), nestedRef));
          if (key && !/^data:/i.test(nestedRef)) nested.push(key);
          return undefined;
        });
        pendingCss.push({ ref, css });
        queue.push(...nested);
        continue;
      }
      map[ref] = copyHashed(id, "assets", basename(ref), readFileSync(file));
    } else if (inherited[ref] && existsSync(join(publicDir, inherited[ref]))) {
      map[ref] = inherited[ref];
    } else if (previous[ref] && existsSync(join(publicDir, previous[ref]))) {
      map[ref] = previous[ref];
    } else {
      missing.push(ref);
    }
  }
  for (const { ref, css } of pendingCss.reverse()) {
    const rewritten = mapCssRefs(css, (nestedRef) => map[normalizeAssetRef(posix.join(posix.dirname(ref), nestedRef)) ?? ""]);
    map[ref] = copyHashed(id, "assets", basename(ref), Buffer.from(rewritten));
  }
  const ordered = Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right)));
  if (Object.keys(ordered).length) manifest[locale] = ordered;
  else delete manifest[locale];
  if (Object.keys(manifest).length || existsSync(assetsManifestPath(id))) writeJson(assetsManifestPath(id), manifest);
  return { copied: Object.keys(ordered).length, missing, skipped };
}

async function download(url, { timeout = 20_000, userAgent = DOWNLOAD_UA } = {}) {
  const response = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Download external classic scripts and stylesheets so the comic does not depend on CDNs. */
async function syncVendor(id, html) {
  const { externalScripts, externalStyles } = collectComicReferences(html);
  const manifest = readJson(vendorManifestPath(id), {});
  const results = [];
  for (const url of [...externalScripts, ...externalStyles]) {
    if (manifest[url] && existsSync(join(publicDir, manifest[url]))) continue;
    const isStyle = externalStyles.includes(url);
    try {
      let body = await download(url);
      if (isStyle) {
        // Relative files inside a vendored stylesheet still come from its original host.
        body = Buffer.from(mapCssRefs(body.toString("utf8"), (ref) => (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref.trim()) ? undefined : new URL(ref.trim(), url).href)));
      }
      const name = basename(new URL(url).pathname) || "file";
      const fileName = extname(name) ? name : `${name}${isStyle ? ".css" : ".js"}`;
      manifest[url] = copyHashed(id, "vendor", fileName, body);
      results.push(`downloaded ${url} (${kb(body.length)})`);
    } catch (error) {
      results.push(`warning: could not download ${url} (${error.message}); the page keeps loading it from its original host`);
    }
  }
  if (Object.keys(manifest).length) writeJson(vendorManifestPath(id), manifest);
  return results;
}

// ---------------------------------------------------------------------------------------
// Preview: the edition as the site shows it, without the site header and footer.

function fontManifest(id, locale) {
  const path = fontCssPath(id, locale);
  if (!existsSync(path)) return { selfHosted: [], unused: [], css: "" };
  const css = readFileSync(path, "utf8");
  const meta = /\/\*\s*comic-fonts\s+(\{.*?\})\s*\*\//.exec(css)?.[1];
  const parsed = meta ? JSON.parse(meta) : {};
  return { selfHosted: parsed.selfHosted ?? [], unused: parsed.unused ?? [], css };
}

function previewDocument(id, locale, { withFonts }) {
  const meta = readMeta(id);
  const html = readHtml(editionPath(id, locale));
  const fonts = withFonts ? fontManifest(id, locale) : { selfHosted: [], unused: [], css: "" };
  const handledFamilies = new Set([...fonts.selfHosted, ...fonts.unused].map((family) => family.toLowerCase()));
  const doc = parseComicHtml(html, { assets: editionAssets(id, locale, meta), vendored: readJson(vendorManifestPath(id), {}), handledFamilies });
  return `<!doctype html><html lang="${htmlLang[locale]}"${attributes(doc.htmlAttrs)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts.css}</style>${doc.head}</head><body${attributes(doc.bodyAttrs)}>${doc.body}</body></html>`;
}

async function previewPage(browser, id, html, viewport, setup) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  if (setup) await page.addInitScript(setup);
  const vendored = Object.fromEntries(Object.entries(readJson(vendorManifestPath(id), {})).map(([url, local]) => [url, join(publicDir, local)]));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === PREVIEW_ORIGIN) {
      if (url.pathname === `/comics/${id}/`) return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
      let file = "";
      try {
        file = resolve(publicDir, `.${decodeURIComponent(url.pathname)}`);
      } catch {
        return route.fulfill({ status: 400, body: "" });
      }
      if (file.startsWith(publicComicsDir + sep) && existsSync(file) && statSync(file).isFile()) {
        return route.fulfill({ status: 200, contentType: MIME[extname(file).toLowerCase()] ?? "application/octet-stream", body: readFileSync(file) });
      }
      return route.fulfill({ status: 404, body: "" });
    }
    if (/^fonts\.(?:googleapis|gstatic)\.com$/i.test(url.hostname)) return route.abort();
    const local = vendored[route.request().url()];
    if (local && existsSync(local)) return route.fulfill({ status: 200, contentType: MIME[extname(local).toLowerCase()] ?? "text/plain", body: readFileSync(local) });
    return route.continue();
  });
  await page.goto(`${PREVIEW_ORIGIN}/comics/${id}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
  return page;
}

// ---------------------------------------------------------------------------------------
// Fonts

/** Characters each font family renders, including text scripts insert later (typewriters, reveals). */
async function glyphsByFamily(browser, id, locale) {
  const page = await previewPage(browser, id, previewDocument(id, locale, { withFonts: false }), { width: 1280, height: 900 }, () => {
    const seen = [];
    window.__comicGlyphs = seen;
    window.__comicMutations = 0;
    const record = (node) => {
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (!element || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE"].includes(element.tagName)) return;
      seen.push([getComputedStyle(element).fontFamily, node.nodeType === Node.TEXT_NODE ? node.data : element.textContent ?? ""]);
    };
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        window.__comicMutations += 1;
        if (mutation.type === "characterData") record(mutation.target);
        for (const node of mutation.addedNodes) if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) record(node);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  // Scroll through the page so reveal-on-scroll content appears, then wait for the DOM to settle.
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((done) => setTimeout(done, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(200, innerHeight * 0.8)) {
      scrollTo(0, y);
      await pause(150);
    }
    scrollTo(0, 0);
    let last = -1;
    for (let waited = 0, quiet = 0; waited < 8000 && quiet < 1500; waited += 250) {
      await pause(250);
      quiet = window.__comicMutations === last ? quiet + 250 : 0;
      last = window.__comicMutations;
    }
  });
  const usage = await page.evaluate(() => {
    const families = {};
    const fullWidth = (text) => [...text].map((character) => {
      const code = character.charCodeAt(0);
      return code === 32 ? "　" : code > 32 && code < 127 ? String.fromCharCode(code + 0xfee0) : character;
    }).join("");
    const add = (fontFamily, text, element) => {
      if (!text) return;
      const transformed = element && getComputedStyle(element).textTransform === "full-width" ? fullWidth(text) : text;
      for (const part of fontFamily.split(",")) {
        const name = part.trim().replace(/^["']|["']$/g, "").toLowerCase();
        if (!name) continue;
        families[name] ??= new Set();
        for (const character of transformed) families[name].add(character);
      }
    };
    for (const [fontFamily, text] of window.__comicGlyphs ?? []) add(fontFamily, text);
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE"].includes(element.tagName)) continue;
      add(getComputedStyle(element).fontFamily, node.nodeValue, element);
    }
    for (const element of document.querySelectorAll("*")) {
      for (const pseudo of ["::before", "::after", "::marker", "::first-letter"]) {
        const style = getComputedStyle(element, pseudo);
        const strings = [...(style.content ?? "").matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]);
        if (strings.length) add(style.fontFamily, strings.join(""), element);
      }
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLButtonElement) {
        add(getComputedStyle(element).fontFamily, `${element.value ?? ""}${"placeholder" in element ? element.placeholder ?? "" : ""}`, element);
      }
    }
    return Object.fromEntries(Object.entries(families).map(([name, set]) => [name, [...set].join("")]));
  });
  await page.close();
  return usage;
}

async function fetchFaces(requests) {
  const query = requests.map((request) => `family=${encodeURIComponent(request.family).replace(/%20/g, "+")}${request.axes ? `:${request.axes}` : ""}`).join("&");
  const css = (await download(`https://fonts.googleapis.com/css2?${query}&display=swap`, { userAgent: FONT_FETCH_UA })).toString("utf8");
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, block]) => ({
    family: /font-family:\s*['"]?([^;'"]+)['"]?/.exec(block)?.[1]?.trim(),
    style: /font-style:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? "normal",
    weight: /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? "400",
    url: /src:\s*url\(([^)]+)\)/.exec(block)?.[1]?.trim(),
  })).filter((face) => face.family && face.url);
}

async function cachedFont(url) {
  mkdirSync(fontCacheDir, { recursive: true });
  const cached = join(fontCacheDir, url.replace(/^https?:\/\//, "").replace(/[^a-z0-9.]+/gi, "_"));
  if (existsSync(cached)) return readFileSync(cached);
  const buffer = await download(url, { timeout: 60_000, userAgent: FONT_FETCH_UA });
  writeFileSync(cached, buffer);
  return buffer;
}

function hostableRequests(html) {
  const requested = mergeFontRequests(collectComicReferences(html).googleFontUrls.filter((url) => !/\/icon(?:[?#]|$)/.test(url)).flatMap(googleFontRequests));
  return {
    hostable: requested.filter((request) => !SYSTEM_TEXT_FAMILIES.test(request.family) && !ICON_FAMILIES.test(request.family)),
    system: requested.filter((request) => SYSTEM_TEXT_FAMILIES.test(request.family)).map((request) => request.family),
    icons: [...new Set(collectComicReferences(html).googleFontUrls.flatMap(googleFontRequests).map((request) => request.family).filter((family) => ICON_FAMILIES.test(family)))],
  };
}

async function buildFonts(id, only) {
  const targets = editionLocales(id, only);
  const subsetFont = await loadSubsetFont();
  const browser = await launchBrowser();
  try {
    for (const locale of targets) {
      const html = readHtml(editionPath(id, locale));
      const { hostable, system, icons } = hostableRequests(html);
      const notes = [system.length ? `system fonts for ${system.join(", ")}` : "", icons.length ? `${icons.join(", ")} stays on Google (icon font)` : ""].filter(Boolean).join("; ");
      if (!hostable.length) {
        console.log(`${id}/${locale}: no web fonts to self-host${notes ? ` (${notes})` : ""}`);
        if (existsSync(fontCssPath(id, locale))) console.log(`  note: ${rel(fontCssPath(id, locale))} is no longer needed and can be deleted`);
        continue;
      }
      let faces;
      try {
        faces = await fetchFaces(hostable);
      } catch (error) {
        console.warn(`${id}/${locale}: could not reach Google Fonts (${error.message}); the page loads them without blocking instead (they may not show in mainland China). Rerun "npm run comic -- fonts ${id} --locale ${locale}" later.`);
        continue;
      }
      const usage = await glyphsByFamily(browser, id, locale);
      const outDir = join(publicComicsDir, id, "fonts", locale);
      mkdirSync(outDir, { recursive: true });
      const rules = [];
      const selfHosted = new Set();
      const failed = new Set();
      console.log(`${id}/${locale}: self-hosting ${hostable.map((request) => request.family).join(", ")}${notes ? `; ${notes}` : ""}`);
      for (const face of faces) {
        const used = usage[face.family.toLowerCase()] ?? "";
        if (!used.trim()) continue;
        try {
          const text = [...new Set([...BASE_GLYPHS, ...used, ...used.toUpperCase(), ...used.toLowerCase()])].join("");
          const woff2 = await subsetFont(await cachedFont(face.url), text, { targetFormat: "woff2" });
          const name = `${slug(face.family)}-${face.weight.replace(/\s+/g, "-")}${face.style === "italic" ? "-italic" : ""}.woff2`;
          writeFileSync(join(outDir, name), woff2);
          rules.push(`@font-face{font-family:${JSON.stringify(face.family)};font-style:${face.style};font-weight:${face.weight};font-display:swap;src:url(/comics/${id}/fonts/${locale}/${name}) format("woff2")}`);
          selfHosted.add(face.family);
          console.log(`  ${face.family} ${face.weight}${face.style === "italic" ? " italic" : ""}: ${[...new Set(used)].length} characters, ${kb(woff2.length)}`);
        } catch (error) {
          failed.add(face.family);
          console.warn(`  warning: ${face.family} ${face.weight}: ${error.message}; it keeps loading from Google without blocking`);
        }
      }
      const unused = hostable.map((request) => request.family).filter((family) => !selfHosted.has(family) && !failed.has(family) && !(usage[family.toLowerCase()] ?? "").trim());
      if (unused.length) console.log(`  not used on the page: ${unused.join(", ")}`);
      mkdirSync(dirname(fontCssPath(id, locale)), { recursive: true });
      writeFileSync(
        fontCssPath(id, locale),
        `/* comic-fonts ${JSON.stringify({ selfHosted: [...selfHosted].sort(), unused: unused.sort() })} */\n`
          + `/* Generated by scripts/comics.mjs; rerun "npm run comic -- fonts ${id} --locale ${locale}" after editing ${locale}.html. */\n`
          + `${rules.join("\n")}\n`,
      );
    }
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------
// Covers

async function buildCovers(id, only) {
  const targets = editionLocales(id, only);
  const sharp = await loadSharp();
  const browser = await launchBrowser();
  try {
    const outDir = join(publicComicsDir, id, "covers");
    mkdirSync(outDir, { recursive: true });
    for (const locale of targets) {
      const page = await previewPage(browser, id, previewDocument(id, locale, { withFonts: true }), { width: 1200, height: 630 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((done) => setTimeout(done, 1500));
        // Let entrance animations finish; ignore endless ones (spinners, marquees).
        const finite = document.getAnimations().filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime ?? Infinity));
        await Promise.race([Promise.allSettled(finite.map((animation) => animation.finished)), new Promise((done) => setTimeout(done, 3000))]);
      });
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

// ---------------------------------------------------------------------------------------
// add

async function add(args) {
  const file = args._[0];
  if (!file || !existsSync(file) || !statSync(file).isFile()) fail("usage: npm run comic -- add <file.html> --id <slug> [--locale zh]");
  const id = args.id;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) fail("--id must be lowercase letters/digits joined by hyphens, for example gpt-6-astra");
  if (args.date !== undefined && (typeof args.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(args.date))) fail("--date must look like 2026-10-08");
  if (args["shell-theme"] !== undefined && !["light", "dark"].includes(args["shell-theme"])) fail("--shell-theme must be light or dark");
  const assetRoot = typeof args.assets === "string" ? args.assets : dirname(resolve(file));
  if (!existsSync(assetRoot) || !statSync(assetRoot).isDirectory()) fail(`--assets ${assetRoot} is not a folder`);

  const { html, removed } = cleanComicSource(readHtml(file));
  const lang = typeof args.locale === "string" ? args.locale : /<html[^>]*\slang=["']?([\w-]+)/i.exec(html)?.[1];
  const locale = localeFromLang(lang);
  if (!locale) fail(`cannot tell the edition language from lang="${lang ?? ""}"; pass --locale (${locales.join(", ")})`);
  const doc = parseComicHtml(html);
  const today = typeof args.date === "string" ? args.date : new Date().toISOString().slice(0, 10);
  const meta = readMeta(id) ?? { publishedAt: today, updatedAt: today, sourceLocale: locale, editions: {} };
  const previous = meta.editions[locale];
  const title = typeof args.title === "string" ? args.title : previous?.title ?? listTitle(doc.title);
  if (!title) fail("the HTML has no <title>; pass --title");
  const derived = !previous?.description && !doc.description && typeof args.description !== "string";
  const description = typeof args.description === "string" ? args.description : previous?.description ?? (doc.description || derivedDescription(doc.body));

  // Everything is validated; write the edition.
  mkdirSync(join(comicsDir, id), { recursive: true });
  writeFileSync(editionPath(id, locale), html);
  meta.editions[locale] = { title, description };
  meta.updatedAt = today;
  if (args.draft) meta.draft = true;
  if (args["shell-theme"]) meta.shellTheme = args["shell-theme"];
  writeMeta(id, meta);

  console.log(`${id}/${locale}: saved ${rel(editionPath(id, locale))}${removed ? ` (removed ${removed} site-shell leftovers)` : ""}`);
  if (previous && typeof args.title !== "string") console.log(`  kept the existing title "${title}" (pass --title to change it)`);
  if (derived) console.log(`  description taken from the comic's first paragraph; review it in ${rel(metaPath(id))}`);
  const assets = syncAssets(id, locale, html, assetRoot, meta);
  if (assets.copied) console.log(`  assets: ${assets.copied} file(s) mapped into public/comics/${id}/assets/`);
  for (const ref of assets.skipped) console.log(`  note: ${ref} is an HTML page and was not copied`);
  for (const ref of assets.missing) console.log(`  warning: missing asset ${ref}; put it next to the HTML (or in --assets) and rerun add`);
  if (!args["no-vendor"]) for (const line of await syncVendor(id, html)) console.log(`  ${line}`);
  for (const warning of lintComicHtml(html)) console.log(`  warning: ${warning}`);
  await buildFonts(id, locale);
  await buildCovers(id, locale);
  const path = locale === "zh" ? `/comics/${id}/` : `/${locale}/comics/${id}/`;
  console.log(`\nNext: npm run comic -- check ${id} && npm run build && npm run preview, then open ${path}`);
}

// ---------------------------------------------------------------------------------------
// check

function check(onlyId) {
  const folders = onlyId ? [onlyId] : comicFolders();
  const errors = [];
  const warnings = [];
  for (const id of folders) {
    if (!existsSync(join(comicsDir, id))) {
      errors.push(`${id}: no such comic folder`);
      continue;
    }
    if (!ID_PATTERN.test(id)) errors.push(`${id}: folder name must be lowercase words joined by hyphens`);
    let meta;
    try {
      meta = readMeta(id);
    } catch (error) {
      errors.push(`${id}: comic.json is not valid JSON (${error.message})`);
      continue;
    }
    if (!meta) {
      errors.push(`${id}: missing comic.json`);
      continue;
    }
    for (const key of ["publishedAt", "updatedAt"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(meta[key] ?? "")) errors.push(`${id}: ${key} must be YYYY-MM-DD`);
    }
    if (meta.updatedAt < meta.publishedAt) warnings.push(`${id}: updatedAt is earlier than publishedAt`);
    if (meta.draft !== undefined && typeof meta.draft !== "boolean") errors.push(`${id}: draft must be true or false`);
    if (meta.shellTheme !== undefined && !["light", "dark"].includes(meta.shellTheme)) errors.push(`${id}: shellTheme must be "light" or "dark"`);
    if (!locales.includes(meta.sourceLocale) || !meta.editions?.[meta.sourceLocale]) errors.push(`${id}: sourceLocale "${meta.sourceLocale}" has no edition`);
    for (const fileName of readdirSync(join(comicsDir, id)).filter((name) => name.endsWith(".html"))) {
      const locale = fileName.replace(/\.html$/, "");
      if (!locales.includes(locale)) errors.push(`${id}: ${fileName} is not named after a site locale`);
      else if (!meta.editions?.[locale]) errors.push(`${id}: ${fileName} has no entry in comic.json (add it with "npm run comic -- add")`);
    }
    const assetsManifest = readJson(assetsManifestPath(id), {});
    const vendor = readJson(vendorManifestPath(id), {});
    let sourceHtml = "";
    for (const [locale, edition] of Object.entries(meta.editions ?? {})) {
      const label = `${id}/${locale}`;
      if (!locales.includes(locale)) {
        errors.push(`${label}: unsupported locale`);
        continue;
      }
      if (typeof edition?.title !== "string" || !edition.title.trim() || typeof edition?.description !== "string" || !edition.description.trim()) {
        errors.push(`${label}: title and description are required`);
      }
      if (!existsSync(editionPath(id, locale))) {
        errors.push(`${label}: missing ${rel(editionPath(id, locale))}`);
        continue;
      }
      let html;
      try {
        html = readHtml(editionPath(id, locale));
      } catch (error) {
        errors.push(`${label}: ${error.message}`);
        continue;
      }
      if (locale === meta.sourceLocale) sourceHtml = html;
      if (cleanComicSource(html).removed) errors.push(`${label}: contains site-shell leftovers; re-add it with "npm run comic -- add"`);
      const references = collectComicReferences(html);
      const { hostable } = hostableRequests(html);
      const fonts = fontManifest(id, locale);
      const accounted = new Set([...fonts.selfHosted, ...fonts.unused]);
      const missingFonts = hostable.map((request) => request.family).filter((family) => !accounted.has(family));
      if (missingFonts.length) warnings.push(`${label}: ${missingFonts.join(", ")} not self-hosted yet, so they load from Google and may not show in mainland China; run "npm run comic -- fonts ${id} --locale ${locale}"`);
      for (const [, url] of fonts.css.matchAll(/url\((\/comics\/[^)]+)\)/g)) {
        if (!existsSync(join(publicDir, url))) errors.push(`${label}: font file missing for ${url}`);
      }
      for (const extension of ["jpg", "webp"]) {
        if (!existsSync(join(publicComicsDir, id, "covers", `${locale}.${extension}`))) {
          errors.push(`${label}: missing cover ${locale}.${extension}; run "npm run comic -- cover ${id} --locale ${locale}"`);
        }
      }
      const assets = { ...(assetsManifest[meta.sourceLocale] ?? {}), ...(assetsManifest[locale] ?? {}) };
      for (const ref of references.assets) {
        if (/\.html?$/i.test(ref)) continue;
        if (!assets[ref]) errors.push(`${label}: missing asset ${ref}; rerun "npm run comic -- add" with the file next to the HTML (or --assets <dir>)`);
        else if (!existsSync(join(publicDir, assets[ref]))) errors.push(`${label}: asset file missing for ${ref} (${assets[ref]})`);
      }
      for (const ref of references.escaping) errors.push(`${label}: "${ref}" points outside the comic folder`);
      for (const url of [...references.externalScripts, ...references.externalStyles]) {
        if (!vendor[url]) warnings.push(`${label}: ${url} still loads from its original host (may fail in mainland China); rerun add to download it`);
        else if (!existsSync(join(publicDir, vendor[url]))) errors.push(`${label}: downloaded copy missing for ${url}`);
      }
      for (const warning of lintComicHtml(html)) warnings.push(`${label}: ${warning}`);
    }
    for (const [locale] of Object.entries(meta.editions ?? {})) {
      if (locale === meta.sourceLocale || !sourceHtml || !existsSync(editionPath(id, locale))) continue;
      const label = `${id}/${locale}`;
      const html = readFileSync(editionPath(id, locale), "utf8");
      const count = (text, pattern) => (text.match(pattern) ?? []).length;
      for (const [name, pattern] of [["h1", /<h1\b/gi], ["h2", /<h2\b/gi], ["h3", /<h3\b/gi], ["img", /<img\b/gi], ["svg", /<svg\b/gi], ["pre", /<pre\b/gi], ["table", /<table\b/gi]]) {
        if (count(html, pattern) !== count(sourceHtml, pattern)) warnings.push(`${label}: <${name}> count ${count(html, pattern)} differs from the ${meta.sourceLocale} source (${count(sourceHtml, pattern)})`);
      }
      if (["zh", "ja"].includes(meta.sourceLocale) && !["zh", "ja"].includes(locale)) {
        const leftover = (visibleText(html.replace(/<(pre|code)[\s\S]*?<\/\1>/gi, " ")).match(/[一-鿿]+/g) ?? []).filter((run) => run.length > 1);
        if (leftover.length) warnings.push(`${label}: ${leftover.length} untranslated Chinese runs, e.g. ${leftover.slice(0, 3).join(" / ")}`);
      }
    }
  }
  for (const warning of warnings) console.log(`warning: ${warning}`);
  if (errors.length) {
    console.error(errors.map((error) => `error: ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(`Comics check passed (${folders.length} comic${folders.length === 1 ? "" : "s"}).`);
}

// ---------------------------------------------------------------------------------------

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const locale = typeof args.locale === "string" ? localeFromLang(args.locale) : undefined;
  if (args.locale !== undefined && !locale) fail(`unsupported --locale ${args.locale}`);

  if (command === "add") return add(args);
  if (command === "fonts" || command === "cover") {
    const id = args._[0];
    if (!id || !readMeta(id)) fail(`usage: npm run comic -- ${command} <id> [--locale xx]; known comics: ${comicFolders().join(", ") || "none"}`);
    return command === "fonts" ? buildFonts(id, locale) : buildCovers(id, locale);
  }
  if (command === "check") return check(args._[0]);
  fail("commands: add, fonts, cover, check (see the header of scripts/comics.mjs)");
}

main().catch((error) => {
  console.error(`error: ${error instanceof UsageError ? error.message : error.stack ?? error.message}`);
  process.exitCode = 1;
});
