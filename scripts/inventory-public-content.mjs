import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContentEntries } from "./lib/content-files.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const requestedOutput = process.env.CONTENT_AUDIT && resolve(process.env.CONTENT_AUDIT);
if (!requestedOutput) throw new Error("CONTENT_AUDIT must point to a file outside the repository");
const outputEntry = lstatSync(requestedOutput, { throwIfNoEntry: false });
let outputPath;
try {
  outputPath = outputEntry
    ? realpathSync(requestedOutput)
    : resolve(realpathSync(dirname(requestedOutput)), basename(requestedOutput));
} catch {
  throw new Error("CONTENT_AUDIT must point to a file outside the repository");
}
const outputRelative = relative(realpathSync(root), outputPath);
if (outputRelative === "" || (outputRelative !== ".." && !outputRelative.startsWith(`..${sep}`) && !isAbsolute(outputRelative))) {
  throw new Error("CONTENT_AUDIT must point to a file outside the repository");
}

const privateTermsPath = process.env.SHOA_PRIVATE_TERMS_FILE;
if (privateTermsPath && !existsSync(privateTermsPath)) {
  throw new Error("SHOA_PRIVATE_TERMS_FILE does not exist");
}
const privateTerms = privateTermsPath
  ? readFileSync(privateTermsPath, "utf8").split(/\r?\n/).map((term) => term.trim().toLowerCase()).filter(Boolean)
  : [];

async function reachable(url) {
  if (!url) return "missing";
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
    return response.ok ? "reachable" : `http-${response.status}`;
  } catch {
    return "unreachable";
  }
}

const groups = Map.groupBy(
  loadContentEntries(resolve(root, "src/content")),
  (entry) => `${entry.collection}:${entry.data.translationKey}`,
);
const items = await Promise.all([...groups.entries()].map(async ([key, entries]) => {
  const source = entries.find((entry) => entry.data.locale === entry.data.sourceLocale) ?? entries[0];
  const normalized = entries
    .map((entry) => `${entry.relativePath}\n${JSON.stringify(entry.data)}\n${entry.body}`)
    .join("\n")
    .toLowerCase();
  const isPrivate = privateTerms.some((term) => normalized.includes(term));
  if (isPrivate) {
    return { id: createHash("sha256").update(key).digest("hex").slice(0, 12), decision: "quarantine" };
  }
  const contentType = source.data.contentType ?? "adaptation";
  return {
    id: source.data.translationKey,
    collection: source.collection,
    file: source.relativePath,
    sourceUrl: source.data.sourceUrl,
    sourceLocale: source.data.sourceLocale,
    contentType,
    imageCount: (source.body.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length,
    reachability: await reachable(source.data.sourceUrl),
    decision: contentType === "original" ? "publish" : "adapt",
  };
}));

const report = {
  generatedAt: new Date().toISOString(),
  publicCount: items.filter((item) => item.decision !== "quarantine").length,
  quarantinedCount: items.filter((item) => item.decision === "quarantine").length,
  items,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ publicCount: report.publicCount, quarantinedCount: report.quarantinedCount }));
