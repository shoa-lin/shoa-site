---
title: "Pi：OpenClaw 内部的极简 Agent"
date: "2026-01-31"
source: "Armin Ronacher's Thoughts and Writings"
sourceUrl: "https://lucumr.pocoo.org/2026/1/31/pi/"
author: "Armin Ronacher"
tags: ["AI", "Pi", "OpenClaw", "Agent", "编程"]
---

<style>
.blog-article-body {
    font-size: 1.05rem;
    line-height: 1.8;
}
.blog-article-body h2 {
    margin-top: 2.5rem;
    margin-bottom: 1.25rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
}
.blog-article-body h3 {
    margin-top: 2rem;
    margin-bottom: 1rem;
}
.blog-article-body h4 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
}
.blog-article-body p {
    margin-bottom: 1.25rem;
}
.blog-article-body ul, .blog-article-body ol {
    margin-bottom: 1.5rem;
}
.blog-article-body li {
    margin-bottom: 0.5rem;
}
.blog-article-body blockquote {
    border-left: 4px solid #667eea;
    padding-left: 1rem;
    margin: 1.5rem 0;
    color: #4b5563;
}
.blog-article-body code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
}
.blog-article-body pre {
    background-color: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5rem 0;
}
.blog-article-body pre code {
    background-color: transparent;
    padding: 0;
}
.blog-article-body img {
    max-width: 100%;
    border-radius: 0.5rem;
    margin: 1.5rem 0;
}
</style>

<div class="blog-article-body">

*写于 2026 年 1 月 31 日*

如果你最近没有与世隔绝，你应该已经注意到本周我朋友 Peter 的一个项目在互联网上爆火了。它有很多名字。最新的一个是 **OpenClaw**，但在新闻中你可能会根据看到的时间称它为 **ClawdBot** 或 **MoltBot**。它是一个连接到你选择的通信通道的 Agent，只是运行代码而已。

你可能不太熟悉的是，OpenClaw 内部使用的是一个小型编码 Agent 叫 **Pi**。而 Pi 在这个阶段是我几乎专门使用的编码 Agent。在过去几周里，我越来越像是这个小 Agent 的推广者了。最近我做了一个关于这个的演讲后，我意识到我实际上还没有在这个博客上写过关于 Pi 的文章，所以我觉得我应该给出一些背景，说明为什么我对它如此着迷，以及它与 OpenClaw 的关系。

Pi 由 **Mario Zechner** 编写，与 Peter 不同——Peter 追求的是"带有疯狂色彩的科幻风格"——Mario 非常脚踏实地。尽管方法不同，但 OpenClaw 和 Pi 遵循相同的理念：**LLM 非常擅长编写和运行代码，所以要拥抱这一点**。在某种程度上，我认为这并非巧合，因为 Peter 在去年让我和 Mario 都迷上了这个想法和 Agent。

## 什么是 Pi？

所以 Pi 是一个编码 Agent。而现在有很多编码 Agent。真的，我认为你现在可以随意选择一个现成的，你都能体验到什么是 Agent 编程。在这个博客的评论中，我积极地谈论过 **AMP**，我与 AMP 产生共鸣的原因之一是，它真的感觉像是由那些既沉迷于 Agent 编程又尝试过各种方法来验证哪些方法有效的人构建的产品，而不仅仅是围绕它构建一个花哨的 UI。

Pi 对我来说很有趣，主要有两个原因：

- **首先，它有一个极小的核心。** 它有我所知道的任何 Agent 中最短的系统提示词，而且它只有四个工具：Read、Write、Edit、Bash。
- **其次，它通过提供一个扩展系统来弥补其核心的精简，这个系统还允许扩展将状态持久化到会话中，这非常强大。

还有一个额外的小优点：Pi 本身就像优秀的软件一样编写。它不闪烁，不消耗大量内存，不会随机崩溃，它非常可靠，是由一个非常注重软件内容的人编写的。

