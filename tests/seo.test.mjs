import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

test("built pages pass SEO and internal-link audits", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  for (const [script, args] of [
    ["scripts/check-seo.mjs", ["dist"]],
    ["scripts/check-links.mjs", ["dist"]],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  }
});

test("build includes robots, localized RSS, sitemap, and no project URLs", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  for (const path of [
    "dist/robots.txt", "dist/rss.xml", "dist/en/rss.xml", "dist/ja/rss.xml",
    "dist/ko/rss.xml", "dist/th/rss.xml", "dist/fr/rss.xml", "dist/sitemap-index.xml",
  ]) {
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, path);
  }

  const sitemap = readFileSync(new URL("../dist/sitemap-0.xml", import.meta.url), "utf8");
  assert.doesNotMatch(sitemap, /\/projects/);
});

test("Blog index carries a deterministic legacy id redirect map", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/components/pages/BlogIndexPage.astro", import.meta.url), "utf8"));
  assert.match(source, /URLSearchParams/);
  assert.match(source, /legacyRoutes/);
  assert.match(source, /location\.replace/);
});
