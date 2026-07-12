import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4321";
const output = join(root, "lighthouse-reports");
const lighthouseCli = join(root, "node_modules", "lighthouse", "cli", "index.js");
const routes = [
  { name: "home", path: "/" },
  { name: "blog", path: "/blog" },
  { name: "article", path: "/blog/getting-started-with-loops" },
];
const profiles = ["mobile", "desktop"];
const thresholds = {
  performance: 90,
  accessibility: 95,
  "best-practices": 95,
  seo: 95,
  lcp: 2500,
  cls: 0.1,
};

function score(report, category) {
  return Math.round((report.categories[category]?.score ?? 0) * 100);
}

function metric(report, audit) {
  const value = report.audits[audit]?.numericValue;
  return Number.isFinite(value) ? value : null;
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const summary = [];
const failures = [];
for (const route of routes) {
  for (const profile of profiles) {
    const reportPath = join(output, `${route.name}-${profile}.json`);
    const targetUrl = new URL(route.path, baseUrl).href;
    const args = [
      lighthouseCli,
      targetUrl,
      "--quiet",
      "--output=json",
      `--output-path=${reportPath}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--max-wait-for-load=45000",
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
    ];
    if (profile === "desktop") args.push("--preset=desktop");

    const result = spawnSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CHROME_PATH: chromium.executablePath() },
      maxBuffer: 10 * 1024 * 1024,
    });
    if (result.status !== 0) {
      throw new Error(`${route.name}/${profile} Lighthouse failed:\n${result.stdout}\n${result.stderr}`);
    }

    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    if (report.runtimeError) failures.push(`${route.name}/${profile}: Lighthouse runtime error`);
    if (report.finalUrl !== targetUrl) failures.push(`${route.name}/${profile}: final URL does not match target URL`);
    if (report.audits["http-status-code"]?.score !== 1) failures.push(`${route.name}/${profile}: HTTP status audit failed`);
    const lcp = metric(report, "largest-contentful-paint");
    const cls = metric(report, "cumulative-layout-shift");
    const row = {
      route: route.name,
      profile,
      performance: score(report, "performance"),
      accessibility: score(report, "accessibility"),
      bestPractices: score(report, "best-practices"),
      seo: score(report, "seo"),
      lcpMs: lcp === null ? null : Math.round(lcp),
      cls: cls === null ? null : Number(cls.toFixed(4)),
    };
    summary.push(row);

    for (const [key, minimum] of Object.entries({
      performance: thresholds.performance,
      accessibility: thresholds.accessibility,
      bestPractices: thresholds["best-practices"],
      seo: thresholds.seo,
    })) {
      if (row[key] < minimum) failures.push(`${route.name}/${profile}: ${key} ${row[key]} < ${minimum}`);
    }
    if (row.lcpMs === null) failures.push(`${route.name}/${profile}: LCP metric missing`);
    else if (row.lcpMs <= 0) failures.push(`${route.name}/${profile}: LCP must be greater than 0ms`);
    else if (row.lcpMs >= thresholds.lcp) failures.push(`${route.name}/${profile}: LCP ${row.lcpMs}ms >= ${thresholds.lcp}ms`);
    if (row.cls === null) failures.push(`${route.name}/${profile}: CLS metric missing`);
    else if (row.cls >= thresholds.cls) failures.push(`${route.name}/${profile}: CLS ${row.cls} >= ${thresholds.cls}`);
  }
}

writeFileSync(join(output, "summary.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), thresholds, results: summary }, null, 2)}\n`);
console.table(summary);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Lighthouse passed (${summary.length} reports).`);
}