Pi 也是一组小组件的集合，你可以在此基础上构建自己的 Agent。这就是 OpenClaw 的构建方式，也是我构建自己的小 Telegram 机器人以及 Mario 构建他的 mom 的方式。如果你想构建自己的 Agent 并连接到某样东西，当你指向 Pi 自己和 mom 时，它会为你变出一个来。

## Pi 中没有什么

为了理解 Pi 中有什么，理解它**没有什么**、为什么没有，以及更重要的是：**为什么将来也不会有**，甚至更重要。

最明显的遗漏是 **对 MCP 的支持**。其中没有 MCP 支持。虽然你可以为此构建一个扩展，但你也可以做 OpenClaw 做的事情来支持 MCP，那就是使用 **mcporter**。mcporter 通过 CLI 接口或 TypeScript 绑定暴露 MCP 调用，也许你的 Agent 可以用它做点什么。或者不能，我不知道 :)

但这并不是懒惰的遗漏。这来自于 Pi 的工作理念。Pi 的整个理念是，如果你想让 Agent 做一些它还不会做的事情，你不会去下载扩展或技能之类的东西。你**要求 Agent 扩展自己**。它庆祝编写和运行代码的想法。

这并不是说不能下载扩展。这完全支持。但与其一定要鼓励你下载别人的扩展，你也可以让你的 Agent 指向一个已经存在的扩展，比如说，像你在那边看到的那样构建它，但做出你喜欢的这些改变。

## 为构建 Agent 的 Agent 而构建的 Agent

当你看看 Pi 以及延伸的 OpenClaw 在做什么时，有一个像粘土一样可塑的软件的例子。这对其底层架构设定了某些要求，实际上在很多方面对系统设定了某些约束，这些约束确实需要进入核心设计。

例如，Pi 的底层 AI SDK 编写得很好，一个会话可以真正包含来自许多不同模型提供者的许多不同消息。它认识到会话在模型提供者之间的可移植性是有限的，因此它不会过度依赖任何无法转移到另一个模型提供者的特定功能集。

其次，除了模型消息外，它还在会话文件中维护自定义消息，扩展可以用这些消息来存储状态，或者系统本身用它们来维护信息——要么完全不发送给 AI，要么只发送其中的一部分。

因为这个系统存在，并且扩展状态也可以持久化到磁盘，所以它内置了热重载，所以 Agent 可以编写代码、重新加载、测试它，并循环进行，直到你的扩展真正起作用。它还附带了 Agent 本身可以用来扩展自己的文档和示例。更好的是：Pi 中的会话是树。你可以在会话中分支和导航，这开启了各种有趣的可能性，比如能够启用工作流程，进行支线任务来修复损坏的 Agent 工具，而不会在主会话中浪费上下文。工具修复后，我可以将会话倒回到较早的时间，Pi 会总结在另一个分支上发生了什么。

这一切都很重要，因为例如如果你考虑 MCP 是如何工作的，在大多数模型提供者上，MCP 的工具（就像 LLM 的任何工具一样）需要在会话开始时加载到系统上下文或其工具部分。这使得在不完全破坏缓存或让 AI 对先前调用的工作方式不同感到困惑的情况下，完全重新加载工具可以做的事情变得非常困难甚至不可能。

## 上下文外的工具

Pi 中的扩展可以注册一个工具供 LLM 调用，偶尔我发现这很有用。例如，尽管我批评 Beads 的实现方式，但我确实认为给 Agent 提供待办事项列表的访问权限是非常有用的。我确实使用了一个本地工作的特定于 Agent 的问题跟踪器，我让我的 Agent 自己构建的。因为我还希望 Agent 也管理待办事项，在这种特殊情况下，我决定给它一个工具而不是 CLI。这对于问题的范围来说感觉是合适的，它目前是我加载到上下文中的唯一额外工具。

但大多数情况下，我添加到 Agent 的所有东西要么是技能，要么是 TUI 扩展，让与 Agent 一起工作对我来说更愉快。除了斜杠命令外，Pi 扩展可以直接在终端中渲染自定义 TUI 组件：微调器、进度条、交互式文件选择器、数据表、预览窗格。TUI 足够灵活，以至于 Mario 证明你可以在其中运行 Doom。不实用，但如果你能运行 Doom，你当然可以构建一个有用的仪表板或调试界面。

