import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  TOTAL_KEY,
  isValidSlug,
  likesKey,
  parseLikesPath,
} from "../workers/site-visits/src/counter.js";
import worker from "../workers/site-visits/src/index.js";

const browserUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

function createEnv() {
  const store = new Map();
  const puts = [];
  return {
    store,
    puts,
    ALLOWED_ORIGINS: "https://www.bydziwen.top,https://bydziwen.top",
    VISITS: {
      get: async (key) => store.get(key) ?? null,
      put: async (key, value, options) => {
        puts.push({ key, value, options });
        store.set(key, value);
      },
    },
  };
}

function request(path, { method = "GET", origin = "https://www.bydziwen.top", ua = browserUA, ip = "203.0.113.7", body } = {}) {
  const headers = new Headers({ "User-Agent": ua });
  if (origin) headers.set("Origin", origin);
  if (ip) headers.set("CF-Connecting-IP", ip);
  const init = { method, headers };
  if (body !== undefined) init.body = body;
  return new Request(`https://shoa-site-visits.example.workers.dev${path}`, init);
}

test("slug and path helpers accept translationKey-style slugs only", () => {
  assert.equal(isValidSlug("getting-started-with-loops"), true);
  assert.equal(isValidSlug("a"), true);
  assert.equal(isValidSlug("x".repeat(64)), true);
  assert.equal(isValidSlug("Getting-Started"), false);
  assert.equal(isValidSlug(".."), false);
  assert.equal(isValidSlug(""), false);
  assert.equal(isValidSlug("x".repeat(65)), false);
  assert.equal(likesKey("post-a"), "likes:post-a");
  assert.equal(parseLikesPath("/likes/post-a"), "post-a");
  assert.equal(parseLikesPath("/likes/%2e%2e"), "..");
  assert.equal(parseLikesPath("/total"), null);
  assert.equal(parseLikesPath("/likes"), null);
});

test("GET /likes/{slug} returns zero for an unknown slug without writing", async () => {
  const env = createEnv();
  const response = await worker.fetch(request("/likes/brand-new-post"), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, slug: "brand-new-post", likes: 0 });
  assert.equal(env.store.has(likesKey("brand-new-post")), false);
});

test("POST /likes/{slug} increments likes:{slug} and likes from different visitors accumulate (no rate-limit binding)", async () => {
  const env = createEnv();
  const slug = "getting-started-with-loops";

  const first = await worker.fetch(request(`/likes/${slug}`, { method: "POST", ip: "203.0.113.1" }), env);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("X-Like-RL"), "nobinding");
  assert.deepEqual(await first.json(), { ok: true, slug, likes: 1, counted: true });

  const second = await worker.fetch(request(`/likes/${slug}`, { method: "POST", ip: "203.0.113.2" }), env);
  assert.deepEqual(await second.json(), { ok: true, slug, likes: 2, counted: true });
  assert.equal(env.store.get(likesKey(slug)), "2");

  const read = await worker.fetch(request(`/likes/${slug}`), env);
  assert.deepEqual(await read.json(), { ok: true, slug, likes: 2 });
});

test("invalid slugs are rejected with 400 on both GET and POST", async () => {
  const env = createEnv();
  // Pure dot segments (".", "..", "%2e%2e") are normalized away by the URL
  // parser before the request reaches the Worker; the shapes that do arrive
  // are covered here — uppercase, slashes, spaces, encoded traversals, empty,
  // and over-length slugs all decode to something the slug regex rejects.
  const invalid = ["Getting-Started", "a/b", "", "%41bc", "foo%20bar", "..%2fx", "foo%2Fbar", "x".repeat(65)];

  for (const slug of invalid) {
    const path = `/likes/${slug}`;
    const get = await worker.fetch(request(path), env);
    assert.equal(get.status, 400, `GET ${path}`);
    assert.deepEqual(await get.json(), { ok: false, error: "invalid slug" });

    const post = await worker.fetch(request(path, { method: "POST" }), env);
    assert.equal(post.status, 400, `POST ${path}`);
  }
  assert.equal(env.store.size, 0);
});

