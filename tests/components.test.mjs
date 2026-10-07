import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readBuffer = (path) => readFileSync(new URL(`../${path}`, import.meta.url));

test("BaseLayout provides metadata, skip navigation, and one main landmark", () => {
  const layout = read("src/layouts/BaseLayout.astro");

  assert.match(layout, /class="skip-link"/);
  assert.match(layout, /<main[^>]*id="main-content"/);
  assert.match(layout, /<slot\s*\/>/);
  assert.match(layout, /<link rel="canonical"/);
  assert.match(layout, /hreflang=/);
});

test("shared shell has localized navigation, language, theme, and mobile controls", () => {
  const files = [
    "src/components/Header.astro",
    "src/components/Footer.astro",
    "src/components/LanguageMenu.astro",
    "src/components/ThemeToggle.astro",
    "src/components/MobileNav.astro",
  ];
  const source = files.map(read).join("\n");

  assert.match(source, /localizedPath/);
  assert.match(source, /localeMeta/);
  assert.match(source, /shoa-theme/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-current/);
  assert.match(source, /Escape/);
  assert.doesNotMatch(source, /font-awesome|cdnjs|cdn\.jsdelivr/i);
});

test("theme toggle icons do not depend on localized text fonts", () => {
  const toggle = read("src/components/ThemeToggle.astro");

  assert.match(toggle, /<svg\b/);
  assert.match(toggle, /class="theme-toggle__icon"/);
  assert.doesNotMatch(toggle, /☀|☾/);
});

test("global styles cover keyboard focus, reduced motion, and stable touch targets", () => {
  const css = ["src/styles/global.css", "src/styles/components.css", "src/styles/article.css"]
    .map(read)
    .join("\n");

  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /border-radius:\s*var\(--radius\)/);
});

test("global typography uses system text stacks plus small self-hosted mono and Thai fonts", () => {
  const fontFiles = {
    mono: ["jetbrains-mono"],
    th: ["noto-sans-thai-looped", "jetbrains-mono"],
  };
  for (const [name, families] of Object.entries(fontFiles)) {
    const path = `src/styles/fonts/${name}.css`;
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} exists`);
    const css = read(path);
    for (const family of families) {
      assert.match(css, new RegExp(`@fontsource-variable/${family}/wght\\.css`), `${path} imports ${family}`);
    }
    assert.doesNotMatch(css, /https?:\/\//);
    assert.doesNotMatch(css, /noto-sans(?:-sc|-jp|-kr)?\//, `${path} ships no CJK or Latin text font`);
  }

  const layout = read("src/layouts/BaseLayout.astro");
  for (const name of Object.keys(fontFiles)) {
    assert.match(layout, new RegExp(`styles/fonts/${name}\\.css\\?url`), `BaseLayout imports ${name} fonts`);
  }
  assert.match(layout, /<link rel="stylesheet" href=\{fontStylesheet\[locale\]\} \/>/);

  const tokens = read("src/styles/tokens.css");
  const global = read("src/styles/global.css");
  const pages = read("src/styles/pages.css");
  const article = read("src/styles/article.css");

  assert.match(tokens, /--font-sans:\s*ui-sans-serif,\s*system-ui/);
  assert.match(tokens, /--font-mono:\s*"JetBrains Mono Variable"/);
  assert.doesNotMatch(global, /fonts\.css/);
  assert.match(global, /html:lang\(zh-CN\)[^}]*"PingFang SC"[^}]*"Microsoft YaHei"/s);
  assert.match(global, /html:lang\(ja\)[^}]*"Hiragino Sans"/s);
  assert.match(global, /html:lang\(ko\)[^}]*"Apple SD Gothic Neo"[^}]*"Malgun Gothic"/s);
  assert.match(global, /html:lang\(th\)[^}]*"Noto Sans Thai Looped Variable"/s);
  assert.match(global, /font-synthesis:\s*none/);
  assert.match(pages, /line-height:\s*var\(--line-display\)/);
  assert.match(pages, /line-height:\s*var\(--line-prose\)/);
  assert.match(article, /line-height:\s*var\(--line-display\)/);
  assert.match(article, /line-height:\s*var\(--line-prose\)/);

  const typographyCss = ["src/styles/components.css", "src/styles/pages.css"]
    .map(read)
    .join("\n");
  assert.doesNotMatch(typographyCss, /font-weight:\s*(?:620|650|760)/);
});

test("the public avatar keeps the approved byte-for-byte asset", () => {
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const profile = read("src/data/profile.ts");

  assert.match(profile, /avatar:\s*"\/assets\/avatar\/profile\.jpg"/);
  assert.equal(hash(readBuffer("public/assets/avatar/profile.jpg")), "d5f166ae85da5cc22599c2427e9fd461b17f4883c05a8ff53030d72cd09781b2");
});

test("mobile article contents use an accessible floating dialog", () => {
  const componentPath = "src/components/MobileArticleToc.astro";
  assert.equal(existsSync(new URL(`../${componentPath}`, import.meta.url)), true);

  const articlePage = read("src/components/pages/ArticlePage.astro");
  const component = read(componentPath);

  assert.match(articlePage, /MobileArticleToc/);
  assert.match(component, /<dialog/);
  assert.match(component, /aria-expanded="false"/);
  assert.match(component, /aria-haspopup="dialog"/);
  assert.match(component, /IntersectionObserver/);
  assert.match(component, /cancel/);
  assert.match(component, /tocOpen/);
  assert.match(component, /tocClose/);
  assert.doesNotMatch(component, /font-awesome|cdnjs|cdn\.jsdelivr/i);
});

test("visual capture waits for fonts and images before taking review screenshots", () => {
  const capture = read("scripts/capture-review-screenshots.mjs");

  assert.match(capture, /document\.fonts\.ready/);
  assert.match(capture, /image\.decode\(\)/);
});
