import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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

test("global styles cover keyboard focus, reduced motion, and stable touch targets", () => {
  const css = ["src/styles/global.css", "src/styles/components.css", "src/styles/article.css"]
    .map(read)
    .join("\n");

  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /border-radius:\s*var\(--radius\)/);
});

test("the copied avatar is byte-for-byte unchanged", () => {
  const hash = (value) => createHash("sha256").update(value).digest("hex");

  assert.equal(
    hash(readBuffer("assets/images/avatar/profile.jpg")),
    hash(readBuffer("public/assets/avatar/profile.jpg")),
  );
});
