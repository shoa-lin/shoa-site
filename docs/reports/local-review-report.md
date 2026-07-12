# 六语个人主页本地审核报告

日期：2026-07-12

状态：本地实现完成，等待用户审核；未推送、未合并、未发布生产环境。

## 实施范围

- 分支：`codex/multilingual-site-redesign`
- 基线提交：`d1ddf4b5ee2c6acc611c61ffac64cb17004de903`
- 实施提交范围：`d251fc8` 至 `5cd6305`，共 33 个提交
- 页面：Home、About、Blog、Favorites、Contact、404
- 语言：中文、英语、日语、韩语、泰语、法语
- 中文 URL 无语言前缀；其他五种语言使用语言前缀
- 当前无 Projects 页面、路由、导航、占位、sitemap 或 RSS 记录

## 内容结果

- 公开内容组：9 组
- Blog：8 组，48 个六语文件
- Favorites：1 组，6 个六语文件
- 六语内容文件总数：54
- 所有公开版本状态：`reviewed`
- 实施过程中隔离：8 项；本报告不列名称，当前公开内容与生成站点不包含这些隔离项
- 当前 9 个 canonical source 均可访问
- 头像保留批准的原始字节，公开邮箱为 `shoa_lin@outlook.com`

## 验证结果

| 验证 | 结果 |
| --- | --- |
| `npm ci` | 退出 0 |
| `npm run verify` | 退出 0 |
| `npm run check` | 0 errors、0 warnings、0 hints |
| `npm run test:unit` | 43/43 通过，0 skipped |
| `npm run audit:content` | 215 个源码/公开文件通过 |
| `npm run build` | 84 个静态页面 |
| `npm run audit:seo` | 84 个 HTML 页面通过 |
| `npm run audit:links` | 102 个构建文件通过 |
| `npm run test:e2e` | 65/65 通过，0 retries、0 skipped |
| 六语完整性 | 9 组、54 文件 |
| 翻译结构等价 | 9 组通过 |
| 仓库外私密词表扫描 | 102 个构建文件通过 |
| Projects 输出检查 | 无匹配路径或入口 |
| `git diff --check` | 退出 0 |

Playwright 覆盖 320、390、768、1024、1440 五种宽度、六种语言、浅色/暗色、全部公开 Blog、Axe 严重/关键问题、键盘焦点、reduced motion、主题持久化、语言切换、分类、Favorites 外链、Contact 和 404。

## Lighthouse

阈值：Performance >= 90、Accessibility >= 95、Best Practices >= 95、SEO >= 95、LCP < 2.5s、CLS < 0.1。

| 页面 | 配置 | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Mobile | 99 | 100 | 96 | 100 | 2.114s | 0.0011 |
| Home | Desktop | 100 | 100 | 96 | 100 | 0.446s | 0 |
| Blog | Mobile | 100 | 100 | 96 | 100 | 0.902s | 0 |
| Blog | Desktop | 100 | 100 | 96 | 100 | 0.242s | 0 |
| Article | Mobile | 100 | 100 | 96 | 100 | 0.754s | 0 |
| Article | Desktop | 100 | 100 | 96 | 100 | 0.206s | 0.0418 |

原始 JSON 与汇总位于被忽略的 `lighthouse-reports/`，共 6 份页面报告和 1 份汇总。

## 截图

- 目录：`artifacts/visual-review/`
- 数量：360 张
- 结构：`<locale>/<theme>/<viewport>/<page>.png`
- 每组包含 Home、About、Blog、代表文章、Favorites、Contact
- 截图目录被 Git 忽略，不进入提交

## 安全核验

- 原 checkout 当前状态快照 SHA-256 与基线一致：`910cea94e0c06c37b3d2f5d58b6a0038b5157a9be6c8b6e2ced0027782c2c2e0`
- 原有安全补丁 SHA-256 与基线一致：`268edbc96181d91056ed22b97f0f2244957511782bd18c526af105df542748ee`
- Git 历史只读审计覆盖 95 个提交，其中 19 个提交命中仓库外私密词表
- 未执行历史重写、force push、远端删除或生产发布

## 已知风险

- `npm audit --omit=dev` 为 0；完整开发依赖审计有 17 个 moderate，来自 Lighthouse 的 OpenTelemetry/Sentry 间接依赖。当前建议修复会改变 Lighthouse 主版本范围，因此本次不做计划外依赖降级。
- 外部来源和远程图片未来可能失效；当前 canonical source 可访问，链接审计只保证本次本地构建状态。
- Lighthouse 是本机单次测量，仍可能受机器负载影响；本次最低 Performance 为 99，最高 LCP 为 2.114s。
- 历史中的命中仍存在；是否单独重写历史需要用户明确决定，不属于本次本地审核范围。
- 自动化已覆盖结构、交互、无障碍和响应式，但文案语气、翻译自然度与最终视觉偏好仍需用户人工审核。

## 发布状态

本次仅完成本地审核版本。未 push、未合并 main、未触发 GitHub Pages、未修改 DNS，也未发布生产环境。
