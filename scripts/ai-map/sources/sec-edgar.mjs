// SEC EDGAR XBRL API (public, no key; SEC asks for a descriptive User-Agent): latest full-year revenue from 10-K / 20-F.
import { fetchJson, sleep } from "../lib/http.mjs";
import { daysBetween } from "../lib/dates.mjs";

export const id = "secEdgar";
export const label = "SEC EDGAR XBRL API";
export const license = "U.S. government public data (SEC EDGAR)";

const CONCEPTS = [
  ["us-gaap", "Revenues"],
  ["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"],
  ["ifrs-full", "Revenue"],
];

export async function collect(entries) {
  const tracked = entries.filter((entry) => entry.sources?.sec?.ticker);
  if (!tracked.length) return { items: {}, errors: [] };
  const tickers = Object.values(await fetchJson("https://www.sec.gov/files/company_tickers.json"));
  const items = {};
  const errors = [];
  for (const entry of tracked) {
    const ticker = entry.sources.sec.ticker.toUpperCase();
    const company = tickers.find((row) => row.ticker === ticker);
    if (!company) { errors.push(`${entry.id}: ticker ${ticker} not in SEC list`); continue; }
    const cik = String(company.cik_str).padStart(10, "0");
    try {
      const data = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
      let best = null;
      for (const [taxonomy, concept] of CONCEPTS) {
        const units = data.facts?.[taxonomy]?.[concept]?.units ?? {};
        for (const [unit, values] of Object.entries(units)) {
          for (const value of values) {
            if (!["10-K", "20-F", "10-K/A", "20-F/A"].includes(value.form) || !value.start) continue;
            const days = daysBetween(value.start, value.end);
            if (days < 350 || days > 380) continue;
            if (!best || value.end > best.end || (value.end === best.end && value.filed > best.filed)) best = { taxonomy, concept, unit, ...value };
          }
        }
      }
      if (!best) { errors.push(`${entry.id}: no annual revenue concept found`); continue; }
      items[entry.id] = { ticker, cik, entityName: data.entityName, revenue: best };
    } catch (error) {
      errors.push(`${entry.id}: ${error.message}`);
    }
    await sleep(300);
  }
  return { items, errors };
}

export function facts(item, entry, meta) {
  const r = item.revenue;
  const accession = r.accn.replace(/-/g, "");
  return [{
    method: "script", collector: id, retrievedAt: meta.retrievedAt,
    metric: "annualRevenue", value: r.val, unit: r.unit, period: `${r.start}–${r.end}`, asOf: r.end,
    sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(item.cik)}/${accession}/`,
    sourceName: `SEC EDGAR · ${r.form} (${r.taxonomy}:${r.concept})`,
  }];
}

// Annual filings say nothing about recent product activity, so SEC data never counts as an activity signal.
export function lastActivity() {
  return null;
}
