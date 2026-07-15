import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"];

function article(locale, options = {}) {
  const heading = options.heading ?? "Shared heading";
  const image = options.image ?? "![Diagram](/assets/blog/example/diagram.png)";
  return `---
translationKey: example
locale: ${locale}
title: Example ${locale}
description: Example description ${locale}
publishedAt: 2026-01-01
updatedAt: 2026-01-01
category: architecture
sourceLocale: zh
sourceUrl: https://example.com/source
sourceAuthor: Public Author
contentType: adaptation
translationStatus: reviewed
---

# ${heading}

${image}

\`\`\`js
console.log("example");
\`\`\`

| A | B |
| --- | --- |
| 1 | 2 |

[Source](https://example.com/source)
`;
}

function run(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
}

test("content config declares the complete Blog and Favorites metadata contracts", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/content.config.ts", import.meta.url), "utf8"));
  for (const field of [
    "translationKey", "locale", "title", "description", "publishedAt", "updatedAt", "category",
    "sourceLocale", "sourceUrl", "sourceAuthor", "contentType", "translationStatus",
  ]) {
    assert.match(source, new RegExp(`${field}:`), field);
  }
  assert.match(source, /favorites/);
  assert.match(source, /visibility/);
});

test("content inventory fails closed when the configured private terms file is missing", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-inventory-terms-"));
  try {
    const output = join(directory, "audit.json");
    const result = spawnSync(process.execPath, ["scripts/inventory-public-content.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CONTENT_AUDIT: output,
        SHOA_PRIVATE_TERMS_FILE: join(directory, "missing-private-terms.txt"),
      },
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /SHOA_PRIVATE_TERMS_FILE/);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("content inventory rejects an external symlink that resolves inside the repository", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-inventory-link-"));
  const targetDirectory = fileURLToPath(new URL("../artifacts/inventory-path-guard/", import.meta.url));
  try {
    mkdirSync(targetDirectory, { recursive: true });
    const target = join(targetDirectory, "audit.json");
    const link = join(directory, "audit.json");
    writeFileSync(target, "sentinel\n");
    symlinkSync(target, link);
    const env = { ...process.env, CONTENT_AUDIT: link };
    delete env.SHOA_PRIVATE_TERMS_FILE;

    const result = spawnSync(process.execPath, ["scripts/inventory-public-content.mjs"], {
      cwd: root,
      encoding: "utf8",
      env,
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the repository/);
    assert.equal(readFileSync(target, "utf8"), "sentinel\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
    rmSync(targetDirectory, { recursive: true, force: true });
  }
});

test("content inventory rejects a dangling external symlink targeting the repository", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-inventory-dangling-link-"));
  const targetDirectory = fileURLToPath(new URL("../artifacts/inventory-dangling-path-guard/", import.meta.url));
  try {
    mkdirSync(targetDirectory, { recursive: true });
    const target = join(targetDirectory, "audit.json");
    const link = join(directory, "audit.json");
    symlinkSync(target, link);
    const env = { ...process.env, CONTENT_AUDIT: link };
    delete env.SHOA_PRIVATE_TERMS_FILE;

    const result = spawnSync(process.execPath, ["scripts/inventory-public-content.mjs"], {
      cwd: root,
      encoding: "utf8",
      env,
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the repository/);
    assert.equal(existsSync(target), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
    rmSync(targetDirectory, { recursive: true, force: true });
  }
});

test("content completeness requires exactly eight reviewed locale files", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-content-complete-"));
  try {
    for (const locale of locales) {
      const localeDir = join(directory, "blog", locale);
      mkdirSync(localeDir, { recursive: true });
      writeFileSync(join(localeDir, "example.md"), article(locale));
    }

    const complete = run("scripts/check-content-completeness.mjs", ["--content-root", directory]);
    assert.equal(complete.status, 0, `${complete.stdout}\n${complete.stderr}`);

    rmSync(join(directory, "blog", "vi", "example.md"));
    const incomplete = run("scripts/check-content-completeness.mjs", ["--content-root", directory]);
    assert.equal(incomplete.status, 1);
    assert.match(incomplete.stderr, /example: expected 8 locales, found 7/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("content completeness allows partial draft batches only with the explicit flag", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-content-draft-"));
  try {
    const localeDir = join(directory, "blog", "zh");
    mkdirSync(localeDir, { recursive: true });
    writeFileSync(join(localeDir, "example.md"), article("zh").replace("translationStatus: reviewed", "translationStatus: draft"));

    const strict = run("scripts/check-content-completeness.mjs", ["--content-root", directory]);
    assert.equal(strict.status, 1);

    const drafts = run("scripts/check-content-completeness.mjs", ["--content-root", directory, "--allow-drafts"]);
    assert.equal(drafts.status, 0, `${drafts.stdout}\n${drafts.stderr}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("translation parity detects changed headings and image positions", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-content-parity-"));
  try {
    for (const locale of ["zh", "en"]) {
      const localeDir = join(directory, "blog", locale);
      mkdirSync(localeDir, { recursive: true });
      writeFileSync(join(localeDir, "example.md"), article(locale));
    }

    const matching = run("scripts/check-translation-parity.mjs", ["--content-root", directory]);
    assert.equal(matching.status, 0, `${matching.stdout}\n${matching.stderr}`);

    writeFileSync(join(directory, "blog", "en", "example.md"), article("en", { heading: "Changed", image: "" }));
    const changed = run("scripts/check-translation-parity.mjs", ["--content-root", directory]);
    assert.equal(changed.status, 1);
    assert.match(changed.stderr, /example\/en: structure differs/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("translation parity allows localized image files at matching positions", () => {
  const directory = mkdtempSync(join(tmpdir(), "shoa-content-localized-images-"));
  try {
    for (const locale of ["zh", "en"]) {
      const localeDir = join(directory, "blog", locale);
      mkdirSync(localeDir, { recursive: true });
      const image = `![Diagram](/assets/blog/example/diagram-${locale}.png)`;
      writeFileSync(join(localeDir, "example.md"), article(locale, { image }));
    }

    const result = run("scripts/check-translation-parity.mjs", ["--content-root", directory]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
