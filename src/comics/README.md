# 漫画模块

每部漫画是 `src/comics/<id>/` 下的一个文件夹，`<id>` 用小写英文和连字符，例如 `gpt-6-astra`。

| 文件 | 内容 |
| --- | --- |
| `comic.json` | 发布日期、更新日期、原文语言 `sourceLocale`、各语言版本的标题和简介；可选 `draft: true`、`shellTheme: "light" \| "dark" \| "auto"` |
| `<locale>.html` | 作者给的完整 HTML，原样保存，一个语言一份（zh、en、ja、ko、th、fr、de、vi） |
| `fonts/<locale>.css` | 自动生成：自托管字体的 `@font-face`，第一行记录哪些字体已自托管 |
| `assets.json` | 自动生成：HTML 里的相对路径 → 复制到站点里的文件 |
| `vendor.json` | 自动生成：外部脚本/样式的网址 → 下载到站点里的副本 |

公开文件在 `public/comics/<id>/`：`fonts/<locale>/`（字体子集）、`covers/<locale>.webp|.jpg`（列表封面和分享预览图）、`assets/`（漫画用到的图片等）、`vendor/`（下载下来的外部脚本）。这些都由脚本生成，不要手改。

## 前置条件

- `npm ci`，以及一次 `npx playwright install chromium`（截封面、统计字形要用浏览器）。
- 能访问 fonts.googleapis.com 和漫画用到的 CDN。只有 `npm run comic` 需要联网，站点构建不需要。

## 发布一部新漫画

```bash
npm run comic -- add /path/to/comic.html --id <slug>
npm run comic -- check <slug>
npm run build && npm run preview   # 打开 add 最后一行打印的地址，手机宽度和桌面宽度都看一眼
npm run verify                     # 全绿后再提交
```

原文不是中文的漫画没有 `/comics/<slug>/`，只有 `/<locale>/comics/<slug>/`，所以以 `add` 打印的地址为准。

`add` 先检查参数和输入（编码、语言、日期、标题和简介、浏览器是否装好），有问题时不写任何文件。检查通过后依次做下面这些事；后面某一步失败（比如下载字体、截封面），修好原因后重跑同一条 `add` 即可：

1. 读文件：必须是 UTF-8；从线上页面另存的，会先去掉站点加上去的页头页脚等部件，并把自托管字体还原成 Google Fonts 链接。
2. 识别语言：读 `<html lang>`，识别不了时用 `--locale zh` 指定。
3. 原样保存到 `src/comics/<id>/<locale>.html`，写 `comic.json`：
   - 标题取 `<title>`，自动去掉「· 漫画版」「| Shoa Lin」这类尾巴；简介取 `<meta name="description">`，没有就取第一段正文，需要人工过一眼。
   - 再次 `add` 同一个语言时保留 comic.json 里已有的标题和简介，用 `--title`、`--description` 才会改。
   - 第一次 `add` 的语言就是原文语言。
4. 复制资源：只复制 HTML（以及它引用的 CSS）真正用到的相对路径文件，默认从 HTML 所在的文件夹找，`--assets <目录>` 可以另指；文件名带内容哈希，同名不同内容不会互相覆盖。HTML 文件本身不会被当成资源公开。
5. 下载外部脚本和样式（CDN 上的库），让国内读者也能打开；`--no-vendor` 关闭。`type="module"` 的脚本不下载，会提示。
6. 自托管字体：下载 Google Fonts，裁剪成页面实际用到的字符（会滚动页面、等脚本插入的文字出现）。中日韩正文字体（Noto Sans SC 等）不下载，用读者的系统字体；Material Icons 这类图标字体留在 Google，不阻塞渲染。
7. 截图生成封面。
8. 打印风险提示，见下文。

其它参数：`--date 2026-10-08`、`--shell-theme light|dark|auto`、`--draft`。

只改了某个语言的 HTML 时，重跑同一条 `add` 即可；也可以单独重跑 `npm run comic -- fonts <id> --locale <xx>`、`npm run comic -- cover <id> --locale <xx>`。

改版后旧的字体子集、资源副本不再被引用，`check` 会提示。`npm run comic -- prune <id>` 列出这些文件，确认后加 `--apply`，只删除列出的那些文件。

## 多语言版本

