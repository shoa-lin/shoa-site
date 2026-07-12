# Multilingual Personal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有个人主页迁移为 Astro 7 静态六语站点，清除当前项目相关公开输出，保留头像，以克制文案介绍 Shoa Lin，并让每篇获准公开的博客在中文、英语、日语、韩语、泰语和法语中完整可用。

**Architecture:** 在独立 Git worktree 中迁移，避免触碰原始脏工作区。Astro 负责静态路由、内容集合、SEO 和共享布局；语言由 URL 决定，中文无前缀，其他五种语言使用前缀。公开内容、翻译结构、私密信息、链接、无障碍和视觉回归均通过确定性脚本与 Playwright 门禁验证，最终只启动本地预览并等待用户审核。

**Tech Stack:** Astro 7.0.7、TypeScript、Astro Content Collections、原生 CSS、Node.js 测试、Playwright 1.61.1、`@axe-core/playwright` 4.12.1、Lighthouse 13.4.0、GitHub Pages Actions。

---

## 执行边界

- 原始工作区：执行开始时通过 `git rev-parse --show-toplevel` 得到并保存为 `$SOURCE_REPO`，不得把真实绝对路径写入仓库。
- 隔离工作树：在 `$SOURCE_REPO` 的同级临时目录创建并保存为 `$WORKTREE`，不得把真实绝对路径写入仓库。
- 工作分支：`codex/multilingual-site-redesign`
- 设计规格：`docs/superpowers/specs/2026-07-10-multilingual-personal-site-redesign-design.md`
- 本计划：`docs/superpowers/plans/2026-07-11-multilingual-personal-site-implementation.md`
- 生产发布、历史重写、强推、域名/DNS 修改不属于本计划。
- 当前版本不创建 Projects 页面、路由、导航、占位内容或空组件；只通过内容边界和页面组合方式保留未来扩展能力。
- 私人标识不得写入源码、测试、文档、提交信息或公开报告。需要匹配具体私人词条时，只允许读取仓库外的本地临时词表。

## 目标文件结构

```text
.github/workflows/deploy-pages.yml       GitHub Pages 构建定义，只提交不触发发布
.gitignore                               忽略 dist、测试产物和本地审计文件
.nvmrc                                   CI 基准 Node 24
astro.config.mjs                         站点域名、sitemap 和静态输出
package.json / package-lock.json         固定依赖与验证命令
src/content.config.ts                    Blog 与 Favorites 内容 schema
src/components/                          Header、Footer、语言、主题、文章组件
src/layouts/                             页面、索引和文章布局
src/lib/i18n.ts                          六语类型、字典读取和回退规则
src/lib/routes.ts                        中文无前缀与其他语言前缀规则
src/lib/seo.ts                           canonical、hreflang 和结构化数据
src/i18n/{zh,en,ja,ko,th,fr}.json        UI、页面文案和无障碍标签
src/content/blog/<locale>/*.md           六语文章
src/content/favorites/<locale>/*.md      六语收藏摘要
src/pages/                               中文和五种前缀语言静态页面
src/styles/                              tokens、global、components、article
public/assets/avatar/profile.jpg         原头像原字节保留
public/assets/blog/                       经公开性确认的文章图片
public/CNAME                             现有域名
public/robots.txt                        搜索引擎规则
scripts/                                 内容、翻译、隐私、链接、SEO 门禁
tests/                                   Node 单测与 Playwright 测试
artifacts/visual-review/                 本地截图，忽略不提交
```

### Task 1: 冻结原工作区并创建隔离工作树

**Files:**
- Read only: source checkout resolved at runtime as `$SOURCE_REPO`
- Create outside repo: safety patch resolved at runtime as `$SAFETY_PATCH`
- Create worktree: sibling temporary checkout resolved at runtime as `$WORKTREE`

- [ ] **Step 1: 记录原工作区状态**

Run:

