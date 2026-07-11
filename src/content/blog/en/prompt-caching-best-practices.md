---
translationKey: "prompt-caching-best-practices"
locale: "en"
title: "Prompt Caching best practices: Claude Code’s large-scale optimization experience"
description: "Summarize the engineering practices of Prompt Caching around cache boundaries, prompt word stability, and contextual organization."
publishedAt: "2026-02-26"
updatedAt: "2026-02-26"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://x.com/trq212/status/2024574133011673516"
sourceAuthor: "Claude Code Team"
contentType: "translation"
translationStatus: "draft"
---

<div class="blog-article-body">

## Introduction

In the engineering field, people often say "Cache Rules Everything Around Me", and this rule also applies to AI Agents.

Long-running Agent products like Claude Code are only possible thanks to Prompt Caching technology. It allows us to reuse calculation results from previous rounds, significantly reducing latency and cost.

So, what is Prompt Caching? How does it work? How to implement it technically?

## Claude Code’s caching architecture

At Claude Code, our entire framework is built around Prompt Caching. High hint cache hit rates reduce costs and help us provide more generous rate limits for subscription plans. Therefore, we set up monitoring alerts on the prompt cache hit rate and declare an SEV (Severe Event) when the hit rate gets too low.

Here are the (often counter-intuitive) lessons we learned from optimizing prompt caching at scale.

![Prompt Caching architecture diagram](https://pbs.twimg.com/media/HBipHa1boAAXD_A?format=jpg&name=large)

## How Prompt Caching works

### Prefix matching mechanism

Prompt Caching works via **prefix matching** — the API caches everything from the start of the request to each `cache_control` breakpoint.

This means: **The order in which you put things is important**, you want as many requests as possible to share the prefix.

### Best practice: static first, dynamic last

The best way is: **Static content is placed in the front and dynamic content is placed in the back**.

For Claude Code, this sequence is:

1. **Static System Tips and Tools** (Global Cache)
2. **Project context** (in-project cache)
3. **Session context** (in-session cache)
4. **Conversation Message**

This way we maximize the chance of shared cache hits between sessions.

### Fragile cache order

But this order can be surprisingly fragile! Reasons why we broke this order before include:

- Put detailed timestamps in static system prompts
- Non-deterministically shuffle tool definition order
- Update tool parameters (such as Agents that AgentTool can call)

## Keep cache valid

### Handling of outdated information

Sometimes the information you put in the prompt becomes outdated, such as the time or the user changing the file.

You may want to update the prompt, but this will cause cache misses, which will ultimately cost the user expensively.

**Better approach**: Consider whether this information can be delivered via message in the next round.

In Claude Code, we add a `<system-reminder>` tag with updated information (e.g. "It's Wednesday") on the next user message or tool result, which helps keep cache cached.

## Traps of model switching

### Caching is model specific

Prompt caching is model-specific, which makes costing Prompt Caching rather counter-intuitive.

**Scenario**: If you're already 100k tokens into a conversation with Opus and want to ask a relatively simple question, it's actually cheaper to have Opus answer it than to switch to Haiku — since we'd need to rebuild the prompt cache for Haiku.

### Sub-agent solution

If you need to switch models, the best way is to use a **subagent**, Opus will prepare a "handover" message to the other model describing the tasks that need to be completed.

We do this a lot in Claude Code’s Explore Agent, which uses Haiku.

## Impact of Toolset Changes

Changing toolsets in the middle of a conversation is one of the most common ways people break Prompt Caching.

This seems intuitive—you should only give the model the tools it needs right now. But because tools are part of the cache prefix, adding or removing tools invalidates the cache for the entire conversation.

### Plan Mode — Design around caching

Plan pattern is a great example of designing functionality around caching constraints.

The intuitive approach is this: when the user enters planning mode, the toggle toolset contains only read-only tools. But this will destroy the cache.

**Our approach**: We always keep all tools in the request and pass `EnterPlanMode` and `ExitPlanMode` as the tools themselves. When the user switches planning mode, the Agent receives a system message stating that it is in planning mode and what the instructions are — explore the code base, do not edit files, and call `ExitPlanMode` when the plan is complete. Tool definitions never change.

This has an added benefit: because `EnterPlanMode` is a tool that the model can call itself, it can enter planning mode autonomously when it detects a problem, without corrupting the cache.

### Tool Search — Delay rather than remove

The same principle applies to our tool search functionality. Claude Code can load dozens of MCP tools, and including them all in every request would be expensive. But removing them in the middle of a conversation breaks the cache.

**Our solution**: `defer_loading`. Instead of removing tools, we send lightweight stubs — just the tool names, with `defer_loading: true` – so that the model can "discover" them via the `ToolSearch` tool when needed. The complete tool architecture is only loaded on model selection. This keeps cache prefixes stable: the same stubs always exist in the same order.

Fortunately, you can simplify this process using the `ToolSearch` tool through our API.

## Compressed caching challenge

![Compression and caching diagram](https://pbs.twimg.com/media/HBitEdRbUAMVSnM?format=jpg&name=large)

Compaction is what happens when you run out of context windows. We summarize the conversation so far and use that summary to continue a new conversation.

Surprisingly, compression has many counter-intuitive edge cases when it comes to prompt caching.

### The problem

In particular, when we compress, we need to send the entire conversation to the model to generate a summary. If this were a separate API call, using a different system prompt and without tools (which is the simple way to do it), the cache prefix of the main conversation would not match at all. You need to pay full price for all these input tokens, dramatically increasing the cost to the user.

### Solution — Cache Safe Branches

When we run compression, we use the exact same system prompt, user context, system context, and tool definitions as the parent conversation. We add the parent conversation's message at the front and then append the compression prompt as a new user message at the end.

From an API perspective, this request looks almost identical to the last request of the parent conversation — same prefix, same tools, same history — so the cached prefix is ​​reused. The only new token is the compression hint itself.

But it does mean that we need to save a "compression buffer" so that we have enough space in the context window to contain the compressed message and digest output token.

## Five Core Principles

Minification is tricky, but luckily you don't need to learn these lessons yourself — based on our experience at Claude Code, we've built these capabilities directly into the API, so you can apply these patterns in your own applications.

<div class="info-box">

**1. Prompt Caching is prefix matching**

Any change anywhere in the prefix invalidates everything after it. Design the entire system around this constraint. Get the order right and most of the caching work is done automatically.

</div>

<div class="tip-box">

**2. Use messages instead of system prompts for changes**

You might want to edit the system prompts to do things like enter planning mode, change dates, etc., but it's actually better to insert these into messages within the conversation.

</div>

<div class="warning-box">

**3. Don’t change tools or models in the middle of a conversation**

Use tools to simulate state transitions (such as planning mode) rather than changing the toolset. Delay tool loading instead of tool removal.

</div>

<div class="info-box">

**4. Monitor cache hit rate as well as uptime**

We set alerts on cache outages and treat them as events. A few percentage points of cache hit rate can significantly impact cost and latency.

</div>

<div class="tip-box">

**5. Branch operations need to share the parent prefix**

If you need to run side calculations (compression, digest, skill execution), use the same cache-safe parameters to get cache hits on the parent prefix.

</div>

## Conclusion

Claude Code has been built around Prompt Caching from day one. If you are building an Agent, you should do the same.

---

>Original post on X (Twitter) @trq212
> Translation: Shoa Lin
> If there are any translation errors, please correct me

</div>
