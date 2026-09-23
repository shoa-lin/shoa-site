// Site-wide page-view counter for www.bydziwen.top.
// Stores one integer in KV; no cookies, IPs, or user agents are persisted.

import { TOTAL_KEY, isAllowedOrigin, isBot } from "./counter.js";

function corsHeaders(origin, env) {
  const headers = { Vary: "Origin" };
  if (isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function readTotal(env) {
  const value = Number.parseInt((await env.VISITS.get(TOTAL_KEY)) ?? "0", 10);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
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
      return json({ total: await readTotal(env) }, 200, cors);
    }

    if (url.pathname === "/hit" && request.method === "POST") {
      // Only count hits sent by the site itself (or a local preview) from a real browser.
      if (!isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) {
        return json({ ok: false, error: "origin not allowed" }, 403, cors);
      }

      const total = await readTotal(env);
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
