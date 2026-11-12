// Wikidata (CC0): labels, country (P17), inception (P571), official website (P856). Used for de-duplication,
// consistency checks against the curated seed, and the founding year shown in entry details.
import { fetchJson } from "../lib/http.mjs";

export const id = "wikidata";
export const label = "Wikidata";
export const license = "CC0";

const countryCodes = { Q30: "US", Q148: "CN", Q145: "GB", Q142: "FR", Q183: "DE", Q801: "IL", Q884: "KR", Q17: "JP", Q16: "CA", Q865: "TW", Q8646: "HK", Q334: "SG", Q213: "CZ", Q55: "NL", Q39: "CH", Q34: "SE", Q219: "BG", Q408: "AU", Q668: "IN" };

function claimValues(entity, property) {
  return (entity.claims?.[property] ?? []).filter((claim) => claim.rank !== "deprecated").map((claim) => claim.mainsnak?.datavalue?.value).filter(Boolean);
}

export async function collect(entries) {
  const tracked = entries.filter((entry) => entry.wikidata);
  const items = {};
  const errors = [];
  for (let i = 0; i < tracked.length; i += 40) {
    const batch = tracked.slice(i, i + 40);
    const ids = batch.map((entry) => entry.wikidata).join("|");
    try {
      const data = await fetchJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=labels|descriptions|claims&languages=en|zh&format=json`);
      for (const entry of batch) {
        const entity = data.entities?.[entry.wikidata];
        if (!entity || entity.missing !== undefined) { errors.push(`${entry.id}: ${entry.wikidata} missing`); continue; }
        const countries = claimValues(entity, "P17").map((value) => value.id);
        const inception = claimValues(entity, "P571")[0]?.time ?? null;
        items[entry.id] = {
          qid: entry.wikidata,
          labelEn: entity.labels?.en?.value ?? null,
          labelZh: entity.labels?.zh?.value ?? null,
          descriptionEn: entity.descriptions?.en?.value ?? null,
          countries: countries.map((qid) => countryCodes[qid] ?? qid),
          inceptionYear: inception ? Number(inception.slice(1, 5)) : null,
          websites: claimValues(entity, "P856"),
        };
      }
    } catch (error) {
      errors.push(`batch ${i}: ${error.message}`);
    }
  }
  return { items, errors };
}

export function facts(item, entry, meta) {
  if (!item.inceptionYear) return [];
  return [{ method: "script", collector: id, retrievedAt: meta.retrievedAt, metric: "foundedYear", value: String(item.inceptionYear), valueType: "text", role: "meta", asOf: meta.retrievedAt, sourceUrl: `https://www.wikidata.org/wiki/${item.qid}`, sourceName: "Wikidata (CC0)" }];
}

export function lastActivity() {
  return null;
}
