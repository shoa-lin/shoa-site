import entriesData from "../data/ai-map/entries.json" with { type: "json" };
import metricsData from "../data/ai-map/metrics.json" with { type: "json" };
import policiesData from "../data/ai-map/policies.json" with { type: "json" };
import taxonomyData from "../data/ai-map/taxonomy.json" with { type: "json" };
import { localeMeta, type Locale } from "./i18n";

export type AiMapRegion = "cn" | "global";
type Localized = { zh: string; en: string };
type FactValue = number | string | Localized;

export interface AiMapFact {
  key: string;
  metric?: string;
  label?: Localized;
  value: FactValue;
  valueType?: "date" | "text";
  unit?: string;
  period?: string;
  subject?: string;
  sourceUrl: string;
  sourceName: string;
  asOf: string;
  verifiedAt: string;
  method: "script" | "manual";
}

export interface AiMapEntry {
  id: string;
  name: Localized;
  region: AiMapRegion;
  country: string;
  layer: string;
  category: string;
  website: string;
  wikidata: string | null;
  oneLiner: Localized;
  reason: Localized;
  status: "active" | "watch" | "removed";
  firstListed: string;
  facts: AiMapFact[];
  founded?: AiMapFact;
}

export interface AiMapPolicy {
  id: string;
  region: AiMapRegion;
  title: Localized;
  issuer: Localized;
  date: string;
  dateLabel: "published" | "effective" | "applicable";
  sourceUrl: string;
  verifiedAt: string;
}

export const aiMapRules = taxonomyData.rules;
export const aiMapLayers = taxonomyData.layers;
export const aiMapDataAsOf: string = metricsData.dataAsOf;
export const aiMapSources = metricsData.sources as Record<string, { label: string; license: string; status: string; retrievedAt: string; items: number; skipped: string | null }>;
export const aiMapPolicies = policiesData as AiMapPolicy[];

type MetricsEntry = { facts: AiMapFact[]; meta: Record<string, AiMapFact>; lastActivity: string | null };
const metricEntries = metricsData.entries as Record<string, MetricsEntry>;

export const aiMapEntries: AiMapEntry[] = (entriesData as unknown as Omit<AiMapEntry, "facts" | "founded">[])
  .filter((entry) => entry.status !== "removed")
  .map((entry) => ({ ...entry, facts: metricEntries[entry.id]?.facts ?? [], founded: metricEntries[entry.id]?.meta?.foundedYear }));

/** Only zh and en have curated copy in P1; every other locale shows the English text. */
export function contentLocale(locale: Locale): "zh" | "en" {
  return locale === "zh" ? "zh" : "en";
}

export function pick(value: Localized, locale: Locale): string {
  return value[contentLocale(locale)];
}

export function entriesFor(category: string, region: AiMapRegion): AiMapEntry[] {
  return aiMapEntries.filter((entry) => entry.category === category && entry.region === region);
}

export function daysSince(date: string, today: Date): number {
  return Math.floor((today.valueOf() - new Date(`${date.slice(0, 10)}T00:00:00Z`).valueOf()) / 86_400_000);
}

export type Freshness = "fresh" | "stale" | "hidden";

export function factFreshness(fact: AiMapFact, today: Date): Freshness {
  const age = daysSince(fact.verifiedAt, today);
  if (age > aiMapRules.hideNumbersAfterDays) return "hidden";
  if (age > aiMapRules.staleAfterDays) return "stale";
  return "fresh";
}

export function entryFreshness(entry: AiMapEntry, today: Date): Freshness {
  const states = entry.facts.map((fact) => factFreshness(fact, today));
  if (states.length && states.every((state) => state === "hidden")) return "hidden";
  return states.some((state) => state !== "fresh") ? "stale" : "fresh";
}

const currencyUnits = new Set(["USD", "CNY", "KRW", "TWD", "EUR"]);
const measureUnits = new Set(["mile", "kilometer"]);

export function formatFactValue(fact: AiMapFact, locale: Locale): string {
  const lang = contentLocale(locale) === "zh" ? "zh-CN" : "en";
  const { value } = fact;
  if (typeof value === "object") return pick(value, locale);
  if (fact.valueType === "date" && typeof value === "string") {
    return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  }
  if (typeof value === "string") return value;
  if (fact.unit && currencyUnits.has(fact.unit)) {
    return new Intl.NumberFormat(lang, { style: "currency", currency: fact.unit, notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (fact.unit && measureUnits.has(fact.unit)) {
    return new Intl.NumberFormat(lang, { style: "unit", unit: fact.unit, unitDisplay: "short", notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (Math.abs(value) < 10_000) return new Intl.NumberFormat(lang).format(value);
  return new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatDate(date: string, locale: Locale): string {
  const lang = contentLocale(locale) === "zh" ? "zh-CN" : "en";
  if (/^\d{4}-\d{2}$/.test(date)) return new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}-01T00:00:00Z`));
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

export function htmlLangFor(locale: Locale): string {
  return contentLocale(locale) === locale ? localeMeta[locale].htmlLang : "en";
}

export type DistributionRegion = "cn" | "us" | "europe" | "other";
const europe = new Set(["GB", "FR", "DE", "NL", "CH", "SE", "BG", "CZ", "ES", "IT", "IE", "FI", "DK", "BE", "AT", "PL", "EE"]);

export function distributionRegion(entry: AiMapEntry): DistributionRegion {
  if (entry.region === "cn") return "cn";
  if (entry.country === "US") return "us";
  if (europe.has(entry.country)) return "europe";
  return "other";
}
