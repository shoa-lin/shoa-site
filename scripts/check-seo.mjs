import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "dist");
const failures = [];

function walk(directory, output = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, output);
    else if (path.endsWith(".html")) output.push(path);
  }
  return output;
}

if (!existsSync(root)) throw new Error(`Missing build directory: ${root}`);
const htmlFiles = walk(root);

for (const file of htmlFiles) {
  const path = relative(root, file);
  const html = readFileSync(file, "utf8");
  const required = [
    ["title", /<title>[^<]+<\/title>/],
    ["description", /<meta name="description" content="[^"]+"/],
    ["canonical", /<link rel="canonical" href="https:\/\/www\.bydziwen\.top\//],
    ["og title", /<meta property="og:title" content="[^"]+"/],
    ["og description", /<meta property="og:description" content="[^"]+"/],
    ["og url", /<meta property="og:url" content="https:\/\/www\.bydziwen\.top\//],
    ["og image", /<meta property="og:image" content="https:\/\/www\.bydziwen\.top\//],
    ["twitter card", /<meta name="twitter:card" content="summary_large_image"/],
  ];
  for (const [label, pattern] of required) if (!pattern.test(html)) failures.push(`${path}: missing ${label}`);
  // hreflang alternates: at least one locale plus x-default, and every target must be a built page.
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="https:\/\/www\.bydziwen\.top(\/[^"]*)"/g)];
  if (alternates.length < 2) failures.push(`${path}: expected hreflang alternates plus x-default`);
  if (!alternates.some(([, lang]) => lang === "x-default")) failures.push(`${path}: missing x-default alternate`);
  for (const [, lang, href] of alternates) {
    const clean = href.replace(/[?#].*$/, "");
    const candidates = /\.[a-z0-9]+$/i.test(clean)
      ? [join(root, clean)]
      : [join(root, clean, "index.html"), join(root, `${clean}.html`)];
    if (!candidates.some((target) => existsSync(target))) failures.push(`${path}: hreflang ${lang} points to missing ${href}`);
  }
  const isArticle = /(?:^|\/)blog\/[^/]+\/index\.html$/.test(path) && !/(?:^|\/)blog\/index\.html$/.test(path);
  if (isArticle && !/<script type="application\/ld\+json">[^<]*"@type":"Article"/.test(html)) {
    failures.push(`${path}: missing Article JSON-LD`);
  }
}

const sitemapIndex = join(root, "sitemap-index.xml");
const sitemap = join(root, "sitemap-0.xml");
if (!existsSync(sitemapIndex) || !existsSync(sitemap)) failures.push("missing sitemap output");
else if (/\/projects/.test(readFileSync(sitemap, "utf8"))) failures.push("sitemap contains forbidden project URL");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`SEO check passed (${htmlFiles.length} HTML pages).`);