每个语言是一份完整的翻译后 HTML，用 `--locale <xx>` 加进同一个 `<id>`。译文引用的图片和原文同名时直接复用原文的文件，不用再给。`check` 会对比各语言和原文的标题、图片、代码块数量，并提示残留的中文（含 alt、aria-label 和 SVG 文字）。列表页和语言切换只显示已有的语言；某个语言没有版本时，该语言的列表链接到原文版本并标注出来。

## 网址

- 列表：`/comics/`（中文）、`/<locale>/comics/`；最新一部在最上面，显示为大卡片。
- 单篇：`/comics/<id>/`（中文）、`/<locale>/comics/<id>/`。

## 站点替漫画做的事

- 作者的 `<style>` 和 `<script>` 原样保留，漫画页不加载主站样式表。
- `<title>`、description、canonical、hreflang、Open Graph、favicon 由站点按 `comic.json` 生成；作者 HTML 里的同类标签，以及会拦截站点脚本的 CSP、`<meta http-equiv="refresh">`、`<base>`，在构建时去掉。
- 页头（导航、语言切换、手机菜单）和页脚放在 shadow DOM 里，并在解析时移到 `<body>` 外面：漫画对 `body` 写的 `max-width`、`padding`、`display:flex` 管不到它们，漫画的 CSS 也改不了它们的样式。
- 页头页脚的配色跟着漫画走：页面背景是深色时用深色版；浅色页面带有自己的深色模式（`@media (prefers-color-scheme: dark)`）时跟随读者的系统设置；其余用浅色版。也可以在 comic.json 里用 `shellTheme` 指定。
- 层级：漫画全屏的遮罩、灯箱、开场页（`position: fixed`、面积超过屏幕四分之一、`z-index` 不小于 2）盖在页头页脚上面，关闭按钮不会被挡住。没写 `z-index` 的全屏层会被页头页脚压住，`add` 会提示。回到顶部按钮、工具条这类小的悬浮元素盖到页头页脚的链接时，页头页脚浮到它们上面，链接点得到。打开站点菜单时页头在最上层。
- `html, body { height: 100% }` 这类固定高度的页面，内容会溢出 body；页脚会被挪到内容之后，不会压在正文上。
- 在页头页脚里按键（Tab、Enter、方向键）不会触发漫画自己挂在 document 上的快捷键。

## 作者 HTML 怎么写最省事

- 完整的 HTML 文档、UTF-8 编码，`<html lang="zh-CN">` 写对语言，`<title>` 写成想要的标题。
- 版式写在 `body` 或内容容器上都可以，不要写在 `html` / `:root` 上（`html { padding }` 会推开站点页头页脚）。
- 页面高度用 `min-height: 100vh`，不要用 `height: 100%` 或 `100vh`：固定高度的 body 装不下内容时，内容会溢出 body 的盒子，body 自己的背景和边框只铺到第一屏。站点会把页脚挪到内容之后，但这只是补救。
- 页面本身要能滚动：`html, body { overflow: hidden }` 的全屏翻页式页面会让读者到不了页脚。
- 顶部固定栏用 `position: sticky` 而不是 `fixed`，否则在页面顶部时它会被站点页头盖住。
- 字体直接用 Google Fonts 的 CSS 链接，会被自动自托管；不要直接引用 fonts.gstatic.com 的字体文件。
- Material Icons / Material Symbols 图标字体留在 Google 加载，国内读者可能看到的是图标名文字（如 `arrow_forward`）。重要的图标用内联 SVG 或图片。
- 图片用相对路径，和 HTML 放在同一个文件夹里。脚本里写到的文件路径（如 `"img/p2.png"`）也会被复制；找不到文件时 `add` 会提示，不算错误。

## 草稿

`draft: true` 的漫画只在 `npm run dev` 里出现，不进列表、不生成页面。但仓库是公开的，草稿的 HTML、封面和字体文件仍然公开可见，草稿只是「不上架」，不是保密。

## 出问题时

- 连不上 Google Fonts：`add` 照常完成，页面暂时从 Google 加载字体（不阻塞渲染，国内会显示系统字体）；网络恢复后重跑 `npm run comic -- fonts <id>`。
- CDN 下载失败：页面继续从原地址加载那个脚本，`check` 会提示；网络恢复后重跑 `add`。
- `check` 报 missing asset：把缺的文件放到 HTML 旁边（或 `--assets` 目录）后重跑 `add`。
