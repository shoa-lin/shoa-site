import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadContentEntries, locales } from "../scripts/lib/content-files.mjs";

const contentRoot = fileURLToPath(new URL("../src/content", import.meta.url));
const splitKeys = ["ai-agent-patterns", "ai-agent-engineering-patterns"];
const expectedLocales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"];

test("split Agent pattern articles each have eight reviewed architecture editions", () => {
  const entries = loadContentEntries(contentRoot).filter((entry) => entry.collection === "blog");

  assert.equal(entries.filter((entry) => entry.data.translationKey === "ai-agent-design-patterns").length, 0);
  assert.deepEqual(locales, expectedLocales);
  for (const translationKey of splitKeys) {
    const editions = entries.filter((entry) => entry.data.translationKey === translationKey);
    assert.equal(editions.length, expectedLocales.length, translationKey);
    assert.deepEqual(editions.map((entry) => entry.data.locale).sort(), [...expectedLocales].sort(), translationKey);
    assert.ok(editions.every((entry) => entry.data.category === "architecture"), translationKey);
    assert.ok(editions.every((entry) => entry.data.sourceLocale === "zh"), translationKey);
    assert.ok(editions.every((entry) => entry.data.contentType === "original"), translationKey);
    assert.ok(editions.every((entry) => entry.data.translationStatus === "reviewed"), translationKey);
  }
});

test("the Chinese Blackboard diagram is a preserved text block", () => {
  const source = loadContentEntries(contentRoot).find((entry) => (
    entry.collection === "blog"
    && entry.data.translationKey === "ai-agent-patterns"
    && entry.data.locale === "zh"
  ));

  assert.ok(source);
  assert.match(source.body, /### 09 Blackboard — 共享黑板[\s\S]*?```text\n\[共享黑板\][\s\S]*?└─────────────────────────────────┘\n```/);
});

test("part one structural diagrams are preserved text blocks in every locale", () => {
  const entries = loadContentEntries(contentRoot).filter((entry) => (
    entry.collection === "blog" && entry.data.translationKey === "ai-agent-patterns"
  ));

  for (const entry of entries) {
    const textBlocks = [...entry.body.matchAll(/^```text\n[\s\S]*?^```$/gm)];
    const proseOnly = entry.body.replace(/^```[\s\S]*?^```$/gm, "");

    assert.equal(textBlocks.length, 6, `${entry.data.locale}: structural diagram block count`);
    assert.doesNotMatch(proseOnly, /^[> ]*.*[┌┐└┘│├┤─].*$/m, `${entry.data.locale}: box diagram must be fenced`);
    assert.doesNotMatch(proseOnly, /^>.*[↓↑].*$/m, `${entry.data.locale}: flow diagram must be fenced`);
  }
});

test("the pattern overview is a compact multi-line hierarchy in every locale", () => {
  const entries = loadContentEntries(contentRoot).filter((entry) => (
    entry.collection === "blog" && entry.data.translationKey === "ai-agent-patterns"
  ));

  for (const entry of entries) {
    const textBlocks = [...entry.body.matchAll(/^```text\n([\s\S]*?)^```$/gm)];
    const overview = textBlocks[5]?.[1] ?? "";
    const lines = overview.trim().split("\n");

    assert.ok(lines.length >= 16, `${entry.data.locale}: overview must keep its hierarchy on separate lines`);
    assert.match(overview, /^├/m, `${entry.data.locale}: overview must include layer separators`);
    assert.ok(Math.max(...lines.map((line) => line.length)) <= 28, `${entry.data.locale}: overview must stay compact`);
  }
});

test("split articles separate Agent behavior from engineering structure", () => {
  const byKey = (translationKey) => loadContentEntries(contentRoot).find((entry) => (
    entry.collection === "blog" && entry.data.translationKey === translationKey && entry.data.locale === "zh"
  ));
  const partOne = byKey("ai-agent-patterns");
  const partTwo = byKey("ai-agent-engineering-patterns");

  assert.ok(partOne, "the first part exists");
  assert.equal(partOne.data.translationStatus, "reviewed");
  assert.equal(partOne.data.title, "AI Agent 设计模式（上）：可靠运行");
  assert.match(partOne.body, /## 第一层：单 Agent 核心模式/);
  assert.match(partOne.body, /## 下一篇：AI Agent 工程设计模式/);
  assert.doesNotMatch(partOne.body, /## 一、经典 GoF 模式在 Agent 中的新生命/);

  assert.ok(partTwo, "the engineering-pattern part exists");
  assert.equal(partTwo.data.translationStatus, "reviewed");
  assert.equal(partTwo.data.title, "AI Agent 工程设计模式（下）：可靠落地");
  assert.match(partTwo.body, /## 一、经典 GoF 模式在 Agent 中的新生命/);
  assert.match(partTwo.body, /## 先建立一张工程地图/);
  assert.doesNotMatch(partTwo.body, /## 第一层：单 Agent 核心模式/);
});

test("part two state machine is a compact vertical state flow in every locale", () => {
  const entries = loadContentEntries(contentRoot).filter((entry) => (
    entry.collection === "blog" && entry.data.translationKey === "ai-agent-engineering-patterns"
  ));

  for (const entry of entries) {
    const diagram = entry.body.match(/```text\n(\[PLANNING\][\s\S]*?\[EXECUTING\][\s\S]*?)^```/m)?.[1] ?? "";
    const lines = diagram.trim().split("\n");

    assert.ok(lines.length >= 14, `${entry.data.locale}: state flow must keep transitions on separate lines`);
    assert.deepEqual(
      ["[PLANNING]", "[EXECUTING]", "[REVIEW]", "[FALLBACK]", "[TIMEOUT]", "[COMPLETE]"].filter((label) => diagram.includes(label)),
      ["[PLANNING]", "[EXECUTING]", "[REVIEW]", "[FALLBACK]", "[TIMEOUT]", "[COMPLETE]"],
      entry.data.locale,
    );
    assert.match(diagram, /plan_ready/, entry.data.locale);
    assert.match(diagram, /retry/, entry.data.locale);
    assert.ok(Math.max(...lines.map((line) => line.length)) <= 30, `${entry.data.locale}: state flow must fit a mobile reading column`);
  }
});
