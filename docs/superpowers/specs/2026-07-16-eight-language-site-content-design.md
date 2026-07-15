# Shoa Site Eight-Language Content Design

Date: 2026-07-16

## Goal

Upgrade the public Shoa site from six complete locales to eight complete locales by adding German (`de`) and Vietnamese (`vi`) across the site shell and every currently published content group.

Completion means:

- the site exposes `zh`, `en`, `ja`, `ko`, `th`, `fr`, `de`, and `vi` as supported locales;
- all 12 currently published translation groups contain eight reviewed locale files, for 96 public content files in total;
- German and Vietnamese core pages, Blog and Favorites indexes, article routes, RSS routes, metadata, language selection, and browser-language preference work as first-class site behavior;
- the Retry article has language-specific illustrations for every non-Chinese locale;
- all checks pass and the eight production article routes are verified after deployment.

## Current State

The production site currently supports six locales and contains 12 complete translation groups: 11 Blog groups and one Favorites group. The working tree also contains an unpublished update that localizes the Retry article illustrations for English, Japanese, Korean, Thai, and French and changes structural parity checks so translated images may use locale-specific file names while preserving image count and heading position.

The global publication validator already recognizes `de` and `vi`, but the site runtime, content schema, dictionaries, routes, tests, and historical content do not yet support them.

## Locale Contract

The canonical locale order will be:

```text
zh → en → ja → ko → th → fr → de → vi
```

Locale metadata:

| Locale | Label | HTML language | URL prefix |
|---|---|---|---|
| zh | 简体中文 | zh-CN | none |
| en | English | en | en |
| ja | 日本語 | ja | ja |
| ko | 한국어 | ko | ko |
| th | ไทย | th | th |
| fr | Français | fr | fr |
| de | Deutsch | de | de |
| vi | Tiếng Việt | vi | vi |

German and Vietnamese are not optional partial locales. The strict publication contract will require eight reviewed or published locale files for every public translation group.

## Site Architecture Changes

### Runtime i18n

- Add `src/i18n/de.json` and `src/i18n/vi.json` with the exact same non-empty key set as the existing dictionaries.
- Extend `src/lib/i18n.ts`, the Astro content schema, content-loading utilities, translation tooling, locale preference handling, and locale dictionary validation to eight locales.
- Use the existing generic `[locale]` routes; no duplicate page components are needed.
- German and Vietnamese use the existing self-hosted Noto Sans variable font family.

### Routing and SEO

- Generate German and Vietnamese Home, About, Blog, Favorites, Contact, 404, and RSS routes through the existing dynamic locale pages.
- Extend canonical route helpers and browser-language preference resolution to `de` and `vi`.
- Core pages and fully translated content expose eight locale alternates plus `x-default`, for nine `hreflang` links.
- Language menus preserve the current path and store the selected locale using the existing preference key.

### Content completeness

- Expand the content locale enum and content completeness checks from six to eight.
- Require exactly eight unique, non-draft locales per public translation group.
- Preserve the current structural parity rules: heading levels, image positions, code-fence languages, tables, and external links remain aligned; image targets may differ by locale.
- Preserve exact canonical image targets for source-locale snapshot tests where those targets are part of an approved source record.

## Translation Scope and Rules

Create German and Vietnamese files for all 12 groups:

```text
Blog (11 groups) × 2 locales = 22 files
Favorites (1 group) × 2 locales = 2 files
Total = 24 new content files
```

Translation method:

- translate directly from each group's declared `sourceLocale`;
- preserve the approved heading order and paragraph intent;
- preserve code, commands, URLs, citations, numeric values, product names, and source attribution;
- use concise, professional native-language phrasing rather than literal sentence-by-sentence substitution;
- keep the existing `contentType` semantics: source adaptations remain adaptations, while translations of user-authored originals remain original/translation according to the established group metadata pattern;
- set `translationStatus` or `publicationStatus` to `reviewed` only after structural and language review;
- use `publishedAt` from the existing group and `updatedAt: 2026-07-16` for the new German and Vietnamese files and the image-localization update.

## Image Policy

### Original Shoa illustrations

The two Retry illustrations are original project assets. Create and publish:

```text
retry-becomes-fork-de.png
text-vs-world-state-de.png
retry-becomes-fork-vi.png
text-vs-world-state-vi.png
```

Each image must retain the original composition, charcoal line work, white background, 16:9 dimensions, and `#E11919` scarf while replacing all Chinese labels with the target language.

### Third-party figures and screenshots

Third-party source figures, screenshots, code screenshots, logos, and externally hosted images remain unchanged. This includes the Martin Fowler Harness Engineering diagrams even though copies are served locally: the figures contain source attribution and are evidence from the referenced article.

German and Vietnamese Markdown alt text and surrounding explanations will be translated. The image itself will not be redrawn or have its source labels overwritten without explicit reuse rights and a separately approved localized source.

## Testing Strategy

Use test-driven changes for the locale expansion.

Required evidence:

1. Unit tests define the exact eight-locale order, labels, route behavior, browser-language preference, dictionary parity, content schema, 96-file completeness contract, and nine-link SEO alternate contract.
2. Content tests prove all 12 groups have eight reviewed locale files and preserve approved Markdown structure.
3. Build tests prove German and Vietnamese core pages, indexes, articles, Favorites, RSS, and 404 routes exist.
4. The publication validator and public-content audit pass for the complete eight-locale Retry article and all new public files.
5. `npm run verify` passes, including Astro checks, unit tests, public audit, static build, SEO audit, link audit, accessibility checks, and responsive Playwright coverage.
6. The staged diff contains only the intended locale, content, image, test, and supporting contract changes.
7. GitHub Pages deployment succeeds and real browser checks confirm all eight Retry routes, language menus, images, metadata, and responsive layout.

## Release Plan

- Keep the existing Chinese production URL unchanged.
- Publish the locale expansion as one focused release after all 24 translations and four new images are complete.
- Do not use broad staging. Stage only the named site, content, test, and image paths.
- Push to `main`, wait for the Pages workflow, then verify production before reporting completion.

## Explicit Non-Goals

- Do not rewrite or redesign existing article arguments.
- Do not translate code, commands, URLs, product names, or externally sourced screenshots.
- Do not create German or Vietnamese versions through cascading translation from an existing translation.
- Do not add unrelated site features or visual redesigns.
