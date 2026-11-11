// GitHub REST API: stars and last push for one repository per entry.
// Uses GITHUB_TOKEN when present (GitHub Actions provides it); otherwise unauthenticated (60 requests/hour).
import { fetchJson, sleep } from "../lib/http.mjs";

export const id = "github";
export const label = "GitHub REST API";
export const license = "GitHub API terms; repository metadata only";

export async function collect(entries) {
  const items = {};
  const errors = [];
  const headers = { "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (const entry of entries) {
    const repo = entry.sources?.github?.repo;
    if (!repo) continue;
    try {
      const data = await fetchJson(`https://api.github.com/repos/${repo}`, { headers, accept: "application/vnd.github+json", retries: 1 });
      items[entry.id] = {
        repo: data.full_name,
        stars: data.stargazers_count,
        forks: data.forks_count,
        pushedAt: data.pushed_at,
        archived: data.archived,
        license: data.license?.spdx_id ?? null,
        ownerType: data.owner?.type,
      };
    } catch (error) {
      errors.push(`${entry.id}: ${error.message}`);
    }
    await sleep(200);
  }
  return { items, errors, notes: [process.env.GITHUB_TOKEN ? "authenticated with GITHUB_TOKEN" : "unauthenticated (60 requests/hour)"] };
}

export function facts(item, entry, meta) {
  const base = { method: "script", collector: id, retrievedAt: meta.retrievedAt };
  const url = `https://github.com/${item.repo}`;
  const out = [];
  if (typeof item.stars === "number") out.push({ ...base, metric: "githubStars", value: item.stars, subject: item.repo, sourceUrl: url, sourceName: "GitHub", asOf: meta.retrievedAt });
  if (item.pushedAt) out.push({ ...base, metric: "githubLastPush", value: item.pushedAt.slice(0, 10), valueType: "date", subject: item.repo, sourceUrl: `${url}/commits`, sourceName: "GitHub", asOf: meta.retrievedAt });
  return out;
}

export function lastActivity(item) {
  return item.archived ? null : item.pushedAt?.slice(0, 10) ?? null;
}
