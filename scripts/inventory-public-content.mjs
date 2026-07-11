import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const outputPath = process.env.CONTENT_AUDIT;
if (!outputPath) throw new Error("CONTENT_AUDIT must point to a file outside the repository");

const manifest = JSON.parse(readFileSync(new URL("../blogs/manifest.json", import.meta.url), "utf8"));
const privateTerms = process.env.SHOA_PRIVATE_TERMS_FILE && existsSync(process.env.SHOA_PRIVATE_TERMS_FILE)
  ? readFileSync(process.env.SHOA_PRIVATE_TERMS_FILE, "utf8").split(/\r?\n/).map((term) => term.trim().toLowerCase()).filter(Boolean)
  : [];

function sourceUrl(content) {
  const preferred = content.match(/(?:原文|来源|Source|Original)[^\n]*?\((https?:\/\/[^)]+)\)/i);
  if (preferred) return preferred[1];
  return content.match(/(?<!!)\[[^\]]+\]\((https?:\/\/[^)]+)\)/)?.[1] ?? null;
}

async function reachable(url) {
  if (!url) return "missing";
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
    return response.ok ? "reachable" : `http-${response.status}`;
  } catch {
    return "unreachable";
  }
}

const items = [];
for (const item of manifest) {
  const content = readFileSync(new URL(`../${item.filename}`, import.meta.url), "utf8");
  const normalized = `${item.filename}\n${content}`.toLowerCase();
  const isPrivate = privateTerms.some((term) => normalized.includes(term));
  if (isPrivate) {
    items.push({ id: createHash("sha256").update(item.id).digest("hex").slice(0, 12), decision: "quarantine" });
    continue;
  }
  const canonical = sourceUrl(content);
  items.push({
    id: item.id,
    file: item.filename,
    sourceUrl: canonical,
    sourceLocale: "zh",
    contentType: canonical ? "adaptation" : "original",
    imageCount: (content.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length,
    reachability: await reachable(canonical),
    decision: canonical ? "adapt" : "publish",
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  publicCount: items.filter((item) => item.decision !== "quarantine").length,
  quarantinedCount: items.filter((item) => item.decision === "quarantine").length,
  items,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ publicCount: report.publicCount, quarantinedCount: report.quarantinedCount }));
