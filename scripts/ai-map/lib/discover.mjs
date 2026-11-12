// Monthly "discovery" stage: deterministic searches over public APIs that surface products the map does NOT list yet.
// No AI is involved and nothing here edits entries.json — the output is a list a human reads and decides on.
import { sleep as defaultSleep } from "./http.mjs";

const USER_AGENT = "shoa-site-ai-map/1.0 (+https://www.bydziwen.top; shoa_lin@outlook.com)";
const DAY = 86_400_000;

export const SECTION_HEADING = "## 6. 候选新条目（需人工判断）";

// Each query is a GitHub search string with {created} / {pushed} placeholders filled from the run date.
// "fresh" = created recently and already popular; "active" = established repos still pushing code this month.
export const githubQueries = [
  { id: "ai-agent-new", signal: "fresh", q: "topic:ai-agent created:>={created} stars:>=300" },
  { id: "ai-agents-new", signal: "fresh", q: "topic:ai-agents created:>={created} stars:>=300" },
  { id: "coding-agent-new", signal: "fresh", q: "topic:coding-agent created:>={created} stars:>=200" },
  { id: "llm-agent-new", signal: "fresh", q: "topic:llm-agent created:>={created} stars:>=300" },
  { id: "agent-keyword-new", signal: "fresh", q: "\"ai agent\" in:name,description created:>={created} stars:>=1000" },
  { id: "ai-agent-active", signal: "active", q: "topic:ai-agent pushed:>={pushed} stars:>=10000" },
  { id: "coding-agent-active", signal: "active", q: "topic:coding-agent pushed:>={pushed} stars:>=3000" },
  { id: "llm-agent-active", signal: "active", q: "topic:llm-agent pushed:>={pushed} stars:>=10000" },
  { id: "ai-agents-active", signal: "active", q: "topic:ai-agents pushed:>={pushed} stars:>=20000" },
  { id: "assistant-active", signal: "active", q: "topic:assistant pushed:>={pushed} stars:>=20000" },
  { id: "coding-agent-keyword-active", signal: "active", q: "\"coding agent\" in:description pushed:>={pushed} stars:>=20000" },
];

export const defaults = { createdWithinDays: 183, pushedWithinDays: 30, perQuery: 30, maxGithub: 30, hfWithinDays: 90, maxHf: 15 };

// Lists, tutorials and prompt collections are popular on GitHub but are not products.
const NOT_A_PRODUCT = /(^|[-_.])(awesome|list|lists|tutorials?|course|courses|prompts?|papers|cookbook|examples|interview|roadmap|guide|resources|checklist|learn|handbook)([-_.]|$)/i;

// Quantised, merged or "uncensored" re-uploads trend on the Hub but are not new model makers.
const REPACKAGED = /gguf|uncensored|heretic|abliterated|[-_.](awq|gptq|mlx|exl2|exl3|fp8|int4|bnb|4bit|8bit)([-_.]|$)|merge/i;

const dayString = (date) => new Date(date).toISOString().slice(0, 10);

export function fillQuery(template, now, options = defaults) {
  return template
    .replace("{created}", dayString(new Date(now).valueOf() - options.createdWithinDays * DAY))
    .replace("{pushed}", dayString(new Date(now).valueOf() - options.pushedWithinDays * DAY));
}

// Everything the map already covers, normalised to lowercase, so candidates never repeat a listed entry.
export function knownSets(entries) {
  const repos = new Set();
  const owners = new Set();
  const hfOrgs = new Set();
  const names = new Set();
  for (const entry of entries) {
    if (entry.status === "removed") continue;
    const repo = entry.sources?.github?.repo;
    if (repo) { repos.add(repo.toLowerCase()); }
    const site = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/i.exec(entry.website ?? "");
    if (site) repos.add(`${site[1]}/${site[2]}`.toLowerCase());
    const org = entry.sources?.huggingface?.org;
    if (org) hfOrgs.add(org.toLowerCase());
    for (const name of [entry.name?.en, entry.name?.zh]) if (name) names.add(normaliseName(name));
  }
  for (const repo of repos) owners.add(repo.split("/")[0]);
  return { repos, owners, hfOrgs, names };
}

export function normaliseName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

