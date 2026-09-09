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

test("blog index uses a quiet desktop rail and mobile-friendly filters", () => {
  const html = read("blog.html");
  const css = read("css/blog.css");

  assert.match(html, /class="blog-index-head"/);
  assert.match(html, /class="category-filter category-filter-quiet"/);
  assert.match(html, /class="mobile-index-toolbar"/);
  assert.match(html, /aria-label="移动端主题筛选"/);
  assert.doesNotMatch(html, /class="sidebar-eyebrow"|>Index</);
  assert.doesNotMatch(html, /按主题快速定位文章/);
  assert.doesNotMatch(html, /class="[^"]*category-icon/);

  assert.match(css, /\.blog-index-head/);
  assert.match(css, /\.mobile-index-toolbar/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /\.blog-item\.active::before/);
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
  [
    "6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg",
    "6a43eb603762e725a739d98c_8ace2295.png",
    "6a43eb603762e725a739d98f_c6fa9ae5.png",
    "6a43eb603762e725a739d989_eb9e496a.png",
  ].forEach((image) => {
    assert.match(markdown, new RegExp(image.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
  assert.match(markdown, /### Turn-based loop[\s\S]*6a43eb603762e725a739d98c_8ace2295\.png/);
  assert.match(markdown, /### Goal-based loop[\s\S]*6a43eb603762e725a739d98f_c6fa9ae5\.png/);
  assert.match(markdown, /### Proactive loop[\s\S]*6a43eb603762e725a739d989_eb9e496a\.png/);
});

test("blog includes the GitHub event to Feishu development updates guide", () => {
  const manifest = readJson("blogs/manifest.json");
  const article = manifest.find((item) => item.id === "github-events-to-feishu");

  assert.ok(article, "GitHub event guide must be registered in the blog manifest");
  assert.equal(article.title, "从 GitHub 事件到飞书研发群：一条轻量的本地 Agent 链路");
  assert.equal(article.category, "development");
  assert.equal(article.filename, "blogs/github-events-to-feishu.md");

  const markdown = read(article.filename);
  assert.match(markdown, /GitHub Webhook/);
  assert.match(markdown, /Cloudflare Tunnel/);
  assert.match(markdown, /飞书/);
  assert.match(markdown, /验签/);
  assert.match(markdown, /最小可行方案/);
  assert.match(markdown, /assets\/github-events-to-feishu-illustrations\/01-event-to-update\.png/);
});

test("project skill documents safe blog translation publishing", () => {
  const skill = read(".codex/skills/translate-blog-publish/SKILL.md");

  assert.match(skill, /^name: translate-blog-publish/m);
  assert.match(skill, /公开仓库/);
  assert.match(skill, /隐私|保密/);
  assert.match(skill, /不得提交/);
  assert.match(skill, /blogs\/manifest\.json/);
  assert.match(skill, /blogs\/.*\.md/);
  assert.match(skill, /图片/);
  assert.match(skill, /node --test tests\/site-content\.test\.mjs/);
  assert.match(skill, /git diff --check/);
  assert.match(skill, /GitHub Pages/);
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

test("comic system registers locale-aware editions", () => {
  const manifest = readJson("comics/manifest.json");
  const comic = manifest.find((item) => item.id === "gpt-6-astra");
  assert.ok(comic);
  assert.deepEqual(Object.keys(comic.locales).sort(), ["en", "ja", "ko", "zh-CN"].sort());
  ["comics/gpt-6-astra/index.html", "comics/gpt-6-astra/en/index.html", "comics/gpt-6-astra/ja/index.html", "comics/gpt-6-astra/ko/index.html"].forEach((file) => assert.match(read(file), /GPT-6 Astra/));
});

test("comic locale fallback and RTL hooks are present", () => {
  const runtime = read("comics/comics.js");
  assert.match(runtime, /supported/);
  assert.match(runtime, /当前语言暂未提供/);
  ["comics/gpt-6-astra/index.html", "comics/gpt-6-astra/en/index.html", "comics/gpt-6-astra/ja/index.html", "comics/gpt-6-astra/ko/index.html"].forEach((file) => {
    const html = read(file);
    assert.match(html, /comics\/comics\.js/);
    assert.match(html, /direction:rtl/);
  });
});

test("comic locale registry defines extensible fallback and RTL languages", () => {
  const locales = readJson("comics/locales.json");
  assert.equal(locales.default, "zh-CN");
  assert.deepEqual(locales.fallback, ["en", "zh-CN"]);
  assert.ok(locales.rtl.includes("ar"));
});
