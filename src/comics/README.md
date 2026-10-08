# 漫画模块

每部漫画是 `src/comics/<id>/` 下的一个文件夹，`<id>` 用小写英文和连字符，例如 `gpt-6-astra`。

| 文件 | 内容 |
| --- | --- |
| `comic.json` | 发布日期、更新日期、原文语言 `sourceLocale`、各语言版本的标题和简介，可选 `draft: true` |
| `<locale>.html` | 作者给的完整 HTML，原样保存，一个语言一份（zh、en、ja、ko、th、fr、de、vi） |
| `fonts/<locale>.css` | 自动生成的 `@font-face` 规则，不要手改 |

公开文件在 `public/comics/<id>/`：

| 目录 | 内容 |
| --- | --- |
| `fonts/<locale>/` | 按该语言版本实际用到的字符裁剪的字体子集（woff2） |
| `covers/<locale>.webp`、`.jpg` | 列表封面和分享预览图，从页面首屏自动截图 |
| `assets/` | 漫画用相对路径引用的图片等文件，用 `--assets` 复制进来 |

## 发布一部新漫画

```bash
npm run comic -- add /path/to/comic.html --id <slug>
npm run comic -- check <slug>
npm run build && npm run preview   # 打开 /comics/<slug>/ 看效果
npm run verify                     # 全绿后再提交
```

`add` 会依次做这些事：

1. 识别语言：读 `<html lang>`，识别不了时报错，用 `--locale zh` 指定。
2. 原样保存 HTML 到 `src/comics/<id>/<locale>.html`；如果是从线上页面另存的，会先去掉站点加上去的页头页脚等部件。
3. 写 `comic.json`：标题取 `<title>`，简介取 `<meta name="description">`，没有就取正文开头，需要人工过一眼；`--title`、`--description` 可以直接指定。第一次 `add` 的语言就是原文语言。
4. 打印风险提示，例如 body 上的布局样式、外部 CDN 脚本、缺少的相对路径资源。
5. 自托管字体：下载漫画用到的 Google Fonts，裁剪成只含页面实际字符的子集。中文、日文、韩文正文字体（Noto Sans SC 等）不下载，读者用自己的系统字体。
6. 截图生成封面。

常用参数：`--locale <xx>`、`--title "..."`、`--description "..."`、`--date 2026-10-08`、`--assets <目录>`、`--draft`（只在 `npm run dev` 里出现）。

改了某个语言的 HTML 之后，重跑同一条 `add`，或者单独重跑 `npm run comic -- fonts <id> --locale <xx>` 和 `npm run comic -- cover <id> --locale <xx>`。

## 多语言版本

每个语言是一份完整的翻译后 HTML，用 `--locale <xx>` 加进同一个 `<id>`。`check` 会对比各语言和原文的标题、图片、代码块数量，并提示残留的中文。列表页和语言切换只显示已有的语言；某个语言没有版本时，该语言的列表会链接到原文版本并标注出来。

## 网址

- 列表：`/comics/`（中文）、`/<locale>/comics/`
- 单篇：`/comics/<id>/`（中文）、`/<locale>/comics/<id>/`

## 站点替漫画做的事

- 作者的 `<style>` 和 `<script>` 原样保留，漫画页不加载主站样式表。
- `<title>`、description、canonical、hreflang、Open Graph、favicon 由站点按 `comic.json` 统一生成，作者 HTML 里的同类标签在构建时去掉。
- 页头（导航、语言切换、手机菜单）和页脚放在 shadow DOM 里：漫画的 CSS 改不到它们，它们的样式也不会漏进漫画。
- Google Fonts 已自托管时从页面里移除；还没自托管时改成不阻塞渲染的加载方式，避免国内打不开时整页空白。
- 相对路径资源改写到 `/comics/<id>/assets/`。

## 作者 HTML 怎么写最省事

- 完整的 HTML 文档，`<html lang="zh-CN">` 写对语言，`<title>` 写成想要的标题。
- 页面级布局（`max-width`、`padding`、`display: flex`）写在内容容器上，不要写在 `body` 上，否则会挤压站点页头页脚。
- 字体直接用 Google Fonts，会被自动自托管。
- 尽量不用外部 CDN 脚本和样式，国内可能加载不到。
- 图片用相对路径，和 HTML 一起给到 `--assets` 目录。
