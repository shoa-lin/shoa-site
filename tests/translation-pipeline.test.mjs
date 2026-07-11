import assert from "node:assert/strict";
import { test } from "node:test";

test("Markdown translation protects code and preserves structural signatures", async () => {
  const { protectCodeBlocks, protectHeadings, protectImages, protectLinks, restoreCodeBlocks, restoreHeadings, restoreImages, restoreLinks, structureSignature } = await import("../scripts/lib/translate-markdown.mjs");
  const source = `## 标题

正文。

\`\`\`js
console.log("不要翻译");
\`\`\`

![图](https://example.com/a.png)

| A | B |
| --- | --- |
| 1 | 2 |
`;
  const protectedValue = protectCodeBlocks(source);
  assert.doesNotMatch(protectedValue.text, /不要翻译/);
  assert.match(protectedValue.text, /__SHOA_CODE_BLOCK_0__/);
  assert.equal(restoreCodeBlocks(protectedValue.text, protectedValue.blocks), source);
  assert.deepEqual(structureSignature(source), structureSignature(restoreCodeBlocks(protectedValue.text, protectedValue.blocks)));

  const protectedImage = protectImages(source);
  assert.match(protectedImage.text, /__SHOA_IMAGE_0__/);
  assert.doesNotMatch(protectedImage.text, /https:\/\/example\.com\/a\.png/);
  const restoredImage = restoreImages(protectedImage.text, protectedImage.images, ["Diagram"]);
  assert.match(restoredImage, /!\[Diagram\]\(https:\/\/example\.com\/a\.png\)/);

  const linkSource = "Read [the source](https://example.com/source).";
  const protectedLink = protectLinks(linkSource);
  assert.match(protectedLink.text, /__SHOA_LINK_0__/);
  assert.doesNotMatch(protectedLink.text, /https:\/\/example\.com\/source/);
  assert.equal(restoreLinks(protectedLink.text, protectedLink.links, ["original source"]), "Read [original source](https://example.com/source).");

  const protectedHeading = protectHeadings("## 标题\n\n正文");
  assert.match(protectedHeading.text, /__SHOA_HEADING_0__/);
  assert.equal(restoreHeadings(protectedHeading.text, protectedHeading.headings, ["Heading"]), "## Heading\n\n正文");
});

test("Markdown chunking keeps paragraphs intact and under the request limit", async () => {
  const { chunkMarkdown } = await import("../scripts/lib/translate-markdown.mjs");
  const source = Array.from({ length: 20 }, (_, index) => `段落 ${index} ${"内容".repeat(80)}`).join("\n\n");
  const chunks = chunkMarkdown(source, 700);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 700));
  assert.equal(chunks.join("\n\n"), source);
});

test("project translation skill describes the Astro six-language workflow", async () => {
  const { readFile } = await import("node:fs/promises");
  const skill = await readFile(new URL("../.codex/skills/translate-blog-publish/SKILL.md", import.meta.url), "utf8");

  assert.match(skill, /^name: translate-blog-publish/m);
  assert.match(skill, /src\/content\/blog\/<locale>/);
  assert.match(skill, /zh.*en.*ja.*ko.*th.*fr/s);
  assert.match(skill, /check-content-completeness\.mjs/);
  assert.match(skill, /check-translation-parity\.mjs/);
  assert.match(skill, /图片|image/i);
  assert.match(skill, /隐私|private/i);
  assert.match(skill, /本地审核|local review/i);
  assert.doesNotMatch(skill, /blogs\/manifest\.json/);
});

test("translation CLI keeps Blog and Favorites metadata boundaries separate", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../scripts/translate-content.mjs", import.meta.url), "utf8");
  assert.match(source, /entry\.collection === "blog"/);
  assert.match(source, /data\.contentType = entry\.data\.contentType/);
  assert.doesNotMatch(source, /data\.contentType = "translation"/);
  assert.match(source, /data\.tags = await Promise\.all/);
  assert.doesNotMatch(source, /contentType:\s*"translation"/);
});

test("translation CLI preserves the canonical source locale", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../scripts/translate-content.mjs", import.meta.url), "utf8");

  assert.match(source, /sourceLocale:\s*entry\.data\.sourceLocale/);
  assert.doesNotMatch(source, /sourceLocale:\s*"zh"/);
});