test("dot-segment paths that URL normalization resolves stay 404 and write nothing", async () => {
  const env = createEnv();
  // "/likes/." normalizes to "/likes/", which lands on the empty-slug 400 above.
  for (const path of ["/likes/..", "/likes/%2e%2e"]) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 404, path);
  }
  assert.equal(env.store.size, 0);
});

test("POST /likes from a foreign origin is rejected with 403 and nothing is written", async () => {
  const env = createEnv();
  const response = await worker.fetch(request("/likes/fixture-post", { method: "POST", origin: "https://evil.example" }), env);

  assert.equal(response.status, 403);
  assert.equal(env.store.size, 0);
});

test("bot user agents read but never write the like count", async () => {
  const env = createEnv();
  env.store.set(likesKey("fixture-post"), "41");
  const response = await worker.fetch(request("/likes/fixture-post", { method: "POST", ua: "Googlebot/2.1" }), env);

  assert.deepEqual(await response.json(), { ok: true, slug: "fixture-post", likes: 41, counted: false });
  assert.equal(env.store.get(likesKey("fixture-post")), "41");
});

test("a failed KV write returns the old count with counted:false", async () => {
  const env = createEnv();
  env.store.set(likesKey("fixture-post"), "7");
  env.VISITS.put = async () => { throw new Error("quota"); };
  const response = await worker.fetch(request("/likes/fixture-post", { method: "POST" }), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, slug: "fixture-post", likes: 7, counted: false });
});

test("a rate-limited IP gets 429 with the current count and no KV write", async () => {
  const env = createEnv();
  env.store.set(likesKey("fixture-post"), "5");
  const limitedKeys = [];
  env.LIKE_LIMITER = {
    limit: async ({ key }) => {
      limitedKeys.push(key);
      return { success: false };
    },
  };

  const response = await worker.fetch(request("/likes/fixture-post", { method: "POST" }), env);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("X-Like-RL"), "limited");
  assert.deepEqual(await response.json(), { ok: false, error: "rate limited", likes: 5 });
  assert.equal(env.store.get(likesKey("fixture-post")), "5");
  assert.deepEqual(limitedKeys, ["203.0.113.7"]);

  const noIp = await worker.fetch(request("/likes/other-post", { method: "POST", ip: null }), env);
  assert.equal(noIp.status, 429);
  assert.deepEqual(limitedKeys, ["203.0.113.7", "unknown"]);
});

test("a throwing or succeeding limiter never blocks the like on its own", async () => {
  const env = createEnv();
  env.LIKE_LIMITER = {
    limit: async () => { throw new Error("limiter down"); },
  };
  const failing = await worker.fetch(request("/likes/fixture-post", { method: "POST" }), env);
  assert.equal(failing.headers.get("X-Like-RL"), "error");
  assert.deepEqual(await failing.json(), { ok: true, slug: "fixture-post", likes: 1, counted: true });

  env.LIKE_LIMITER = {
    limit: async () => ({ success: true }),
  };
  const passing = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "203.0.113.8" }), env);
  assert.equal(passing.headers.get("X-Like-RL"), "ok");
  assert.deepEqual(await passing.json(), { ok: true, slug: "fixture-post", likes: 2, counted: true });
});