export function selectGithubCandidates(resultsByQuery, entries, options = defaults) {
  const known = knownSets(entries);
  const byRepo = new Map();
  const excluded = { listed: 0, notProduct: 0, archivedOrFork: 0 };
  for (const { query, items } of resultsByQuery) {
    for (const item of items ?? []) {
      const fullName = item.full_name;
      if (!fullName) continue;
      const key = fullName.toLowerCase();
      if (known.repos.has(key) || known.names.has(normaliseName(item.name))) { excluded.listed += 1; continue; }
      if (item.archived || item.fork) { excluded.archivedOrFork += 1; continue; }
      if (NOT_A_PRODUCT.test(item.name)) { excluded.notProduct += 1; continue; }
      const existing = byRepo.get(key);
      if (existing) { if (!existing.matchedQueries.includes(query.id)) existing.matchedQueries.push(query.id); if (!existing.signals.includes(query.signal)) existing.signals.push(query.signal); continue; }
      byRepo.set(key, {
        repo: fullName,
        url: item.html_url ?? `https://github.com/${fullName}`,
        description: (item.description ?? "").trim().slice(0, 200),
        homepage: item.homepage || null,
        owner: item.owner?.login ?? fullName.split("/")[0],
        ownerType: item.owner?.type ?? null,
        ownerAlreadyListed: known.owners.has(fullName.split("/")[0].toLowerCase()),
        stars: item.stargazers_count ?? 0,
        createdAt: item.created_at?.slice(0, 10) ?? null,
        pushedAt: item.pushed_at?.slice(0, 10) ?? null,
        language: item.language ?? null,
        license: item.license?.spdx_id ?? null,
        topics: (item.topics ?? []).slice(0, 8),
        matchedQueries: [query.id],
        signals: [query.signal],
      });
    }
  }
  const candidates = [...byRepo.values()].sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo)).slice(0, options.maxGithub);
  return { candidates, excluded, considered: byRepo.size };
}

export function selectHfCandidates(models, entries, now, options = defaults) {
  const known = knownSets(entries);
  const cutoff = new Date(now).valueOf() - options.hfWithinDays * DAY;
  const out = [];
  const seenAuthors = new Set();
  for (const model of models ?? []) {
    const author = model.author ?? model.id?.split("/")[0];
    if (!author || known.hfOrgs.has(author.toLowerCase())) continue;
    if (REPACKAGED.test(model.id ?? "")) continue;
    if (model.createdAt && Date.parse(model.createdAt) < cutoff) continue;
    if (seenAuthors.has(author.toLowerCase())) continue; // one line per organisation; the top-trending model represents it
    seenAuthors.add(author.toLowerCase());
    out.push({
      author,
      model: model.id,
      url: `https://huggingface.co/${model.id}`,
      orgUrl: `https://huggingface.co/${author}`,
      likes: model.likes ?? 0,
      downloads30d: model.downloads ?? 0,
      trendingScore: model.trendingScore ?? null,
      pipeline: model.pipeline_tag ?? null,
      createdAt: model.createdAt?.slice(0, 10) ?? null,
    });
    if (out.length >= options.maxHf) break;
  }
  return out;
}

