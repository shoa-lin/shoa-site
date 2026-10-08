---
name: comic-publish
description: Use when the owner sends a comic as an HTML file (or pasted HTML) to publish in the site's Comics section, to add another language edition of a comic, or to update an existing comic.
---

# Comic Publish

漫画模块的结构、命令和约定见 `src/comics/README.md`。本文件是收到漫画后的操作顺序。

## 前置条件

- 仓库根目录执行过 `npm ci` 和 `npx playwright install chromium`。
- 能访问 fonts.googleapis.com 和漫画用到的 CDN（只有 `npm run comic` 需要）。

## 收到一份漫画 HTML

1. 把 HTML 原样存进一个新的临时目录（`mktemp -d`），不要先手改；主人给了配图，就按 HTML 里的相对路径放在同一目录下。粘贴进对话的 HTML 同样先存成文件。
2. 定 `<id>`：小写英文和连字符，取主题的英文关键词，例如 `gpt-6-astra`。`src/comics/` 下已有同名文件夹，就是更新这部漫画。
3. 运行：

   ```bash
   npm run comic -- add <file.html> --id <id>
   ```

   列表标题看起来不对（太长、带系列名）时加 `--title`；简介要一两句话说清这部漫画讲什么，自动截取的不好就用 `--description`。

   `add` 先检查参数和输入，不通过时什么都不写；之后某一步失败（下载字体、截封面），修好原因后重跑同一条命令。
4. 逐条处理输出里的 warning 和 note：
   - `html { … }` 上的版式：挪到 `body` 或内容容器上，再重跑 `add`。
   - body 固定高度（`height: 100%` / `100vh`）：建议改成 `min-height`；不改也能用，页脚会被挪到内容之后。
   - 页面不能滚动、顶部固定栏：按提示改成可滚动或 `position: sticky`。
   - missing asset，或 note 里脚本提到但找不到的文件：向主人要文件。
   - module 脚本、外部嵌入、Material 图标字体：告诉主人国内可能打不开或显示成文字。
5. `npm run comic -- check <id>`，然后 `npm run build && npm run preview`，打开 `add` 最后一行打印的地址（原文不是中文时没有 `/comics/<id>/`），看 390px 和 1280px 宽度：页头、语言菜单、页脚、正文、漫画自己的交互（灯箱、按钮、快捷键）都要正常。

## 补其他语言

站点是八语（zh、en、ja、ko、th、fr、de、vi）。主人没说只要一种语言时，补齐其余七种：

- 每种语言一个独立子任务（可并行），输入是原文 HTML，输出是完整的译文 HTML。
- 只翻译可见文字和 `alt`、`title`、`aria-label`、`placeholder` 属性；HTML 结构、class、id、内联样式、`<script>`、`<pre>`/`<code>` 和英文 Prompt 原文一律不动；`<html lang>` 改成目标语言。
- 原文里指代「中文」的说法（如「中文解读」「中文漫画摘录」）改成指代目标语言。
- 地道、口语化，不要机翻腔；术语见 `docs/content/translation-glossary.md`。
- 每份译文：`npm run comic -- add <译文.html> --id <id> --locale <xx> --title "..." --description "..."`。图片和原文同名就直接复用，不用再给。
- 再派一个独立复核者逐段对照原文检查遗漏和误译；`check` 会提示结构数量不一致和残留中文。

## 上线

规矩来自 `homepage-bot-kit`（本机路径 `/workspace/个人主页维护员/homepage-bot-kit/AGENT.md`），要点：

1. 新建分支提交，不直接推 `main`，不 force-push。
2. `npm run verify` 全绿（e2e 会自动把每部漫画的每个语言都打开一遍）。
3. 开 PR，描述里写清改了什么、怎么验证的。合并要主人授权；主人明确说过「verify 全绿后直接上线」时，按 squash 合并。
4. 合并后等 GitHub Pages 部署完成，打开线上 `/comics/` 和这部漫画每个语言的地址确认。
5. 不碰 DNS、Cloudflare、自定义域名；不把密钥写进仓库。

## 出错时

- 连不上 Google Fonts 或 CDN：`add` 仍会完成，页面暂时从原地址加载（不阻塞渲染）；网络恢复后重跑 `npm run comic -- fonts <id>` 或 `add`。
- `check` 报 site-shell leftovers：HTML 是从线上页面另存的，重跑一次 `add` 会自动清理。
- `check` 提示有不再使用的生成文件：`npm run comic -- prune <id>` 先看清单，确认后再加 `--apply`（只删清单里的文件）。

## 不要做

- 不要手改 `src/comics/<id>/fonts/`、`assets.json`、`vendor.json`，以及 `public/comics/<id>/` 下的生成文件。
- 不要把漫画页面放进 `public/comics/<id>/index.html`；单篇页面由 Astro 从 `src/comics/` 生成。
- 不要改作者的视觉设计，除非是为了不和站点页头页脚冲突。