```bash
SOURCE_REPO="$(git rev-parse --show-toplevel)"
RUNTIME_DIR="${TMPDIR:-/tmp}/shoa-site-redesign"
WORKTREE="$(dirname "$SOURCE_REPO")/shoa-site-multilingual-redesign-worktree"
SAFETY_PATCH="$RUNTIME_DIR/preexisting.patch"
mkdir -p "$RUNTIME_DIR"
git -C "$SOURCE_REPO" status --short --branch
git -C "$SOURCE_REPO" diff --binary > "$SAFETY_PATCH"
shasum -a 256 "$SAFETY_PATCH"
```

Expected: 状态显示 `main` 领先远端 2 个提交，并保留现有 Blog、测试和 `.codex/` 未提交内容；补丁文件非空。

- [ ] **Step 2: 保护用户现有改动的行为意图**

Read the patch and record these required migration behaviors in the execution log without editing the original files:

```text
桌面文章索引保持安静、紧凑
移动端分类可横向滚动且触控目标至少 44px
当前文章使用 aria-current="page"
分类切换不强制关闭移动抽屉
项目级翻译发布 skill 必须迁移到新内容结构
```

Expected: 执行日志包含 5 项，且没有把私人标识复制进计划或源码。

- [ ] **Step 3: 创建独立分支和 worktree**

Run:

```bash
test ! -e "$WORKTREE"
! git -C "$SOURCE_REPO" show-ref --verify --quiet refs/heads/codex/multilingual-site-redesign
git -C "$SOURCE_REPO" worktree add -b codex/multilingual-site-redesign "$WORKTREE" HEAD
```

Expected: worktree 创建成功，原始工作区 `git status --short` 与 Step 1 完全一致。

- [ ] **Step 4: 建立基线**

Run in the worktree:

```bash
node --test tests/site-content.test.mjs
git diff --check
```

Expected: 两条命令退出码均为 0。若基线失败，只记录失败，不修改测试以掩盖问题。

- [ ] **Step 5: 提交执行安全说明**

Create `docs/reports/implementation-baseline.md` containing only branch、基线命令、原工作区变更的仓库相对文件名和补丁 SHA-256；不得写入真实 worktree 路径、补丁正文或私人标识。

Run:

```bash
git add docs/reports/implementation-baseline.md
git commit -m "docs: record redesign implementation baseline"
```

Expected: 只提交该报告。

### Task 2: 建立 P0 隐私门禁并移除当前项目输出

**Files:**
- Create: `scripts/check-public-content.mjs`
- Create: `tests/public-content.test.mjs`
- Modify: `index.html`, `about.html`, `contact.html`, `blog.html`, `favorites.html`
- Delete: `projects.html`
- Modify: `tests/site-content.test.mjs`

- [ ] **Step 1: 先写失败的隐私测试**

The test must assert:

```js
assert.equal(existsSync("projects.html"), false);
for (const html of publicPages) {
  assert.doesNotMatch(html, /href=["'][^"']*\/projects/);
}
assert.equal(runPublicContentCheck().status, 0);
```

`scripts/check-public-content.mjs` must scan tracked text and generated HTML for local absolute paths、secret patterns、project route references and optional terms read from `SHOA_PRIVATE_TERMS_FILE`. It must never embed specific private terms.

- [ ] **Step 2: 运行测试确认按预期失败**

Run:

```bash
node --test tests/public-content.test.mjs
```

Expected: FAIL because `projects.html` and project-route references still exist.

- [ ] **Step 3: 删除当前项目页面和所有入口**

Remove `projects.html`; remove project links、项目描述、项目提示和依赖这些内容的旧断言。保留头像、邮箱、X、Blog、Favorites 和 Contact。

- [ ] **Step 4: 执行当前树与可选私人词表扫描**

Run:

```bash
node --test tests/public-content.test.mjs
node scripts/check-public-content.mjs
git diff --check
```

Expected: 全部退出 0；`git ls-files projects.html` 无输出。

- [ ] **Step 5: 只读审计 Git 历史**

If a local private-term file exists, scan all reachable commits with it and write only aggregate counts and commit hashes to `$RUNTIME_DIR/history-audit.txt`. Do not rewrite history and do not copy matched text into a tracked file.

