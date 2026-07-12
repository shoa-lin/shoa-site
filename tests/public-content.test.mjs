import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const legacyPaths = [
  "index.html", "about.html", "blog.html", "favorites.html", "contact.html", "style.css", "script.js",
  "css", "js", "blogs", "favorites/articles", "assets", "CNAME", ".nojekyll",
  "tests/site-content.test.mjs", "scripts/migrate-legacy-content.mjs",
];
let buildResult;

function ensureBuild() {
  buildResult ??= spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(buildResult.status, 0, `${buildResult.stdout}\n${buildResult.stderr}`);
}

function trackedSourcePaths() {
  return execFileSync("git", ["ls-files", "-z", "--", "src", "public"], { cwd: root })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function walk(directory, output = []) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, output);
    else output.push(path);
  }
  return output;
}

function readText(path) {
  const value = readFileSync(path);
  return value.includes(0) ? "" : value.toString("utf8");
}

test("legacy static runtime is absent from the checkout", () => {
  const remaining = legacyPaths.filter((path) => existsSync(resolve(root, path)));
  assert.deepEqual(remaining, []);
});

test("tracked Astro source and built output expose no projects route, entry point, or promotion", () => {
  ensureBuild();
  const sourcePaths = trackedSourcePaths();
  const distPaths = walk(resolve(root, "dist"));
  const relativePaths = [...sourcePaths, ...distPaths.map((path) => relative(root, path))];
  const combined = [
    ...sourcePaths.map((path) => readText(resolve(root, path))),
    ...distPaths.map(readText),
  ].join("\n");

  assert.ok(sourcePaths.length > 0);
  assert.ok(distPaths.length > 0);
  assert.ok(relativePaths.every((path) => !/(^|\/)projects(?:\/|\.|$)/i.test(path)));
  assert.doesNotMatch(combined, /(?:href|action)=["'][^"']*\/projects(?:["'/?#])/i);
  assert.doesNotMatch(combined, /我的项目|看项目|项目是系统实验|公开工作台|Featured work|Selected projects|项目展示/);
});

test("tracked source and every built HTML page use the public Outlook address", () => {
  ensureBuild();
  const source = trackedSourcePaths().map((path) => readText(resolve(root, path))).join("\n");
  const htmlFiles = walk(resolve(root, "dist")).filter((path) => path.endsWith(".html"));

  assert.match(source, /email:\s*"shoa_lin@outlook\.com"/);
  assert.doesNotMatch(source, /contact@shoa\.lin/);
  assert.ok(htmlFiles.length > 0);
  for (const path of htmlFiles) {
    const html = readText(path);
    assert.match(html, /mailto:shoa_lin@outlook\.com/, relative(root, path));
    assert.doesNotMatch(html, /contact@shoa\.lin/, relative(root, path));
  }
});

test("public content checker accepts the built repository output", () => {
  ensureBuild();
  const result = spawnSync(process.execPath, ["scripts/check-public-content.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("private-term scan tolerates tracked files deleted in the working tree", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-public-content-"));
  const termsFile = join(directory, "terms.txt");
  const absentTerm = ["absent", process.pid, Date.now().toString(36)].join("-");
  writeFileSync(termsFile, `${absentTerm}\n`);

  try {
    const result = spawnSync(process.execPath, ["scripts/check-public-content.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, SHOA_PRIVATE_TERMS_FILE: termsFile },
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("private-term scan checks tracked path names without printing the term", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-public-content-"));
  const termsFile = join(directory, "terms.txt");
  writeFileSync(termsFile, "EDGE-TTS-SETUP.md\n");

  try {
    const result = spawnSync(process.execPath, ["scripts/check-public-content.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, SHOA_PRIVATE_TERMS_FILE: termsFile },
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /tracked path: private term match/);
    assert.doesNotMatch(result.stderr, /EDGE-TTS-SETUP\.md/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
