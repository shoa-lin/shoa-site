import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  cleanComicSource,
  collectComicReferences,
  comicPageTone,
  googleFontRequests,
  lintComicHtml,
  mergeFontRequests,
  parseComicHtml,
} from "../src/lib/comic-html.ts";

const root = new URL("../", import.meta.url);

const authorComic = `<!DOCTYPE html>
<html lang="zh-CN" class="paper">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="script-src 'self'">
<title>测试漫画 · 第一话</title>
<meta name="description" content="一段描述">
<meta property="og:title" content="x">
<link rel="icon" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
<style>@import url(https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe:wght@400;700&display=swap);
.hero{background:url(img/hero.png)}</style>
<script src="https://cdn.example.com/lib.js"></script>
</head>
<body class="comic">
<!-- 开场 -->
<header class="masthead"><h1>第一话</h1></header>
<img src="img/a.png?v=2" srcset="img/a.png 1x, data:image/png;base64,AA,BB 2x" alt="">
<img src="https://example.com/b.png" alt="">
<svg viewBox="0 0 10 10"><title>星星</title><image href="img/star.png"/></svg>
<p style="background:url('./img/dots.png')">内容</p>
<a href="files/guide.pdf">下载</a> <a href="next.html">下一话</a> <a href="../shared/x.png">x</a>
<template><!-- hidden note --><p>模板</p></template>
<script>document.querySelector("h1").dataset.ready = "1";</script>
</body>
<style>.late{color:red}</style>
</html>`;

const assets = {
  "img/hero.png": "/comics/t/assets/h1-hero.png",
  "img/a.png": "/comics/t/assets/a1-a.png",
  "img/star.png": "/comics/t/assets/s1-star.png",
  "img/dots.png": "/comics/t/assets/d1-dots.png",
  "files/guide.pdf": "/comics/t/assets/g1-guide.pdf",
};