test("X-Like-RL reports the limiter branch and failures are logged, not swallowed", async (t) => {
  const warnings = [];
  const errors = [];
  t.mock.method(console, "warn", (...args) => void warnings.push(args));
  t.mock.method(console, "error", (...args) => void errors.push(args));

  const env = createEnv();
  const missing = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "192.0.2.1" }), env);
  assert.equal(missing.status, 200);
  assert.equal(missing.headers.get("X-Like-RL"), "nobinding");
  assert.equal(missing.headers.get("Access-Control-Expose-Headers"), "X-Like-RL");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0][0], /LIKE_LIMITER binding missing/);

  // A binding object without a callable limit() counts as missing too.
  env.LIKE_LIMITER = {};
  const notCallable = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "192.0.2.2" }), env);
  assert.equal(notCallable.headers.get("X-Like-RL"), "nobinding");
  assert.equal(warnings.length, 2);

  env.LIKE_LIMITER = { limit: async () => { throw new TypeError("bad key"); } };
  const thrown = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "192.0.2.3" }), env);
  assert.equal(thrown.status, 200);
  assert.equal(thrown.headers.get("X-Like-RL"), "error");
  assert.equal(errors.length, 1);
  assert.deepEqual(errors[0][1], { name: "TypeError", message: "bad key" });

  // A synchronous throw from limit() is caught the same way.
  env.LIKE_LIMITER = { limit: () => { throw new Error("sync boom"); } };
  const syncThrown = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "192.0.2.4" }), env);
  assert.equal(syncThrown.headers.get("X-Like-RL"), "error");
  assert.equal(errors.length, 2);

  // A KV write failure after a passing limiter still carries the header.
  env.LIKE_LIMITER = { limit: async () => ({ success: true }) };
  env.VISITS.put = async () => { throw new Error("quota"); };
  const kvFail = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "192.0.2.5" }), env);
  assert.equal(kvFail.headers.get("X-Like-RL"), "ok");
  assert.equal((await kvFail.json()).counted, false);

  // GET and bot POSTs never reach the limiter, so they carry no header.
  const get = await worker.fetch(request("/likes/fixture-post"), env);
  assert.equal(get.headers.get("X-Like-RL"), null);
  const bot = await worker.fetch(request("/likes/fixture-post", { method: "POST", ua: "curl/8.7.1" }), env);
  assert.equal(bot.headers.get("X-Like-RL"), null);
  assert.equal((await bot.json()).counted, false);
});

test("there is no unlike: an unlike body still increments", async () => {
  const env = createEnv();
  env.store.set(likesKey("fixture-post"), "3");
  const response = await worker.fetch(
    request("/likes/fixture-post", { method: "POST", body: JSON.stringify({ action: "unlike" }) }),
    env,
  );

  assert.deepEqual(await response.json(), { ok: true, slug: "fixture-post", likes: 4, counted: true });
  assert.equal(env.store.get(likesKey("fixture-post")), "4");
});

test("article.like and article.liked exist and are non-empty in every locale", () => {
  for (const locale of ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"]) {
    const dictionary = JSON.parse(readFileSync(new URL(`../src/i18n/${locale}.json`, import.meta.url), "utf8"));
    assert.ok(dictionary.article.like.trim(), `${locale} article.like`);
    assert.ok(dictionary.article.liked.trim(), `${locale} article.liked`);
    assert.notEqual(dictionary.article.like, dictionary.article.liked, `${locale} like/liked differ`);
  }
});

test("/hit and /total keep their original behaviour next to the likes routes", async () => {
  const env = createEnv();
  env.store.set(TOTAL_KEY, "9");

  const hit = await worker.fetch(request("/hit", { method: "POST" }), env);
  assert.deepEqual(await hit.json(), { ok: true, counted: true, total: 10 });

  const total = await worker.fetch(request("/total"), env);
  assert.deepEqual(await total.json(), { total: 10 });

  const likes = await worker.fetch(request("/likes/fixture-post"), env);
  assert.deepEqual(await likes.json(), { ok: true, slug: "fixture-post", likes: 0 });
});

function expectedDedupeKey(ip, slug) {
  const hex = createHash("sha256").update(`${ip}|${slug}|site-likes-v1`).digest("hex").slice(0, 16);
  return `liked:${slug}:${hex}`;
}

