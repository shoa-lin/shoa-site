import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadContentEntries, locales } from "../scripts/lib/content-files.mjs";

const root = new URL("../", import.meta.url);
const entries = loadContentEntries(fileURLToPath(new URL("../src/content", import.meta.url)));
const publicChineseArticles = entries
  .filter((entry) => entry.collection === "blog" && entry.data.locale === "zh" && entry.data.translationStatus !== "draft");
const publicChineseFavorites = entries
  .filter((entry) => entry.collection === "favorites" && entry.data.locale === "zh" && entry.data.publicationStatus !== "draft");
const quarantinedBlogIds = [
  "clawdbot-installation-guide",
  "x-algorithm-research-report",
  "demystifying-evals-for-ai-agents",
  "claude-agent-sdk-complete-guide",
  "claude-code-2.1.2-release",
  "project-vend-phase-2",
];

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

  for (const slug of quarantinedBlogIds) {
    assert.equal(existsSync(new URL(`../dist/blog/${slug}/index.html`, import.meta.url)), false, slug);
    for (const locale of locales.filter((value) => value !== "zh")) {
      const path = new URL(`../dist/${locale}/blog/${slug}/index.html`, import.meta.url);
      assert.equal(existsSync(path), false, `${locale}/${slug}`);
    }
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
