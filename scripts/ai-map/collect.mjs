#!/usr/bin/env node
// Step 1 of the monthly AI map update: pull raw observations from public APIs/datasets for the curated entries
// and save one JSON snapshot per source under data/ai-map/raw/<YYYY-MM-DD>/. No AI involved.
// Usage: node scripts/ai-map/collect.mjs [--only huggingface,github] [--date 2026-12-01]
import { resolve } from "node:path";
import { sources } from "./sources/index.mjs";
import { loadSeed, rawDir, writeJson } from "./lib/paths.mjs";
import { isoDate } from "./lib/dates.mjs";

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const only = option("only")?.split(",").map((value) => value.trim());
const date = option("date") ?? isoDate();
const now = new Date(`${date}T00:00:00Z`);
const { entries } = loadSeed();
const active = entries.filter((entry) => entry.status !== "removed");
const outDir = resolve(rawDir, date);
const manifest = { date, startedAt: new Date().toISOString(), sources: {} };

for (const source of sources) {
  if (only && !only.includes(source.id)) continue;
  const started = Date.now();
  process.stdout.write(`→ ${source.id} … `);
  let result;
  try {
    result = await source.collect(active, { now });
  } catch (error) {
    result = { items: {}, errors: [`fatal: ${error.message}`] };
  }
  const retrievedAt = new Date().toISOString();
  const status = result.skipped ? "skipped" : result.errors?.length && !Object.keys(result.items).length ? "failed" : result.errors?.length ? "partial" : "ok";
  writeJson(resolve(outDir, `${source.id}.json`), {
    source: source.id, label: source.label, license: source.license, retrievedAt, status,
    skipped: result.skipped ?? null, notes: result.notes ?? [], errors: result.errors ?? [], items: result.items,
  });
  manifest.sources[source.id] = { status, items: Object.keys(result.items).length, errors: result.errors?.length ?? 0, skipped: result.skipped ?? null, seconds: Math.round((Date.now() - started) / 100) / 10 };
  console.log(`${status} (${Object.keys(result.items).length} items, ${result.errors?.length ?? 0} errors${result.skipped ? `, ${result.skipped}` : ""})`);
  for (const error of result.errors ?? []) console.log(`   ! ${error}`);
}

manifest.finishedAt = new Date().toISOString();
const manifestPath = resolve(outDir, "manifest.json");
let previous = {};
try { previous = (await import(manifestPath, { with: { type: "json" } })).default; } catch { /* first run of the day */ }
writeJson(manifestPath, { ...previous, ...manifest, sources: { ...(previous.sources ?? {}), ...manifest.sources } });
console.log(`Raw snapshot written to ${outDir}`);
