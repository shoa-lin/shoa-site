---
name: translate-blog-publish
description: Use for translating, reviewing, migrating, or preparing public Blog and Favorites content in this Astro personal site across Chinese, English, Japanese, Korean, Thai, and French.
---

# Translate Blog Publish

## Public Repository Boundary

这是公开仓库。不得提交或发布私人项目、内部系统、客户信息、本机路径、会话数据、日志、cookie、token、API key、凭据或未批准的个人事实。

具体私人词条只允许从仓库外的 `SHOA_PRIVATE_TERMS_FILE` 读取。不得把词条复制到源码、测试、文档、提交信息或报告。

## Current Content Layout

- Blog: `src/content/blog/<locale>/<slug>.md`
- Favorites: `src/content/favorites/<locale>/<slug>.md`
- Shared images: `public/assets/blog/<slug>/`
- Schema: `src/content.config.ts`
- Supported locales, in required order: `zh`, `en`, `ja`, `ko`, `th`, `fr`

当前没有 Projects 页面或内容集合。不要从仓库、浏览器历史或旧对话推断公开项目。

## Source And Copyright

1. Resolve the canonical public source before translating.
2. Prefer direct translation from the canonical source language. Do not use a Chinese translation as an English-source replacement unless the content is explicitly classified as a Chinese structured adaptation.
3. Classify each item as `original`, `translation`, or `adaptation`.
4. If full republication rights are unclear, publish a faithful structured adaptation with author attribution and canonical URL.
5. If the source requires login, payment, private access, or cannot be verified, quarantine it and stop that item.

## Fidelity Rules

- Preserve heading levels and section order.
- Preserve code blocks exactly, including fence language.
- Preserve tables and factual values.
- Preserve links, citations, caveats, and uncertainty.
- Keep every image at its corresponding location. Localize alt text and captions, but do not edit text embedded in the image.
- Translate technical prose naturally. Keep API names, commands, identifiers, and product names unchanged.
- Use `docs/content/translation-glossary.md` for recurring terminology.

## Six-Language Gate

Every item that remains public must have exactly six locale files. Partial-language content must not be marked `published`.

Run after each batch of no more than three items:

```bash
node scripts/check-content-completeness.mjs --allow-drafts
node scripts/check-translation-parity.mjs
npm run check
npm run build
git diff --check
```

Before final review, remove draft status and run:

```bash
node scripts/check-content-completeness.mjs
node scripts/check-translation-parity.mjs
node scripts/check-public-content.mjs dist
```

## Review Process

Each locale needs two passes:

1. Translation from the approved source or canonical adaptation.
2. Independent review for omissions, semantic drift, terminology, natural phrasing, headings, images, tables, code, links, and source metadata.

Mechanical parity is necessary but not sufficient. Do not mark a translation reviewed only because a script exits 0.

## Publication Gate

Complete local review first. Do not push, trigger GitHub Pages, rewrite history, force-push, modify DNS, or publish production without explicit user approval.
