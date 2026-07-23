import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadContentEntries, locales } from "../scripts/lib/content-files.mjs";

const root = new URL("../", import.meta.url);
const entries = loadContentEntries(fileURLToPath(new URL("../src/content", import.meta.url)));
const approvedGroups = new Set([
  "blog:getting-started-with-loops",
  "blog:loop-engineering",
  "blog:state-of-ai-agent-memory-2026",
  "blog:dynamic-workflows-in-claude-code",
  "blog:harness-engineering",
  "blog:lessons-from-building-claude-code-skills",
  "blog:prompt-caching-best-practices",
  "blog:pi-minimal-agent",
  "blog:ai-agent-patterns",
  "blog:ai-agent-engineering-patterns",
  "blog:ai-agent-retry-state",
  "blog:github-events-to-feishu",
  "favorites:fix-your-life-in-one-day",
]);
const approvedBlogIds = new Set([...approvedGroups]
  .filter((key) => key.startsWith("blog:"))
  .map((key) => key.slice("blog:".length)));
const publicChineseArticles = entries
  .filter((entry) => entry.collection === "blog" && entry.data.locale === "zh" && entry.data.translationStatus !== "draft");
const publicChineseFavorites = entries
  .filter((entry) => entry.collection === "favorites" && entry.data.locale === "zh" && entry.data.publicationStatus !== "draft");
const publishedEntries = entries.filter((entry) => (
  entry.collection === "blog" ? entry.data.translationStatus !== "draft" : entry.data.publicationStatus !== "draft"
));

function builtBlogSlugs(locale) {
  const directory = new URL(locale === "zh" ? "../dist/blog/" : `../dist/${locale}/blog/`, import.meta.url);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((item) => item.isDirectory() && existsSync(new URL(`${item.name}/index.html`, directory)))
    .map((item) => item.name)
    .sort();
}

test("approved Chinese articles build as static canonical pages", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  for (const entry of publicChineseArticles) {
    const slug = entry.data.translationKey;
    const path = new URL(`../dist/blog/${slug}/index.html`, import.meta.url);
    assert.equal(existsSync(path), true, slug);
    const html = readFileSync(path, "utf8");
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, slug);
    assert.match(html, /class="article-content"/);
    assert.match(html, /https:\/\//);
    assert.match(html, new RegExp(`https://www\\.bydziwen\\.top/blog/${slug}`));
  }

  assert.deepEqual(
    [...new Set(publishedEntries.map((entry) => `${entry.collection}:${entry.data.translationKey}`))].sort(),
    [...approvedGroups].sort(),
  );

  for (const locale of locales) {
    const expected = entries
      .filter((entry) => entry.collection === "blog" && entry.data.locale === locale && entry.data.translationStatus !== "draft")
      .map((entry) => entry.data.translationKey)
      .sort();
    const actual = builtBlogSlugs(locale);
    assert.deepEqual(actual, expected, locale);
    assert.ok(actual.every((slug) => approvedBlogIds.has(slug)), locale);
  }
});

test("Blog and Favorites indexes are generated from content collections", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  const blog = readFileSync(new URL("../dist/blog/index.html", import.meta.url), "utf8");
  const favorites = readFileSync(new URL("../dist/favorites/index.html", import.meta.url), "utf8");
  assert.equal((blog.match(/class="article-card"/g) ?? []).length, publicChineseArticles.length);
  assert.equal((favorites.match(/class="favorite-item"/g) ?? []).length, publicChineseFavorites.length);
});

test("the GitHub event article has eight reviewed editions with translated text diagrams", () => {
  const editions = entries.filter((entry) => (
    entry.collection === "blog" && entry.data.translationKey === "github-events-to-feishu"
  ));

  assert.equal(editions.length, locales.length);
  assert.deepEqual(editions.map((entry) => entry.data.locale).sort(), [...locales].sort());
  assert.ok(editions.every((entry) => entry.data.translationStatus === "reviewed"));
  assert.ok(editions.every((entry) => entry.data.contentType === "original"));
  assert.ok(editions.every((entry) => entry.data.sourceAuthor === "Shoa Lin"));
  assert.ok(editions.every((entry) => /\/assets\/blog\/github-events-to-feishu\/01-event-to-update\.png/.test(entry.body)));
  assert.ok(editions.every((entry) => /> /.test(entry.body)));

  for (const edition of editions.filter((entry) => entry.data.locale !== "zh")) {
    const diagrams = [...edition.body.matchAll(/```text\n([\s\S]*?)\n```/g)].map((match) => match[1]);
    assert.equal(diagrams.length, 3, edition.data.locale);
    assert.doesNotMatch(diagrams.join("\n"), /研发动态|事实：|关注：|链接：|本地 Agent/);
  }
});

test("Chinese drafts appear in local review lists but remain excluded from production lists", () => {
  const blogIndex = readFileSync(new URL("../src/components/pages/BlogIndexPage.astro", import.meta.url), "utf8");
  const home = readFileSync(new URL("../src/components/pages/HomePage.astro", import.meta.url), "utf8");

  for (const source of [blogIndex, home]) {
    assert.match(source, /data\.translationStatus !== "draft" \|\| \(locale === "zh" && import\.meta\.env\.DEV\)/);
  }
});
