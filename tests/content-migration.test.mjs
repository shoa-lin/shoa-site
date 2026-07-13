import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadContentEntries, locales } from "../scripts/lib/content-files.mjs";
import { structureSignature } from "../scripts/lib/translate-markdown.mjs";

const entries = loadContentEntries(fileURLToPath(new URL("../src/content", import.meta.url)));
const approvedGroups = [
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
  "favorites:fix-your-life-in-one-day",
];
const expectedStructure = {
  "blog:getting-started-with-loops": { headings: 8, images: 4, codeFences: 8, tables: 1, links: 9 },
  "blog:loop-engineering": { headings: 9, images: 0, codeFences: 0, tables: 1, links: 19 },
  "blog:state-of-ai-agent-memory-2026": { headings: 23, images: 3, codeFences: 0, tables: 3, links: 22 },
  "blog:dynamic-workflows-in-claude-code": { headings: 29, images: 9, codeFences: 0, tables: 0, links: 15 },
  "blog:harness-engineering": { headings: 14, images: 6, codeFences: 0, tables: 1, links: 12 },
  "blog:lessons-from-building-claude-code-skills": { headings: 26, images: 11, codeFences: 0, tables: 0, links: 7 },
  "blog:prompt-caching-best-practices": { headings: 19, images: 2, codeFences: 0, tables: 0, links: 0 },
  "blog:pi-minimal-agent": { headings: 10, images: 2, codeFences: 0, tables: 0, links: 0 },
  "blog:ai-agent-patterns": { headings: 25, images: 0, codeFences: 12, tables: 5, links: 0 },
  "blog:ai-agent-engineering-patterns": { headings: 21, images: 0, codeFences: 24, tables: 2, links: 4 },
  "favorites:fix-your-life-in-one-day": { headings: 0, images: 0, codeFences: 0, tables: 0, links: 0 },
};
const loopsImages = [
  { headingIndex: -1, target: "https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg" },
  { headingIndex: 1, target: "https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png" },
  { headingIndex: 2, target: "https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png" },
  { headingIndex: 4, target: "https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png" },
];

function groupKey(entry) {
  return `${entry.collection}:${entry.data.translationKey}`;
}

function publicationStatus(entry) {
  return entry.collection === "blog" ? entry.data.translationStatus : entry.data.publicationStatus;
}

const publishedEntries = entries.filter((entry) => publicationStatus(entry) !== "draft");

function structureCounts(signature) {
  return {
    headings: signature.headings.length,
    images: signature.images.length,
    codeFences: signature.codeLanguages.length,
    tables: signature.tableCount,
    links: signature.externalLinks.length,
  };
}

test("content root contains exactly eleven approved groups with six reviewed locales", () => {
  const groups = Map.groupBy(publishedEntries, groupKey);

  assert.equal(approvedGroups.length, 11);
  assert.equal(publishedEntries.length, approvedGroups.length * locales.length);
  assert.deepEqual([...groups.keys()].sort(), [...approvedGroups].sort());

  for (const key of approvedGroups) {
    const group = groups.get(key);
    assert.ok(group, `${key}: missing group`);
    assert.equal(group.length, locales.length, `${key}: expected six files`);
    assert.deepEqual(
      group.map((entry) => entry.data.locale).sort(),
      [...locales].sort(),
      `${key}: locale set`,
    );
    assert.ok(group.every((entry) => entry.pathLocale === entry.data.locale), `${key}: path locale mismatch`);
    assert.ok(group.every((entry) => publicationStatus(entry) === "reviewed"), `${key}: all locales must be reviewed`);
  }
});

test("approved locale groups preserve canonical metadata and full markdown structure", () => {
  const groups = Map.groupBy(publishedEntries, groupKey);

  for (const key of approvedGroups) {
    const group = groups.get(key);
    const sourceLocales = new Set(group.map((entry) => entry.data.sourceLocale));
    const sourceUrls = new Set(group.map((entry) => entry.data.sourceUrl));
    assert.equal(sourceLocales.size, 1, `${key}: source locale consistency`);
    const [sourceLocale] = sourceLocales;
    assert.equal(sourceUrls.size, 1, `${key}: source URL parity`);
    assert.match([...sourceUrls][0], /^https:\/\//, `${key}: public source URL`);

    const source = group.find((entry) => entry.data.locale === sourceLocale);
    const chinese = group.find((entry) => entry.data.locale === "zh");
    assert.ok(source, `${key}: missing source entry`);
    assert.ok(chinese, `${key}: missing Chinese entry`);

    const sourceSignature = structureSignature(source.body);
    assert.deepEqual(structureCounts(sourceSignature), expectedStructure[key], `${key}: approved structure counts`);
    assert.equal(structureSignature(chinese.body).headings.includes(1), false, `${key}: Chinese body must not contain h1`);

    for (const entry of group) {
      assert.equal(groupKey(entry), key, `${entry.relativePath}: translation key`);
      assert.deepEqual(structureSignature(entry.body), sourceSignature, `${entry.relativePath}: structure parity`);
    }
  }
});

test("the Loops guide keeps its approved metadata, loop markers, and image placement", () => {
  const loops = entries.find((entry) => (
    groupKey(entry) === "blog:getting-started-with-loops" && entry.data.locale === "zh"
  ));

  assert.ok(loops);
  assert.equal(loops.data.title, "Claude Code Loops 入门：从手动回合到主动循环");
  assert.equal(loops.data.category, "development");
  assert.equal(loops.data.sourceUrl, "https://claude.com/blog/getting-started-with-loops");
  assert.deepEqual(structureSignature(loops.body).images, loopsImages);
  for (const marker of ["Turn-based loop", "Goal-based loop", "Time-based loop", "Proactive loop"]) {
    assert.match(loops.body, new RegExp(marker));
  }
  assert.match(loops.body, /### Turn-based loop[\s\S]*6a43eb603762e725a739d98c_8ace2295\.png/);
  assert.match(loops.body, /### Goal-based loop[\s\S]*6a43eb603762e725a739d98f_c6fa9ae5\.png/);
  assert.match(loops.body, /### Proactive loop[\s\S]*6a43eb603762e725a739d989_eb9e496a\.png/);
});

test("the approved Favorite remains a concise public editorial summary", () => {
  const favorite = entries.find((entry) => groupKey(entry) === "favorites:fix-your-life-in-one-day" && entry.data.locale === "zh");

  assert.ok(favorite);
  assert.equal(favorite.data.visibility, "public");
  assert.equal(favorite.data.publicationStatus, "reviewed");
  assert.ok(favorite.body.length < 1200);
});
