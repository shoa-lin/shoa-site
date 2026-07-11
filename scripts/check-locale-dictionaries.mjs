import { readFileSync } from "node:fs";

const locales = ["zh", "en", "ja", "ko", "th", "fr"];

function flatten(value, prefix = "", output = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, path, output);
    } else {
      output.set(path, child);
    }
  }
  return output;
}

const dictionaries = new Map(
  locales.map((locale) => {
    const url = new URL(`../src/i18n/${locale}.json`, import.meta.url);
    return [locale, flatten(JSON.parse(readFileSync(url, "utf8")))];
  }),
);

const sourceKeys = [...dictionaries.get("zh").keys()].sort();
const failures = [];

for (const locale of locales) {
  const dictionary = dictionaries.get(locale);
  const keys = [...dictionary.keys()].sort();
  const missing = sourceKeys.filter((key) => !dictionary.has(key));
  const extra = keys.filter((key) => !dictionaries.get("zh").has(key));
  const empty = keys.filter((key) => typeof dictionary.get(key) !== "string" || !dictionary.get(key).trim());

  if (missing.length) failures.push(`${locale}: missing ${missing.join(", ")}`);
  if (extra.length) failures.push(`${locale}: extra ${extra.join(", ")}`);
  if (empty.length) failures.push(`${locale}: empty ${empty.join(", ")}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Locale dictionaries passed (${locales.length} locales, ${sourceKeys.length} keys).`);
