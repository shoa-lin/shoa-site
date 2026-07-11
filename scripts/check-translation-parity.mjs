import { loadContentEntries, resolveContentRoot } from "./lib/content-files.mjs";

function signature(body) {
  const lines = body.split(/\r?\n/);
  const headings = [];
  const images = [];
  const codeLanguages = [];
  const externalLinks = [];
  let headingIndex = -1;
  let tableCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^(#{1,6})\s+\S/);
    if (heading) {
      headings.push(heading[1].length);
      headingIndex += 1;
    }

    for (const match of line.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      images.push({ headingIndex, target: match[1].split(/\s+/)[0] });
    }

    const fence = line.match(/^```([^\s`]*)/);
    if (fence) codeLanguages.push(fence[1]);

    if (/^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(line.trim())) tableCount += 1;

    for (const match of line.matchAll(/(?<!!)\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)) {
      externalLinks.push(match[1]);
    }
  }

  return { headings, images, codeLanguages, tableCount, externalLinks };
}

const entries = loadContentEntries(resolveContentRoot());
const groups = new Map();
const failures = [];

for (const entry of entries) {
  const key = `${entry.collection}:${entry.data.translationKey}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

for (const [key, group] of groups) {
  const sourceLocale = group[0].data.sourceLocale;
  const source = group.find((entry) => entry.data.locale === sourceLocale);
  if (!source) {
    failures.push(`${key}: source locale file missing`);
    continue;
  }
  const expected = JSON.stringify(signature(source.body));
  for (const entry of group) {
    if (JSON.stringify(signature(entry.body)) !== expected) {
      failures.push(`${entry.data.translationKey}/${entry.data.locale}: structure differs`);
    }
    if (entry.data.sourceUrl !== source.data.sourceUrl) {
      failures.push(`${entry.data.translationKey}/${entry.data.locale}: source URL differs`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Translation parity passed (${groups.size} translation groups).`);
