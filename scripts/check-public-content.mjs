import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const requestedTargets = process.argv.slice(2);
const legacyPages = ["index.html", "about.html", "blog.html", "favorites.html", "contact.html"];
const defaultTargets = [
  ...legacyPages.filter((path) => existsSync(resolve(root, path))),
  ...["src", "public", "dist"].filter((path) => existsSync(resolve(root, path))),
];
const targets = requestedTargets.length > 0 ? requestedTargets : defaultTargets;

const shippingPatterns = [
  { label: "projects route", pattern: /(?:href|action)=["'][^"']*\/projects(?:["'/?#])/i },
  { label: "local user path", pattern: /\/(?:Users|home)\/[^/\s]+\// },
  { label: "private key", pattern: /BEGIN [A-Z ]*PRIVATE KEY/ },
  { label: "authorization header", pattern: /authorization\s*[:=]\s*["']?(?:bearer|basic)\s+/i },
  { label: "set-cookie header", pattern: /set-cookie\s*:/i },
  { label: "common secret assignment", pattern: /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i },
];

const textFiles = new Set();
const failures = [];

function collect(path) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) return;

  const stats = statSync(absolute);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(absolute)) {
      collect(relative(root, resolve(absolute, entry)));
    }
    return;
  }

  textFiles.add(absolute);
}

function readText(path) {
  if (!existsSync(path)) return null;
  const value = readFileSync(path);
  if (value.includes(0)) return null;
  return value.toString("utf8");
}

for (const target of targets) collect(target);

if (existsSync(resolve(root, "projects.html"))) {
  failures.push("projects.html: forbidden public route file");
}

for (const path of textFiles) {
  const content = readText(path);
  if (content === null) continue;

  for (const { label, pattern } of shippingPatterns) {
    if (pattern.test(content)) {
      failures.push(`${relative(root, path)}: ${label}`);
    }
  }
}

const privateTermsPath = process.env.SHOA_PRIVATE_TERMS_FILE;
if (privateTermsPath) {
  if (!existsSync(privateTermsPath)) {
    failures.push("private terms file: missing");
  } else {
    const terms = readFileSync(privateTermsPath, "utf8")
      .split(/\r?\n/)
      .map((term) => term.trim())
      .filter((term) => term && !term.startsWith("#"));
    const normalizedTerms = terms.map((term) => term.toLocaleLowerCase());
    const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root })
      .toString("utf8")
      .split("\0")
      .filter(Boolean);

    for (const trackedPath of tracked) {
      const normalizedPath = trackedPath.toLocaleLowerCase();
      if (normalizedTerms.some((term) => normalizedPath.includes(term))) {
        failures.push("tracked path: private term match");
        continue;
      }

      const absolute = resolve(root, trackedPath);
      const content = readText(absolute);
      if (content === null) continue;

      const normalizedContent = content.toLocaleLowerCase();
      if (normalizedTerms.some((term) => normalizedContent.includes(term))) {
        failures.push(`${trackedPath}: private term match`);
      }
    }
  }
}

if (basename(resolve(root, process.argv[2] ?? "")) === "projects") {
  failures.push("projects: forbidden public output target");
}

if (failures.length > 0) {
  console.error([...new Set(failures)].sort().join("\n"));
  process.exit(1);
}

console.log(`Public content check passed (${textFiles.size} files).`);
