// Site-wide page-view counter and per-article reader likes for www.bydziwen.top.
// Stores one integer per key in KV; no cookies, raw IPs, or user agents are persisted.
// Like dedupe keeps only a truncated one-way hash of (IP, slug), and only for 24h.

import {
  TOTAL_KEY,
  isAllowedOrigin,
  isBot,
  isValidSlug,
  likesKey,
  parseLikesPath,
} from "./counter.js";

function corsHeaders(origin, env) {
  const headers = { Vary: "Origin" };
  if (isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Max-Age"] = "86400";
    headers["Access-Control-Expose-Headers"] = "X-Like-RL";
  }
  return headers;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function readCount(env, key) {
  const value = Number.parseInt((await env.VISITS.get(key)) ?? "0", 10);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

// One counted like per visitor per article per 24h. The KV key holds the first
// 16 hex chars of SHA-256("{ip}|{slug}|site-likes-v1"), never the IP itself.
const LIKE_DEDUPE_TTL_SECONDS = 86400;
const LIKE_DEDUPE_SALT = "site-likes-v1";

async function likeDedupeKey(ip, slug) {
  const data = new TextEncoder().encode(`${ip}|${slug}|${LIKE_DEDUPE_SALT}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const hex = Array.from(digest.subarray(0, 8), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `liked:${slug}:${hex}`;
}

function errorDetails(error) {
  return { name: error?.name, message: error?.message ?? String(error) };
}

// Best-effort per-IP throttle for like writes. A missing binding (local dev,
// tests) or a throwing limiter must never break the endpoint: fail open.
// Returns which branch ran ("ok" | "limited" | "nobinding" | "error"); POST
// /likes echoes it in the X-Like-RL response header so a curl shows it at once.
async function likeRateLimitStatus(env, request) {
  if (typeof env.LIKE_LIMITER?.limit !== "function") {
    console.warn("LIKE_LIMITER binding missing or has no limit(); failing open", {
      bindingType: typeof env.LIKE_LIMITER,
    });
    return "nobinding";
  }
  const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
  try {
    const { success } = await env.LIKE_LIMITER.limit({ key });
    return success === true ? "ok" : "limited";
  } catch (error) {
    console.error("LIKE_LIMITER.limit() threw; failing open", {
      name: error?.name,
      message: error?.message ?? String(error),
    });
    return "error";
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/total" && request.method === "GET") {
      return json({ total: await readCount(env, TOTAL_KEY) }, 200, cors);
    }

    const likesSlug = parseLikesPath(url.pathname);
    if (likesSlug !== null) {
      if (!isValidSlug(likesSlug)) {
        return json({ ok: false, error: "invalid slug" }, 400, cors);
      }

      if (request.method === "GET") {
        return json({ ok: true, slug: likesSlug, likes: await readCount(env, likesKey(likesSlug)) }, 200, cors);
      }

      if (request.method === "POST") {
        // Likes only ever increment; there is intentionally no unlike.
        // Same guards as /hit: only the site itself, and never a bot UA.
        if (!isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) {
          return json({ ok: false, error: "origin not allowed" }, 403, cors);
        }

        const key = likesKey(likesSlug);
        const likes = await readCount(env, key);
        if (isBot(request.headers.get("User-Agent"))) {
          return json({ ok: true, slug: likesSlug, likes, counted: false }, 200, cors);
        }

        const rateLimit = await likeRateLimitStatus(env, request);
        const likeHeaders = { ...cors, "X-Like-RL": rateLimit };
        if (rateLimit === "limited") {
          return json({ ok: false, error: "rate limited", likes }, 429, likeHeaders);
        }

        // Dedupe: a visitor who already liked this article in the last 24h gets
        // the current count back, uncounted. No CF-Connecting-IP (local dev)
        // skips it; a dedupe KV failure fails open and is logged.
        const ip = request.headers.get("CF-Connecting-IP");
        let dedupeKey = null;
        if (ip) {
          try {
            dedupeKey = await likeDedupeKey(ip, likesSlug);
            if ((await env.VISITS.get(dedupeKey)) !== null) {
              return json(
                { ok: true, slug: likesSlug, likes, counted: false, duplicate: true },
                200,
                { ...likeHeaders, "X-Like-RL": "dup" },
              );
            }
          } catch (error) {
            console.error("like dedupe read failed; failing open", errorDetails(error));
          }
        }

        const next = likes + 1;
        try {
          await env.VISITS.put(key, String(next));
        } catch {
          // KV allows one write per key per second; a burst or an exhausted
          // daily quota lands here. Like /hit: report the old value, counted false.
          return json({ ok: true, slug: likesSlug, likes, counted: false }, 200, likeHeaders);
        }
        if (dedupeKey) {
          try {
            await env.VISITS.put(dedupeKey, "1", { expirationTtl: LIKE_DEDUPE_TTL_SECONDS });
          } catch (error) {
            console.error("like dedupe write failed; like still counted", errorDetails(error));
          }
        }
        return json({ ok: true, slug: likesSlug, likes: next, counted: true }, 200, likeHeaders);
      }
    }

    if (url.pathname === "/hit" && request.method === "POST") {
      // Only count hits sent by the site itself (or a local preview) from a real browser.
      if (!isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) {
        return json({ ok: false, error: "origin not allowed" }, 403, cors);
      }

      const total = await readCount(env, TOTAL_KEY);
      if (isBot(request.headers.get("User-Agent"))) {
        return json({ ok: true, counted: false, total }, 200, cors);
      }

      // KV has no atomic increment; concurrent hits may occasionally collapse into one.
      // That is acceptable for a rough public PV figure. A failed write (e.g. free-plan
      // daily write quota) still returns the last known total so the footer keeps working.
      const next = total + 1;
      try {
        await env.VISITS.put(TOTAL_KEY, String(next));
        return json({ ok: true, counted: true, total: next }, 200, cors);
      } catch {
        return json({ ok: true, counted: false, total }, 200, cors);
      }
    }

    return json({ ok: false, error: "not found" }, 404, cors);
  },
};
