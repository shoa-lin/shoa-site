# Shoa Site Multilingual Redesign Design

Date: 2026-07-10

Status: Awaiting written-spec approval

## 1. Objective

Rebuild the public personal site as a multilingual editorial website that introduces Shoa Lin clearly, publishes every approved public blog article in six languages, and prevents private project information from appearing in the repository or deployed site.

Supported languages:

- Simplified Chinese (`zh-CN`)
- English (`en`)
- Japanese (`ja`)
- Korean (`ko`)
- Thai (`th`)
- French (`fr`)

The avatar remains unchanged. Current private projects, project names, project descriptions, internal architecture, and operational details are out of scope for public content.

## 2. Product Direction

This site is a personal technical publication, not a project portfolio.

Primary audiences:

- Technical peers following AI Agent systems and developer tooling
- International readers discovering Shoa Lin through articles or social profiles
- Potential collaborators who want to understand Shoa's background and working interests

Design reading:

- Page type: developer personal site and editorial blog
- Tone: restrained, specific, credible, and personal
- Design variance: 6/10
- Motion intensity: 3/10
- Visual density: 4/10
- Foundation: Astro static generation with native CSS and shared components

The existing neutral palette, light/dark theme, domain, avatar, and stable Chinese URLs are preserved where possible. The current information architecture and content model are replaced where they prevent privacy, internationalization, SEO, or maintainability.

## 3. Non-Negotiable Privacy Rules

### 3.1 Public content boundary

The public repository and generated site must not contain:

- Current private project names or aliases
- Descriptions of private systems, repositories, runtimes, customers, or internal workflows
- Private screenshots, local filesystem paths, session data, logs, credentials, tokens, or configuration values
- Claims derived from private browser sessions or non-public documents

Only facts explicitly approved for public use may appear in profile copy. Public social-profile content is evidence for drafting, not automatic permission to publish every fact on the site.

### 3.2 Immediate containment

The first implementation phase must:

- Remove the public project page and its route
- Remove project-related descriptions from Home, About, Contact, navigation, tests, and generated output
- Quarantine any blog article whose subject is a private project until the user explicitly approves it for publication
- Remove public tests that assert private content must exist
- Purge the deployed site and CDN cache after the user approves publication
- Verify removed URLs return `404` or `410`, not a cached page

### 3.3 Git history

Deleting current files does not remove older public commits. A read-only history audit must identify commits containing private project information.

If the user requires historical removal, perform a separate, explicitly approved history-rewrite operation using `git filter-repo`, followed by a coordinated force push and cache-removal process. This operation must never be bundled into the visual redesign commit.

Private identifiers must not be copied into this design document, public tests, comments, issue descriptions, or commit messages.

## 4. Architecture Decision

### 4.1 Chosen approach

Migrate from manually maintained HTML plus runtime Markdown loading to Astro static generation.

Reasons:

- Produces static HTML compatible with GitHub Pages
- Gives every article a real URL, title, description, canonical link, and social preview
- Supports shared layouts without copying navigation and footer markup
- Supports Markdown content collections and schema validation
- Keeps client JavaScript small
- Makes six-language completeness testable at build time

### 4.2 Rejected approaches

#### Patch the existing vanilla site

This would require duplicated HTML, dictionaries, runtime content switching, and increasingly complex client-side routing. It does not solve article SEO or long-term translation maintenance.

#### Next.js static export

This is capable but introduces more framework and client-runtime complexity than this content-focused site needs.

## 5. Target Repository Structure

```text
src/
  components/
    Header.astro
    Footer.astro
    LanguageMenu.astro
    ThemeToggle.astro
    ArticleCard.astro
    ArticleLanguageMenu.astro
  layouts/
    BaseLayout.astro
    PageLayout.astro
    BlogIndexLayout.astro
    ArticleLayout.astro
  i18n/
    zh.json
    en.json
    ja.json
    ko.json
    th.json
    fr.json
  content/
    blog/
      zh/<slug>.md
      en/<slug>.md
      ja/<slug>.md
      ko/<slug>.md
      th/<slug>.md
      fr/<slug>.md
  pages/
    index.astro
    about.astro
    blog/
    favorites.astro
    contact.astro
    en/
    ja/
    ko/
    th/
    fr/
public/
  assets/
    avatar/profile.jpg
    blog/<slug>/
scripts/
  check-content-completeness.mjs
  check-translation-parity.mjs
  check-public-content.mjs
```

The exact directory layout may be adjusted to Astro's installed version, but the boundaries remain: shared UI, locale dictionaries, locale-specific article files, shared article assets, and deterministic validation scripts.

## 6. Routing And Locale Behavior

Chinese URLs remain unprefixed to preserve existing links:

```text
/
/about
/blog
/blog/<slug>
/favorites
/contact
```

Other locales use prefixes:

```text
/en/...
/ja/...
/ko/...
/th/...
/fr/...
```

Rules:

- Article slugs remain stable ASCII identifiers in every language
- Old `/blog?id=<id>` links redirect to the canonical Chinese article URL
- Each page links to all six translations with `hreflang`
- The root page is the `x-default`
- The site does not force browser-language redirects
- The selected locale is represented by the URL, not hidden JavaScript state
- Theme preference may remain in local storage
- First-visit theme respects `prefers-color-scheme`

## 7. Content Model

Each blog translation must include validated metadata:

```yaml
translationKey: stable-article-id
locale: zh
title: Localized title
description: Localized search and index summary
publishedAt: 2026-01-01
updatedAt: 2026-01-01
category: architecture
sourceLocale: en
sourceUrl: https://example.com/original
sourceAuthor: Public author name
contentType: original | translation | adaptation
translationStatus: draft | reviewed | published
```

The underlying category key remains stable. Category labels are translated by the locale dictionary.

Every article approved for public publication must have all six locale files before it can be included in a production build. Private articles are removed from the public collection rather than translated.

## 8. Translation Workflow

### 8.1 Source selection

- Translate from the canonical original source whenever it is available
- Do not translate Japanese, Korean, Thai, or French from an existing Chinese translation when the original is English
- Use Chinese as the source only for original Chinese writing
- Preserve author attribution, source URL, original publication date, and translation status

### 8.2 Structural fidelity

Every locale version must preserve:

- Heading hierarchy and section order
- Tables and lists
- Code blocks and language annotations
- Links and citations
- Images and their corresponding positions
- Technical distinctions, caveats, and uncertainty

Images are shared across languages. Alternative text and captions are localized. Text embedded inside copyrighted images is not edited unless permission and source files are available.

### 8.3 Quality review

Translation is completed in two independent passes:

1. Faithful translation from the canonical source
2. Review for omissions, semantic drift, terminology, natural phrasing, structure, links, images, tables, and code

A six-language glossary keeps terms such as AI Agent, harness, workflow, prompt, token, benchmark, context, memory, evaluation, and tool calling consistent.

### 8.4 Copyright boundary

Every article must be classified as original, licensed translation, or structured adaptation. Where full republication rights are unclear, publish a faithful structured adaptation with clear attribution and a canonical source link instead of presenting it as an authorized full translation.

## 9. Copy Direction

### 9.1 Voice principles

The site copy should sound like a thoughtful technical practitioner, not a manifesto.

Use:

- First-person language
- Specific fields, actions, and questions
- Short sentences with one idea each
- Verifiable public facts
- Established English technical terms only when they improve precision

Avoid:

- World-changing claims
- Grand slogans and self-mythologizing
- Forced metaphors
- Repeating words such as builder, system, future, or innovation without concrete meaning
- Decorative English inside otherwise Chinese sentences
- Internal design notes presented as visitor-facing content
- Project references or hints

### 9.2 Proposed Chinese source copy

#### Home

Page title:

> Shoa Lin

Introduction:

> 你好，我是 Shoa Lin。

> 我关注 AI Agent、知识系统和开发者工具，主要研究工具调用、记忆、评估与工作流如何在真实任务中协同工作。

Supporting line:

> 这里收录我的文章、研究笔记和长期收藏。

#### About

Heading:

> 关于我

Draft body:

> 我的工作经历涉及知识图谱、数据与企业架构。现在，我把主要精力放在 AI Agent 系统和开发者工作流上。

> 我关心的不只是模型能回答什么，也关心它如何使用工具、保留上下文、处理失败，并留下可以复查的结果。

Any employer, school, location, credential, or career detail requires inclusion in the approved public-fact list before publication.

#### Blog

Heading:

> 文章

Description:

> 关于 AI Agent、知识系统、开发工具和工程实践的长期记录。

#### Favorites

Heading:

> 收藏

Description:

> 我会把值得再次阅读的文章、论文和工具放在这里，并附上简短的整理说明。

#### Contact

Heading:

> 联系我

Description:

> 如果你想讨论 AI Agent、知识系统、开发工具或技术写作，可以通过邮件或 X 联系我。

Channel note:

> 邮件适合需要上下文的讨论，X 适合简短交流。

These are source-copy proposals, not final published text. The final English, Japanese, Korean, Thai, and French versions should be natural localized writing that preserves meaning rather than literal word-for-word output.

## 10. Page Design

### 10.1 Header

Desktop:

- Brand/name on the left
- Primary navigation on one line
- Current-language menu
- Theme toggle

Mobile:

- Brand/name
- Language control
- Theme control
- Menu button
- Navigation links inside an accessible sheet

No flag icons are used. Language options use native names: 简体中文, English, 日本語, 한국어, ไทย, Français.

### 10.2 Home

The Home page introduces the person before the subject matter.

Sections:

- Short introduction and unchanged avatar
- Current areas of interest
- Public professional background, using only approved facts
- Working approach expressed through concrete behavior
- Latest articles generated from the content collection
- Contact links

There is no project section, project teaser, case study, client logo wall, or current-work status block.

### 10.3 About

Replace the current slogan-led layout with:

