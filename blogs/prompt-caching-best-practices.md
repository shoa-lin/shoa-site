---
title: "Prompt Caching 最佳实践：Claude Code 的大规模优化经验"
date: "2026-02-26"
source: "X (Twitter) @trq212"
sourceUrl: "https://x.com/trq212/status/2024574133011673516"
author: "Claude Code Team"
tags: ["AI", "Claude", "Prompt Caching", "Agent", "性能优化", "API"]
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
    color: inherit;
}
.blog-article-body img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1.5rem 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.blog-article-body .warning-box {
    background-color: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 1rem;
    margin: 1.5rem 0;
    border-radius: 0.25rem;
}
.blog-article-body .tip-box {
    background-color: #d1fae5;
    border-left: 4px solid #10b981;
    padding: 1rem;
    margin: 1.5rem 0;
    border-radius: 0.25rem;
}
.blog-article-body .info-box {
    background-color: #dbeafe;
    border-left: 4px solid #3b82f6;
    padding: 1rem;
    margin: 1.5rem 0;
    border-radius: 0.25rem;
}
</style>

<div class="blog-article-body">

## 引言

在工程领域，人们常说 "Cache Rules Everything Around Me"（缓存决定一切），这条规则同样适用于 AI Agent。

像 Claude Code 这样的长时间运行的 Agent 产品之所以可行，归功于 **Prompt Caching**（提示缓存）技术。它允许我们重用之前轮次的计算结果，显著降低延迟和成本。

那么，什么是 Prompt Caching？它是如何工作的？在技术上又该如何实现？

## Claude Code 的缓存架构

在 Claude Code 中，我们的整个框架都是围绕 Prompt Caching 构建的。高提示缓存命中率能降低成本，帮助我们为订阅计划提供更慷慨的速率限制。因此，我们对提示缓存命中率设置了监控警报，当命中率过低时会宣布 SEV（严重事件）。

以下是我们从大规模优化 Prompt Caching 中学到的（往往反直觉的）经验教训。

