---
translationKey: "prompt-caching-best-practices"
locale: "zh"
title: "Claude Code 的 Prompt Caching：大规模实践经验"
description: "结构化整理 Claude Code 团队关于稳定前缀、工具、模型切换与缓存安全压缩的生产经验。"
publishedAt: "2026-02-20"
updatedAt: "2026-02-20"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2024574133011673516"
sourceAuthor: "Claude Code Team"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

## 引言

工程师有时会说，缓存决定着系统周围的一切。对长时间运行的 Agent 来说也是如此。

Claude Code 这类产品之所以在成本上可行，很大程度上依赖 Prompt Caching。后续请求可以复用前面轮次已经完成的计算，从而降低延迟和成本，尤其是在对话不断变长时。

## Claude Code 的缓存架构

Claude Code 从整体架构上围绕 Prompt Caching 设计。较高的 prompt cache hit rate 能降低运行成本，也让订阅方案可以提供更宽松的速率限制。团队会持续监控这一指标，严重下降时甚至会按事件处理。

下面结构化整理他们在大规模优化 Prompt Caching 时得到的生产经验。

![Prompt Caching 架构示意图](https://pbs.twimg.com/media/HBipHa1boAAXD_A?format=jpg&name=large)

## Prompt Caching 如何工作

### 前缀匹配

Prompt Caching 依赖**前缀匹配**。只要从请求开头到缓存断点之间的内容保持一致，API 就可以复用这段前缀已经完成的计算。

因此，内容顺序非常重要：越多请求共享相同的开头，可复用的缓存就越多。

### Claude Code 采用的缓存友好顺序

Claude Code 采用的方式是：**稳定内容放前面，动态内容放后面**。这是一种围绕其请求形态形成的缓存友好布局，而不是脱离场景的唯一“最佳方式”。

请求大致按以下顺序组织：

1. **稳定的 system prompts 和工具**（可广泛共享）
2. **项目上下文**（在同一项目内共享）
3. **会话上下文**（在同一会话内共享）
4. **对话消息**

这种排列提高了不同请求和会话共享可复用前缀的机会。

### 为什么这个顺序很脆弱

一些看似无害的变化也会破坏前缀，例如：

- 把精确时间戳写进稳定的 system prompt
- 以非确定顺序输出工具定义
- 改动工具参数，例如 Agent 工具能够调用哪些 Agent

## 保持缓存有效

### 更新已经过时的信息

提示中的一些信息自然会过时：日期发生变化、用户编辑了文件，或者其他运行时状态已经更新。

直接修改前面的 system prompt 看起来很整洁，但它会改变前缀，使其后的内容失去缓存命中。

Claude Code 的做法是把更新放进后续消息。例如，在下一条用户消息或工具结果中加入 `<system-reminder>`，说明“现在是周三”。这样既能把新信息交给模型，又能保留旧前缀的复用机会。

## 切换模型的陷阱

### 缓存与模型绑定

Prompt cache 与具体模型绑定，因此成本计算有时并不直观。

如果与 Opus 的对话已经积累了 100k tokens 的缓存，此时再问一个简单问题，让 Opus 回答可能比切换到 Haiku 更便宜，因为 Haiku 需要为这段历史重新建立 prompt cache。

### 用子 Agent 完成模型交接

确实需要使用其他模型时，Claude Code 更倾向于通过**子 Agent**交接，而不是替换现有对话的模型。Opus 可以为另一个模型准备一段紧凑的任务说明。

Explore Agent 是常见例子：它们可以使用 Haiku，同时不丢弃父对话已经建立的模型缓存。

## 为什么改动工具代价很高

在对话中途更改工具集，也是破坏 Prompt Caching 的常见原因。

只暴露当前需要的工具看起来更高效，但工具定义属于缓存前缀。增加或删除工具，都会让后续对话无法复用原来的前缀。

### Plan Mode：用状态表达，而不是改工具

Plan Mode 展示了 Claude Code 如何围绕缓存约束设计功能。

最直接的实现，是用户进入 Plan Mode 时把普通工具集替换成只读工具。但 full tool schema 一旦变化，缓存就会失效。

Claude Code 会保持工具定义稳定，把 `EnterPlanMode` 和 `ExitPlanMode` 也作为普通工具。随后追加一条系统消息，告诉 Agent 当前处于 Plan Mode：浏览代码库、不要编辑文件，并在计划完成时调用 `ExitPlanMode`。工具定义本身不变。

因为 `EnterPlanMode` 本身就是工具，模型识别到问题需要深入规划时，也可以自行进入 Plan Mode，而不会破坏缓存前缀。

### Tool Search：延迟加载，而不是移除工具

Tool Search 也遵循同一原则。Claude Code 可能接入几十个 MCP 工具，每次都发送全部 full tool schema 成本很高；但在对话中途移除工具仍会破坏缓存。

解决方案是 `defer_loading`。Claude Code 会发送稳定、轻量的工具存根，并标记 `defer_loading: true`。模型需要某个工具时，再通过 `ToolSearch` 加载它的 full tool schema。存根始终以相同顺序存在，因此前缀保持稳定。

API 也提供 `ToolSearch`，应用可以复用这一模式。

## Compaction 与缓存

![Compaction 与缓存示意图](https://pbs.twimg.com/media/HBitEdRbUAMVSnM?format=jpg&name=large)

Compaction 会在对话接近上下文窗口上限时发生：系统生成一份 summary，再用更小的表示继续对话。

这个过程会带来一些容易忽略的 Prompt Caching 边界情况。

### 问题所在

为了生成 summary，模型需要看到对话历史。一个简单但代价高的实现，是单独发起请求，改用不同的 system prompts，并且不携带工具。这样就无法匹配主对话的缓存前缀，所有 input tokens 都需要按完整成本重新处理。

### 解决方案：缓存安全的分支

Claude Code 把 compaction 当成一个 cache-safe fork。Compaction 请求沿用父请求相同的 system prompts、用户与系统上下文、工具定义和对话历史，只在末尾追加一条新的用户消息作为 compaction 指令。

从输入前缀的计算口径看，这个请求与父请求共享相同的前缀、工具和历史，因此可以复用已有缓存；主要只有新增 compaction 指令对应的 input tokens 需要重新处理。但 summary 仍需模型实际生成，因此这部分计算和 output tokens 仍会计费。

这还要求预留 compaction buffer：上下文窗口中必须有足够空间容纳追加的 compaction 指令和模型将生成的 summary。

## 五条经验

Compaction 的细节很复杂，但更广泛的经验适用于任何依赖 Prompt Caching 的 Agent。

<div class="info-box">

**1. Prompt Caching 本质上是前缀匹配**

前缀中的任何变化都会使其后的内容失效。系统从一开始就应围绕稳定顺序设计。

</div>

<div class="tip-box">

**2. 用消息传递更新**

日期、运行时状态或模式发生变化时，追加消息，而不是重写前面的 system prompts。

</div>

<div class="warning-box">

**3. 不要在对话中途更换模型或工具**

模型切换使用交接，状态切换使用工具，大型工具目录使用延迟加载。

</div>

<div class="info-box">

**4. 像监控可用性一样监控 prompt cache hit rate**

几个百分点的变化就可能明显影响成本和延迟，因此缓存回退值得配置运维告警。

</div>

<div class="tip-box">

**5. 分支任务应保留父级前缀**

Compaction、summary 和其他旁路计算，应尽可能复用父请求的缓存安全形态。

</div>

## 结语

Claude Code 从一开始就围绕 Prompt Caching 构建。实践中的重点不是照搬某一种固定布局，而是把缓存稳定性当作一等架构约束。

---

> 根据 @trq212 分享的 Claude Code 团队 X Article 结构化改写。

</div>
