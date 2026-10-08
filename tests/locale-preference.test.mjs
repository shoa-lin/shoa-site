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

test("search crawlers keep the canonical homepage while real browsers still follow their language", async () => {
  const { isSearchCrawler } = await import(moduleUrl.href);

  for (const crawler of [
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36",
    "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
  ]) {
    assert.equal(isSearchCrawler(crawler), true, crawler);
  }

  for (const browser of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; CUBOT KINGKONG 5 PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    undefined,
  ]) {
    assert.equal(isSearchCrawler(browser), false, String(browser));
  }
});
