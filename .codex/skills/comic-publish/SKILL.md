---
name: comic-publish
description: Use when the owner sends a comic as an HTML file (or pasted HTML) to publish in the site's Comics section, to add another language edition of a comic, or to update an existing comic.
---

# Comic Publish

漫画模块的结构、命令和约定见 `src/comics/README.md`。本文件是收到漫画后的操作顺序。

## 收到一份漫画 HTML

1. 把 HTML 原样存到临时目录（`mktemp -d`），不要先手改。有配图就一起放进同一目录的子文件夹。
2. 定 `<id>`：小写英文和连字符，取主题的英文关键词，例如 `gpt-6-astra`。已有同名文件夹就是更新这部漫画。
3. 运行：

   ```bash
   npm run comic -- add <file.html> --id <id> [--assets <dir>]
   ```

   语言从 `<html lang>` 识别；标题和简介从 HTML 取，标题去掉「漫画版」之类的后缀后更像列表标题时，用 `--title` 指定。简介要一两句话说清这部漫画讲什么。
4. 逐条看 warning：
   - body 上的布局样式：把作者写在 `body` 上的 `max-width`、`padding`、`display:flex` 挪到内容容器上，再重跑 `add`。
   - 外部脚本或样式：能本地化就下载到 `--assets`；做不到时告诉主人国内可能打不开。
   - 相对路径资源：缺文件就向主人要。
5. `npm run comic -- check <id>`，然后 `npm run build && npm run preview`，用浏览器看 `/comics/<id>/` 的手机宽度（390px）和桌面宽度：页头、语言菜单、页脚、正文都要正常。

## 补其他语言

站点是八语（zh、en、ja、ko、th、fr、de、vi）。主人没说只要一种语言时，补齐其余七种：

- 每种语言一个独立子任务（可并行），输入是原文 HTML，输出是完整的译文 HTML。
- 只翻译可见文字和 `alt`、`title`、`aria-label`、`placeholder` 属性；HTML 结构、class、id、内联样式、`<script>`、`<pre>`/`<code>` 和英文 Prompt 原文一律不动；`<html lang>` 改成目标语言。
- 原文里指代「中文」的说法（如「中文解读」「中文漫画摘录」）改成指代目标语言。
- 地道、口语化，不要机翻腔；术语见 `docs/content/translation-glossary.md`。
- 每份译文：`npm run comic -- add <译文.html> --id <id> --locale <xx> --title "..." --description "..."`。
- 再派一个独立复核者逐段对照原文检查遗漏和误译，`check` 会提示结构数量不一致和残留中文。

## 上线

1. `npm run verify` 全绿。
2. 按 `homepage-bot-kit` 规矩开 PR；主人明确说过直接上线时，verify 通过后合并。
3. 合并后等 GitHub Pages 部署完成，打开线上 `/comics/<id>/` 和 `/comics/` 确认。

## 不要做

- 不要手改 `src/comics/<id>/fonts/*.css`、`public/comics/<id>/fonts/`、`covers/`，它们由脚本生成。
- 不要把漫画放进 `public/comics/<id>/index.html`；单篇页面由 Astro 从 `src/comics/` 生成。
- 不要改作者的视觉设计，除非是为了不和站点页头页脚冲突。
