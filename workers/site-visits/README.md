# site-visits Worker

Site-wide cumulative **page-view (PV)** counter and per-article **reader likes** for www.bydziwen.top. Cloudflare KV holds one integer per key (`site:pv`, `likes:{slug}`); no cookies, IPs, or user agents are stored.

## API

| Method | Path | Response | Notes |
| ------ | ---- | -------- | ----- |
| POST   | `/hit`   | `{ ok: true, counted: boolean, total }`    | Increments `site:pv`. Requires an allowed `Origin`; bot-like / missing user agents return the total without counting. |
| GET    | `/total` | `{ total }`                                | Public read. |
| GET    | `/likes/{slug}` | `{ ok: true, slug, likes }`         | Public read of one article's like count. No key means `likes: 0`. |
| POST   | `/likes/{slug}` | `{ ok: true, slug, likes, counted }` | Increments `likes:{slug}`, **never decrements** — there is no unlike. Same `Origin` / bot-UA rules as `/hit`, plus per-IP rate limiting (below). |

The `{slug}` is the blog post's `translationKey`, shared by all eight language editions, so every locale reads and writes the same counter. Slugs must match `^[a-z0-9][a-z0-9-]{0,63}$`; anything else (uppercase, `/`, `..`, encoded characters, >64 chars) gets `400 { ok: false, error: "invalid slug" }` on both GET and POST.

CORS allows the origins in `ALLOWED_ORIGINS` (`wrangler.toml`) plus any `http://localhost:*` / `http://127.0.0.1:*` for previews.

## Rate limiting

`wrangler.toml` declares a Workers Rate Limiting binding `LIKE_LIMITER`: 10 `POST /likes/{slug}` per 60 seconds per `CF-Connecting-IP` (missing header counts as `"unknown"`). Over the limit the Worker answers `429 { ok: false, error: "rate limited", likes }` without touching KV. `GET` is never limited. When the binding is absent (local `wrangler dev`, tests) or `limit()` throws, the Worker silently fails open — likes still work and are only guarded by the Origin allowlist, bot-UA filter, and KV's one-write-per-key-per-second ceiling.

Deploying the `[[ratelimits]]` block requires **wrangler ≥ 4.36**; older versions reject the config.

## Deploy

```bash
cd workers/site-visits
npm i -g wrangler            # or npx wrangler
wrangler login               # or: export CLOUDFLARE_API_TOKEN=... (Workers Scripts:Edit + Workers KV Storage:Edit)
wrangler kv namespace create VISITS
# paste the printed id into wrangler.toml -> [[kv_namespaces]].id
wrangler deploy              # prints https://shoa-site-visits.<account>.workers.dev
```

Optionally seed a starting value: `wrangler kv key put --binding VISITS --remote site:pv 0`.

Then wire the site to it:

```bash
gh variable set PUBLIC_VISIT_API_URL --repo shoa-lin/shoa-site --body "https://shoa-site-visits.<account>.workers.dev"
```

The Pages workflow passes that variable to the build. When it is empty, the footer counter is not rendered and no requests are made.

## Local development

```bash
wrangler dev --port 8787                                   # local KV, nothing touches production
PUBLIC_VISIT_API_URL=http://127.0.0.1:8787 npm run build && npm run preview
```

## Limits and trade-offs

- **KV has no atomic increment.** Two hits landing at the same moment can collapse into one, and a KV value read at another edge location can lag by up to ~60s. That is fine for a rough public PV figure. If exact counts matter later, swap KV for a Durable Object (single-threaded, atomic).
- **Free plan: 1,000 KV writes/day**, shared by `/hit` and `/likes`. Past that, both still return the last value (`counted: false`) and the pages keep working; the counters just stop increasing until the next UTC day. Workers Paid lifts this.
- **Like counts are integrity-light by design** (same as the PV figure): `Origin` and UA headers stop casual browser-side noise, `LIKE_LIMITER` slows scripted floods to 10/min/IP, but a determined actor with rotating IPs can still inflate numbers. The rate-limit binding is the knob to tighten first.
- Bot filtering is a simple UA regex (`bot|crawl|spider|headless|lighthouse|…`). It never matches ordinary mobile or desktop browsers.
