import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  fillQuery, githubQueries, githubSearch, knownSets, rateLimitWaitMs, renderDiscoverySection, runDiscovery,
  SECTION_HEADING, selectGithubCandidates, selectHfCandidates, upsertSection,
} from "../scripts/ai-map/lib/discover.mjs";

const root = new URL("../", import.meta.url);
const now = new Date("2026-11-12T00:00:00Z");
const entries = [
  { id: "claude-code", name: { zh: "Claude Code", en: "Claude Code" }, website: "https://www.anthropic.com/claude-code", sources: { github: { repo: "anthropics/claude-code" } }, status: "active" },
  { id: "qwen-code", name: { zh: "Qwen Code", en: "Qwen Code" }, website: "https://github.com/QwenLM/qwen-code", sources: {}, status: "active" },
  { id: "deepseek", name: { zh: "DeepSeek", en: "DeepSeek" }, website: "https://www.deepseek.com", sources: { huggingface: { org: "deepseek-ai" } }, status: "active" },
];
const repo = (fullName, stars, extra = {}) => ({
  full_name: fullName, name: fullName.split("/")[1], html_url: `https://github.com/${fullName}`, stargazers_count: stars,
  created_at: "2026-09-01T00:00:00Z", pushed_at: "2026-11-10T00:00:00Z", owner: { login: fullName.split("/")[0], type: "Organization" }, ...extra,
});
const headers = (map = {}) => ({ get: (name) => map[name.toLowerCase()] ?? null });
const jsonResponse = (body, status = 200, h = {}) => ({ ok: status >= 200 && status < 300, status, headers: headers(h), json: async () => body, text: async () => JSON.stringify(body) });

test("query templates are filled from the run date", () => {
  assert.equal(fillQuery("created:>={created} pushed:>={pushed}", now), "created:>=2026-05-13 pushed:>=2026-10-13");
  assert.ok(githubQueries.length >= 5);
  assert.ok(githubQueries.every((query) => ["fresh", "active"].includes(query.signal)));
});

test("known sets cover seed repos, GitHub websites and Hugging Face orgs", () => {
  const known = knownSets(entries);
  assert.ok(known.repos.has("anthropics/claude-code"));
  assert.ok(known.repos.has("qwenlm/qwen-code"));
  assert.ok(known.hfOrgs.has("deepseek-ai"));
});

test("GitHub candidates exclude listed repos, lists and forks, merge duplicates and sort by stars", () => {
  const runs = [
    { query: { id: "a", signal: "fresh" }, items: [repo("Anthropics/Claude-Code", 90_000), repo("someone/awesome-agents", 50_000), repo("acme/agent", 1_000), repo("x/forked", 9_000, { fork: true })] },
    { query: { id: "b", signal: "active" }, items: [repo("acme/agent", 1_000), repo("big/bot", 5_000), repo("qwenlm/qwen-code", 20_000)] },
  ];
  const { candidates, excluded } = selectGithubCandidates(runs, entries);
  assert.deepEqual(candidates.map((item) => item.repo), ["big/bot", "acme/agent"]);
  assert.deepEqual(candidates[1].matchedQueries, ["a", "b"]);
  assert.deepEqual(candidates[1].signals, ["fresh", "active"]);
  assert.deepEqual(excluded, { listed: 2, notProduct: 1, archivedOrFork: 1 });
});

test("Hugging Face candidates skip listed orgs, old models and re-uploads, one line per org", () => {
  const models = [
    { id: "deepseek-ai/new", author: "deepseek-ai", createdAt: "2026-11-01T00:00:00Z", likes: 9 },
    { id: "lab/model-a", author: "lab", createdAt: "2026-11-01T00:00:00Z", likes: 5, downloads: 10 },
    { id: "lab/model-b", author: "lab", createdAt: "2026-11-02T00:00:00Z", likes: 4 },
    { id: "old/model", author: "old", createdAt: "2025-01-01T00:00:00Z", likes: 3 },
    { id: "quant/Model-GGUF", author: "quant", createdAt: "2026-11-01T00:00:00Z", likes: 2 },
  ];
  assert.deepEqual(selectHfCandidates(models, entries, now).map((item) => item.model), ["lab/model-a"]);
});

