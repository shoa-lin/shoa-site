# Eight-Language Site Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Shoa site and all 12 published content groups from six complete locales to eight complete locales by adding German and Vietnamese, localized Retry illustrations, full verification, and production deployment.

**Architecture:** Extend the existing locale-driven Astro architecture instead of adding duplicate pages. The central locale lists, dictionaries, content schema, route helpers, validation scripts, and tests become eight-locale contracts; the generic `[locale]` routes then produce German and Vietnamese pages automatically. Every public content group receives direct-from-source German and Vietnamese files, so SEO alternates and language menus remain complete and deterministic.

**Tech Stack:** Astro 7, TypeScript, JSON dictionaries, Markdown content collections, Node test runner, Playwright, Python publication validator, GitHub Pages, built-in image generation.

---

### Task 1: Lock the eight-locale contract with failing tests

**Files:**
- Modify: `tests/i18n.test.mjs`
- Modify: `tests/locale-preference.test.mjs`
- Modify: `tests/routes.test.mjs`
- Modify: `tests/content-schema.test.mjs`
- Modify: `tests/content-migration.test.mjs`
- Modify: `tests/e2e/locales.spec.ts`
- Modify: `tests/e2e/visual.spec.ts`

- [ ] **Step 1: Change the i18n test to require eight locales**

```js
assert.deepEqual(locales, ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"]);
assert.deepEqual(
  locales.map((locale) => localeMeta[locale].label),
  ["简体中文", "English", "日本語", "한국어", "ไทย", "Français", "Deutsch", "Tiếng Việt"],
);
assert.throws(() => getDictionary("es"), /Unsupported locale/);
```

- [ ] **Step 2: Require German and Vietnamese browser-language resolution**

```js
assert.equal(resolvePreferredLocale(["de-DE", "en-US"]), "de");
assert.equal(resolvePreferredLocale(["vi-VN", "en-US"]), "vi");
```

- [ ] **Step 3: Require German and Vietnamese route prefixes and nine alternates**

```js
assert.equal(localizedPath("de", "/about"), "/de/about");
assert.equal(localizedPath("vi", "/blog/example"), "/vi/blog/example");
assert.deepEqual(
  alternateLinks("/contact").map((link) => link.hreflang),
  ["zh-CN", "en", "ja", "ko", "th", "fr", "de", "vi", "x-default"],
);
```

- [ ] **Step 4: Change content tests to require eight locales and 96 reviewed files**

```js
const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"];
assert.equal(publishedEntries.length, multilingualApprovedGroups.length * locales.length);
assert.equal(complete.status, 0, `${complete.stdout}\n${complete.stderr}`);
assert.match(incomplete.stderr, /example: expected 8 locales, found 7/);
```

- [ ] **Step 5: Add German and Vietnamese to browser and responsive locale matrices**

```ts
const locales = [
  ["/", "zh-CN", "Noto Sans SC Variable"],
  ["/en/", "en", "Noto Sans Variable"],
  ["/ja/", "ja", "Noto Sans JP Variable"],
  ["/ko/", "ko", "Noto Sans KR Variable"],
  ["/th/", "th", "Noto Sans Thai Looped Variable"],
  ["/fr/", "fr", "Noto Sans Variable"],
  ["/de/", "de", "Noto Sans Variable"],
  ["/vi/", "vi", "Noto Sans Variable"],
] as const;
```

- [ ] **Step 6: Run the focused tests and verify the expected failure**

Run:

```bash
node --test --test-concurrency=1 \
  tests/i18n.test.mjs \
  tests/locale-preference.test.mjs \
  tests/routes.test.mjs \
  tests/content-schema.test.mjs \
  tests/content-migration.test.mjs
```

Expected: failures report missing `de` and `vi`, six-locale arrays, and incomplete content groups.

### Task 2: Implement the eight-locale site runtime

**Files:**
- Create: `src/i18n/de.json`
- Create: `src/i18n/vi.json`
- Modify: `src/lib/i18n.ts`
- Modify: `src/content.config.ts`
- Modify: `scripts/lib/content-files.mjs`
- Modify: `scripts/check-content-completeness.mjs`
- Modify: `scripts/check-locale-dictionaries.mjs`
- Modify: `scripts/translate-content.mjs`
- Modify: `scripts/check-seo.mjs`
- Modify: `scripts/capture-review-screenshots.mjs`

