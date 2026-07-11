import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("i18n exposes the exact six supported locales", async () => {
  const { defaultLocale, localeMeta, locales } = await import("../src/lib/i18n.ts");

  assert.deepEqual(locales, ["zh", "en", "ja", "ko", "th", "fr"]);
  assert.equal(defaultLocale, "zh");
  assert.deepEqual(
    locales.map((locale) => localeMeta[locale].label),
    ["简体中文", "English", "日本語", "한국어", "ไทย", "Français"],
  );
});

test("all locale dictionaries have the same non-empty keys", () => {
  const result = spawnSync(process.execPath, ["scripts/check-locale-dictionaries.mjs"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("dictionary lookup rejects unsupported locale input", async () => {
  const { getDictionary } = await import("../src/lib/i18n.ts");

  assert.throws(() => getDictionary("de"), /Unsupported locale/);
});
