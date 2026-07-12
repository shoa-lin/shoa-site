# Mobile Floating TOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the mobile article's static top-of-content table of contents with an accessible circular frosted-glass trigger and temporary bottom-sheet directory.

**Architecture:** Keep the existing desktop sticky TOC in `ArticlePage.astro`. Add a focused `MobileArticleToc.astro` component that owns the mobile trigger, native dialog, current-section tracking, and focus restoration. Keep visual behavior in `article.css` and cover the public contract with source-level and Playwright tests.

**Tech Stack:** Astro 7, TypeScript-compatible inline browser JavaScript, native HTML dialog, CSS `backdrop-filter`, Intersection Observer, Node test runner, Playwright.

---

### Task 1: Define the mobile TOC behavior with failing tests

**Files:**
- Modify: `tests/components.test.mjs`
- Modify: `tests/e2e/articles.spec.ts`

- [x] **Step 1: Add a source contract test**

Assert that `ArticlePage.astro` renders `MobileArticleToc`, and that the component contains a dialog, localized open/close labels, `aria-expanded`, Intersection Observer, Escape handling, and no external icon dependency.

- [x] **Step 2: Add a Playwright interaction test**

At a 390px viewport, open `/blog/loop-engineering`, verify the desktop TOC is hidden and the circular trigger is visible, open the dialog, verify the active section state, jump to a later heading, and verify the dialog closes and the URL hash changes. Repeat the material visibility checks in light and dark themes.

- [x] **Step 3: Run the targeted tests and verify RED**

Run:

```bash
npm run test:unit -- --test-name-pattern="mobile article contents"
npx playwright test tests/e2e/articles.spec.ts --grep "mobile floating contents"
```

Expected: both fail because the component and selectors do not exist.

### Task 2: Add the localized mobile TOC component

**Files:**
- Create: `src/components/MobileArticleToc.astro`
- Modify: `src/components/pages/ArticlePage.astro`
- Modify: `src/i18n/zh.json`
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/ja.json`
- Modify: `src/i18n/ko.json`
- Modify: `src/i18n/th.json`
- Modify: `src/i18n/fr.json`

- [x] **Step 1: Add localized labels**

Add `tocOpen` and `tocClose` under each locale's `article` dictionary so both icon buttons have accurate accessible names.

- [x] **Step 2: Render the component only for articles with at least three headings**

Pass the existing H2/H3 heading list and localized labels into `MobileArticleToc`. Keep the existing desktop TOC markup and add a desktop-specific class.

- [x] **Step 3: Implement minimal dialog behavior**

Use a `48px` trigger with `aria-haspopup="dialog"`, `aria-controls`, and `aria-expanded`. Use `dialog.showModal()` and `dialog.close()`, close on backdrop click and directory-link selection, restore focus on close, and update the active link through Intersection Observer.

- [x] **Step 4: Run the targeted tests and verify component behavior is GREEN**

Run the two commands from Task 1. Expected: source contract and interaction test pass.

### Task 3: Implement the responsive frosted-glass presentation

**Files:**
- Modify: `src/styles/article.css`

- [x] **Step 1: Preserve desktop behavior**

Keep the existing sticky TOC visible above 900px and hide the mobile component.

- [x] **Step 2: Add the compact mobile trigger**

At 900px and below, hide the desktop TOC and display a fixed `48px × 48px` circular trigger at the right safe-area edge. Use existing color tokens with `color-mix`, a 1px border, restrained shadow, and approximately `20px` backdrop blur.

- [x] **Step 3: Add the temporary bottom sheet**

Style the native dialog as a bottom sheet with `max-height: 60dvh`, scrollable navigation, H3 indentation, active-section blue marker, backdrop dimming, and a solid-color fallback when backdrop blur is unavailable.

- [x] **Step 4: Add motion and safe-area rules**

Add short open animation, disable it under `prefers-reduced-motion`, and reserve enough article bottom padding that the final content remains readable beside the floating button.

- [x] **Step 5: Run targeted E2E tests**

Run:

```bash
npx playwright test tests/e2e/articles.spec.ts --grep "mobile floating contents"
```

Expected: pass in light and dark modes at 390px.

### Task 4: Verify regression and responsive quality

**Files:**
- Modify only if a verified regression requires a scoped correction.

- [x] **Step 1: Run static and type checks**

```bash
npm run check
npm run test:unit
git diff --check
```

Expected: all pass.

- [x] **Step 2: Build and run relevant browser tests**

```bash
npm run build
npx playwright test tests/e2e/articles.spec.ts tests/e2e/accessibility.spec.ts
```

Expected: all pass.

- [x] **Step 3: Inspect real mobile layouts**

Use browser screenshots at 320px, 390px, and 430px in light and dark themes. Verify the trigger remains circular and inside the safe area, the sheet does not exceed `60dvh`, current-section highlighting works, and neither state creates horizontal overflow or incoherent overlap.

- [x] **Step 4: Commit the implementation**

```bash
git add src/components/MobileArticleToc.astro src/components/pages/ArticlePage.astro src/styles/article.css src/i18n/*.json tests/components.test.mjs tests/e2e/articles.spec.ts docs/superpowers/plans/2026-07-12-mobile-floating-toc-implementation.md
git commit -m "feat: add mobile floating article contents"
```
