#!/usr/bin/env node
// Gate for `npm run verify`: the AI map must never publish an entry or a number without a source.
// Checks the curated seed (taxonomy, caps, names, one-liners, manual facts) and the published metrics.json.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadSeed, readJson, siteDataDir } from "./lib/paths.mjs";

const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isHttps = (value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
const hasText = (value) => typeof value === "string" && value.trim().length > 0;

const { taxonomy, entries } = loadSeed();
const categories = new Map(taxonomy.layers.flatMap((layer) => layer.categories.map((category) => [category.id, { ...category, layer: layer.id }])));
const cnCountries = new Set(["CN", "TW", "HK", "MO"]);
const ids = new Set();
const counts = new Map();

for (const entry of entries) {
  const where = `entry ${entry.id ?? "(no id)"}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id ?? "")) fail(`${where}: id must be lowercase kebab-case`);
  if (ids.has(entry.id)) fail(`${where}: duplicate id`);
  ids.add(entry.id);
  const category = categories.get(entry.category);
  if (!category) fail(`${where}: unknown category ${entry.category}`);
  else if (category.layer !== entry.layer) fail(`${where}: category ${entry.category} belongs to layer ${category.layer}, not ${entry.layer}`);
  if (!taxonomy.regions.includes(entry.region)) fail(`${where}: region must be one of ${taxonomy.regions.join("/")}`);
  if (!/^[A-Z]{2}$/.test(entry.country ?? "")) fail(`${where}: country must be an ISO 3166-1 alpha-2 code`);
  if (entry.region === "cn" && !cnCountries.has(entry.country)) fail(`${where}: region cn requires country CN/TW/HK/MO`);
  if (entry.region === "global" && cnCountries.has(entry.country)) fail(`${where}: country ${entry.country} must use region cn`);
  for (const locale of ["zh", "en"]) {
    if (!hasText(entry.name?.[locale])) fail(`${where}: name.${locale} missing`);
    if (!hasText(entry.oneLiner?.[locale])) fail(`${where}: oneLiner.${locale} missing`);
    if (!hasText(entry.reason?.[locale])) fail(`${where}: reason.${locale} missing`);
  }
  if ([...(entry.oneLiner?.zh ?? "")].length > 45) fail(`${where}: oneLiner.zh longer than 45 characters`);
  if ((entry.oneLiner?.en ?? "").length > 110) fail(`${where}: oneLiner.en longer than 110 characters`);
  if (!isHttps(entry.website)) fail(`${where}: website must be an https URL`);
  if (entry.wikidata && !/^Q\d+$/.test(entry.wikidata)) fail(`${where}: wikidata must look like Q123`);
  if (!["active", "watch", "removed"].includes(entry.status)) fail(`${where}: status must be active/watch/removed`);
  if (!/^\d{4}-\d{2}$/.test(entry.firstListed ?? "")) fail(`${where}: firstListed must be YYYY-MM`);
  for (const fact of entry.manualFacts ?? []) {
    const label = `${where} manual fact ${fact.key ?? "(no key)"}`;
    if (!hasText(fact.key)) fail(`${label}: key missing`);
    if (!hasText(fact.label?.zh) || !hasText(fact.label?.en)) fail(`${label}: label.zh/en missing`);
    if (fact.value === undefined || fact.value === null || fact.value === "") fail(`${label}: value missing`);
    if (!isHttps(fact.sourceUrl)) fail(`${label}: sourceUrl must be https`);
    if (!hasText(fact.sourceName)) fail(`${label}: sourceName missing`);
    if (!isDate(fact.asOf)) fail(`${label}: asOf must be YYYY-MM-DD`);
    if (!isDate(fact.verifiedAt)) fail(`${label}: verifiedAt must be YYYY-MM-DD`);
    if (!hasText(fact.verifiedBy)) fail(`${label}: verifiedBy missing`);
  }
  if (entry.status !== "removed") {
    const key = `${entry.category}/${entry.region}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
}
for (const [key, count] of counts) {
  const [categoryId, region] = key.split("/");
  const cap = categories.get(categoryId)?.cap?.[region];
  if (cap !== undefined && count > cap) fail(`category ${categoryId} row ${region}: ${count} entries exceed the cap of ${cap}`);
}

const metricsPath = resolve(siteDataDir, "metrics.json");
if (!existsSync(metricsPath)) fail("src/data/ai-map/metrics.json missing — run collect, build and apply");
else {
  const metrics = readJson(metricsPath);
  if (!isDate(metrics.dataAsOf)) fail("metrics.json: dataAsOf must be YYYY-MM-DD");
  for (const id of Object.keys(metrics.entries ?? {})) if (!ids.has(id)) fail(`metrics.json: facts for unknown entry ${id}`);
  for (const entry of entries.filter((item) => item.status !== "removed")) {
    const facts = metrics.entries?.[entry.id]?.facts ?? [];
    if (!facts.length) { fail(`entry ${entry.id}: no sourced facts in metrics.json — entries without sources cannot be published`); continue; }
    if (facts.length > taxonomy.rules.maxFactsPerEntry) fail(`entry ${entry.id}: more than ${taxonomy.rules.maxFactsPerEntry} facts`);
    if (facts.length < 2) warnings.push(`${entry.id} has only one fact`);
    for (const fact of facts) {
      const label = `entry ${entry.id} fact ${fact.key}`;
      if (!isHttps(fact.sourceUrl)) fail(`${label}: sourceUrl must be https`);
      if (!hasText(fact.sourceName)) fail(`${label}: sourceName missing`);
      if (!isDate(fact.asOf)) fail(`${label}: asOf must be YYYY-MM-DD`);
      if (!isDate(fact.verifiedAt)) fail(`${label}: verifiedAt must be YYYY-MM-DD`);
      if (!["script", "manual"].includes(fact.method)) fail(`${label}: method must be script or manual`);
      if (fact.value === undefined || fact.value === null || fact.value === "") fail(`${label}: value missing`);
    }
  }
}

const policiesPath = resolve(siteDataDir, "policies.json");
if (existsSync(policiesPath)) {
  for (const policy of readJson(policiesPath)) {
    const where = `policy ${policy.id}`;
    if (!taxonomy.regions.includes(policy.region)) fail(`${where}: bad region`);
    if (!hasText(policy.title?.zh) || !hasText(policy.title?.en)) fail(`${where}: title.zh/en missing`);
    if (!isHttps(policy.sourceUrl)) fail(`${where}: sourceUrl must be https`);
    if (!isDate(policy.verifiedAt)) fail(`${where}: verifiedAt must be YYYY-MM-DD`);
  }
}

if (failures.length) {
  console.error(`AI map audit failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`AI map audit passed (${entries.filter((e) => e.status !== "removed").length} entries${warnings.length ? `; ${warnings.length} with a single fact` : ""}).`);
