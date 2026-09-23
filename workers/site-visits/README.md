# site-visits Worker

Site-wide cumulative **page-view (PV)** counter for www.bydziwen.top. One integer in Cloudflare KV (`site:pv`); no cookies, IPs, or user agents are stored.

## API

| Method | Path     | Response                                   | Notes |
| ------ | -------- | ------------------------------------------ | ----- |
| POST   | `/hit`   | `{ ok: true, counted: boolean, total }`    | Increments `site:pv`. Requires an allowed `Origin`; bot-like / missing user agents return the total without counting. |
| GET    | `/total` | `{ total }`                                | Public read. |

CORS allows the origins in `ALLOWED_ORIGINS` (`wrangler.toml`) plus any `http://localhost:*` / `http://127.0.0.1:*` for previews.

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
- **Free plan: 1,000 KV writes/day.** Past that, `/hit` still returns the last total (`counted: false`) and the footer keeps working; the counter just stops increasing until the next UTC day. Workers Paid lifts this.
- Bot filtering is a simple UA regex (`bot|crawl|spider|headless|lighthouse|…`). It never matches ordinary mobile or desktop browsers.
