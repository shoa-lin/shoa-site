// Epoch AI chip datasets (CC BY 4.0): cumulative AI compute shipped by chip designer, and AI compute owned by company.
// Values are Epoch's median estimates in H100-equivalents.
import { fetchBuffer } from "../lib/http.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { readZip, zipEntry } from "../lib/zip.mjs";

export const id = "epochChips";
export const label = "Epoch AI · AI Chip Sales / AI Chip Owners";
export const license = "CC BY 4.0 — Epoch AI, https://epoch.ai/data/ai-chip-sales and https://epoch.ai/data/ai-chip-owners";
const salesUrl = "https://epoch.ai/data/ai_chip_sales.zip";
const ownersUrl = "https://epoch.ai/data/ai_chip_owners.zip";

export async function collect(entries) {
  const designers = entries.filter((entry) => entry.sources?.epochChips?.designer);
  const owners = entries.filter((entry) => entry.sources?.epochChips?.owner);
  if (!designers.length && !owners.length) return { items: {}, errors: [] };
  const items = {};
  const errors = [];
  if (designers.length) {
    const rows = parseCsv(zipEntry(readZip(await fetchBuffer(salesUrl)), "cumulative_timelines_by_designer.csv"));
    for (const entry of designers) {
      const designer = entry.sources.epochChips.designer;
      const row = rows.filter((r) => r["Chip manufacturer"] === designer).sort((a, b) => b["End date"].localeCompare(a["End date"]))[0];
      if (!row) { errors.push(`${entry.id}: designer ${designer} not found`); continue; }
      items[entry.id] = { ...(items[entry.id] ?? {}), designer: { name: designer, start: row["Start date"], end: row["End date"], h100e: Number(row["Compute estimate in H100e (median)"]), incomplete: row["Incomplete"] || "" } };
    }
  }
  if (owners.length) {
    const rows = parseCsv(zipEntry(readZip(await fetchBuffer(ownersUrl)), "cumulative_by_designer.csv"));
    for (const entry of owners) {
      const owner = entry.sources.epochChips.owner;
      const own = rows.filter((r) => r["Owner"] === owner);
      const end = own.map((r) => r["End date"]).sort().at(-1);
      if (!end) { errors.push(`${entry.id}: owner ${owner} not found`); continue; }
      const latest = own.filter((r) => r["End date"] === end);
      items[entry.id] = {
        ...(items[entry.id] ?? {}),
        owner: { name: owner, end, h100e: latest.reduce((sum, r) => sum + Number(r["Compute estimate in H100e (median)"] || 0), 0), byDesigner: latest.map((r) => ({ designer: r["Chip manufacturer"], h100e: Number(r["Compute estimate in H100e (median)"]) })) },
      };
    }
  }
  return { items, errors };
}

export function facts(item, entry, meta) {
  const base = { method: "script", collector: id, retrievedAt: meta.retrievedAt, sourceName: "Epoch AI (CC BY 4.0)" };
  const out = [];
  if (item.designer) out.push({ ...base, metric: "epochCumulativeH100eShipped", value: Math.round(item.designer.h100e), period: `${item.designer.start}–${item.designer.end}`, asOf: item.designer.end, sourceUrl: "https://epoch.ai/data/ai-chip-sales" });
  if (item.owner) out.push({ ...base, metric: "epochOwnedH100e", value: Math.round(item.owner.h100e), period: `≤ ${item.owner.end}`, asOf: item.owner.end, sourceUrl: "https://epoch.ai/data/ai-chip-owners" });
  return out;
}

export function lastActivity() {
  return null;
}