![Prompt Caching 架构示意图](https://pbs.twimg.com/media/HBipHa1boAAXD_A?format=jpg&name=large)

## Prompt Caching 的工作原理

### 前缀匹配机制

Prompt Caching 通过**前缀匹配**工作 — API 会缓存从请求开始到每个 `cache_control` 断点之间的所有内容。

这意味着：**你放置内容的顺序非常重要**，你希望尽可能多的请求共享前缀。

### 最佳实践：静态优先，动态最后

最佳方式是：**静态内容放前面，动态内容放后面**。

对于 Claude Code，这个顺序是：

1. **静态系统提示和工具**（全局缓存）
2. **项目上下文**（项目内缓存）
3. **会话上下文**（会话内缓存）
4. **对话消息**

这样我们最大化了会话间共享缓存命中的机会。

### 脆弱的缓存顺序

但这种顺序可能出奇地脆弱！我们之前破坏这个顺序的原因包括：

- 在静态系统提示中放入详细的时间戳
- 非确定性地打乱工具定义顺序
- 更新工具参数（例如 AgentTool 可以调用的 Agent）

## 保持缓存的有效性

### 信息过时的处理

有时你放入提示的信息会过时，比如时间或用户更改了文件。

你可能想更新提示，但这会导致缓存缺失，最终让用户付出昂贵代价。

**更好的方法**：考虑是否可以在下一轮中通过消息传递这些信息。

在 Claude Code 中，我们在下一条用户消息或工具结果中添加一个带有更新信息的 `<system-reminder>` 标签（例如 "现在是周三"），这有助于保持缓存。

## 模型切换的陷阱

### 缓存是模型特定的

Prompt 缓存是针对特定模型的，这使得 Prompt Caching 的成本计算相当反直觉。

**场景**：如果你与 Opus 的对话已经进行了 100k tokens，想问一个相对简单的问题，实际上让 Opus 回答比切换到 Haiku 更便宜 — 因为我们需要为 Haiku 重建提示缓存。

### 子代理解决方案

如果需要切换模型，最好的方式是使用**子代理**，Opus 会准备一条"交接"消息给另一个模型，说明需要完成的任务。

我们在 Claude Code 的 Explore Agent 中经常这样做，它们使用 Haiku。

## 工具集变更的影响

在对话中间更改工具集是人们破坏 Prompt Caching 最常见的方式之一。

这看起来很直观 — 你应该只给模型它现在需要的工具。但因为工具是缓存前缀的一部分，添加或删除工具会使整个对话的缓存失效。

### 计划模式 — 围绕缓存设计

计划模式是围绕缓存约束设计功能的绝佳例子。

直观的方法是：当用户进入计划模式时，切换工具集只包含只读工具。但这会破坏缓存。

**我们的做法**：我们在请求中始终保持所有工具，并将 `EnterPlanMode` 和 `ExitPlanMode` 作为工具本身。当用户切换计划模式时，Agent 会收到一条系统消息，说明它处于计划模式以及指令是什么 — 探索代码库、不编辑文件、计划完成时调用 `ExitPlanMode`。工具定义从不改变。

这有一个额外好处：因为 `EnterPlanMode` 是模型可以自己调用的工具，它可以在检测到难题时自主进入计划模式，而不会破坏缓存。

### 工具搜索 — 延迟而非移除

同样的原则适用于我们的工具搜索功能。Claude Code 可以加载几十个 MCP 工具，在每个请求中包含所有工具会很昂贵。但在对话中间移除它们会破坏缓存。

**我们的解决方案**：`defer_loading`。我们不移除工具，而是发送轻量级存根 — 只有工具名称，带有 `defer_loading: true` — 模型可以在需要时通过 `ToolSearch` 工具"发现"它们。完整的工具架构只在模型选择时加载。这保持缓存前缀稳定：相同的存根始终以相同顺序存在。

幸运的是，你可以通过我们的 API 使用 `ToolSearch` 工具来简化这个过程。

## 压缩的缓存挑战

![压缩与缓存示意图](https://pbs.twimg.com/media/HBitEdRbUAMVSnM?format=jpg&name=large)

压缩是当你用完上下文窗口时发生的事情。我们总结到目前为止的对话，并用该摘要继续新的会话。

令人惊讶的是，压缩在 Prompt Caching 方面有许多反直觉的边缘情况。

### 问题所在

特别是，当我们压缩时，我们需要将整个对话发送给模型以生成摘要。如果这是一个单独的 API 调用，使用不同的系统提示且没有工具（这是简单的实现方式），主对话的缓存前缀完全不匹配。你需要为所有这些输入 token 付出全价，急剧增加用户的成本。

### 解决方案 — 缓存安全的分支

当我们运行压缩时，我们使用与父对话完全相同的系统提示、用户上下文、系统上下文和工具定义。我们在前面添加父对话的消息，然后在末尾附加压缩提示作为新的用户消息。

从 API 的角度来看，这个请求看起来与父对话的最后一个请求几乎相同 — 相同的前缀、相同的工具、相同的历史记录 — 因此重用了缓存的前缀。唯一的新 token 是压缩提示本身。

但这确实意味着我们需要保存一个"压缩缓冲区"，以便我们在上下文窗口中有足够的空间来包含压缩消息和摘要输出 token。

## 五条核心原则

压缩很棘手，但幸运的是，你不需要自己学习这些教训 — 基于我们在 Claude Code 中的经验，我们直接将这些功能构建到 API 中，因此你可以在自己的应用程序中应用这些模式。

<div class="info-box">

**1. Prompt Caching 是前缀匹配**

前缀中任何位置的任何更改都会使其后的所有内容失效。围绕这个约束设计整个系统。把顺序搞对，大部分缓存工作就自动完成了。

</div>

<div class="tip-box">

**2. 使用消息而不是系统提示更改**

你可能想编辑系统提示来做诸如进入计划模式、更改日期等事情，但实际上最好将这些插入到对话中的消息里。

</div>

<div class="warning-box">

**3. 不要在对话中间更改工具或模型**

使用工具来模拟状态转换（如计划模式），而不是更改工具集。延迟工具加载而不是移除工具。

</div>

<div class="info-box">

**4. 像监控正常运行时间一样监控缓存命中率**

我们对缓存中断设置警报，并将它们视为事件。缓存命中率的几个百分点可能会显著影响成本和延迟。

</div>

<div class="tip-box">

**5. 分支操作需要共享父级前缀**

如果你需要运行侧面计算（压缩、摘要、技能执行），使用相同的缓存安全参数，以便在父级前缀上获得缓存命中。

</div>

## 结语

Claude Code 从第一天起就是围绕 Prompt Caching 构建的。如果你正在构建 Agent，你也应该这样做。

---

> 原文发布于 X (Twitter) @trq212
> 翻译：Shoa Lin
> 如有翻译错误，欢迎指正

</div>