Expected: 最终报告区分“当前输出已清除”和“历史仍可能包含”，不声称历史已清除。

- [ ] **Step 6: 提交 P0 隐私止血**

Run:

```bash
git add index.html about.html contact.html blog.html favorites.html tests/site-content.test.mjs tests/public-content.test.mjs scripts/check-public-content.mjs
git add -u projects.html
git commit -m "fix: remove private project output"
```

Expected: 提交不包含具体私人项目名。

### Task 3: 脚手架 Astro 7 静态站和验证命令

**Files:**
- Create: `package.json`, `package-lock.json`, `.nvmrc`, `.gitignore`, `astro.config.mjs`, `tsconfig.json`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `src/pages/index.astro`, `src/styles/tokens.css`, `src/styles/global.css`
- Create: `tests/build-config.test.mjs`
- Move later: `CNAME` to `public/CNAME`

- [ ] **Step 1: 写失败的构建配置测试**

Test exact invariants:

```js
assert.equal(pkg.scripts.build, "astro build");
assert.equal(pkg.scripts.check, "astro check");
assert.equal(configHasStaticOutput, true);
assert.equal(configHasSiteDomain, true);
assert.equal(workflowDeploysOnlyAfterBuild, true);
```

- [ ] **Step 2: 运行并确认缺少 package.json 而失败**

Run: `node --test tests/build-config.test.mjs`

Expected: FAIL with missing `package.json`.

- [ ] **Step 3: 安装唯一允许的新依赖**

Create `package.json` with scripts `dev`, `build`, `preview`, `check`, `test:unit`, `test:e2e`, `audit:content`, `audit:links`, `audit:seo`, `verify`.

Run:

```bash
npm install --save-exact astro@7.0.7 @astrojs/sitemap@3.7.3 @astrojs/rss@4.0.19
npm install --save-dev --save-exact @astrojs/check@0.9.9 typescript@7.0.2 @playwright/test@1.61.1 @axe-core/playwright@4.12.1 lighthouse@13.4.0
```

Expected: `package-lock.json` is created; no other runtime framework or CSS library is installed.

- [ ] **Step 4: 建立最小可构建页面**

Configure `output: "static"`, `site: "https://www.bydziwen.top"`, sitemap integration, `public/CNAME`, and a minimal page importing tokens/global CSS. Preserve the exact avatar file for later copy.

- [ ] **Step 5: 添加不自动发布的 Pages workflow**

The workflow must build on pull request and push, but the deploy job may run only through `workflow_dispatch` or after a future explicit publication change. It must not publish during this implementation branch.

- [ ] **Step 6: 验证并提交**

Run:

```bash
node --test tests/build-config.test.mjs
npm run check
npm run build
git diff --check
```

Expected: 全部退出 0，`dist/index.html` 存在，`dist/projects/index.html` 不存在。

Commit:

```bash
git add package.json package-lock.json .nvmrc .gitignore astro.config.mjs tsconfig.json .github src public tests/build-config.test.mjs
git commit -m "build: add Astro static site foundation"
```

### Task 4: 实现六语类型、字典和路由契约

**Files:**
- Create: `src/lib/i18n.ts`, `src/lib/routes.ts`, `src/lib/seo.ts`
- Create: `src/i18n/zh.json`, `en.json`, `ja.json`, `ko.json`, `th.json`, `fr.json`
- Create: `scripts/check-locale-dictionaries.mjs`
- Create: `tests/i18n.test.mjs`, `tests/routes.test.mjs`

- [ ] **Step 1: 写六语集合与 URL 失败测试**

Use these exact locale keys:

```ts
export const locales = ["zh", "en", "ja", "ko", "th", "fr"] as const;
export const defaultLocale = "zh";
```

Tests must assert `localizedPath("zh", "/about") === "/about"`, `localizedPath("fr", "/about") === "/fr/about"`, all six alternate links exist, and unsupported locale input throws.

- [ ] **Step 2: 写字典等价失败测试**

