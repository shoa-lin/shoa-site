#!/usr/bin/env node
// Step 2: merge the latest raw snapshot with the curated seed into a candidate metrics file plus a human-readable
// diff report (new / changed / stale / failed). Nothing here is published until a maintainer reviews it and runs apply.
// Usage: node scripts/ai-map/build.mjs [--date 2026-12-01]
import { existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { candidatesDir, latestSubdir, loadSeed, rawDir, readJson, reportsDir, siteDataDir, writeJson } from "./lib/paths.mjs";
import { selectFacts, summarizeSources } from "./lib/facts.mjs";
import { daysBetween, isoDate } from "./lib/dates.mjs";

const args = process.argv.slice(2);
const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : null;
const date = dateArg ?? latestSubdir(rawDir);
if (!date || !existsSync(resolve(rawDir, date))) { console.error("No raw snapshot found. Run collect.mjs first."); process.exit(1); }
const snapshotDir = resolve(rawDir, date);
const raw = Object.fromEntries(readdirSync(snapshotDir).filter((name) => name.endsWith(".json") && name !== "manifest.json")
  .map((name) => { const data = readJson(resolve(snapshotDir, name)); return [data.source, data]; }));
const { taxonomy, entries } = loadSeed();
const rules = taxonomy.rules;
const today = new Date(`${date}T00:00:00Z`);
const publishedPath = resolve(siteDataDir, "metrics.json");
const published = existsSync(publishedPath) ? readJson(publishedPath) : { entries: {} };

const candidate = { dataAsOf: date, generatedAt: new Date().toISOString(), sources: summarizeSources(raw), entries: {} };
const audit = {};
for (const entry of entries.filter((item) => item.status !== "removed")) {
  const selection = selectFacts(entry, raw, rules, today);
  candidate.entries[entry.id] = { facts: selection.display, meta: selection.meta, lastActivity: selection.lastActivity };
  audit[entry.id] = selection;
}
writeJson(resolve(candidatesDir, `${date}.json`), { ...candidate, audit: Object.fromEntries(Object.entries(audit).map(([id, s]) => [id, { allFacts: s.all, dropped: s.dropped }])) });

// ---------- report
const lines = [];
const push = (line = "") => lines.push(line);
const fmt = (value) => typeof value === "number" ? value.toLocaleString("en-US") : typeof value === "object" ? JSON.stringify(value) : String(value);
push(`# AI 产业地图 · 数据更新候选报告 ${date}`);
push();
push(`生成时间：${candidate.generatedAt}（UTC）。本报告由脚本生成，未经人工审核前不代表最终上线数据。`);
push();
push("## 1. 数据源运行情况");
push();
push("| 数据源 | 状态 | 条目 | 错误 | 备注 |");
push("|---|---|---|---|---|");
for (const [id, s] of Object.entries(candidate.sources)) push(`| ${s.label} (\`${id}\`) | ${s.status} | ${s.items} | ${s.errors} | ${s.skipped ?? ""} |`);
for (const [id, snapshot] of Object.entries(raw)) for (const error of snapshot.errors ?? []) push(`- \`${id}\` ${error}`);
push();

const prev = published.entries ?? {};
const added = Object.keys(candidate.entries).filter((id) => !prev[id]);
const removed = Object.keys(prev).filter((id) => !candidate.entries[id]);
push("## 2. 条目变动");
push();
push(`- 新增条目（${added.length}）：${added.join(", ") || "无"}`);
push(`- 移出条目（${removed.length}）：${removed.join(", ") || "无"}`);
push();

push("## 3. 指标变化（与当前线上 metrics.json 比较；|变化| > 50% 标 ⚠️）");
push();
push("| 条目 | 指标 | 旧值 | 新值 | 变化 | 来源 |");
push("|---|---|---|---|---|---|");
let changes = 0;
for (const [id, current] of Object.entries(candidate.entries)) {
  for (const fact of current.facts) {
    const old = prev[id]?.facts?.find((item) => item.key === fact.key);
    if (old && old.value === fact.value) continue;
    let delta = "新";
    if (old && typeof old.value === "number" && typeof fact.value === "number" && old.value !== 0) {
      const pct = ((fact.value - old.value) / old.value) * 100;
      delta = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%${Math.abs(pct) > 50 ? " ⚠️" : ""}`;
    } else if (old) delta = "变更";
    changes += 1;
    push(`| ${id} | ${fact.key} | ${old ? fmt(old.value) : "—"} | ${fmt(fact.value)} | ${delta} | [${fact.sourceName}](${fact.sourceUrl}) |`);
  }
}
if (!changes) push("| — | — | — | — | 无变化 | — |");
push();

push("## 4. 需要人工处理");
push();
const problems = [];
for (const [id, current] of Object.entries(candidate.entries)) {
  const entry = entries.find((item) => item.id === id);
  if (!current.facts.length) problems.push(`- ❌ \`${id}\`：没有任何可展示的带来源指标（verify 会失败），请补人工核实指标或移出。`);
  else if (current.facts.length < 2) problems.push(`- ⚠️ \`${id}\`：只有 ${current.facts.length} 个指标，建议补到 2 个。`);
  for (const fact of current.facts.filter((item) => item.method === "manual")) {
    const age = daysBetween(fact.verifiedAt, today);
    if (age > rules.hideNumbersAfterDays) problems.push(`- ❌ \`${id}\` 人工指标 \`${fact.key}\` 已 ${age} 天未核实（>${rules.hideNumbersAfterDays} 天页面隐藏数字），请重新打开来源核实。`);
    else if (age > rules.staleAfterDays) problems.push(`- ⚠️ \`${id}\` 人工指标 \`${fact.key}\` 已 ${age} 天未核实（>${rules.staleAfterDays} 天页面标「待更新」）。`);
  }
  for (const drop of audit[id].dropped) problems.push(`- ℹ️ \`${id}\` 指标 \`${drop.key}\` 未采用：${drop.reason}`);
  if (current.lastActivity && daysBetween(current.lastActivity, today) > rules.activeWithinDays) problems.push(`- ⚠️ \`${id}\`：最近活动 ${current.lastActivity}，超过 ${rules.activeWithinDays} 天，检查是否仍活跃。`);
  const wd = raw.wikidata?.items?.[id];
  if (wd && entry && !entry.countryNote && wd.countries.length && !wd.countries.includes(entry.country)) problems.push(`- ⚠️ \`${id}\`：Wikidata 国家为 ${wd.countries.join("/")}，种子文件为 ${entry.country}，请确认。`);
}
const seen = new Map();
for (const entry of entries) {
  for (const key of [entry.wikidata && `qid:${entry.wikidata}`, entry.website && `domain:${new URL(entry.website).hostname.replace(/^www\./, "")}${new URL(entry.website).pathname.replace(/\/$/, "")}`].filter(Boolean)) {
    if (seen.has(key)) problems.push(`- ⚠️ 可能重复：\`${seen.get(key)}\` 与 \`${entry.id}\` 共用 ${key}`);
    else seen.set(key, entry.id);
  }
}
for (const line of problems.length ? problems : ["- 无"]) push(line);
push();
push("## 5. 审核清单");
push();
push("- [ ] 逐条打开 ⚠️/❌ 项的来源核对；核实不了的数字删掉，不要猜。");
push("- [ ] 人工指标（manualFacts）超过 45 天的，重新打开来源并更新 `verifiedAt`。");
push("- [ ] 新增/移出条目写清理由（入选标准见 scripts/ai-map/README.md）。");
push("- [ ] `npm run audit:ai-map` 与完整 `npm run verify` 通过后，再请站长合并。");
mkdirSync(reportsDir, { recursive: true });
writeFileSync(resolve(reportsDir, `${date}.md`), `${lines.join("\n")}\n`);
console.log(`Candidate: data/ai-map/candidates/${date}.json`);
console.log(`Report:    data/ai-map/reports/${date}.md  (${changes} metric changes, ${problems.length} review notes)`);