- [ ] **Step 1: Add complete German and Vietnamese dictionaries**

Create both JSON files with the exact 66-line key structure used by `src/i18n/en.json`. Use native professional translations for `meta`, `nav`, `theme`, `language`, `home`, `about`, `blog`, `favorites`, `contact`, `article`, `errors`, `a11y`, and `footer`; retain `Shoa Lin`, `X`, `GitHub`, and technical product names.

- [ ] **Step 2: Extend the runtime locale metadata**

```ts
import de from "../i18n/de.json" with { type: "json" };
import vi from "../i18n/vi.json" with { type: "json" };

export const locales = ["zh", "en", "ja", "ko", "th", "fr", "de", "vi"] as const;

de: { label: "Deutsch", htmlLang: "de", prefix: "de" },
vi: { label: "Tiếng Việt", htmlLang: "vi", prefix: "vi" },
```

Add `de` and `vi` to the `dictionaries` record.

- [ ] **Step 3: Extend content schema and content tools**

```ts
const locale = z.enum(["zh", "en", "ja", "ko", "th", "fr", "de", "vi"]);
```

Use the same ordered array in `scripts/lib/content-files.mjs` and `scripts/check-locale-dictionaries.mjs`. Add `de` and `vi` to `supportedTargets` in `scripts/translate-content.mjs`.

- [ ] **Step 4: Change completeness from six to eight**

```js
if (active.length !== locales.length || found.length !== locales.length) {
  failures.push(`${key.split(":")[1]}: expected ${locales.length} locales, found ${found.length}`);
}
```

- [ ] **Step 5: Change SEO audit expectations to nine alternates**

```js
if ((html.match(/hreflang=/g) ?? []).length !== 9) {
  failures.push(`${path}: expected 9 alternate links`);
}
```

- [ ] **Step 6: Add German and Vietnamese visual-capture routes**

```js
de: [["home", "/de/"], ["about", "/de/about"], ["blog", "/de/blog"], ["favorites", "/de/favorites"], ["contact", "/de/contact"]],
vi: [["home", "/vi/"], ["about", "/vi/about"], ["blog", "/vi/blog"], ["favorites", "/vi/favorites"], ["contact", "/vi/contact"]],
```

- [ ] **Step 7: Run the focused runtime tests**

Run:

```bash
node --test --test-concurrency=1 tests/i18n.test.mjs tests/locale-preference.test.mjs tests/routes.test.mjs
node scripts/check-locale-dictionaries.mjs
```

Expected: i18n, preference, routes, and dictionary parity pass; content completeness still fails until the 24 translations are added.

- [ ] **Step 8: Commit the runtime contract**

```bash
git add src/i18n/de.json src/i18n/vi.json src/lib/i18n.ts src/content.config.ts \
  scripts/lib/content-files.mjs scripts/check-content-completeness.mjs \
  scripts/check-locale-dictionaries.mjs scripts/translate-content.mjs \
  scripts/check-seo.mjs scripts/capture-review-screenshots.mjs \
  tests/i18n.test.mjs tests/locale-preference.test.mjs tests/routes.test.mjs \
  tests/content-schema.test.mjs tests/content-migration.test.mjs \
  tests/e2e/locales.spec.ts tests/e2e/visual.spec.ts
git commit -m "feat(i18n): add German and Vietnamese site locales"
```

### Task 3: Translate all English-source content directly into German

**Files:**
- Create: `src/content/blog/de/dynamic-workflows-in-claude-code.md`
- Create: `src/content/blog/de/getting-started-with-loops.md`
- Create: `src/content/blog/de/harness-engineering.md`
- Create: `src/content/blog/de/lessons-from-building-claude-code-skills.md`
- Create: `src/content/blog/de/loop-engineering.md`
- Create: `src/content/blog/de/pi-minimal-agent.md`
- Create: `src/content/blog/de/prompt-caching-best-practices.md`
- Create: `src/content/blog/de/state-of-ai-agent-memory-2026.md`
- Create: `src/content/favorites/de/fix-your-life-in-one-day.md`

- [ ] **Step 1: Translate each file from its English source-locale file**

For every file, preserve frontmatter identity fields, dates, category/tags, source URL, source author, content type, structural headings, code fences, tables, links, and image targets. Set `locale: "de"`, `updatedAt: "2026-07-16"`, and the publish status to `reviewed`.