- A direct heading
- Two or three short narrative paragraphs
- A concise public-background timeline
- Areas of interest
- Working principles written as practical statements

### 10.4 Blog

Separate the index and article experiences.

Blog index:

- Compact editorial heading
- Category filters
- Article list or asymmetric editorial grid
- Locale-aware dates and summaries

Article page:

- No repeated large blog masthead
- Localized title, category, date, author, source, and language menu
- Readable article column
- Desktop table of contents when useful
- Compact mobile controls
- Previous/next article links only if they remain useful after testing

### 10.5 Favorites

Favorites becomes a curated library with localized summaries and source links. Mirrored third-party full text is not expanded automatically into six languages unless publication rights are clear.

### 10.6 Contact

Use direct contact copy. Remove visitor-facing implementation notes and all references to viewing projects or ongoing work.

## 11. Visual System

- Preserve light and dark modes as page-level themes
- Use one restrained blue accent across the site
- Use neutral backgrounds and consistent contrast in both themes
- Use 8px content-surface radius
- Reserve circular shapes for icon buttons
- Reserve pills for filters and compact selectors
- Prefer spacing and dividers over repeated floating cards
- Keep motion limited to opacity, transform, hover, and menu transitions
- Honor `prefers-reduced-motion`

Locale-aware font stacks are selected with `:lang()` rules. Layouts must tolerate French text expansion, Japanese line breaking, Korean metrics, Thai line height, and long technical English terms without fixed-height text containers.

## 12. Accessibility

Required improvements:

- Visible `:focus-visible` states
- Skip-to-content link
- Correct page and article `lang` attributes
- Accessible language menu with current-language state
- Focus trapping and focus restoration for dialogs and mobile navigation
- Localized accessible names for theme, menu, close, table-of-contents, and back-to-top controls
- Reduced-motion support
- WCAG AA contrast
- Keyboard operation for all filters, menus, dialogs, and article controls

## 13. SEO And Distribution

Every generated page must include:

- Localized title and description
- Canonical URL
- Six-language `hreflang` links
- Open Graph and social-card metadata
- Article structured data where appropriate
- Sitemap entry
- Stable share URL

The build also provides a `robots.txt`, localized sitemap coverage, a custom `404` page, and optional locale-specific RSS feeds.

## 14. Testing And Quality Gates

The production build fails when:

- Any approved public article lacks one of the six locales
- A locale dictionary has missing or extra required keys
- Translation structure loses required images, code blocks, tables, or source links
- A public page references the removed project route
- A page includes local paths, credentials, secret patterns, or unapproved private content
- Internal links or asset links are broken
- Generated HTML lacks canonical or locale metadata

Browser verification covers:

- 320px, 390px, 768px, 1024px, and 1440px widths
- All six locales
- Light and dark themes
- Longest page title and longest article title per locale
- Blog index, article reading, Favorites filters, Contact links, menus, and dialogs

Performance targets:

- LCP below 2.5 seconds on representative pages
- CLS below 0.1
- INP below 200 milliseconds
- No runtime Markdown parser or remote icon-font dependency

## 15. Delivery Phases

### Phase P0: Privacy containment

Remove current private project exposure, update tests, audit history, verify removed URLs locally, and prepare a dedicated privacy-only diff. Publish only after user review.

### Phase P1: Static foundation

Introduce Astro, shared layouts, locale routing, theme bootstrap, content schemas, and GitHub Pages build output.

### Phase P2: Core six-language pages

Implement and localize Home, About, Blog index, Favorites, Contact, navigation, footer, 404, metadata, and accessibility labels.

### Phase P3: Blog normalization

Normalize current article metadata, remove Markdown-local style blocks, stabilize image assets, classify copyright status, and identify the approved public article set.

### Phase P4: Six-language article migration

Translate and review each approved article into all six languages. Process articles in small reviewable batches. Do not expose partial-language articles in production.

### Phase P5: Design refinement

Apply the approved copy, typography, layout, responsive behavior, article reading design, and theme polish.

### Phase P6: Verification and publication

Run content, privacy, build, accessibility, responsive, theme, SEO, and link checks. Present the local site for user approval before any production publication.

## 16. Existing Worktree Safety

The repository already contains unrelated uncommitted changes in Blog files and tests. Implementation must preserve those changes and use narrowly scoped commits. The privacy hotfix, Astro migration, content migration, translation batches, and visual redesign must remain separate reviewable commits.

## 17. Acceptance Criteria

The redesign is complete only when:

- No private project information appears in the current repository output or live site
- Historical exposure has been reviewed and handled according to the user's decision
- Every approved public blog article exists in all six languages
- All core pages and controls exist in all six languages
- Every article has static, indexable HTML and correct locale metadata
- The avatar is unchanged
- Copy is specific, restrained, and free of grand slogans
- Desktop and mobile layouts pass in all six scripts
- Light and dark themes remain visually consistent
- Privacy, translation, content, accessibility, link, and build tests pass
- The user approves the local preview before publication