test("rate-limit wait honours Retry-After, then X-RateLimit-Reset", () => {
  assert.equal(rateLimitWaitMs(headers({ "retry-after": "7" })), 7000);
  assert.equal(rateLimitWaitMs(headers({ "x-ratelimit-reset": "1000" }), 990_000), 11_000);
  assert.equal(rateLimitWaitMs(headers({})), 60_000);
});

test("GitHub search waits once on a rate-limit response, then succeeds; sends the token when given", async () => {
  const calls = [];
  const waits = [];
  const responses = [jsonResponse({ message: "rate limit" }, 403, { "x-ratelimit-remaining": "0", "retry-after": "3" }), jsonResponse({ total_count: 1, items: [repo("acme/agent", 10)] })];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return responses.shift(); };
  const result = await githubSearch("topic:ai-agent", { token: "t0k", fetchImpl, sleepImpl: async (ms) => waits.push(ms) });
  assert.equal(result.items.length, 1);
  assert.deepEqual(waits, [3000]);
  assert.equal(calls[0].init.headers.Authorization, "Bearer t0k");
  assert.match(calls[0].url, /^https:\/\/api\.github\.com\/search\/repositories\?q=topic%3Aai-agent&sort=stars/);
});

test("GitHub search gives up with a clear message when the reset is too far away", async () => {
  const fetchImpl = async () => jsonResponse({}, 403, { "x-ratelimit-remaining": "0", "retry-after": "3600" });
  await assert.rejects(githubSearch("q", { fetchImpl, sleepImpl: async () => {} }), /rate limit.*GITHUB_TOKEN/);
});

test("a failing source is reported without stopping the run, and nothing touches entries.json", async () => {
  const before = readFileSync(new URL("src/data/ai-map/entries.json", root), "utf8");
  const fetchImpl = async (url) => url.startsWith("https://api.github.com/")
    ? jsonResponse({ total_count: 1, items: [repo("acme/agent", 4_000)] })
    : jsonResponse({}, 500);
  const data = await runDiscovery({ entries, now, token: "x", fetchImpl, sleepImpl: async () => {} });
  assert.deepEqual(data.github.map((item) => item.repo), ["acme/agent"]);
  assert.equal(data.huggingface.length, 0);
  assert.ok(data.errors.some((error) => error.startsWith("huggingface")));
  assert.equal(data.date, "2026-11-12");
  assert.equal(readFileSync(new URL("src/data/ai-map/entries.json", root), "utf8"), before);
});

test("report section renders candidates and is upserted idempotently", () => {
  const data = {
    generatedAt: "2026-11-12T00:00:00Z", authenticated: false, queries: [{ id: "a" }], excluded: { listed: 1, notProduct: 0, archivedOrFork: 0 }, errors: [],
    github: [{ repo: "acme/agent", url: "https://github.com/acme/agent", stars: 1234, createdAt: "2026-10-01", pushedAt: "2026-11-10", signals: ["fresh"], description: "a | b", ownerAlreadyListed: false }],
    huggingface: [],
  };
  const section = renderDiscoverySection(data);
  assert.ok(section.startsWith(SECTION_HEADING));
  assert.match(section, /\[acme\/agent\]\(https:\/\/github\.com\/acme\/agent\) \| 1,234 /);
  assert.match(section, /a \\\| b/);
  const report = "# R\n\n## 5. 审核清单\n\n- [ ] x\n";
  const once = upsertSection(report, section);
  const twice = upsertSection(once, section);
  assert.equal(once, twice);
  assert.equal(once.split(SECTION_HEADING).length, 2);
  assert.ok(once.indexOf("## 5.") < once.indexOf(SECTION_HEADING));
  const withTail = upsertSection(`${report}\n${SECTION_HEADING}\nold\n\n## 7. 其他\n\ntail\n`, section);
  assert.ok(withTail.includes("## 7. 其他") && !withTail.includes("\nold\n"));
});

test("discover script never writes to entries.json", () => {
  const source = readFileSync(new URL("scripts/ai-map/discover.mjs", root), "utf8") + readFileSync(new URL("scripts/ai-map/lib/discover.mjs", root), "utf8");
  assert.doesNotMatch(source, /entries\.json["'`]\s*\)/);
  assert.doesNotMatch(source, /writeJson\([^)]*siteDataDir/);
});