- [ ] **Step 2: Validate German structure after each three-file batch**

Run:

```bash
node scripts/check-translation-parity.mjs --content-root src/content
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py public-audit \
  src/content/blog/de/*.md src/content/favorites/de/*.md
```

Expected before Vietnamese exists: parity and public audit pass; full completeness may still fail only for missing Vietnamese files.

### Task 4: Translate all Chinese-source content directly into German

**Files:**
- Create: `src/content/blog/de/ai-agent-patterns.md`
- Create: `src/content/blog/de/ai-agent-engineering-patterns.md`
- Create: `src/content/blog/de/ai-agent-retry-state.md`

- [ ] **Step 1: Translate directly from the Chinese source files**

Preserve every text diagram, code block, link, claim qualification, and heading position. The Retry article references `/assets/blog/ai-agent-retry-state/retry-becomes-fork-de.png` and `/assets/blog/ai-agent-retry-state/text-vs-world-state-de.png`.

- [ ] **Step 2: Run German locale and public audits**

```bash
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py locales \
  --content-dir src/content/blog --slug ai-agent-retry-state --locales de
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py public-audit src/content/blog/de/*.md
```

Expected: German Blog files pass metadata and privacy checks.

### Task 5: Translate all English-source content directly into Vietnamese

**Files:**
- Create: `src/content/blog/vi/dynamic-workflows-in-claude-code.md`
- Create: `src/content/blog/vi/getting-started-with-loops.md`
- Create: `src/content/blog/vi/harness-engineering.md`
- Create: `src/content/blog/vi/lessons-from-building-claude-code-skills.md`
- Create: `src/content/blog/vi/loop-engineering.md`
- Create: `src/content/blog/vi/pi-minimal-agent.md`
- Create: `src/content/blog/vi/prompt-caching-best-practices.md`
- Create: `src/content/blog/vi/state-of-ai-agent-memory-2026.md`
- Create: `src/content/favorites/vi/fix-your-life-in-one-day.md`

- [ ] **Step 1: Translate each file from its English source-locale file**

Preserve the same metadata and Markdown invariants as Task 3. Set `locale: "vi"`, `updatedAt: "2026-07-16"`, and the publish status to `reviewed`. Use natural Vietnamese technical terminology and retain code, commands, URLs, citations, and product names exactly.

- [ ] **Step 2: Validate Vietnamese structure after each three-file batch**

```bash
node scripts/check-translation-parity.mjs --content-root src/content
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py public-audit \
  src/content/blog/vi/*.md src/content/favorites/vi/*.md
```

Expected: parity and public audit pass for every completed batch.

### Task 6: Translate all Chinese-source content directly into Vietnamese

**Files:**
- Create: `src/content/blog/vi/ai-agent-patterns.md`
- Create: `src/content/blog/vi/ai-agent-engineering-patterns.md`
- Create: `src/content/blog/vi/ai-agent-retry-state.md`

- [ ] **Step 1: Translate directly from the Chinese source files**

Preserve every text diagram, code block, link, claim qualification, and heading position. The Retry article references `/assets/blog/ai-agent-retry-state/retry-becomes-fork-vi.png` and `/assets/blog/ai-agent-retry-state/text-vs-world-state-vi.png`.

- [ ] **Step 2: Run Vietnamese locale and public audits**

```bash
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py locales \
  --content-dir src/content/blog --slug ai-agent-retry-state --locales vi
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py public-audit src/content/blog/vi/*.md
```

Expected: Vietnamese Blog files pass metadata and privacy checks.

### Task 7: Generate German and Vietnamese Retry illustrations

**Files:**
- Create: `public/assets/blog/ai-agent-retry-state/retry-becomes-fork-de.png`
- Create: `public/assets/blog/ai-agent-retry-state/text-vs-world-state-de.png`
- Create: `public/assets/blog/ai-agent-retry-state/retry-becomes-fork-vi.png`
- Create: `public/assets/blog/ai-agent-retry-state/text-vs-world-state-vi.png`

- [ ] **Step 1: Generate each image separately with built-in image generation**

German first-image labels:

```text
Noch einmal antworten / Bereits geschehen / Ein anderer Weg
```

German second-image labels:

