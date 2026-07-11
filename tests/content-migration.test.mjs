import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { locales, parseFrontmatter } from "../scripts/lib/content-files.mjs";

const manifest = JSON.parse(readFileSync(new URL("../blogs/manifest.json", import.meta.url), "utf8"));

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

test("every approved legacy manifest entry has a normalized Chinese content file", () => {
  assert.equal(manifest.length, 14);

  for (const item of manifest) {
    const target = `src/content/blog/zh/${item.id}.md`;
    assert.equal(existsSync(new URL(`../${target}`, import.meta.url)), true, target);

    const migrated = parseFrontmatter(read(target), target);
    const legacy = legacyBody(read(item.filename));

    assert.equal(migrated.data.translationKey, item.id);
    assert.equal(migrated.data.locale, "zh");
    assert.equal(migrated.data.translationStatus, "reviewed");
    assert.match(migrated.data.sourceUrl, /^https:\/\//);
    assert.doesNotMatch(migrated.body, /<style>/i);
    assert.equal(headingLevels(migrated.body).includes(1), false, `${item.id} must not contain a body h1`);
    assert.deepEqual(structure(migrated.body), structure(legacy), `${item.id} structure`);
  }
});

test("Chinese favorites are summaries with canonical public source links", () => {
  for (const slug of ["fix-your-life-in-one-day"]) {
    const path = `src/content/favorites/zh/${slug}.md`;
    const entry = parseFrontmatter(read(path), path);
    assert.equal(entry.data.locale, "zh");
    assert.equal(entry.data.visibility, "public");
    assert.equal(entry.data.publicationStatus, "reviewed");
    assert.match(entry.data.sourceUrl, /^https:\/\//);
    assert.ok(entry.body.length < 1200, `${slug} must remain a concise summary`);
  }

  for (const locale of locales) {
    const path = `src/content/favorites/${locale}/manus-meeting.md`;
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, path);
  }
});