// GitHub search with explicit rate-limit handling: anonymous search is 10 requests/minute, authenticated 30.
export async function githubSearch(q, { token, perPage = defaults.perQuery, fetchImpl = fetch, sleepImpl = defaultSleep, maxWaitMs = 65_000 } = {}) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}`;
  const headers = { "User-Agent": USER_AGENT, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(60_000) });
    if (response.ok) {
      const data = await response.json();
      return { items: data.items ?? [], total: data.total_count ?? 0, incomplete: Boolean(data.incomplete_results), remaining: Number(response.headers.get("x-ratelimit-remaining") ?? NaN) };
    }
    const limited = response.status === 429 || (response.status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.get("retry-after")));
    if (!limited) throw new Error(`HTTP ${response.status} for GitHub search: ${(await response.text().catch(() => "")).slice(0, 160)}`);
    const wait = rateLimitWaitMs(response.headers);
    if (wait > maxWaitMs) throw new Error(`GitHub search rate limit; reset in ${Math.ceil(wait / 1000)}s (set GITHUB_TOKEN for a higher limit)`);
    await sleepImpl(wait);
  }
  throw new Error("GitHub search still rate limited after retries");
}

export function rateLimitWaitMs(headers, nowMs = Date.now()) {
  const retryAfter = Number(headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) return Math.max(1000, reset * 1000 - nowMs + 1000);
  return 60_000;
}

export async function runDiscovery({ entries, now = new Date(), token = process.env.GITHUB_TOKEN, fetchImpl = fetch, sleepImpl = defaultSleep, options = defaults, log = () => {} }) {
  const errors = [];
  const runs = [];
  // Pace requests under the search limit up front instead of waiting for 403s.
  const gap = token ? 2_500 : 6_500;
  for (const [index, query] of githubQueries.entries()) {
    const q = fillQuery(query.q, now, options);
    try {
      const result = await githubSearch(q, { token, perPage: options.perQuery, fetchImpl, sleepImpl });
      runs.push({ query: { ...query, q }, items: result.items, total: result.total });
      log(`github ${query.id}: ${result.items.length}/${result.total}`);
    } catch (error) {
      errors.push(`github ${query.id}: ${error.message}`);
      runs.push({ query: { ...query, q }, items: [], total: null, error: error.message });
      log(`github ${query.id}: ${error.message}`);
    }
    if (index < githubQueries.length - 1) await sleepImpl(gap);
  }
  const github = selectGithubCandidates(runs, entries, options);

  let hf = [];
  try {
    const response = await fetchImpl("https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=100", { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    hf = selectHfCandidates(await response.json(), entries, now, options);
    log(`huggingface trending: ${hf.length}`);
  } catch (error) {
    errors.push(`huggingface trending: ${error.message}`);
  }

  return {
    date: dayString(now),
    generatedAt: new Date().toISOString(),
    method: "Deterministic public-API search (GitHub Search API, Hugging Face Hub API). No AI. Not applied to entries.json.",
    authenticated: Boolean(token),
    options,
    queries: runs.map((run) => ({ id: run.query.id, signal: run.query.signal, q: run.query.q, returned: run.items.length, total: run.total, error: run.error ?? null })),
    excluded: github.excluded,
    github: github.candidates,
    huggingface: hf,
    errors,
  };
}

const num = (value) => Number(value ?? 0).toLocaleString("en-US");
const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

export function renderDiscoverySection(data) {
  const lines = [SECTION_HEADING, ""];
  lines.push(`由 \`npm run ai-map:discover\` 于 ${data.generatedAt}（UTC）生成：只按公开 API 的确定性规则筛出**未收录**的项目，不调用 AI，也不会改 \`entries.json\`。是否收录、放哪一格，按 README 的入选标准人工判断；收录前要另外找到可核实的指标来源。`);
  lines.push("");
  lines.push(`GitHub 检索 ${data.queries.length} 组（${data.authenticated ? "已用 GITHUB_TOKEN" : "匿名，受限流影响"}），排除已收录 ${data.excluded.listed}、清单/教程类 ${data.excluded.notProduct}、归档/fork ${data.excluded.archivedOrFork}。`);
  for (const error of data.errors) lines.push(`- ⚠️ ${error}`);
  lines.push("");
  lines.push(`### 6.1 GitHub（${data.github.length}）`);
  lines.push("");
  if (data.github.length) {
    lines.push("| 仓库 | Star | 创建 | 最近推送 | 信号 | 简介 |");
    lines.push("|---|---|---|---|---|---|");
    for (const item of data.github) {
      const signal = item.signals.map((value) => (value === "fresh" ? "新项目" : "活跃")).join("+") + (item.ownerAlreadyListed ? "（同机构已收录）" : "");
      lines.push(`| [${cell(item.repo)}](${item.url}) | ${num(item.stars)} | ${item.createdAt ?? ""} | ${item.pushedAt ?? ""} | ${signal} | ${cell(item.description).slice(0, 90)} |`);
    }
  } else lines.push("- 无（或检索失败，见上方提示）");
  lines.push("");
  lines.push(`### 6.2 Hugging Face 热门新模型的未收录机构（${data.huggingface.length}）`);
  lines.push("");
  if (data.huggingface.length) {
    lines.push("| 机构 | 代表模型 | 点赞 | 近 30 天下载 | 类型 | 创建 |");
    lines.push("|---|---|---|---|---|---|");
    for (const item of data.huggingface) lines.push(`| [${cell(item.author)}](${item.orgUrl}) | [${cell(item.model)}](${item.url}) | ${num(item.likes)} | ${num(item.downloads30d)} | ${item.pipeline ?? ""} | ${item.createdAt ?? ""} |`);
  } else lines.push("- 无（或检索失败，见上方提示）");
  lines.push("");
  lines.push("- [ ] 逐个判断：是产品/公司而非清单或个人项目？属于哪一格？该格是否还有名额？");
  lines.push("- [ ] 决定收录的，手工写进 `entries.json` 并补可核实指标，再跑 build / apply / verify。");
  lines.push("");
  return lines.join("\n");
}

// Replace (or append) the discovery section in a report so build.mjs and discover.mjs can run in either order.
export function upsertSection(markdown, section) {
  const text = markdown ?? "";
  const start = text.indexOf(SECTION_HEADING);
  if (start < 0) return `${text.replace(/\s*$/, "")}${text.trim() ? "\n\n" : ""}${section.replace(/\s*$/, "")}\n`;
  const rest = text.slice(start + SECTION_HEADING.length);
  const next = rest.search(/\n## /);
  const tail = next >= 0 ? rest.slice(next + 1) : "";
  return `${text.slice(0, start)}${section.replace(/\s*$/, "")}\n${tail ? `\n${tail}` : ""}`;
}