```text
Text / Neu schreibbar / Zustand geändert / Geschehenes lässt sich nicht rückgängig machen /
Verarbeitet / Ausführungsergebnis / Ausgeführt / Ausgabe
```

Vietnamese first-image labels:

```text
Trả lời lại / Đã xảy ra / Một hướng khác
```

Vietnamese second-image labels:

```text
Văn bản / Có thể viết lại / Trạng thái đã thay đổi / Không thể hoàn tác việc đã xảy ra /
Đã xử lý / Kết quả thực thi / Đã thực thi / Đầu ra
```

Preserve the exact 1672×941 composition, charcoal style, white background, character, objects, and `#E11919` scarf. Remove all Chinese labels and add no other text.

- [ ] **Step 2: Inspect every generated image at original resolution**

Verify every accent, umlaut, apostrophe, and Vietnamese tone mark; retry only the inaccurate text layer.

- [ ] **Step 3: Verify all 14 localized Retry images exist**

```bash
file public/assets/blog/ai-agent-retry-state/*.png
```

Expected: the two Chinese originals and two images for each of seven non-Chinese locales are 1672×941 RGB PNG files.

### Task 8: Complete content and site verification

**Files:**
- Modify: `tests/article-routes.test.mjs`
- Modify: `tests/seo.test.mjs`
- Modify: `tests/e2e/articles.spec.ts`

- [ ] **Step 1: Run eight-locale publication validation**

```bash
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py locales \
  --content-dir src/content/blog --slug ai-agent-retry-state
python3 /Users/shoa/.codex/skills/publish-shoa-blog/scripts/validate_publication.py public-audit \
  src/content/blog/{zh,en,ja,ko,th,fr,de,vi}/*.md \
  src/content/favorites/{zh,en,ja,ko,th,fr,de,vi}/*.md
```

Expected: all requested locale files and public text files pass.

- [ ] **Step 2: Run content contracts**

```bash
node scripts/check-locale-dictionaries.mjs
node scripts/check-content-completeness.mjs
node scripts/check-translation-parity.mjs
```

Expected: eight dictionaries pass; content completeness reports 12 groups and 96 files; translation parity passes.

- [ ] **Step 3: Run full site verification**

```bash
npm run verify
```

Expected: Astro has zero errors, all unit tests pass, public audit passes, the static build succeeds, SEO and link audits pass, and all Playwright tests pass across eight locales.

- [ ] **Step 4: Review the complete working-tree diff**

```bash
git diff --check
git status --short
git diff --stat
git diff -- src scripts tests docs
```

Expected: only the approved eight-language runtime, content, image, test, and documentation changes appear.

### Task 9: Release and production verification

**Files:**
- Stage only the named files created or modified by Tasks 1-8.

- [ ] **Step 1: Stage exact paths and inspect the staged diff**

```bash
git add src/i18n/de.json src/i18n/vi.json src/lib/i18n.ts src/content.config.ts \
  src/content/blog/de src/content/blog/vi src/content/favorites/de src/content/favorites/vi \
  src/content/blog/{en,ja,ko,th,fr}/ai-agent-retry-state.md \
  public/assets/blog/ai-agent-retry-state \
  scripts tests docs/superpowers/plans/2026-07-16-eight-language-site-content.md
git diff --cached --check
git diff --cached --stat
git diff --cached
```

- [ ] **Step 2: Commit and push**

```bash
git commit -m "feat(i18n): publish complete German and Vietnamese site"
git push origin HEAD:main
```

- [ ] **Step 3: Wait for GitHub Pages deployment**

Verify the workflow for the pushed commit reaches a successful conclusion.

- [ ] **Step 4: Verify production routes in a real browser**

Check:

```text
/blog/ai-agent-retry-state/
/en/blog/ai-agent-retry-state/
/ja/blog/ai-agent-retry-state/
/ko/blog/ai-agent-retry-state/
/th/blog/ai-agent-retry-state/
/fr/blog/ai-agent-retry-state/
/de/blog/ai-agent-retry-state/
/vi/blog/ai-agent-retry-state/
```

For every route, verify HTTP success, correct `<html lang>`, correct localized title and description, nine language options, loaded locale-specific Retry images, responsive layout, and no console or broken-link errors.

- [ ] **Step 5: Mark the active goal complete only after the production evidence passes**

Use the goal completion tool after every requirement in the design and this plan has authoritative evidence.
