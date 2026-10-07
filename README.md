# shoa-site

Shoa Lin 的个人主页源码，部署在 www.bydziwen.top。

- 框架：Astro 7 静态输出，部署到 GitHub Pages（`.github/workflows/deploy-pages.yml`，只在 push 到 `main` 时构建并发布）。
- 语言：简体中文为默认语言（无 URL 前缀），另有 en、ja、ko、th、fr、de、vi 七种语言（带前缀）。界面文案在 `src/i18n/*.json`，八份字典的键必须一致。
- 内容：`src/content/blog`、`src/content/favorites`、`src/content/food`，按 `<locale>/<slug>.md` 组织；公开文章要求八种语言齐全并标为 `reviewed`。流程见 `.codex/skills/translate-blog-publish/SKILL.md`，术语见 `docs/content/translation-glossary.md`。
- 漫画子站：`public/comics/` 下的独立静态 HTML，不经过 Astro 路由。
- 页脚访问计数：`workers/site-visits/` 的 Cloudflare Worker，手动用 wrangler 部署；站点通过仓库变量 `PUBLIC_VISIT_API_URL` 接入。

## 常用命令

```bash
npm ci                      # 安装依赖（Node 24，见 .nvmrc）
npm run dev                 # 本地开发
npm run build               # 构建到 dist/
npm run test:unit           # 单元测试（含内容门禁，会多次触发构建）
npm run verify              # CI 同款完整校验：类型检查、单测、内容审计、构建、SEO/链接审计、Playwright e2e
node scripts/check-content-completeness.mjs   # 八语完整性
node scripts/check-translation-parity.mjs     # 译文结构对照
node scripts/run-lighthouse.mjs               # 本地性能基线（需先 npm run preview 在 4321 端口）
```

## 新增一篇文章

1. 写 `src/content/blog/zh/<slug>.md`，frontmatter 字段见 `src/content.config.ts`。
2. 补齐其余七种语言，跑完整性与结构对照脚本。
3. 在 `tests/content-migration.test.mjs` 与 `tests/article-routes.test.mjs` 的审批清单登记该 slug。
4. 本地 `npm run verify` 通过后开 PR。