`check-locale-dictionaries.mjs` must flatten each JSON object and fail on missing keys、extra keys、empty strings or wrong locale count. Chinese is the key schema source.

- [ ] **Step 3: 运行失败测试**

Run:

```bash
node --test tests/i18n.test.mjs tests/routes.test.mjs
node scripts/check-locale-dictionaries.mjs
```

Expected: FAIL because helpers and dictionaries do not exist.

- [ ] **Step 4: 实现类型安全 helper 和六语字典**

Dictionary sections must include `nav`, `theme`, `language`, `home`, `about`, `blog`, `favorites`, `contact`, `article`, `errors`, `a11y`, and `footer`. Native language labels are `简体中文`, `English`, `日本語`, `한국어`, `ไทย`, `Français`.

- [ ] **Step 5: 验证并提交**

Run:

```bash
node --test tests/i18n.test.mjs tests/routes.test.mjs
node scripts/check-locale-dictionaries.mjs
npm run check
```

Expected: 全部退出 0。

Run `git add src/lib src/i18n scripts/check-locale-dictionaries.mjs tests/i18n.test.mjs tests/routes.test.mjs`, then commit with `git commit -m "feat: add six-language routing contract"`.

### Task 5: 建立统一视觉系统、布局和交互组件

**Files:**
- Create: `src/components/Header.astro`, `Footer.astro`, `LanguageMenu.astro`, `ThemeToggle.astro`, `MobileNav.astro`, `ArticleCard.astro`
- Create: `src/layouts/BaseLayout.astro`, `PageLayout.astro`, `BlogIndexLayout.astro`, `ArticleLayout.astro`
- Create: `src/styles/components.css`, `src/styles/article.css`
- Create: `public/assets/avatar/profile.jpg`
- Create: `tests/components.test.mjs`

- [ ] **Step 1: 写组件静态契约测试**

Tests must require skip link、one H1 slot、localized navigation、native-language menu、theme button、`focus-visible` styles、`prefers-reduced-motion` styles and no flag icons. Hash the source avatar and require the copied avatar hash to match exactly.

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/components.test.mjs`

Expected: FAIL because shared components do not exist.

- [ ] **Step 3: 实现基础布局与主题启动**

Theme initialization must run before first paint, read `shoa-theme`, otherwise honor `prefers-color-scheme`, set `data-theme`, expose localized accessible names, and avoid page-specific dark palettes.

- [ ] **Step 4: 实现响应式 Header 与导航**

Desktop shows name、primary nav、language control and icon theme control. Mobile shows name、language、theme and menu icon; menu traps focus, restores focus, closes on Escape, and prevents background scroll.

- [ ] **Step 5: 迁移现有 Blog 交互意图**

Article index controls must keep a quiet rail、horizontal mobile category scrolling、44px touch targets and `aria-current="page"` for active links. No Font Awesome or remote icon font is allowed; use existing icon library only if installed, otherwise accessible text/symbol controls with tooltips.

- [ ] **Step 6: 验证并提交**

Run:

```bash
node --test tests/components.test.mjs
npm run check
npm run build
```

Expected: 全部退出 0，头像 SHA-256 不变。

Commit: `git commit -m "feat: add shared responsive site shell"` with task files only.

### Task 6: 实现六语核心页面和克制文案

**Files:**
- Create: `src/data/profile.ts`, `src/data/social.ts`
- Create: `src/pages/index.astro`, `about.astro`, `blog/index.astro`, `favorites.astro`, `contact.astro`, `404.astro`
- Create: `src/pages/[locale]/index.astro`, `about.astro`, `blog/index.astro`, `favorites.astro`, `contact.astro`, `404.astro`
- Create: `tests/core-pages.test.mjs`

- [ ] **Step 1: 写页面矩阵失败测试**

Generate the expected matrix of 6 locales x 6 page types and assert each built file has correct `lang`, one H1, localized title/description, canonical, six `hreflang` links, theme control, language control and no `/projects` link.

- [ ] **Step 2: 写公开事实和文案边界测试**

Require unchanged avatar path and `mailto:shoa_lin@outlook.com`. Reject local paths、project route、empty project placeholders and a public denylist of grandiose phrases. Do not embed private identifiers.

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
npm run build
node --test tests/core-pages.test.mjs
```

