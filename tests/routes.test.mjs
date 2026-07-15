import assert from "node:assert/strict";
import { test } from "node:test";

test("localized paths keep Chinese unprefixed and prefix other locales", async () => {
  const { localizedPath } = await import("../src/lib/routes.ts");

  assert.equal(localizedPath("zh", "/"), "/");
  assert.equal(localizedPath("zh", "/about"), "/about");
  assert.equal(localizedPath("en", "/"), "/en/");
  assert.equal(localizedPath("fr", "/about"), "/fr/about");
  assert.equal(localizedPath("ja", "/blog/example"), "/ja/blog/example");
  assert.equal(localizedPath("de", "/about"), "/de/about");
  assert.equal(localizedPath("vi", "/blog/example"), "/vi/blog/example");
});

test("localized paths preserve query strings and hashes", async () => {
  const { localizedPath } = await import("../src/lib/routes.ts");

  assert.equal(localizedPath("ko", "/blog?category=ai#latest"), "/ko/blog?category=ai#latest");
});

test("alternate links contain all eight locales and x-default", async () => {
  const { alternateLinks } = await import("../src/lib/routes.ts");

  const links = alternateLinks("/contact");
  assert.equal(links.length, 9);
  assert.deepEqual(
    links.map((link) => link.hreflang),
    ["zh-CN", "en", "ja", "ko", "th", "fr", "de", "vi", "x-default"],
  );
  assert.equal(links.at(-1).href, "https://www.bydziwen.top/contact");
});

test("route helpers reject unsupported locale input", async () => {
  const { localizedPath } = await import("../src/lib/routes.ts");

  assert.throws(() => localizedPath("es", "/about"), /Unsupported locale/);
});
