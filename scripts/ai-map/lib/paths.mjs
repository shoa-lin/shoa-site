import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const siteDataDir = resolve(repoRoot, "src/data/ai-map");
export const pipelineDir = resolve(repoRoot, "data/ai-map");
export const rawDir = resolve(pipelineDir, "raw");
export const candidatesDir = resolve(pipelineDir, "candidates");
export const reportsDir = resolve(pipelineDir, "reports");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function latestSubdir(dir) {
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  return names.at(-1) ?? null;
}

export function loadSeed() {
  return {
    taxonomy: readJson(resolve(siteDataDir, "taxonomy.json")),
    entries: readJson(resolve(siteDataDir, "entries.json")),
  };
}