test("comic sources pass the repository comics check (metadata, editions, fonts, assets, covers)", () => {
  const result = spawnSync(process.execPath, ["scripts/comics.mjs", "check"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("parseComicHtml keeps the author's styles and scripts but drops what the wrapper provides", () => {
  const doc = parseComicHtml(authorComic);

  assert.equal(doc.title, "测试漫画 · 第一话");
  assert.equal(doc.description, "一段描述");
  assert.deepEqual(doc.htmlAttrs, { class: "paper" });
  assert.deepEqual(doc.bodyAttrs, { class: "comic" });
  assert.doesNotMatch(doc.head, /<title>|<meta|rel="icon"|preconnect|Content-Security-Policy/);
  assert.match(doc.body, /document\.querySelector\("h1"\)/, "inline scripts survive");
  assert.match(doc.body, /<style>\.late\{color:red\}<\/style>/, "a style after </body> is kept");
  assert.match(doc.body, /<title>星星<\/title>/, "SVG titles are content, not page titles");
  assert.doesNotMatch(`${doc.head}${doc.body}`, /开场|hidden note/, "comments are dropped, also inside templates");
});

test("wrapper-owned tags are removed wherever the parser puts them", () => {
  const doc = parseComicHtml("<p>intro</p><meta name=\"viewport\" content=\"x\"><base href=\"https://evil.example/\"><meta http-equiv=\"refresh\" content=\"0;url=/x\"><title>Late title</title><p>body</p>");

  assert.equal(doc.title, "Late title");
  assert.doesNotMatch(doc.body, /<meta|<base|<title/);
  assert.match(doc.body, /<p>intro<\/p><p>body<\/p>/);
});

test("a UTF-8 byte-order mark does not push the head into the body", () => {
  const doc = parseComicHtml(`﻿${authorComic}`);

  assert.equal(doc.title, "测试漫画 · 第一话");
  assert.doesNotMatch(doc.body, /<meta|charset/);
});

test("Google Fonts the comic does not self-host load without blocking rendering", () => {
  const doc = parseComicHtml(authorComic);

  assert.equal(doc.googleFontUrls.length, 2);
  assert.match(doc.head, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Bangers[^>]*rel="stylesheet" media="print" onload="this\.media='all'">/);
  assert.match(doc.head, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=ZCOOL\+KuaiLe:wght@400;700&amp;display=swap" media="print"/, "an @import URL containing ';' is read whole");
  assert.match(doc.head, /\.hero\{background:url\(img\/hero\.png\)\}/, "the rule after an unquoted @import survives");
});

test("self-hosted families remove their Google Fonts link; partially hosted links stay", () => {
  const all = parseComicHtml(authorComic, { handledFamilies: new Set(["bangers", "zcool kuaile"]) });
  assert.doesNotMatch(`${all.head}${all.body}`, /fonts\.(?:googleapis|gstatic)\.com/);

  const partial = parseComicHtml(authorComic, { handledFamilies: new Set(["bangers"]) });
  assert.doesNotMatch(partial.head, /family=Bangers/, "Bangers (plus a system font) is fully handled");
  assert.match(partial.head, /family=ZCOOL\+KuaiLe[^"]*" media="print"/, "ZCOOL KuaiLe is not, so it still loads from Google");
});

test("links for system text fonts only are dropped; icon fonts and preloads are kept", () => {
  const doc = parseComicHtml(`<head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700">
<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Lobster" onload="this.rel='stylesheet'">
</head><body></body>`);

  assert.doesNotMatch(doc.head, /Noto\+Sans\+SC/);
  assert.match(doc.head, /icon\?family=Material\+Icons" media="print"/);
  assert.match(doc.head, /rel="preload" as="style" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Lobster"/);
});

test("relative references map to the copies made by npm run comic", () => {
  const doc = parseComicHtml(authorComic, { assets });

  assert.match(doc.head, /\.hero\{background:url\(\/comics\/t\/assets\/h1-hero\.png\)\}/);
  assert.match(doc.body, /<img src="\/comics\/t\/assets\/a1-a\.png\?v=2" srcset="\/comics\/t\/assets\/a1-a\.png 1x, data:image\/png;base64,AA,BB 2x"/, "query kept, data: URI with commas untouched");
  assert.match(doc.body, /<img src="https:\/\/example\.com\/b\.png"/, "absolute URLs are untouched");
  assert.match(doc.body, /<image href="\/comics\/t\/assets\/s1-star\.png">/);
  assert.match(doc.body, /background:url\('\/comics\/t\/assets\/d1-dots\.png'\)/);
  assert.match(doc.body, /<a href="\/comics\/t\/assets\/g1-guide\.pdf">/, "file downloads are assets");
  assert.match(doc.body, /<a href="next\.html">/, "links to pages are not");
  assert.match(doc.body, /<a href="\.\.\/shared\/x\.png">/, "paths outside the comic folder are not rewritten");
});

test("CSS string references (image-set, @import) are mapped too", () => {
  const doc = parseComicHtml(`<style>@import "parts/extra.css";.a{background-image:image-set("img/a.png" 1x, "img/a@2x.png" 2x)}.b{background:url("img/it's.png")}</style>`, {
    assets: { "parts/extra.css": "/x/extra.css", "img/a.png": "/x/a.png", "img/a@2x.png": "/x/a2.png", "img/it's.png": "/x/its.png" },
  });

  assert.match(doc.head, /@import "\/x\/extra\.css";/);
  assert.match(doc.head, /image-set\("\/x\/a\.png" 1x, "\/x\/a2\.png" 2x\)/);
  assert.match(doc.head, /url\("\/x\/its\.png"\)/);
});

test("external scripts and stylesheets map to downloaded copies", () => {
  const doc = parseComicHtml(authorComic, { vendored: { "https://cdn.example.com/lib.js": "/comics/t/vendor/abc-lib.js" } });
  assert.match(doc.head, /<script src="\/comics\/t\/vendor\/abc-lib\.js">/);

  const references = collectComicReferences(`${authorComic}<script type="module" src="https://esm.example/x.js"></script>`);
  assert.deepEqual(references.externalScripts, ["https://cdn.example.com/lib.js"], "module scripts are not downloaded");
  assert.deepEqual(references.assets, ["files/guide.pdf", "img/a.png", "img/dots.png", "img/hero.png", "img/star.png"]);
  assert.deepEqual(references.escaping, ["../shared/x.png"]);
});

test("cleanComicSource leaves author files byte for byte and undoes a saved live page", () => {
  assert.deepEqual(cleanComicSource(authorComic), { html: authorComic, removed: 0 }, "nothing to clean: unchanged");
  const ownContact = authorComic.replace("</body>", "<a href=\"mailto:me@example.com\" aria-label=\"Email\">Email me</a></body>");
  assert.equal(cleanComicSource(ownContact).removed, 0, "the author's own contact link is content");

  const saved = authorComic
    .replace("<link href=\"https://fonts.googleapis.com/css2?family=Bangers&family=Noto+Sans+SC:wght@400;700&display=swap\" rel=\"stylesheet\">", "<style data-comic-fonts>@font-face{font-family:\"Bangers\";font-style:normal;font-weight:400;src:url(/comics/t/fonts/zh/bangers-400.woff2)}</style>")
    .replace("<body class=\"comic\">", "<body class=\"comic\"><shoa-comic-header data-shoa-shell><template shadowrootmode=\"open\"><header>site</header></template></shoa-comic-header><shoa-comic-anchor id=\"shoa-comic-content\"></shoa-comic-anchor><header class=\"site-header comic-shell\" data-comic-header><nav>old</nav></header><nav class=\"comic-langs\"><a href=\"/en/\">English</a></nav>")
    .replace("</body>", "<shoa-comic-footer data-shoa-shell></shoa-comic-footer><a href=\"mailto:shoa_lin@outlook.com\" aria-label=\"Email\">Contact</a><script type=\"module\" src=\"/_astro/comic-shell.js\"></script></body>");
  const cleaned = cleanComicSource(saved);

  assert.equal(cleaned.removed, 8);
  assert.doesNotMatch(cleaned.html, /shoa-comic-|comic-shell|comic-langs|aria-label="Email"|\/_astro\/|data-comic-fonts/);
  assert.match(cleaned.html, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Bangers&amp;display=swap" rel="stylesheet">/, "self-hosted fonts become a Google Fonts link again");
  assert.match(cleaned.html, /<header class="masthead">/);
});

test("Google Fonts URLs of every shape resolve to families and axes", () => {
  assert.deepEqual(
    googleFontRequests("https://fonts.googleapis.com/css2?family=Bangers&family=Noto+Sans+SC:wght@400;700&display=swap"),
    [{ family: "Bangers", axes: "" }, { family: "Noto Sans SC", axes: "wght@400;700" }],
  );
  assert.deepEqual(
    googleFontRequests("https://fonts.googleapis.com/css?family=Roboto:regular,bold,700italic|Open+Sans"),
    [{ family: "Roboto", axes: "ital,wght@0,400;0,700;1,700" }, { family: "Open Sans", axes: "" }],
  );
  assert.deepEqual(googleFontRequests("https://fonts.googleapis.com/icon?family=Material+Icons"), [{ family: "Material Icons", axes: "" }]);
  assert.deepEqual(
    mergeFontRequests([{ family: "Inter", axes: "wght@400" }, { family: "Inter", axes: "ital,wght@1,700" }, { family: "Inter", axes: "" }]),
    [{ family: "Inter", axes: "ital,wght@0,400;1,700" }],
  );
});

test("lintComicHtml flags real risks without flagging ordinary content rules", () => {
  const warnings = lintComicHtml(`<!doctype html><html><head><title>t</title><style>
html{padding:24px}
body .wrap{max-width:980px;margin:0 auto}
:root{--margin:16px;--transform:rotate(2deg)}
.nav{position:sticky;margin-top:0;top:64px}
.bar{position:fixed;top:0;height:6px}
.topnav{position:fixed;top:0;height:56px}
html,body{overflow:hidden}
@font-face{font-family:X;src:url(https://fonts.gstatic.com/s/x.woff2)}
@import url("https://cdn.example.com/extra.css");
</style><script type="module">import confetti from "https://esm.sh/canvas-confetti";</script></head>
<body><iframe src="https://www.youtube.com/embed/x"></iframe><img src="file:///Users/me/a.png"><img src="../up.png"></body></html>`);
  const has = (pattern) => warnings.some((warning) => pattern.test(warning));

  assert.ok(has(/"html \{ padding:24px \}"/), "html-level layout");
  assert.ok(!has(/\.wrap|--margin|\.nav/), "content wrappers, custom properties and sticky bars are fine");
  assert.ok(has(/"\.topnav" is fixed at top: 0/) && !has(/"\.bar"/), "tall fixed top bars, not thin progress bars");
  assert.ok(has(/does not scroll/), "scroll lock");
  assert.ok(has(/fonts\.gstatic\.com/), "direct gstatic font files");
  assert.ok(has(/@import from cdn\.example\.com/));
  assert.ok(has(/module script imports from esm\.sh/));
  assert.ok(has(/Embedded content from www\.youtube\.com/));
  assert.ok(has(/file:\/\/\//));
  assert.ok(has(/"\.\.\/up\.png" points outside/));
});

test("comicPageTone picks the dark header and footer only for dark comic pages", () => {
  assert.equal(comicPageTone("<style>body{background:#0f1115;color:#eee}</style>"), "dark");
  assert.equal(comicPageTone("<style>:root{--paper:#121212}body{background:var(--paper)}</style>"), "dark");
  assert.equal(comicPageTone("<style>html,body{background:linear-gradient(#0b0b12,#1b1b2a)}</style>"), "dark");
  assert.equal(comicPageTone("<style>html{background:#101010}body{background:transparent}</style>"), "dark", "the canvas uses html's background");
  assert.equal(comicPageTone("<style>body{background:#fdf3e3}@media (prefers-color-scheme: dark){body{background:#000}}</style>"), "light", "@media blocks are ignored");
  assert.equal(comicPageTone("<style>body{background:rgba(0,0,0,0.1)}</style>"), "light", "translucent backgrounds do not count");
  assert.equal(comicPageTone("<p>no page background</p>"), "light");
});