test("a second like from the same visitor within 24h is a counted:false duplicate", async () => {
  const env = createEnv();
  env.store.set(likesKey("fixture-post"), "10");
  const ip = "198.51.100.23";

  const first = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip }), env);
  assert.equal(first.headers.get("X-Like-RL"), "nobinding");
  assert.deepEqual(await first.json(), { ok: true, slug: "fixture-post", likes: 11, counted: true });

  const dedupeKey = expectedDedupeKey(ip, "fixture-post");
  assert.match(dedupeKey, /^liked:fixture-post:[0-9a-f]{16}$/);
  assert.deepEqual(env.puts.at(-1), { key: dedupeKey, value: "1", options: { expirationTtl: 86400 } });
  // Only a truncated one-way hash is stored: the raw IP never appears in a key or value.
  for (const [key, value] of env.store) {
    assert.equal(key.includes(ip), false, key);
    assert.equal(String(value).includes(ip), false, key);
  }

  const second = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip }), env);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("X-Like-RL"), "dup");
  assert.deepEqual(await second.json(), { ok: true, slug: "fixture-post", likes: 11, counted: false, duplicate: true });
  assert.equal(env.store.get(likesKey("fixture-post")), "11");

  // Same visitor, another article: separate dedupe key, counted.
  const other = await worker.fetch(request("/likes/other-post", { method: "POST", ip }), env);
  assert.deepEqual(await other.json(), { ok: true, slug: "other-post", likes: 1, counted: true });
  // Another visitor, same article: counted.
  const otherVisitor = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "198.51.100.24" }), env);
  assert.deepEqual(await otherVisitor.json(), { ok: true, slug: "fixture-post", likes: 12, counted: true });
});

test("dedupe is skipped without CF-Connecting-IP and never runs after a 429", async () => {
  const env = createEnv();
  for (const expected of [1, 2]) {
    const response = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: null }), env);
    assert.deepEqual(await response.json(), { ok: true, slug: "fixture-post", likes: expected, counted: true });
  }
  assert.deepEqual([...env.store.keys()], [likesKey("fixture-post")]);

  env.LIKE_LIMITER = { limit: async () => ({ success: false }) };
  const limited = await worker.fetch(request("/likes/fixture-post", { method: "POST" }), env);
  assert.equal(limited.status, 429);
  assert.deepEqual([...env.store.keys()], [likesKey("fixture-post")]);
});

test("dedupe KV failures fail open: the like counts and the error is logged", async (t) => {
  const errors = [];
  t.mock.method(console, "error", (...args) => void errors.push(args));
  t.mock.method(console, "warn", () => {});

  const env = createEnv();
  const realGet = env.VISITS.get;
  env.VISITS.get = async (key) => {
    if (key.startsWith("liked:")) throw new Error("kv read down");
    return realGet(key);
  };
  const readFail = await worker.fetch(request("/likes/fixture-post", { method: "POST" }), env);
  assert.equal(readFail.headers.get("X-Like-RL"), "nobinding");
  assert.deepEqual(await readFail.json(), { ok: true, slug: "fixture-post", likes: 1, counted: true });
  assert.equal(errors.length, 1);
  assert.match(errors[0][0], /dedupe read failed/);
  assert.deepEqual(errors[0][1], { name: "Error", message: "kv read down" });

  env.VISITS.get = realGet;
  const realPut = env.VISITS.put;
  env.VISITS.put = async (key, value, options) => {
    if (key.startsWith("liked:")) throw new Error("kv write down");
    return realPut(key, value, options);
  };
  const writeFail = await worker.fetch(request("/likes/fixture-post", { method: "POST", ip: "198.51.100.99" }), env);
  assert.deepEqual(await writeFail.json(), { ok: true, slug: "fixture-post", likes: 2, counted: true });
  assert.equal(errors.length, 2);
  assert.match(errors[1][0], /dedupe write failed/);
  assert.equal(env.store.get(likesKey("fixture-post")), "2");
});

test("a failed like-count write stores no dedupe key, so the visitor can retry", async () => {
  const env = createEnv();
  env.VISITS.put = async () => { throw new Error("quota"); };
  const response = await worker.fetch(request("/likes/fixture-post", { method: "POST" }), env);
  assert.deepEqual(await response.json(), { ok: true, slug: "fixture-post", likes: 0, counted: false });
  assert.equal(env.store.size, 0);
});
