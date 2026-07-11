import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const publicPages = ["index.html", "about.html", "blog.html", "favorites.html", "contact.html"];

const read = (path) => readFileSync(new URL(path, root), "utf8");

test("legacy public output has no projects page or project entry point", () => {
  assert.equal(existsSync(new URL("projects.html", root)), false);

  for (const page of publicPages) {
    const html = read(page);
    assert.doesNotMatch(html, /href=["'][^"']*\/projects(?:["'/?#])/i, page);
  }
});

test("visitor-facing copy does not advertise private project work", () => {
  const combined = publicPages.map(read).join("\n");

  assert.doesNotMatch(combined, /我的项目|看项目|项目是系统实验|公开工作台/);
});

test("public content checker accepts the current repository output", () => {
  const result = spawnSync(process.execPath, ["scripts/check-public-content.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("private-term scan tolerates tracked files deleted in the working tree", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-public-content-"));
  const termsFile = join(directory, "terms.txt");
  writeFileSync(termsFile, "definitely-not-present-private-term\n");

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
