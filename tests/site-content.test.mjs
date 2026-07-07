import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sitePages = ["index.html", "about.html", "projects.html", "blog.html", "favorites.html", "contact.html"];
const readJson = (path) => JSON.parse(read(path));

test("home page keeps the existing avatar asset", () => {
  const html = read("index.html");
  assert.match(html, /src="assets\/images\/avatar\/profile\.jpg"/);
});

test("home page replaces generic welcome copy with a specific builder positioning", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /欢迎来到我的个人主页/);
  assert.doesNotMatch(html, /这里是展示个人作品、分享想法和记录成长的地方/);
  assert.match(html, /AI Agent/);
  assert.doesNotMatch(html, /看项目|读文章/);
  assert.doesNotMatch(html, /Featured work|Hermes|ModelBase|AI Habitat/);
  assert.doesNotMatch(html, /href="\/projects"/);
});

test("projects page contains real project entries instead of placeholders", () => {
  const html = read("projects.html");
  assert.doesNotMatch(html, /项目一|项目二|项目三/);
  assert.doesNotMatch(html, /href="#"/);
  assert.match(html, /Hermes/);
  assert.match(html, /ModelBase/);
  assert.match(html, /AI Habitat/);
});

test("blog page preserves JavaScript integration hooks", () => {
  const html = read("blog.html");
  [
    "blog-list",
    "mobile-blog-list",
    "blog-content",
    "mobile-menu-btn",
    "mobile-drawer-overlay",
    "mobile-drawer-sidebar",
    "mobile-drawer-close",
    "toc-toggle-btn",
    "toc-panel",
    "toc-panel-content",
    "back-to-top",
  ].forEach((id) => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test("blog page has a technical notes masthead instead of emoji template chrome", () => {
  const html = read("blog.html");
  assert.match(html, /class="blog-masthead"/);
  assert.match(html, /技术笔记/);
  assert.match(html, /AI Agent/);
  assert.doesNotMatch(html, /📚|🏗|💻|📊|🚀|🧮|📝|📑/);
});

test("blog implementation avoids dash and placeholder tells", () => {
  const files = ["blog.html", "css/blog.css", "js/blog.js"];
  const combined = files.map((file) => read(file)).join("\n");
  assert.doesNotMatch(combined, /—|–/);
  assert.doesNotMatch(combined, /href="#"/);
});

test("blog page loads local assets from root paths for article deep links", () => {
  const html = read("blog.html");
  assert.match(html, /href="\/css\/common\.css"/);
  assert.match(html, /href="\/css\/blog\.css"/);
  assert.match(html, /src="\/js\/common\.js\?v=2"/);
  assert.match(html, /src="\/js\/blog\.js\?v=2"/);

  const js = read("js/blog.js");
  assert.match(js, /normalizeArticleAssetPaths/);
});

test("blog includes the Claude Code loops guide", () => {
  const manifest = readJson("blogs/manifest.json");
  const article = manifest.find((item) => item.id === "getting-started-with-loops");

  assert.ok(article, "loops guide must be registered in the blog manifest");
  assert.equal(article.title, "Claude Code Loops 入门：从手动回合到主动循环");
  assert.equal(article.category, "development");
  assert.equal(article.filename, "blogs/getting-started-with-loops.md");

  const markdown = read(article.filename);
  assert.match(markdown, /Getting started with loops/);
  assert.match(markdown, /https:\/\/claude\.com\/blog\/getting-started-with-loops/);
  assert.match(markdown, /Turn-based loop/);
  assert.match(markdown, /Goal-based loop/);
  assert.match(markdown, /Time-based loop/);
  assert.match(markdown, /Proactive loop/);
});

test("all main pages share the global theme toggle runtime", () => {
  const commonCss = read("css/common.css");
  const commonJs = read("js/common.js");

  assert.match(commonCss, /html\[data-theme="dark"\]/);
  assert.match(commonCss, /\.theme-toggle/);
  assert.match(commonJs, /initThemeToggle/);
  assert.match(commonJs, /localStorage\.getItem\('shoa-theme'\)/);

  sitePages.forEach((page) => {
    const html = read(page);
    assert.match(html, /src="\/?js\/common\.js(?:\?v=2)?"/, `${page} must load common.js`);
  });
});

test("blog no longer owns the dark theme by system preference", () => {
  const blogCss = read("css/blog.css");
  assert.doesNotMatch(blogCss, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(blogCss, /--bg-primary: #11110f/);
});

test("favorites and contact pages are included in the redesign surface", () => {
  const favorites = read("favorites.html");
  const contact = read("contact.html");
  const homeCss = read("css/home.css");
  const favoritesCss = read("css/favorites.css");

  assert.match(favorites, /class="favorites-hero"/);
  assert.match(favorites, /收藏是工作台/);
  assert.match(contact, /class="contact-page"/);
  assert.match(contact, /class="contact-hero"/);
  assert.match(contact, /一起把想法做成系统/);
  assert.match(homeCss, /\.contact-grid/);
  assert.match(favoritesCss, /\.favorites-hero/);
});

test("all contact email links use the public Outlook address", () => {
  sitePages.forEach((page) => {
    const html = read(page);
    assert.doesNotMatch(html, /contact@shoa\.lin/, `${page} must not expose the old email address`);
    assert.match(html, /mailto:shoa_lin@outlook\.com/, `${page} must use the Outlook mailto address`);
  });

  const contact = read("contact.html");
  assert.match(contact, />shoa_lin@outlook\.com</);
});

test("favorites filters show an empty state for sparse collections", () => {
  const js = read("js/articles.js");
  const favoritesCss = read("css/favorites.css");

  assert.match(js, /collection-empty/);
  assert.match(js, /暂无符合条件/);
  assert.match(favoritesCss, /\.collection-empty/);
});
