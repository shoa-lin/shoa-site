import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  cleanComicSource,
  googleFontRequests,
  lintComicHtml,
  parseComicHtml,
} from "../src/lib/comic-html.ts";

const root = new URL("../", import.meta.url);

const authorComic = `<!DOCTYPE html>
<html lang="zh-CN" class="paper">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>测试漫画 · 第一话</title>
<meta name="description" content="一段描述">
<meta property="og:title" content="x">
<link rel="icon" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
<style>@import url("https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap");
.hero{background:url(img/hero.png)}</style>
</head>
<body class="comic">
<!-- 开场 -->
<header class="masthead"><h1>第一话</h1></header>
<img src="img/a.png" srcset="img/a.png 1x, img/a@2x.png 2x" alt="">
<img src="https://example.com/b.png" alt="">
<svg viewBox="0 0 10 10"><title>星星</title><image href="img/star.png"/></svg>
<p style="background:url('./img/dots.png')">内容</p>
<script>document.querySelector("h1").dataset.ready = "1";</script>
</body>
<style>.late{color:red}</style>
</html>`;

test("comic sources pass the repository comics check (metadata, editions, fonts, covers)", () => {
  const result = spawnSync(process.execPath, ["scripts/comics.mjs", "check"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("parseComicHtml keeps the author's styles and scripts but drops what the wrapper provides", () => {
  const doc = parseComicHtml(authorComic, { assetBase: "/comics/test/assets/" });

  assert.equal(doc.title, "测试漫画 · 第一话");
  assert.equal(doc.description, "一段描述");
  assert.deepEqual(doc.htmlAttrs, { class: "paper" });
  assert.deepEqual(doc.bodyAttrs, { class: "comic" });
  assert.doesNotMatch(doc.head, /<title>|<meta|rel="icon"|preconnect/);
  assert.match(doc.head, /\.hero\{background:url\(\/comics\/test\/assets\/img\/hero\.png\)\}/);
  assert.match(doc.body, /<header class="masthead">/);
  assert.match(doc.body, /document\.querySelector\("h1"\)/, "inline scripts survive");
  assert.match(doc.body, /<style>\.late\{color:red\}<\/style>/, "a style after </body> is kept");
  assert.match(doc.body, /<title>星星<\/title>/, "SVG titles are content, not page titles");
  assert.doesNotMatch(doc.body, /开场/, "comments are dropped");
});

test("without self-hosted fonts, Google Fonts load without blocking rendering", () => {
  const doc = parseComicHtml(authorComic);

  assert.equal(doc.googleFontUrls.length, 2);
  assert.match(doc.head, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Bangers[^>]*rel="stylesheet" media="print" onload="this\.media='all'">/);
  assert.match(doc.head, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=ZCOOL\+KuaiLe[^"]*" media="print"/);
  assert.doesNotMatch(doc.head, /@import/);
});

test("with self-hosted fonts, every Google Fonts reference is removed", () => {
  const doc = parseComicHtml(authorComic, { hasLocalFonts: true });

  assert.doesNotMatch(`${doc.head}${doc.body}`, /fonts\.(?:googleapis|gstatic)\.com/);
});

test("relative asset URLs point at the comic's asset folder", () => {
  const doc = parseComicHtml(authorComic, { assetBase: "/comics/test/assets/" });

  assert.match(doc.body, /<img src="\/comics\/test\/assets\/img\/a\.png" srcset="\/comics\/test\/assets\/img\/a\.png 1x, \/comics\/test\/assets\/img\/a@2x\.png 2x"/);
  assert.match(doc.body, /<img src="https:\/\/example\.com\/b\.png"/, "absolute URLs are untouched");
  assert.match(doc.body, /<image href="\/comics\/test\/assets\/img\/star\.png">/);
  assert.match(doc.body, /background:url\('\/comics\/test\/assets\/img\/dots\.png'\)/);
});

test("cleanComicSource removes site-shell leftovers and leaves author files byte for byte", () => {
  assert.deepEqual(cleanComicSource(authorComic), { html: authorComic, removed: 0 }, "nothing to clean: unchanged");

  const saved = authorComic
    .replace("<body class=\"comic\">", "<body class=\"comic\"><shoa-comic-header data-shoa-shell><template shadowrootmode=\"open\"><header>site</header></template></shoa-comic-header><header class=\"site-header comic-shell\" data-comic-header><nav>old</nav></header><nav class=\"comic-langs\"><a href=\"/en/\">English</a></nav>")
    .replace("</body>", "<shoa-comic-footer data-shoa-shell></shoa-comic-footer><a href=\"mailto:shoa_lin@outlook.com\" aria-label=\"Email\">Contact</a><script type=\"module\" src=\"/_astro/comic-shell.js\"></script></body>");
  const cleaned = cleanComicSource(saved);

  assert.equal(cleaned.removed, 6);
  assert.doesNotMatch(cleaned.html, /shoa-comic-|comic-shell|comic-langs|aria-label="Email"|\/_astro\//);
  assert.match(cleaned.html, /<header class="masthead">/);
  assert.match(cleaned.html, /<title>测试漫画 · 第一话<\/title>/);
});

test("googleFontRequests reads css2 and legacy css URLs", () => {
  assert.deepEqual(
    googleFontRequests("https://fonts.googleapis.com/css2?family=Bangers&family=Noto+Sans+SC:wght@400;700&display=swap"),
    [{ family: "Bangers", axes: "" }, { family: "Noto Sans SC", axes: "wght@400;700" }],
  );
  assert.deepEqual(
    googleFontRequests("https://fonts.googleapis.com/css?family=Roboto:400,700italic|Open+Sans"),
    [{ family: "Roboto", axes: "wght@400;700" }, { family: "Open Sans", axes: "" }],
  );
});

test("lintComicHtml flags page-level layout rules and blocking external resources", () => {
  const warnings = lintComicHtml(`<!doctype html><html><head><title>t</title>
<style>body{max-width:760px;margin:0 auto;padding:24px}.bar{position:fixed;top:0;height:6px}</style>
<link rel="stylesheet" href="https://cdn.example.com/x.css"><script src="https://cdn.example.com/x.js"></script>
</head><body><img src="pics/one.png"></body></html>`);

  assert.ok(warnings.some((warning) => /Page-level rule "body/.test(warning)), "body width/padding");
  assert.ok(warnings.some((warning) => /External stylesheet from cdn\.example\.com/.test(warning)));
  assert.ok(warnings.some((warning) => /External script from cdn\.example\.com/.test(warning)));
  assert.ok(warnings.some((warning) => /pics\/one\.png/.test(warning)), "relative assets need files");
  assert.ok(!warnings.some((warning) => /fixed to the top/.test(warning)), "a 6px progress bar is fine");
});
