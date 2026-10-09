import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const site = "https://www.bydziwen.top";
const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"];
const htmlLang = { zh: "zh-CN", en: "en", ja: "ja", ko: "ko", th: "th", fr: "fr", de: "de", vi: "vi" };
const prefix = (locale) => (locale === "zh" ? "" : `/${locale}`);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const unescape = (value) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");

function ensureBuild() {
  if (existsSync(new URL("dist/rss.xml", root)) && existsSync(new URL("dist/subscribe/index.html", root))) return;
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
}

function publishedArticles(locale) {
  return readdirSync(new URL(`src/content/blog/${locale}/`, root)).filter((name) => name.endsWith(".md")).filter((name) => {
    const frontmatter = read(`src/content/blog/${locale}/${name}`).split("---")[1] ?? "";
    return !/translationStatus:\s*"draft"/.test(frontmatter);
  }).length;
}

test("every locale has a full-text RSS feed readers can identify and trust", () => {
  ensureBuild();
  for (const locale of locales) {
    const xml = read(`dist${prefix(locale)}/rss.xml`);
    const feedUrl = `${site}${prefix(locale)}/rss.xml`;
    assert.match(xml, new RegExp(`<language>${htmlLang[locale]}</language>`), `${locale} language`);
    assert.ok(xml.includes(`<atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`), `${locale} self link`);
    assert.match(xml, /<image><url>https:\/\/www\.bydziwen\.top\/apple-touch-icon\.png<\/url>/, `${locale} feed image`);

    const items = xml.split("<item>").slice(1);
    assert.equal(items.length, Math.min(20, publishedArticles(locale)), `${locale}: every published article in this language, at most 20`);
    for (const item of items) {
      const link = /<link>([^<]+)<\/link>/.exec(item)?.[1] ?? "";
      const guid = /<guid isPermaLink="true">([^<]+)<\/guid>/.exec(item)?.[1];
      const body = unescape(/<content:encoded>([\s\S]*?)<\/content:encoded>/.exec(item)?.[1] ?? "");
      // Earlier feeds used slash-terminated links as GUIDs; changing them would resend every article.
      assert.match(link, new RegExp(`^${site}${prefix(locale)}/blog/[a-z0-9-]+/$`), `${locale} link ${link}`);
      assert.equal(guid, link, `${link} guid`);
      assert.match(item, /<dc:creator>Shoa Lin<\/dc:creator>/, `${link} author`);
      assert.match(item, /<category>[^<]+<\/category>/, `${link} category`);
      assert.ok(body.length > 500, `${link} carries the full article`);
      assert.doesNotMatch(body, /\b(?:src|href|poster|srcset)="\/(?!\/)/, `${link}: no site-relative URLs in the feed body`);
      assert.ok(body.includes(`<p><a href="${link}">`), `${link} ends with a link back to the article`);
    }
  }
});

test("every page footer links to the subscribe page and comic pages announce the feed", () => {
  ensureBuild();
  for (const locale of locales) {
    for (const page of ["", "/about", "/blog", "/subscribe"]) {
      const html = read(`dist${prefix(locale)}${page}/index.html`);
      assert.match(html, new RegExp(`<a class="site-footer__rss" href="${prefix(locale)}/subscribe"`), `${locale}${page} footer RSS link`);
      assert.match(html, new RegExp(`<link rel="alternate" type="application/rss\\+xml"[^>]*href="${prefix(locale)}/rss\\.xml"`), `${locale}${page} autodiscovery`);
    }
  }
  const comic = read("dist/comics/gpt-6-astra/index.html");
  assert.match(comic, /<link rel="alternate" type="application\/rss\+xml"[^>]*href="\/rss\.xml"/, "comic page autodiscovery");
  assert.match(comic, /<footer class="foot"[^>]*>[\s\S]*<a class="rss" href="\/subscribe"[\s\S]*<\/footer>/, "comic footer RSS link");
});

test("the subscribe page shows this locale's feed address and every other language's feed", () => {
  ensureBuild();
  for (const locale of locales) {
    const html = read(`dist${prefix(locale)}/subscribe/index.html`);
    const feedUrl = `${site}${prefix(locale)}/rss.xml`;
    assert.ok(html.includes(`data-feed-url>${feedUrl}</code>`), `${locale} feed address`);
    const prompt = /<pre[^>]*data-agent-prompt[^>]*>([\s\S]*?)<\/pre>/.exec(html)?.[1] ?? "";
    assert.ok(prompt.includes(feedUrl), `${locale}: the agent prompt names this locale's feed`);
    assert.doesNotMatch(prompt, /\{url\}/, `${locale}: no placeholder left in the agent prompt`);
    for (const other of locales.filter((item) => item !== locale)) {
      assert.match(html, new RegExp(`href="${prefix(other)}/rss\\.xml"`), `${locale} lists the ${other} feed`);
    }
  }
});
