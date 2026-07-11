import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "dist");
const failures = [];

function walk(directory, output = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, output);
    else output.push(path);
  }
  return output;
}

function targetFile(value) {
  const clean = decodeURIComponent(value.split(/[?#]/)[0]);
  if (!clean || clean === "/") return join(root, "index.html");
  const path = join(root, clean.replace(/^\//, ""));
  if (extname(path)) return path;
  return join(path, "index.html");
}

const files = walk(root);
for (const file of files.filter((path) => path.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(/<(a|img|script|source|link)\b[^>]*>/g)) {
    const tag = match[0];
    const name = match[1];
    if (name === "link" && !/rel="(?:stylesheet|icon|preload)"/.test(tag)) continue;
    const attribute = name === "a" || name === "link" ? "href" : "src";
    const value = tag.match(new RegExp(`${attribute}="([^"]+)"`))?.[1];
    if (!value) continue;
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(value)) continue;
    const target = targetFile(value);
    if (!existsSync(target)) failures.push(`${relative(root, file)}: broken ${value}`);
  }
}

if (failures.length) {
  console.error([...new Set(failures)].join("\n"));
  process.exit(1);
}

console.log(`Link check passed (${files.length} files).`);
