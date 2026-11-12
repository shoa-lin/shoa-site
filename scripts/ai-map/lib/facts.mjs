// Turns raw source snapshots + curated manual facts into the per-entry fact lists the site displays.
import { sourceById } from "../sources/index.mjs";
import { daysBetween, isoDate } from "./dates.mjs";

export function manualFacts(entry) {
  return (entry.manualFacts ?? []).map((fact) => ({ ...fact, method: "manual", collector: "manual" }));
}

export function scriptFacts(entry, raw) {
  const facts = [];
  let lastActivity = null;
  for (const [sourceId, snapshot] of Object.entries(raw)) {
    const item = snapshot.items?.[entry.id];
    const source = sourceById[sourceId];
    if (!item || !source) continue;
    const meta = { retrievedAt: snapshot.retrievedAt.slice(0, 10) };
    for (const fact of source.facts(item, entry, meta)) facts.push({ key: fact.metric, verifiedAt: meta.retrievedAt, verifiedBy: `script:${sourceId}`, ...fact });
    const activity = source.lastActivity?.(item);
    if (activity && (!lastActivity || activity > lastActivity)) lastActivity = activity;
  }
  return { facts, lastActivity };
}

export function selectFacts(entry, raw, rules, today = new Date()) {
  const { facts: fromScripts, lastActivity } = scriptFacts(entry, raw);
  const dropped = [];
  const fresh = (fact) => {
    if (fact.asOf && daysBetween(fact.asOf, today) > rules.maxFactAgeDays) { dropped.push({ key: fact.key, reason: `asOf ${fact.asOf} older than ${rules.maxFactAgeDays} days` }); return false; }
    return true;
  };
  const manual = manualFacts(entry).filter(fresh);
  const metaFacts = fromScripts.filter((fact) => fact.role === "meta");
  const ordered = (entry.show ?? []).map((key) => fromScripts.find((fact) => fact.key === key && fact.role !== "meta")).filter(Boolean).filter(fresh);
  for (const key of entry.show ?? []) if (!fromScripts.some((fact) => fact.key === key)) dropped.push({ key, reason: "not returned by any source this run" });
  const display = [...manual, ...ordered].slice(0, rules.maxFactsPerEntry);
  return { display, all: [...manual, ...fromScripts], meta: Object.fromEntries(metaFacts.map((fact) => [fact.key, fact])), lastActivity, dropped };
}

export function summarizeSources(raw) {
  return Object.fromEntries(Object.entries(raw).map(([id, snapshot]) => [id, {
    label: snapshot.label, license: snapshot.license, status: snapshot.status, retrievedAt: snapshot.retrievedAt,
    items: Object.keys(snapshot.items ?? {}).length, errors: snapshot.errors?.length ?? 0, skipped: snapshot.skipped ?? null,
  }]));
}

export { isoDate };
