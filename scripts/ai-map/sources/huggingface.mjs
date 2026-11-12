// Hugging Face Hub public API (no key): organization overview + most-downloaded model/dataset.
// downloads = Hub "downloads" field, i.e. the last 30 days.
import { fetchJson, sleep } from "../lib/http.mjs";

export const id = "huggingface";
export const label = "Hugging Face Hub API";
export const license = "Hub metadata via public API (model licenses vary; only metadata is used)";

const api = "https://huggingface.co/api";

export async function collect(entries) {
  const items = {};
  const errors = [];
  for (const entry of entries) {
    const config = entry.sources?.huggingface;
    if (!config) continue;
    try {
      const item = { org: config.org };
      const overview = await fetchJson(`${api}/organizations/${encodeURIComponent(config.org)}/overview`);
      item.fullname = overview.fullname;
      item.followers = overview.numFollowers;
      item.models = overview.numModels;
      item.datasets = overview.numDatasets;
      const search = config.modelSearch ? `&search=${encodeURIComponent(config.modelSearch)}` : "";
      const models = await fetchJson(`${api}/models?author=${encodeURIComponent(config.org)}${search}&sort=downloads&direction=-1&limit=1`);
      if (models[0]) item.topModel = { id: models[0].id, downloads30d: models[0].downloads, likes: models[0].likes, createdAt: models[0].createdAt };
      const recent = await fetchJson(`${api}/models?author=${encodeURIComponent(config.org)}${search}&sort=createdAt&direction=-1&limit=1`);
      if (recent[0]) item.latestModel = { id: recent[0].id, createdAt: recent[0].createdAt };
      if (config.datasets) {
        const datasets = await fetchJson(`${api}/datasets?author=${encodeURIComponent(config.org)}&sort=downloads&direction=-1&limit=1`);
        if (datasets[0]) item.topDataset = { id: datasets[0].id, downloads30d: datasets[0].downloads, likes: datasets[0].likes };
      }
      items[entry.id] = item;
    } catch (error) {
      errors.push(`${entry.id}: ${error.message}`);
    }
    await sleep(250);
  }
  return { items, errors };
}

export function facts(item, entry, meta) {
  const out = [];
  const orgUrl = `https://huggingface.co/${item.org}`;
  const base = { method: "script", collector: id, retrievedAt: meta.retrievedAt, asOf: meta.retrievedAt };
  if (typeof item.followers === "number") {
    out.push({ ...base, metric: "hfFollowers", value: item.followers, sourceUrl: orgUrl, sourceName: "Hugging Face" });
  }
  if (item.topModel && typeof item.topModel.downloads30d === "number") {
    out.push({ ...base, metric: "hfTopModelDownloads30d", value: item.topModel.downloads30d, subject: item.topModel.id, sourceUrl: `https://huggingface.co/${item.topModel.id}`, sourceName: "Hugging Face" });
  }
  if (item.topDataset && typeof item.topDataset.downloads30d === "number") {
    out.push({ ...base, metric: "hfTopDatasetDownloads30d", value: item.topDataset.downloads30d, subject: item.topDataset.id, sourceUrl: `https://huggingface.co/datasets/${item.topDataset.id}`, sourceName: "Hugging Face" });
  }
  if (typeof item.models === "number") {
    out.push({ ...base, metric: "hfModels", value: item.models, sourceUrl: orgUrl, sourceName: "Hugging Face" });
  }
  return out;
}

export function lastActivity(item) {
  return item.latestModel?.createdAt?.slice(0, 10) ?? null;
}
