// Epoch AI "AI Companies" dataset (CC BY 4.0): revenue, usage and funding reports, each with its own original source.
// Only rows Epoch marks "Confident" are used.
import { fetchBuffer } from "../lib/http.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { readZip, zipEntry } from "../lib/zip.mjs";

export const id = "epochCompanies";
export const label = "Epoch AI · AI Companies";
export const license = "CC BY 4.0 — Epoch AI, 'Data on AI companies', https://epoch.ai/data/ai-companies";
const zipUrl = "https://epoch.ai/data/ai_companies.zip";
export const datasetUrl = "https://epoch.ai/data/ai-companies";

const confident = (row) => row["Confidence"] === "Confident";
const latestFirst = (key) => (a, b) => (b[key] || "").localeCompare(a[key] || "");

export async function collect(entries) {
  const tracked = entries.filter((entry) => entry.sources?.epochCompanies);
  if (!tracked.length) return { items: {}, errors: [] };
  const files = readZip(await fetchBuffer(zipUrl));
  const revenue = parseCsv(zipEntry(files, "ai_companies_revenue_reports.csv"));
  const usage = parseCsv(zipEntry(files, "ai_companies_usage_reports.csv"));
  const funding = parseCsv(zipEntry(files, "ai_companies_funding_rounds.csv"));
  const items = {};
  const errors = [];
  for (const entry of tracked) {
    const { company, usageProduct, revenue: wantRevenue = true, valuation: wantValuation = true } = entry.sources.epochCompanies;
    const item = { company };
    if (wantRevenue) {
      const row = revenue.filter((r) => r["Company"] === company && confident(r) && r["Annualized revenue (USD)"]).sort(latestFirst("Date"))[0];
      if (row) item.revenue = { value: Number(row["Annualized revenue (USD)"]), type: row["Annualized revenue type"], scope: row["Scope"], date: row["Date"], source: row["Source 1"], sourceType: row["Source type"] };
    }
    if (usageProduct) {
      const row = usage.filter((r) => r["Company"] === company && r["Product"] === usageProduct && confident(r) && r["Active users"]).sort(latestFirst("Date"))[0];
      if (row) item.usage = { product: usageProduct, value: Number(row["Active users"]), period: row["Active users time period"], date: row["Date"], source: row["Source 1"], sourceType: row["Source type"] };
    }
    if (wantValuation) {
      const row = funding.filter((r) => r["Company"] === company && confident(r) && r["Valuation (post-money)"] && /closed|completed/i.test(r["Status"] || "")).sort(latestFirst("Close date"))[0];
      if (row) item.valuation = { value: Number(row["Valuation (post-money)"]), date: row["Close date"], source: row["Source 1"], round: row["Id"] };
    }
    if (!item.revenue && !item.usage && !item.valuation) errors.push(`${entry.id}: no Confident rows for ${company}`);
    items[entry.id] = item;
  }
  return { items, errors };
}

function sourceLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "original"; }
}

export function facts(item, entry, meta) {
  const base = { method: "script", collector: id, retrievedAt: meta.retrievedAt };
  const out = [];
  const attribution = (url) => ({ sourceUrl: url || datasetUrl, sourceName: `${sourceLabel(url)} · via Epoch AI (CC BY 4.0)`, datasetUrl });
  if (item.revenue) out.push({ ...base, ...attribution(item.revenue.source), metric: "annualizedRevenue", value: item.revenue.value, unit: "USD", period: item.revenue.type, asOf: item.revenue.date });
  if (item.usage) out.push({ ...base, ...attribution(item.usage.source), metric: item.usage.period === "Weekly" ? "weeklyActiveUsers" : "monthlyActiveUsers", value: item.usage.value, subject: item.usage.product, asOf: item.usage.date });
  if (item.valuation) out.push({ ...base, ...attribution(item.valuation.source), metric: "postMoneyValuation", value: item.valuation.value, unit: "USD", asOf: item.valuation.date });
  return out;
}

export function lastActivity() {
  return null;
}
