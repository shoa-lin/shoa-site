import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseCsv } from "../scripts/ai-map/lib/csv.mjs";
import { selectFacts } from "../scripts/ai-map/lib/facts.mjs";

const root = new URL("../", import.meta.url);
const rules = JSON.parse(readFileSync(new URL("src/data/ai-map/taxonomy.json", root), "utf8")).rules;

test("CSV parser handles quotes, commas and newlines inside fields", () => {
  const rows = parseCsv('Name,Note\nA,"x, ""y""\nz"\r\nB,plain\n');
  assert.deepEqual(rows, [{ Name: "A", Note: 'x, "y"\nz' }, { Name: "B", Note: "plain" }]);
});

test("fact selection puts manual facts first, follows `show`, caps the count and drops stale data", () => {
  const entry = {
    id: "demo",
    show: ["githubStars", "githubLastPush", "hfFollowers"],
    manualFacts: [
      { key: "m1", label: { zh: "甲", en: "A" }, value: 1, sourceUrl: "https://example.com/a", sourceName: "A", asOf: "2026-10-01", verifiedAt: "2026-11-01", verifiedBy: "test" },
      { key: "old", label: { zh: "旧", en: "Old" }, value: 2, sourceUrl: "https://example.com/b", sourceName: "B", asOf: "2024-01-01", verifiedAt: "2026-11-01", verifiedBy: "test" },
    ],
  };
  const raw = {
    github: { retrievedAt: "2026-11-11T00:00:00Z", items: { demo: { repo: "o/r", stars: 10, pushedAt: "2026-11-10T00:00:00Z", archived: false } } },
    huggingface: { retrievedAt: "2026-11-11T00:00:00Z", items: { demo: { org: "o", followers: 5, models: 1 } } },
  };
  const result = selectFacts(entry, raw, rules, new Date("2026-11-11T00:00:00Z"));
  assert.deepEqual(result.display.map((fact) => fact.key), ["m1", "githubStars", "githubLastPush"]);
  assert.ok(result.dropped.some((drop) => drop.key === "old"));
  assert.equal(result.lastActivity, "2026-11-10");
  for (const fact of result.display) {
    assert.match(fact.sourceUrl, /^https:\/\//);
    assert.ok(fact.asOf && fact.verifiedAt);
  }
});

test("published AI map data passes the source audit", () => {
  const result = spawnSync(process.execPath, ["scripts/ai-map/validate.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("every AI map entry is placed in a known cell and has bilingual copy", () => {
  const entries = JSON.parse(readFileSync(new URL("src/data/ai-map/entries.json", root), "utf8"));
  const taxonomy = JSON.parse(readFileSync(new URL("src/data/ai-map/taxonomy.json", root), "utf8"));
  const categories = new Set(taxonomy.layers.flatMap((layer) => layer.categories.map((category) => category.id)));
  assert.equal(categories.size, 17);
  for (const entry of entries) {
    assert.ok(categories.has(entry.category), entry.id);
    assert.ok(entry.name.zh && entry.name.en && entry.oneLiner.zh && entry.oneLiner.en, entry.id);
  }
});

test("November 2026 additions sit in their intended cells with sourced facts", () => {
  const entries = JSON.parse(readFileSync(new URL("src/data/ai-map/entries.json", root), "utf8"));
  const metrics = JSON.parse(readFileSync(new URL("src/data/ai-map/metrics.json", root), "utf8"));
  const hermes = entries.find((entry) => entry.id === "hermes-agent");
  const workbuddy = entries.find((entry) => entry.id === "workbuddy");
  assert.deepEqual([hermes.category, hermes.region, hermes.country, hermes.sources.github.repo], ["coding-agents", "global", "US", "NousResearch/hermes-agent"]);
  assert.deepEqual([workbuddy.category, workbuddy.region, workbuddy.country], ["enterprise-agents", "cn", "CN"]);
  for (const id of ["hermes-agent", "workbuddy"]) {
    const facts = metrics.entries[id]?.facts ?? [];
    assert.ok(facts.length >= 2, id);
    for (const fact of facts) assert.match(fact.sourceUrl, /^https:\/\//, `${id} ${fact.key}`);
  }
});
