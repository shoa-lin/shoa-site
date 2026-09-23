import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TOTAL_KEY, isAllowedOrigin, isBot } from "../workers/site-visits/src/counter.js";
import worker from "../workers/site-visits/src/index.js";

const browserUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

function createEnv(initial) {
  const store = new Map(initial === undefined ? [] : [[TOTAL_KEY, String(initial)]]);
  return {
    store,
    ALLOWED_ORIGINS: "https://www.bydziwen.top,https://bydziwen.top",
    VISITS: {
      get: async (key) => store.get(key) ?? null,
      put: async (key, value) => void store.set(key, value),
    },
  };
}

function request(path, { method = "GET", origin = "https://www.bydziwen.top", ua = browserUA } = {}) {
  const headers = new Headers({ "User-Agent": ua });
  if (origin) headers.set("Origin", origin);
  return new Request(`https://shoa-site-visits.example.workers.dev${path}`, { method, headers });
}

test("POST /hit increments the site-wide total and GET /total reads it", async () => {
  const env = createEnv(41);
  const hit = await worker.fetch(request("/hit", { method: "POST" }), env);

  assert.equal(hit.status, 200);
  assert.deepEqual(await hit.json(), { ok: true, counted: true, total: 42 });
  assert.equal(hit.headers.get("Access-Control-Allow-Origin"), "https://www.bydziwen.top");

  const total = await worker.fetch(request("/total"), env);
  assert.deepEqual(await total.json(), { total: 42 });
});

test("counter starts at zero and allows local preview origins", async () => {
  const env = createEnv();
  const hit = await worker.fetch(request("/hit", { method: "POST", origin: "http://localhost:4321" }), env);

  assert.equal((await hit.json()).total, 1);
  assert.equal(hit.headers.get("Access-Control-Allow-Origin"), "http://localhost:4321");
});

test("hits from foreign origins and bots are not counted", async () => {
  const env = createEnv(10);
  const foreign = await worker.fetch(request("/hit", { method: "POST", origin: "https://evil.example" }), env);
  const bot = await worker.fetch(request("/hit", { method: "POST", ua: "Googlebot/2.1" }), env);

  assert.equal(foreign.status, 403);
  assert.equal(foreign.headers.get("Access-Control-Allow-Origin"), null);
  assert.deepEqual(await bot.json(), { ok: true, counted: false, total: 10 });
  assert.equal(env.store.get(TOTAL_KEY), "10");
});

test("failed KV writes still return the last known total", async () => {
  const env = createEnv(7);
  env.VISITS.put = async () => { throw new Error("quota"); };
  const hit = await worker.fetch(request("/hit", { method: "POST" }), env);

  assert.deepEqual(await hit.json(), { ok: true, counted: false, total: 7 });
});

test("origin and bot helpers keep real mobile browsers countable", () => {
  assert.equal(isAllowedOrigin("http://127.0.0.1:4321"), true);
  assert.equal(isAllowedOrigin("https://bydziwen.top.evil.example", "https://bydziwen.top"), false);
  assert.equal(isAllowedOrigin(null, "https://bydziwen.top"), false);
  assert.equal(isBot(browserUA), false);
  assert.equal(isBot("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36"), false);
  assert.equal(isBot("HeadlessChrome/140.0"), true);
  assert.equal(isBot(""), true);
});

test("footer counter labels use view wording in every locale", () => {
  for (const locale of ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"]) {
    const dictionary = JSON.parse(readFileSync(new URL(`../src/i18n/${locale}.json`, import.meta.url), "utf8"));
    assert.ok(dictionary.footer.viewsLabel, `${locale} footer.viewsLabel`);
    assert.doesNotMatch(dictionary.footer.viewsLabel, /visitor|人数|访客/i);
  }
});
