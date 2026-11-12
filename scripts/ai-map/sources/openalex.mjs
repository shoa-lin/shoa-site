// OpenAlex (CC0): works and citations for research institutions. OpenAlex now meters anonymous use against a tiny
// shared daily budget, so this collector only runs when OPENALEX_API_KEY is set; otherwise it records a skip.
import { fetchJson } from "../lib/http.mjs";

export const id = "openalex";
export const label = "OpenAlex";
export const license = "CC0";

export async function collect(entries) {
  const tracked = entries.filter((entry) => entry.sources?.openalex?.institution);
  if (!process.env.OPENALEX_API_KEY) return { items: {}, errors: [], skipped: "OPENALEX_API_KEY not set (free key: https://openalex.org/settings/api)" };
  const items = {};
  const errors = [];
  for (const entry of tracked) {
    try {
      const data = await fetchJson(`https://api.openalex.org/institutions/${entry.sources.openalex.institution}?api_key=${process.env.OPENALEX_API_KEY}`);
      items[entry.id] = { institution: data.id, worksCount: data.works_count, citedByCount: data.cited_by_count };
    } catch (error) {
      errors.push(`${entry.id}: ${error.message.replace(/api_key=[^&\s]+/g, "api_key=***")}`);
    }
  }
  return { items, errors };
}

export function facts(item, entry, meta) {
  return [{ method: "script", collector: id, retrievedAt: meta.retrievedAt, metric: "openalexWorks", value: item.worksCount, asOf: meta.retrievedAt, sourceUrl: item.institution, sourceName: "OpenAlex (CC0)" }];
}

export function lastActivity() {
  return null;
}
