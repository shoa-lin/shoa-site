#!/usr/bin/env node
// Step 3 (after review): publish a reviewed candidate to src/data/ai-map/metrics.json, which the site reads.
// Usage: node scripts/ai-map/apply.mjs [--date 2026-12-01]
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { candidatesDir, readJson, siteDataDir, writeJson } from "./lib/paths.mjs";

const args = process.argv.slice(2);
const date = args.includes("--date") ? args[args.indexOf("--date") + 1]
  : readdirSync(candidatesDir).filter((name) => name.endsWith(".json")).sort().at(-1)?.replace(/\.json$/, "");
const path = resolve(candidatesDir, `${date}.json`);
if (!date || !existsSync(path)) { console.error("No candidate found. Run build.mjs first."); process.exit(1); }
const { audit, ...candidate } = readJson(path);
writeJson(resolve(siteDataDir, "metrics.json"), candidate);
console.log(`Applied candidate ${date} → src/data/ai-map/metrics.json (${Object.keys(candidate.entries).length} entries)`);
