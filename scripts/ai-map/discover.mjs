#!/usr/bin/env node
// Monthly discovery stage: list popular, recently active AI agent projects and Hugging Face organisations that the map
// does not cover yet. Deterministic public-API queries only, no AI. It NEVER edits src/data/ai-map/entries.json —
// output goes to data/ai-map/candidates/discovery/<date>.json and section 6 of data/ai-map/reports/<date>.md.
// Usage: node scripts/ai-map/discover.mjs [--date 2026-12-01]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { candidatesDir, loadSeed, reportsDir, writeJson } from "./lib/paths.mjs";
import { isoDate } from "./lib/dates.mjs";
import { renderDiscoverySection, runDiscovery, upsertSection } from "./lib/discover.mjs";

const args = process.argv.slice(2);
const date = args.includes("--date") ? args[args.indexOf("--date") + 1] : isoDate();
const { entries } = loadSeed();
const token = process.env.GITHUB_TOKEN || undefined;
if (!token) console.log("No GITHUB_TOKEN: using anonymous GitHub search (10 requests/minute), paced and waiting on rate limits.");

const data = await runDiscovery({ entries, now: new Date(`${date}T00:00:00Z`), token, log: (line) => console.log(`  ${line}`) });
const jsonPath = resolve(candidatesDir, "discovery", `${date}.json`);
writeJson(jsonPath, data);

mkdirSync(reportsDir, { recursive: true });
const reportPath = resolve(reportsDir, `${date}.md`);
const existing = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : `# AI 产业地图 · 数据更新候选报告 ${date}\n\n（本日尚未运行 build.mjs，以下仅为发现候选。）\n`;
writeFileSync(reportPath, upsertSection(existing, renderDiscoverySection(data)));

console.log(`Discovery: ${data.github.length} GitHub + ${data.huggingface.length} Hugging Face candidates, ${data.errors.length} errors`);
console.log(`JSON:   data/ai-map/candidates/discovery/${date}.json`);
console.log(`Report: data/ai-map/reports/${date}.md (section 6)`);
