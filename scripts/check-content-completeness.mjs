import { loadContentEntries, locales, resolveContentRoot } from "./lib/content-files.mjs";

const allowDrafts = process.argv.includes("--allow-drafts");
const entries = loadContentEntries(resolveContentRoot());
const failures = [];
const groups = new Map();

for (const entry of entries) {
  const key = `${entry.collection}:${entry.data.translationKey}`;
  const status = entry.collection === "blog" ? entry.data.translationStatus : entry.data.publicationStatus;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);

  if (!locales.includes(entry.data.locale)) failures.push(`${key}: unsupported locale`);
  if (entry.pathLocale !== entry.data.locale) failures.push(`${key}: path locale mismatch`);
  if (!allowDrafts && status === "draft") failures.push(`${key}: draft content is not publishable`);
}

if (entries.length === 0) failures.push("No content files found.");

for (const [key, group] of groups) {
  const active = allowDrafts ? group : group.filter((entry) => {
    const status = entry.collection === "blog" ? entry.data.translationStatus : entry.data.publicationStatus;
    return status === "reviewed" || status === "published";
  });
  const found = [...new Set(active.map((entry) => entry.data.locale))].sort();
  if (active.length !== 6 || found.length !== 6) {
    failures.push(`${key.split(":")[1]}: expected 6 locales, found ${found.length}`);
  }
  for (const locale of locales) {
    if (!found.includes(locale)) failures.push(`${key}: missing ${locale}`);
  }
}

if (failures.length) {
  console.error([...new Set(failures)].join("\n"));
  process.exit(1);
}

console.log(`Content completeness passed (${groups.size} translation groups, ${entries.length} files).`);
