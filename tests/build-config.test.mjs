import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Astro package scripts expose deterministic verification commands", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(pkg.scripts.build, "astro build");
  assert.equal(pkg.scripts.check, "astro check");
  assert.equal(pkg.scripts.test, "npm run test:unit");
  assert.match(pkg.scripts.verify, /npm run check/);
  assert.match(pkg.scripts.verify, /npm run build/);
  assert.match(pkg.scripts.verify, /npm run test:e2e/);
});

test("Astro config uses static output and the existing public domain", () => {
  const config = read("astro.config.mjs");

  assert.match(config, /output:\s*["']static["']/);
  assert.match(config, /site:\s*["']https:\/\/www\.bydziwen\.top["']/);
  assert.match(config, /sitemap\(\)/);
});

test("Pages workflow verifies and deploys only main to the configured site", () => {
  const workflow = read(".github/workflows/deploy-pages.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npx playwright install --with-deps chromium/);
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /actions\/upload-pages-artifact/);
  assert.match(workflow, /actions\/deploy-pages/);
  assert.match(workflow, /needs:\s*build/);
});
