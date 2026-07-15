import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";

export const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"];

function scalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((item) => scalar(item)).filter(Boolean);
  }
  return trimmed;
}

export function parseFrontmatter(content, filePath = "content") {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0] !== "---") throw new Error(`${filePath}: missing frontmatter`);
  const closing = lines.indexOf("---", 1);
  if (closing === -1) throw new Error(`${filePath}: unclosed frontmatter`);

  const data = {};
  for (const line of lines.slice(1, closing)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!match) throw new Error(`${filePath}: unsupported frontmatter line`);
    data[match[1]] = scalar(match[2]);
  }

  return { data, body: lines.slice(closing + 1).join("\n") };
}

function walk(directory, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) walk(absolute, output);
    else if ([".md", ".mdx"].includes(extname(entry))) output.push(absolute);
  }
  return output;
}

export function resolveContentRoot(argv = process.argv.slice(2)) {
  const index = argv.indexOf("--content-root");
  return resolve(index === -1 ? "src/content" : argv[index + 1]);
}

export function loadContentEntries(contentRoot) {
  const entries = [];
  for (const collection of ["blog", "favorites"]) {
    const collectionRoot = join(contentRoot, collection);
    for (const filePath of walk(collectionRoot)) {
      const parsed = parseFrontmatter(readFileSync(filePath, "utf8"), relative(contentRoot, filePath));
      const pathParts = relative(collectionRoot, filePath).split(sep);
      entries.push({
        collection,
        filePath,
        relativePath: relative(contentRoot, filePath),
        pathLocale: pathParts[0],
        ...parsed,
      });
    }
  }
  return entries;
}