Expected: FAIL because locale pages are absent.

- [ ] **Step 4: 写中文源文案并完成五种自然本地化**

Home first introduces Shoa Lin, then public interests、approved background、working approach、latest articles and contact. About uses short factual paragraphs. Contact uses the approved email and X. No employer、school、location、credential or project fact may be inferred without an approved public source.

- [ ] **Step 5: 保留未来项目插入契约但不渲染**

Home composition must place latest articles after the public-background region through named layout sections or data-driven ordering. Do not create Project components、content directories、routes、navigation items or comments containing private project information.

- [ ] **Step 6: 验证并提交**

Run:

```bash
npm run build
node --test tests/core-pages.test.mjs
node scripts/check-public-content.mjs dist
```

Expected: 36 个核心页面构建成功，无项目路由或入口。

Commit: `git commit -m "feat: add six-language core pages"`.

### Task 7: 定义 Blog 与 Favorites 内容 schema 和公开清单

**Files:**
- Create: `src/content.config.ts`
- Create: `scripts/inventory-public-content.mjs`
- Create: `scripts/check-content-completeness.mjs`
- Create: `scripts/check-translation-parity.mjs`
- Create: `docs/content/translation-glossary.md`
- Create outside repo: content audit resolved at runtime as `$CONTENT_AUDIT`
- Create: `tests/content-schema.test.mjs`

- [ ] **Step 1: 写 schema 失败测试**

Blog metadata must require `translationKey`, `locale`, `title`, `description`, `publishedAt`, `updatedAt`, `category`, `sourceLocale`, `sourceUrl`, `sourceAuthor`, `contentType`, `translationStatus`, and optional localized image captions. Favorites require source URL、author、localized summary、tags and publication status.

- [ ] **Step 2: 写六语完整性和结构等价失败测试**

