import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { loadContentEntries, resolveContentRoot } from "./lib/content-files.mjs";
import { chunkMarkdown, protectCodeBlocks, protectHeadings, protectImages, protectLinks, restoreCodeBlocks, restoreHeadings, restoreImages, restoreLinks, structureSignature } from "./lib/translate-markdown.mjs";

const supportedTargets = ["en", "ja", "ko", "th", "fr", "de", "vi"];
const targetIndex = process.argv.indexOf("--target");
const target = targetIndex === -1 ? "" : process.argv[targetIndex + 1];
if (!supportedTargets.includes(target)) throw new Error(`--target must be one of ${supportedTargets.join(", ")}`);

const slugIndex = process.argv.indexOf("--slugs");
const requestedSlugs = slugIndex === -1 ? [] : process.argv[slugIndex + 1].split(",").map((value) => value.trim()).filter(Boolean);
if (requestedSlugs.length === 0 || requestedSlugs.length > 3) throw new Error("--slugs must list between one and three translation keys");

const contentRoot = resolveContentRoot();
const cachePath = process.env.TRANSLATION_CACHE ?? join(process.env.TMPDIR ?? "/tmp", "shoa-site-redesign", "translation-cache.json");
mkdirSync(dirname(cachePath), { recursive: true });
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};

function cacheKey(source, sourceLocale, targetLocale) {
  return createHash("sha256").update(`${sourceLocale}\0${targetLocale}\0${source}`).digest("hex");
}

function responseText(payload) {
  if (!Array.isArray(payload?.[0])) throw new Error("Unexpected translation response");
  return payload[0].map((part) => part[0]).join("");
}

async function translateText(source, sourceLocale, targetLocale) {
  if (!source.trim()) return source;
  const key = cacheKey(source, sourceLocale, targetLocale);
  if (cache[key]) return cache[key];

  const query = new URLSearchParams({
    client: "gtx",
    sl: sourceLocale === "zh" ? "zh-CN" : sourceLocale,
    tl: targetLocale,
    dt: "t",
    q: source,
  });
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch("https://translate.googleapis.com/translate_a/single", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: query,
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.retryAfter = Number(response.headers.get("retry-after") ?? 0);
        throw error;
      }
      const translated = responseText(await response.json());
      cache[key] = translated;
      writeFileSync(cachePath, `${JSON.stringify(cache)}\n`, { mode: 0o600 });
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 450));
      return translated;
    } catch (error) {
      lastError = error;
      const retryAfter = Number(error.retryAfter ?? 0) * 1000;
      const delay = error.status === 429 ? Math.max(retryAfter, attempt * 15000) : attempt * 1200;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, delay));
    }
  }
  throw lastError;
}

async function translateMarkdown(body, sourceLocale, targetLocale) {
  const protectedCode = protectCodeBlocks(body);
  const protectedHeadings = protectHeadings(protectedCode.text);
  const protectedImages = protectImages(protectedHeadings.text);
  const protectedLinks = protectLinks(protectedImages.text);
  const chunks = chunkMarkdown(protectedLinks.text);
  const translatedChunks = [];
  for (const chunk of chunks) translatedChunks.push(await translateText(chunk, sourceLocale, targetLocale));
  const translatedHeadings = [];
  for (const heading of protectedHeadings.headings) translatedHeadings.push(await translateText(heading.label, sourceLocale, targetLocale));
  const translatedLabels = [];
  for (const link of protectedLinks.links) translatedLabels.push(await translateText(link.label, sourceLocale, targetLocale));
  const withLinks = restoreLinks(translatedChunks.join("\n\n"), protectedLinks.links, translatedLabels);
  const translatedAlts = [];
  for (const image of protectedImages.images) translatedAlts.push(await translateText(image.alt, sourceLocale, targetLocale));
  const withImages = restoreImages(withLinks, protectedImages.images, translatedAlts);
  const withHeadings = restoreHeadings(withImages, protectedHeadings.headings, translatedHeadings);
  const translated = restoreCodeBlocks(withHeadings, protectedCode.blocks);
  const sourceSignature = structureSignature(body);
  const translatedSignature = structureSignature(translated);
  if (JSON.stringify(translatedSignature) !== JSON.stringify(sourceSignature)) {
    const fields = Object.keys(sourceSignature).filter(
      (key) => JSON.stringify(sourceSignature[key]) !== JSON.stringify(translatedSignature[key]),
    );
    throw new Error(`Translated Markdown structure differs from source: ${fields.join(", ")}`);
  }
  return translated;
}

function serialize(data) {
  return `---\n${Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n`;
}

const entries = loadContentEntries(contentRoot)
  .filter((entry) => entry.data.locale === entry.data.sourceLocale && requestedSlugs.includes(entry.data.translationKey));

if (entries.length !== requestedSlugs.length) {
  const found = new Set(entries.map((entry) => entry.data.translationKey));
  throw new Error(`Missing canonical source entries: ${requestedSlugs.filter((slug) => !found.has(slug)).join(", ")}`);
}

for (const entry of entries) {
  const sourceLocale = entry.data.sourceLocale;
  const title = await translateText(entry.data.title, sourceLocale, target);
  const description = await translateText(entry.data.description, sourceLocale, target);
  const body = await translateMarkdown(entry.body, sourceLocale, target);
  const data = {
    ...entry.data,
    locale: target,
    title,
    description,
    sourceLocale: entry.data.sourceLocale,
  };
  if (entry.collection === "blog") {
    data.contentType = entry.data.contentType;
    data.translationStatus = "draft";
  } else {
    data.tags = await Promise.all(entry.data.tags.map((tag) => translateText(tag, sourceLocale, target)));
    data.publicationStatus = "draft";
  }

  const relativeSource = relative(join(contentRoot, entry.collection, sourceLocale), entry.filePath);
  const targetPath = resolve(contentRoot, entry.collection, target, relativeSource);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${serialize(data)}\n${body.trim()}\n`);
  console.log(`${entry.collection}/${entry.data.translationKey}/${target}`);
}
