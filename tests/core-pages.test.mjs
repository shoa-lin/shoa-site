import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const locales = ["zh", "en", "ja", "ko", "th", "fr"];
const htmlLang = { zh: "zh-CN", en: "en", ja: "ja", ko: "ko", th: "th", fr: "fr" };
const pages = ["home", "about", "blog", "favorites", "contact", "404"];

function builtPath(locale, page) {
  if (locale === "zh") {
    if (page === "home") return "dist/index.html";
    if (page === "404") return "dist/404.html";
    return `dist/${page}/index.html`;
  }
  if (page === "home") return `dist/${locale}/index.html`;
  return `dist/${locale}/${page}/index.html`;
}

test("Astro builds all six core pages in all six locales", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  for (const locale of locales) {
    for (const page of pages) {
      const html = readFileSync(new URL(builtPath(locale, page), root), "utf8");
      assert.match(html, new RegExp(`<html[^>]+lang="${htmlLang[locale]}"`), `${locale}/${page}`);
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${locale}/${page} must have one h1`);
      assert.match(html, /<link rel="canonical" href="https:\/\/www\.bydziwen\.top\//);
      assert.equal((html.match(/hreflang=/g) ?? []).length, 7, `${locale}/${page} alternate links`);
      assert.match(html, /data-theme-toggle/);
      assert.match(html, /class="language-menu"/);
      assert.doesNotMatch(html, /\/projects|Projects|项目展示|项目是系统实验/);
    }
  }
});

test("core copy uses the approved public contact and restrained voice", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

  const files = locales.flatMap((locale) => pages.map((page) => builtPath(locale, page)));
  const combined = files.map((path) => readFileSync(new URL(path, root), "utf8")).join("\n");

  assert.match(combined, /mailto:shoa_lin@outlook\.com/);
  assert.doesNotMatch(combined, /Move the world forward|Build cool systems|改变世界|公开工作台|系统实验/);
  assert.doesNotMatch(combined, /\/Users\/|\/home\/[^<\s]+\//);
});