The completeness script must fail unless every `published` translationKey has exactly six locale files. The parity script must compare heading levels/order、image count/positions、code-block languages、table count and source links against the canonical source locale.

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
node --test tests/content-schema.test.mjs
node scripts/check-content-completeness.mjs
```

Expected: FAIL because content collections are not populated.

- [ ] **Step 4: 生成本地公开性与版权审计**

Set `CONTENT_AUDIT="$RUNTIME_DIR/content-audit.json"`, then read `blogs/manifest.json` and Favorites sources. For each item, write only to `$CONTENT_AUDIT`: source reachability、canonical URL、source locale、original/translation/adaptation classification、image count and `publish | adapt | quarantine`. Never copy quarantined private identifiers into tracked files.

- [ ] **Step 5: 建立公开清单规则**

Only `publish` and `adapt` items enter `src/content`. `quarantine` items stay outside the generated site and are absent from tracked public manifests. When full republication rights are unclear, use a faithful structured adaptation with attribution and canonical source, not an unauthorized full-text claim.

- [ ] **Step 6: 建立六语术语表**

Include consistent equivalents and usage notes for AI Agent、harness、workflow、prompt、token、benchmark、context、memory、evaluation and tool calling across all six languages.

- [ ] **Step 7: 验证并提交 schema 与工具**

Run:

```bash
node --test tests/content-schema.test.mjs
npm run check
git diff --check
```

Expected: schema tests pass; completeness remains allowed to fail only until Task 9 populates all approved content.

Commit: `git commit -m "feat: add multilingual content quality gates"`.

### Task 8: 迁移中文 Blog、Favorites 和共享图片

**Files:**
- Create: `src/content/blog/zh/*.md`
- Create: `src/content/favorites/zh/*.md`
- Create: `public/assets/blog/**`
- Modify: `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, `src/pages/[locale]/blog/[slug].astro`
- Create: `tests/content-migration.test.mjs`

- [ ] **Step 1: 为获准公开清单写迁移失败测试**

For every non-quarantined item in the local audit, assert a Chinese content file exists with matching stable slug、source metadata、heading sequence、code blocks、tables、links and image positions.

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/content-migration.test.mjs`

Expected: FAIL with a deterministic list of missing Chinese files.

- [ ] **Step 3: 逐篇迁移中文内容**

Remove Markdown-local `<style>` and runtime-only markup. Preserve technical meaning、source attribution、section order、code and image placement. Use local images already intentionally public; keep canonical public URLs for images that cannot legally be copied.

- [ ] **Step 4: 迁移 Favorites 为摘要卡片**

Do not mirror third-party full text by default. Store localized summary、why it is worth revisiting、tags and canonical source link.

- [ ] **Step 5: 实现静态 Blog 索引与文章页**

Build category filters as links or progressively enhanced controls, static article HTML, optional desktop TOC, compact mobile reading controls, article language menu and previous/next links only when useful.

- [ ] **Step 6: 验证并提交**

Run:

```bash
npm run build
node --test tests/content-migration.test.mjs
node scripts/check-public-content.mjs dist
```

Expected: 每个获准公开条目有中文静态 URL，旧 `/blog?id=<id>` 映射清单完整，私人候选不进入 `dist`。

Commit: `git commit -m "content: migrate approved Chinese articles"`.

### Task 9: 分批完成所有获准文章的六语翻译

**Files:**
- Create: `src/content/blog/{en,ja,ko,th,fr}/*.md`
- Create: `src/content/favorites/{en,ja,ko,th,fr}/*.md`
- Modify: `.codex/skills/translate-blog-publish/SKILL.md`
- Modify: `.codex/skills/translate-blog-publish/agents/openai.yaml`
- Create: `tests/translation-skill.test.mjs`

- [ ] **Step 1: 把现有项目级翻译 skill 复制到 worktree 并先写失败测试**

The new skill must reference Astro content paths、six locales、canonical-source translation、image placement、privacy scan、completeness/parity commands and local-review publication gate. It must not retain the old runtime manifest workflow as the current instruction.

- [ ] **Step 2: 更新 skill 并验证**

Run: `node --test tests/translation-skill.test.mjs`

Expected: PASS and no private identifier appears in the skill.

- [ ] **Step 3: 按最多 3 篇一批翻译**

For each batch, process every item in the public content collection in stable `publishedAt` descending order. Translate from the canonical source locale, not through Chinese when the source is another language. Each target must preserve structure、uncertainty、citations、images、tables and code.

- [ ] **Step 4: 每种语言做独立第二轮复核**

Review omissions、semantic drift、terminology、natural phrasing、heading order、links、image placement、table values and code fences. Mark `translationStatus: reviewed` only after this pass.

- [ ] **Step 5: 每批执行完整门禁并单独提交**

Run after every batch:

```bash
node scripts/check-content-completeness.mjs --allow-drafts
node scripts/check-translation-parity.mjs
npm run build
git diff --check
```

Expected: 当前批次结构一致、构建通过；commit message uses `content: add multilingual article batch <N>` without private names.

- [ ] **Step 6: 完成全部批次后关闭草稿豁免**

Run:

```bash
node scripts/check-content-completeness.mjs
node scripts/check-translation-parity.mjs
```

Expected: 每个获准公开的 Blog 和 Favorite translationKey 恰好有六个 `reviewed` 或 `published` 版本；无部分语言内容进入生产构建。

- [ ] **Step 7: 删除已被 Astro 完整替代的旧运行时**

After migration and parity tests pass, delete the legacy root HTML、`style.css`、`script.js`、`css/`、`js/`、old `blogs/`、old `favorites/articles/`、old content READMEs、root `assets/`、root `CNAME`、`.nojekyll` and the one-time `scripts/migrate-legacy-content.mjs` migration helper. Keep `scripts/inventory-public-content.mjs` functional against `src/content`. Migrate every still-valid assertion from `tests/site-content.test.mjs` into the new test suite before deleting that legacy test.

Run:

```bash
npm run build
node scripts/check-content-completeness.mjs
node scripts/check-translation-parity.mjs
git ls-files 'index.html' 'about.html' 'blog.html' 'favorites.html' 'contact.html' 'projects.html' 'css/**' 'js/**' 'blogs/**' 'favorites/articles/**'
```

Expected: validation commands exit 0 and `git ls-files` has no output after staged deletions. Do not delete the project-level `.codex/skills/translate-blog-publish/` skill.

- [ ] **Step 8: 提交旧运行时清理**

Run `git add -A` only after reviewing `git status --short` and confirming every deletion is listed above, then commit with `git commit -m "refactor: remove legacy static site runtime"`.

### Task 10: 完成 SEO、重定向、RSS、链接和 404

**Files:**
- Create: `src/pages/robots.txt.ts`
- Create: `src/pages/rss.xml.js`, `src/pages/[locale]/rss.xml.js`
- Create: `public/_redirects` or GitHub-Pages-compatible legacy redirect pages
- Create: `scripts/check-seo.mjs`, `scripts/check-links.mjs`
- Create: `tests/seo.test.mjs`

- [ ] **Step 1: 写 SEO 失败测试**

For every built page require localized title/description、canonical、six hreflang entries、Open Graph、social metadata、sitemap inclusion and correct article JSON-LD where applicable.

- [ ] **Step 2: 写内部链接和旧 URL 失败测试**

Check every internal href/src against `dist`. Generate deterministic redirect pages or client-safe redirect mapping for every old `/blog?id=<id>` URL to the canonical Chinese article route.

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
npm run build
node --test tests/seo.test.mjs
node scripts/check-links.mjs dist
```

Expected: FAIL until metadata、RSS、404 and legacy mappings exist.

- [ ] **Step 4: 实现并验证**

Run:

```bash
npm run build
node scripts/check-seo.mjs dist
node scripts/check-links.mjs dist
node --test tests/seo.test.mjs
```

Expected: 全部退出 0；sitemap 不含 `/projects`；每个 locale RSS 只包含该语言完整文章。

- [ ] **Step 5: 提交**

Commit: `git commit -m "feat: add multilingual SEO and legacy routes"`.

### Task 11: Playwright 覆盖响应式、主题、无障碍和核心流程

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/navigation.spec.ts`, `locales.spec.ts`, `themes.spec.ts`, `articles.spec.ts`, `accessibility.spec.ts`, `visual.spec.ts`
- Create: `scripts/capture-review-screenshots.mjs`

- [ ] **Step 1: 写会失败的核心 E2E**

Cover language switching、theme persistence、mobile menu focus、Blog categories、article language menu、Favorites source links、Contact mailto、404 and absence of project navigation/routes.

- [ ] **Step 2: 增加六语与五尺寸矩阵**

Test widths `320`, `390`, `768`, `1024`, `1440`; both themes; all six locales; longest page title and longest article title. Assert no horizontal overflow、overlap、clipped controls or text outside its parent.

- [ ] **Step 3: 增加 Axe 无障碍门禁**

Run `@axe-core/playwright` on Home、About、Blog index、one article、Favorites、Contact and 404 in both themes. Fail on serious or critical violations; separately assert keyboard focus order and reduced-motion behavior.

- [ ] **Step 4: 通过 Playwright webServer 运行测试**

Configure `playwright.config.ts` with a `webServer` command of `npm run preview -- --host 127.0.0.1 --port 4321`, then run:

```bash
npm run build
npx playwright test
```

Expected: all tests pass; Playwright reports no retries required for deterministic cases.

- [ ] **Step 5: 生成本地审核截图**

Write screenshots to ignored `artifacts/visual-review/<locale>/<theme>/<viewport>/`. Include Home、About、Blog index、article、Favorites and Contact.

- [ ] **Step 6: 提交测试，不提交截图**

Commit: `git commit -m "test: cover multilingual responsive experience"`.

### Task 12: 性能、全量验证和本地审核交付

**Files:**
- Create: `scripts/run-lighthouse.mjs`
- Create: `docs/reports/local-review-report.md`
- Modify only if needed: files introduced by Tasks 3-11

- [ ] **Step 1: 运行全量机械验证**

Run:

```bash
npm ci
npm run check
npm run test:unit
npm run audit:content
npm run build
npm run audit:seo
npm run audit:links
npm run test:e2e
git diff --check
```

Expected: every command exits 0; no skipped tests、`.only`、weakened assertions or untracked source files.

- [ ] **Step 2: 运行 Lighthouse**

Measure representative Home、Blog index and article pages in both mobile and desktop profiles. Required thresholds: Performance >= 90, Accessibility >= 95, Best Practices >= 95, SEO >= 95; capture LCP < 2.5s and CLS < 0.1 where Lighthouse reports them.

- [ ] **Step 3: 复查隐私与未来项目边界**

Run:

```bash
node scripts/check-public-content.mjs dist
find dist -path '*projects*' -print
rg -n '/projects|localhost|/Users/|BEGIN .*PRIVATE KEY|authorization|set-cookie' dist src public
```

Expected: privacy script exits 0; `find` and `rg` have no unexplained output. Do not treat safety-rule source strings inside the checker as leaks.

- [ ] **Step 4: 验证原始工作区未被改动**

Run:

```bash
git -C "$SOURCE_REPO" status --short --branch
shasum -a 256 "$SAFETY_PATCH"
```

Expected: original status matches Task 1 and patch checksum is unchanged.

- [ ] **Step 5: 写本地审核报告**

`docs/reports/local-review-report.md` must list commit range、public article count、expected six-language file count、quarantined count without names、commands and exit codes、Lighthouse summary、screenshot path、history-audit status、known residual risks and explicit statement that production was not published.

- [ ] **Step 6: 提交最终报告**

Run:

```bash
git add docs/reports/local-review-report.md
git commit -m "docs: add local multilingual review report"
```

- [ ] **Step 7: 启动供用户查看的本地服务器**

Choose the first free port from `8765` through `8775`, then run the built preview bound to `127.0.0.1`. Store PID and log under `$RUNTIME_DIR`, not in the repo.

Expected: Home、`/about`、`/blog`、one article and `/fr/contact` return HTTP 200; `/projects` returns 404.

- [ ] **Step 8: 停在审核点**

Do not merge、push、force-push、rewrite history、trigger Pages、change DNS or publish. Report the worktree path、branch、local URL、commit range、verification table、screenshot directory、content counts and any item requiring user judgment.

## 最终验收映射

```text
头像不变                         Task 5 hash test
当前无项目页面/信息              Tasks 2, 6, 12 privacy gates
未来可增加公开项目               Task 6 composition and content-boundary contract
核心页面六语                     Tasks 4, 6
每篇获准公开博客六语             Tasks 7-9 completeness gate
翻译保留图片与结构               Tasks 7-9 parity gate
文案克制、不夸张                 Task 6 copy boundary test
浅色/暗色统一                    Tasks 5, 11
手机端友好                       Task 11 five-width matrix
SEO、无障碍、性能                Tasks 10-12
不覆盖现有改动                   Tasks 1, 12 checksum/status proof
本地审核后才可发布               Task 12 explicit stop gate
```

## 强制停止条件

- 原始工作区状态或 `$SAFETY_PATCH` 校验值发生非预期变化。
- 需要公开性判断但没有公开证据，或来源依赖登录、付费墙、私密会话、内部文档。
- 需要把具体私人标识写进公共仓库才能完成检测。
- 需要 Git 历史重写、强推、远端删除、生产发布、域名/DNS 变更或凭据。
- 现有测试失败且无法证明与当前任务无关；不得通过跳过、`.only`、降低断言或删除覆盖来继续。
- 除计划明确列出的依赖外还需要新依赖，或 Astro 7.0.7 与 Node 24/26 无法兼容。
- 无法恢复的构建、翻译结构、图片、链接、无障碍或隐私门禁失败。
- 无法判断某篇内容应完整翻译、结构化译介还是隔离；该项不得进入公开集合。
