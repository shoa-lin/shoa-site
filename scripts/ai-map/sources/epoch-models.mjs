// Epoch AI "AI Models" database (CC BY 4.0): notable models per organization in the trailing 24 months.
import { fetchText } from "../lib/http.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { isoDate, monthsAgo } from "../lib/dates.mjs";

export const id = "epochModels";
export const label = "Epoch AI · AI Models";
export const license = "CC BY 4.0 — Epoch AI, 'Data on AI Models', https://epoch.ai/data/ai-models";
const csvUrl = "https://epoch.ai/data/all_ai_models.csv";
export const datasetUrl = "https://epoch.ai/data/ai-models";

export async function collect(entries, { now = new Date() } = {}) {
  const tracked = entries.filter((entry) => entry.sources?.epochModels?.orgs?.length);
  if (!tracked.length) return { items: {}, errors: [] };
  const rows = parseCsv(await fetchText(csvUrl));
  const since = isoDate(monthsAgo(24, now));
  const items = {};
  for (const entry of tracked) {
    const orgs = new Set(entry.sources.epochModels.orgs);
    const matches = rows.filter((row) => row["Organization"].split(",").some((org) => orgs.has(org.trim())));
    const notable = matches.filter((row) => row["Notability criteria"] && row["Publication date"] >= since)
      .sort((a, b) => b["Publication date"].localeCompare(a["Publication date"]));
    const latest = [...matches].filter((row) => row["Publication date"]).sort((a, b) => b["Publication date"].localeCompare(a["Publication date"]))[0];
    items[entry.id] = {
      orgs: [...orgs],
      window: { since, until: isoDate(now) },
      notableCount24m: notable.length,
      frontierCount24m: notable.filter((row) => row["Frontier model"] && row["Frontier model"] !== "False").length,
      notable: notable.slice(0, 12).map((row) => ({ model: row["Model"], date: row["Publication date"], link: row["Link"], frontier: row["Frontier model"] || "" })),
      latest: latest ? { model: latest["Model"], date: latest["Publication date"], link: latest["Link"] } : null,
    };
  }
  return { items, errors: [], notes: [`rows=${rows.length}`, `window since ${since}`] };
}

export function facts(item, entry, meta) {
  const base = { method: "script", collector: id, retrievedAt: meta.retrievedAt, sourceUrl: datasetUrl, sourceName: "Epoch AI (CC BY 4.0)" };
  const out = [{ ...base, metric: "epochNotableModels24m", value: item.notableCount24m, period: `${item.window.since}–${item.window.until}`, asOf: meta.retrievedAt }];
  const latestNotable = item.notable[0];
  if (latestNotable) out.push({ ...base, metric: "epochLatestNotableModel", value: latestNotable.model, valueType: "text", asOf: latestNotable.date, sourceUrl: latestNotable.link || datasetUrl, sourceName: latestNotable.link ? "Epoch AI (CC BY 4.0) · original release" : base.sourceName });
  return out;
}

export function lastActivity(item) {
  return item.latest?.date ?? null;
}