我想强调我的一些扩展，让你了解什么是可能的。虽然你可以不加修改地使用它们，但整个想法实际上是你让你的 Agent 指向其中一个并根据你的喜好进行混音。

### `/answer`

我不使用计划模式。我鼓励 Agent 提问，并且有一个富有成效的来回。但我不喜欢如果你给 Agent 一个问题工具时发生的结构化问题对话框。我更喜欢带有穿插解释和图表的 Agent 自然散文。

问题：内联回答问题会变得混乱。所以 `/answer` 读取 Agent 的最后回复，提取所有问题，并将它们重新格式化为一个漂亮的输入框。

![/answer 扩展显示问题对话框](https://lucumr.pocoo.org/static/pi-answer.png)

### `/todos`

尽管我批评 Beads 的实现，但给 Agent 一个待办事项列表确实很有用。`/todos` 命令将存储在 `.pi/todos` 中的所有项目作为 markdown 文件调出。Agent 和我都可以操作它们，会话可以认领任务将它们标记为进行中。

### `/review`

随着越来越多的代码由 Agent 编写，在 Agent 首先审查之前将未完成的工作扔给人类是没有意义的。因为 Pi 会话是树，我可以分支到一个新的审查上下文，获得发现，然后将修复带回主会话。

![/review 扩展显示审查预设选项](https://lucumr.pocoo.org/static/pi-review.png)

UI 以 Codex 为模型，它提供易于审查的提交、差异、未提交的更改或远程 PR。提示词关注我关心的事情，所以我得到了我想要的调用（例如：我要求它调用新添加的依赖项）。

### `/control`

我尝试但不积极使用的扩展。它让一个 Pi Agent 向另一个发送提示词。这是一个没有复杂编排的简单多 Agent 系统，对实验很有用。

### `/files`

列出会话中更改或引用的所有文件。你可以在 Finder 中显示它们，在 VS Code 中比较差异，快速查看它们，或在你的提示词中引用它们。`shift+ctrl+r` 快速查看最近提到的文件，当 Agent 生成 PDF 时这很方便。

其他人也构建了扩展：Nico 的子 Agent 扩展和交互式 Shell，让 Pi 在可观察的 TUI 覆盖层中自主运行交互式 CLI。

## 软件构建软件

这些都只是你可以用 Agent 做的事情的想法。主要观点是，这些都不是我写的，它是 Agent 根据我的规范创建的。我告诉 Pi 做一个扩展，它就做了。没有 MCP，没有社区技能，什么都没有。别误会，我使用大量技能。但它们是我的 clanker 手工制作的，而不是从任何地方下载的。例如，我完全用只使用 CDP 的技能替换了我所有的浏览器自动化 CLI 或 MCP。不是因为替代方案不起作用或不好，而是因为这只是简单和自然。Agent 维护自己的功能。

我的 Agent 有相当多的技能，关键是如果我不需要它们，我就扔掉技能。例如，我给它一个技能来读取其他工程师分享的 Pi 会话，这有助于代码审查。或者我有一个技能来帮助 Agent 制作我想要的提交消息和提交行为，以及如何更新变更日志。这些最初是斜杠命令，但我目前正将它们迁移到技能，看看这是否同样有效。我还有一个技能，希望能帮助 Pi 使用 `uv` 而不是 `pip`，但我还添加了一个自定义扩展来拦截对 `pip` 和 `python` 的调用，将它们重定向到 `uv`。

使用像 Pi 这样的极简 Agent 给我带来的部分魅力是，它让你生活在使用构建更多软件的软件的想法中。这走向极端时，就是当你移除 UI 和输出并将其连接到你的聊天时。这就是 OpenClaw 所做的，考虑到它的巨大增长，我真的越来越多地感觉这将以某种方式成为我们的未来。

</div>
