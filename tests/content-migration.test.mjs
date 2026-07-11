import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadContentEntries, parseFrontmatter } from "../scripts/lib/content-files.mjs";

const manifest = JSON.parse(readFileSync(new URL("../blogs/manifest.json", import.meta.url), "utf8"));
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
  "favorites:fix-your-life-in-one-day",
]);
const publicBlogIds = [...approvedGroups]
  .filter((key) => key.startsWith("blog:"))
  .map((key) => key.slice("blog:".length));
const publicFavoriteIds = [...approvedGroups]
  .filter((key) => key.startsWith("favorites:"))
  .map((key) => key.slice("favorites:".length));

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function structure(content) {
  return {
    images: (content.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length,
    codeFences: (content.match(/^```/gm) ?? []).length,
    tables: (content.match(/^\|(?:\s*:?-{3,}:?\s*\|)+$/gm) ?? []).length,
  };
}

function headingLevels(content) {
  const levels = [];
  let inFence = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{1,6})\s+/);
    if (match) levels.push(match[1].length);
  }
  return levels;
}

function legacyBody(content) {
  let body = content;
  if (body.startsWith("---\n")) body = parseFrontmatter(body).body;
  body = body.replace(/<style>[\s\S]*?<\/style>/gi, "").trim();
  body = body.replaceAll("\\`\\`\\`", "```");
  return body;
}

test("content root contains only approved public groups", () => {
  const actualGroups = new Set(entries.map((entry) => `${entry.collection}:${entry.data.translationKey}`));
  const chineseGroups = new Set(entries
    .filter((entry) => entry.data.locale === "zh")
    .map((entry) => `${entry.collection}:${entry.data.translationKey}`));

  assert.equal(approvedGroups.size, 9);
  assert.equal(entries.length, 24);
  assert.deepEqual([...actualGroups].sort(), [...approvedGroups].sort());
  assert.deepEqual([...chineseGroups].sort(), [...approvedGroups].sort());
  assert.ok(entries.filter((entry) => entry.data.locale === "zh")
    .every((entry) => approvedGroups.has(`${entry.collection}:${entry.data.translationKey}`)));
});

test("every approved legacy manifest entry has a normalized Chinese content file", () => {
  const publicManifest = manifest.filter((item) => publicBlogIds.includes(item.id));
  assert.deepEqual(publicManifest.map((item) => item.id), publicBlogIds);

  for (const item of publicManifest) {
    const target = `src/content/blog/zh/${item.id}.md`;
    assert.equal(existsSync(new URL(`../${target}`, import.meta.url)), true, target);

    const migrated = parseFrontmatter(read(target), target);
    const legacy = legacyBody(read(item.filename));

    assert.equal(migrated.data.translationKey, item.id);
    assert.equal(migrated.data.locale, "zh");
    assert.match(migrated.data.sourceUrl, /^https:\/\//);
    assert.doesNotMatch(migrated.body, /<style>/i);
    assert.equal(headingLevels(migrated.body).includes(1), false, `${item.id} must not contain a body h1`);
    assert.deepEqual(structure(migrated.body), structure(legacy), `${item.id} structure`);
  }

  for (const id of publicBlogIds) {
    for (const locale of ["zh", "en"]) {
      const target = `src/content/blog/${locale}/${id}.md`;
      assert.equal(existsSync(new URL(`../${target}`, import.meta.url)), true, target);
    }
  }
});

test("Chinese favorites are summaries with canonical public source links", () => {
  for (const slug of publicFavoriteIds) {
    const path = `src/content/favorites/zh/${slug}.md`;
    const entry = parseFrontmatter(read(path), path);
    assert.equal(entry.data.locale, "zh");
    assert.equal(entry.data.visibility, "public");
    assert.equal(entry.data.publicationStatus, "reviewed");
    assert.match(entry.data.sourceUrl, /^https:\/\//);
    assert.ok(entry.body.length < 1200, `${slug} must remain a concise summary`);
  }
});
