import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadContentEntries } from "../scripts/lib/content-files.mjs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("../blogs/manifest.json", import.meta.url), "utf8"));
const publicChineseFavorites = loadContentEntries(fileURLToPath(new URL("../src/content", import.meta.url)))
  .filter((entry) => entry.collection === "favorites" && entry.data.locale === "zh" && entry.data.publicationStatus !== "draft");

test("approved Chinese articles build as static canonical pages", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  for (const item of manifest) {
    const path = new URL(`../dist/blog/${item.id}/index.html`, import.meta.url);
    assert.equal(existsSync(path), true, item.id);
    const html = readFileSync(path, "utf8");
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, item.id);
    assert.match(html, /class="article-content"/);
    assert.match(html, /https:\/\//);
    assert.match(html, new RegExp(`https://www\\.bydziwen\\.top/blog/${item.id}`));
  }
});

test("Blog and Favorites indexes are generated from content collections", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  const blog = readFileSync(new URL("../dist/blog/index.html", import.meta.url), "utf8");
  const favorites = readFileSync(new URL("../dist/favorites/index.html", import.meta.url), "utf8");
  assert.equal((blog.match(/class="article-card"/g) ?? []).length, manifest.length);
  assert.equal((favorites.match(/class="favorite-item"/g) ?? []).length, publicChineseFavorites.length);
});
