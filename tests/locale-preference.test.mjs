import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

const moduleUrl = new URL("../src/lib/locale-preference.ts", import.meta.url);

test("browser language preferences resolve to supported site locales", async () => {
  assert.equal(existsSync(moduleUrl), true, "locale preference module exists");

  const { localePreferenceKey, resolvePreferredLocale } = await import(moduleUrl.href);

  assert.equal(localePreferenceKey, "shoa-locale");
  assert.equal(resolvePreferredLocale(["th-TH", "en-US"]), "th");
  assert.equal(resolvePreferredLocale(["ja-JP", "zh-CN"]), "ja");
  assert.equal(resolvePreferredLocale(["fr-CA", "en-US"]), "fr");
  assert.equal(resolvePreferredLocale(["de-DE", "en-US"]), "de");
  assert.equal(resolvePreferredLocale(["vi-VN", "en-US"]), "vi");
});
