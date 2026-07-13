# 多语言字体系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use \`subagent-driven-development\` (recommended) or \`executing-plans\` to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** 在不改变站点内容、信息架构或主题系统的前提下，为中文、英语、日语、韩语、泰语与法语建立一致、可自托管、适合长文阅读的字体与排版系统。

**Architecture:** 使用 Fontsource 的变量字体包在 Astro 构建期输出站内 WOFF2 与 \`unicode-range\` 规则；浏览器只按当前页面语言和实际字符请求所需分片，不在运行时连接 Google Fonts。tokens.css 负责字体角色与语言无关的默认变量，global.css 根据 HTML lang 选择具体字体，页面和文章样式只消费语义变量而不写语言特例。

**Tech Stack:** Astro 7、原生 CSS、自托管 \`@fontsource-variable/*\`、Node.js 单测、Playwright。

---

## 范围与边界

- 不改博客正文、翻译、头像、个人资料、路由、配色、主题切换或公开内容审计逻辑。
- 不使用 Google Fonts CDN、第三方字体 CDN 或运行时字体脚本。
- 不把全部 CJK 字体文件手工复制到 public；由 Vite 处理 Fontsource 的 WOFF2 分片与内容哈希。
- 保留现有六种 HTML lang：zh-CN、en、ja、ko、th、fr。
- 不触碰现有未跟踪的 ai-agent-design-patterns 博客与测试文件。

## 字体与排版决策

| HTML lang | 主字体 | 正文行高 | H1 行高 | 长文宽度 |
| --- | --- | ---: | ---: | --- |
| zh-CN | Noto Sans SC Variable | 1.82 | 1.18 | 720px |
| en / fr | Noto Sans Variable | 1.72 | 1.10 | 68ch |
| ja | Noto Sans JP Variable | 1.82 | 1.18 | 720px |
| ko | Noto Sans KR Variable | 1.82 | 1.18 | 720px |
| th | Noto Sans Thai Looped Variable | 1.94 | 1.32 | 720px |

所有语言使用 JetBrains Mono Variable 表现代码、日期和技术元信息；当代码中有非拉丁文字时，后备字体使用当前语言的正文变量。全站仅使用 400、500、600、700 四种字重，并启用 font-synthesis: none，避免浏览器合成粗体。

## 文件地图

| 文件 | 改动职责 |
| --- | --- |
| package.json、package-lock.json | 锁定六个 Fontsource 变量字体包。 |
| src/styles/fonts.css | 引入 Fontsource 的本地 CSS 字体声明。 |
| src/styles/tokens.css | 定义字体角色与语言无关的默认排版变量。 |
| src/styles/global.css | 按 html:lang(...) 映射字体与行高变量，设置字体渲染约束。 |
| src/styles/pages.css | 让首页、关于、收藏、联系和列表标题使用语义行高变量。 |
| src/styles/article.css | 调整文章标题、正文、各级标题、代码块与文章宽度。 |
| tests/components.test.mjs | 锁定自托管字体和语言映射这一源代码契约。 |
| tests/e2e/locales.spec.ts | 验证六语种实际使用对应字体，且字体资源只从本站加载。 |
| tests/e2e/visual.spec.ts | 复用既有六语种、浅暗主题、五种宽度矩阵，增加排版不裁切断言。 |

### Task 1: 先建立失败的字体契约测试

**Files:**
- Modify: tests/components.test.mjs
- Modify: tests/e2e/locales.spec.ts
- Modify: tests/e2e/visual.spec.ts

- [ ] **Step 1: 添加源代码契约测试**

在 tests/components.test.mjs 新增测试，读取 fonts.css、tokens.css 和 global.css，断言六个本地字体 CSS import 与六种 html:lang 映射均存在：

\`\`\`js
const fonts = read("src/styles/fonts.css");
const global = read("src/styles/global.css");

for (const family of [
  "noto-sans", "noto-sans-sc", "noto-sans-jp", "noto-sans-kr", "noto-sans-thai-looped", "jetbrains-mono",
]) assert.match(fonts, new RegExp(\`@fontsource-variable/\${family}/wght\\\\.css\`));

assert.match(global, /html:lang\\(zh-CN\\).*Noto Sans SC Variable/s);
assert.match(global, /html:lang\\(ja\\).*Noto Sans JP Variable/s);
assert.match(global, /html:lang\\(ko\\).*Noto Sans KR Variable/s);
assert.match(global, /html:lang\\(th\\).*Noto Sans Thai Looped Variable/s);
assert.match(global, /font-synthesis:\\s*none/);
\`\`\`

- [ ] **Step 2: 添加浏览器字体与资源来源断言**

在 tests/e2e/locales.spec.ts 为六个主页路径建立字体期望值。页面加载后等待 document.fonts.ready，断言 html 的计算字体包含正确的 Noto 家族，并断言 Performance Resource Timing 中没有 fonts.googleapis.com 或 fonts.gstatic.com 请求。

\`\`\`ts
const expectedFamilies = [
  ["/", "Noto Sans SC Variable"], ["/en/", "Noto Sans Variable"],
  ["/ja/", "Noto Sans JP Variable"], ["/ko/", "Noto Sans KR Variable"],
  ["/th/", "Noto Sans Thai Looped Variable"], ["/fr/", "Noto Sans Variable"],
] as const;
\`\`\`

- [ ] **Step 3: 让测试先失败**

Run: \`npm run test:unit -- tests/components.test.mjs\`

Expected: FAIL，原因是 fonts.css 尚不存在，且现有系统字体不能满足六语种映射。

### Task 2: 引入构建期自托管字体

**Files:**
- Modify: package.json
- Modify: package-lock.json
- Create: src/styles/fonts.css

- [ ] **Step 1: 安装锁定的字体包**

Run:

\`\`\`bash
npm install @fontsource-variable/noto-sans@5.2.10 @fontsource-variable/noto-sans-sc@5.2.10 @fontsource-variable/noto-sans-jp@5.2.10 @fontsource-variable/noto-sans-kr@5.2.10 @fontsource-variable/noto-sans-thai-looped@5.2.3 @fontsource-variable/jetbrains-mono@5.2.8
\`\`\`

这些包在构建时输出站内 WOFF2；不会在访问者浏览页面时向 Google 或任何其他字体 CDN 发请求。

- [ ] **Step 2: 创建唯一的字体资源入口**

创建 src/styles/fonts.css，保持字体加载策略集中且可审计：

\`\`\`css
@import "@fontsource-variable/noto-sans/wght.css";
@import "@fontsource-variable/noto-sans-sc/wght.css";
@import "@fontsource-variable/noto-sans-jp/wght.css";
@import "@fontsource-variable/noto-sans-kr/wght.css";
@import "@fontsource-variable/noto-sans-thai-looped/wght.css";
@import "@fontsource-variable/jetbrains-mono/wght.css";
\`\`\`

不添加无条件 preload：CJK 字符集体积大，浏览器应依靠 Fontsource 的 unicode-range 仅取当前语言实际需要的分片；font-display: swap 保证低网速下内容立即可读。

- [ ] **Step 3: 验证字体资源进入本地构建产物**

Run: \`npm run build\`

Expected: PASS；dist/_astro/ 中出现带哈希的 .woff2 资源，构建 HTML 不包含 fonts.googleapis.com 或 fonts.gstatic.com。

### Task 3: 用语言变量替换设备 fallback

**Files:**
- Modify: src/styles/tokens.css
- Modify: src/styles/global.css

- [ ] **Step 1: 在 token 层定义字体角色与默认尺度**

在 :root 中增加默认拉丁变量：

\`\`\`css
--font-sans: "Noto Sans Variable", ui-sans-serif, system-ui, sans-serif;
--font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
--line-ui: 1.45;
--line-prose: 1.72;
--line-display: 1.10;
--line-section-heading: 1.24;
--article-measure: 68ch;
\`\`\`

- [ ] **Step 2: 在全局样式中导入字体并完成 locale mapping**

在 global.css 的顶部紧接 tokens.css 导入后引入 fonts.css。将原有系统字体选择替换为 var(--font-sans)，并定义下列四组语言变量：

\`\`\`css
html:lang(zh-CN) {
  --font-sans: "Noto Sans SC Variable", ui-sans-serif, system-ui, sans-serif;
  --line-prose: 1.82; --line-display: 1.18; --line-section-heading: 1.32; --article-measure: 720px;
}
html:lang(ja) {
  --font-sans: "Noto Sans JP Variable", ui-sans-serif, system-ui, sans-serif;
  --line-prose: 1.82; --line-display: 1.18; --line-section-heading: 1.32; --article-measure: 720px;
}
html:lang(ko) {
  --font-sans: "Noto Sans KR Variable", ui-sans-serif, system-ui, sans-serif;
  --line-prose: 1.82; --line-display: 1.18; --line-section-heading: 1.32; --article-measure: 720px;
}
html:lang(th) {
  --font-sans: "Noto Sans Thai Looped Variable", ui-sans-serif, system-ui, sans-serif;
  --line-prose: 1.94; --line-display: 1.32; --line-section-heading: 1.42; --article-measure: 720px;
}
\`\`\`

html 同时设置 font-family: var(--font-sans)、line-height: var(--line-ui)、font-synthesis: none 与 font-optical-sizing: auto。删除旧的 Hiragino、Yu Gothic、Apple SD Gothic Neo、Malgun Gothic、Thonburi、Tahoma 分支。

- [ ] **Step 3: 通过单测**

Run: \`npm run test:unit -- tests/components.test.mjs\`

Expected: PASS。

### Task 4: 调整各页面的阅读尺度

**Files:**
- Modify: src/styles/pages.css
- Modify: src/styles/article.css

- [ ] **Step 1: 调整通用页面标题与介绍文案**

将 .home-hero__copy h1、.page-intro h1、.not-found h1 的 line-height: 1.04 改为 var(--line-display)；将首页和普通页面的长文介绍 line-height: 1.75 改为 var(--line-prose)。保留现有字号、色彩、间距、断点和结构，不增加第二套展示字体。

- [ ] **Step 2: 调整文章排版与代码字体**

在 article.css 中执行以下替换：

\`\`\`css
.article-header h1 { line-height: var(--line-display); }
.article-header__description,
.article-content :where(p, li) { line-height: var(--line-prose); }
.article-content :where(h2, h3, h4) { line-height: var(--line-section-heading); }
.article-content { width: min(100%, var(--article-measure)); }
.article-content :where(pre, code, kbd, samp) { font-family: var(--font-mono), var(--font-sans); }
\`\`\`

保留 article-reading-grid 的列结构和移动端目录逻辑；只让其中的阅读列随语言变量变化。代码块允许水平滚动，不能为避免滚动而压缩代码字号。

- [ ] **Step 3: 验证既有页面没有样式回归**

Run: \`npm run check && npm run test:unit && npm run build\`

Expected: 全部 PASS。

### Task 5: 六语种、浅暗模式与移动端验收

**Files:**
- Modify: tests/e2e/visual.spec.ts
- Modify: tests/e2e/locales.spec.ts

- [ ] **Step 1: 增加排版高度与字体可用性检查**

在现有 expectLayoutFits 基础上，增加对 h1、文章卡片 h2、文章 h2、正文段落的检查：元素不能横向溢出，scrollHeight 不能超过可见内容高度 2px 以上。该检查在 320、390、768、1024、1440 五个宽度、六个 locale、浅暗主题下运行。

- [ ] **Step 2: 覆盖长文页面和深色主题**

保留现有所有公开博客的矩阵测试，额外等待 document.fonts.ready 后再执行排版检查。测试重点包括：法语长标题、日语和韩语标题、泰文组合符、中文与英文混排、代码块、移动端悬浮目录。

- [ ] **Step 3: 生成人工审核截图**

Run:

\`\`\`bash
npm run build
npm run preview -- --host 127.0.0.1 --port 8767
PREVIEW_URL=http://127.0.0.1:8767 node scripts/capture-review-screenshots.mjs
\`\`\`

Expected: artifacts/visual-review/ 下生成六语种、浅暗模式、五种宽度的截图；重点人工查看首页、Blog 列表、最长文章、收藏和联系页。

- [ ] **Step 4: 执行完整门禁，不发布**

Run:

\`\`\`bash
npm run verify
git diff --check
\`\`\`

Expected: 所有检查通过，且 diff 不含现有未跟踪博客文件。完成后只提供本地预览给用户验收；未经用户明确同意，不提交、不推送、不发布。

## 验收标准

- 六种语言在桌面和 320px / 390px 手机宽度均无文字裁切、横向溢出或交互控件重叠。
- 浅色、暗色主题的对比度、字体粗细和阅读节奏保持一致。
- 英语与法语长文不超过舒适行宽；CJK 与泰文不被拉得过窄。
- 页面不请求 Google Fonts 或第三方字体 CDN。
- 所有公开内容、隐私审计、SEO、链接、无障碍和现有 Playwright 测试继续通过。
- 先由用户在本地审核，再决定是否提交和发布。
