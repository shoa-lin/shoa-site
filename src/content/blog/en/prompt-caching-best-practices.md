---
translationKey: "prompt-caching-best-practices"
locale: "en"
title: "Lessons from Claude Code: Prompt Caching Is Everything"
description: "A structured adaptation of the Claude Code team's production lessons on stable prefixes, tools, model changes, and cache-safe compaction."
publishedAt: "2026-02-20"
updatedAt: "2026-02-20"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2024574133011673516"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

## Introduction

Engineers sometimes say that cache rules everything around them. The same is true for long-running agents.

Products such as Claude Code are economically viable because prompt caching lets later requests reuse computation from earlier turns. That reuse lowers latency and cost, especially as conversations grow.

## Claude Code's caching architecture

Claude Code is designed around Prompt Caching. A high prompt cache hit rate lowers operating costs and supports more generous subscription rate limits. The team monitors that rate closely enough that a serious drop can be treated as an incident.

The sections below capture the production lessons they learned while optimizing prompt caching at scale.

![Prompt Caching architecture diagram](https://pbs.twimg.com/media/HBipHa1boAAXD_A?format=jpg&name=large)

## How Prompt Caching works

### Prefix matching

Prompt Caching works through **prefix matching**. The API can reuse content from the beginning of a request through its cache breakpoints when that prefix is unchanged.

Order therefore matters: the more requests share the same beginning, the more cached work they can reuse.

### Claude Code's cache-friendly order

Claude Code uses a cache-friendly layout: **put stable content first and dynamic content last**.

Its request is organized roughly as follows:

1. **Stable system prompts and tools** (shared broadly)
2. **Project context** (shared within a project)
3. **Session context** (shared within a session)
4. **Conversation messages**

This arrangement increases the chance that requests and sessions share a reusable prefix.

### Why the order is fragile

The prefix can be broken by changes that look harmless. Examples include:

- putting a precise timestamp in a stable system prompt
- emitting tool definitions in a non-deterministic order
- changing tool parameters, such as which agents an agent tool can call

## Keeping the cache valid

### Updating stale information

Some prompt information naturally becomes stale: the date changes, a file is edited, or another piece of runtime state moves on.

Editing an earlier system prompt may look tidy, but it changes the prefix and causes a cache miss over everything that follows.

The Claude Code pattern is to send the update in a later message. For example, the next user message or tool result can include a `<system-reminder>` saying that it is now Wednesday. The old prefix remains reusable while the model still receives current information.

## The model-switching trap

### Caches are model-specific

Prompt caches are model-specific, which makes cost calculations less intuitive than they first appear.

If a conversation already contains 100k tokens cached for Opus, asking Opus one more simple question may cost less than switching to Haiku, because Haiku would need a new prompt cache for that history.

### Use a subagent for model handoffs

When another model is appropriate, Claude Code prefers a **subagent** handoff instead of changing the model for the existing conversation. Opus can prepare a compact task description for the other model.

The Explore agents are a common example: they can use Haiku without discarding the parent conversation's model-specific cache.

## Why tool changes are expensive

Changing the tool set in the middle of a conversation is another common way to destroy prompt cache reuse.

It can seem efficient to expose only the tools needed right now. In practice, tool definitions are part of the cached prefix, so adding or removing a tool invalidates the conversation prefix that follows them.

### Plan Mode: represent state without changing tools

Plan Mode shows how Claude Code designs features around this constraint.

The obvious implementation would replace the normal tool set with read-only tools when a user enters Plan Mode. That tool-schema change would break the cache.

Instead, Claude Code keeps the tools stable and includes `EnterPlanMode` and `ExitPlanMode` as regular tools. A later system message tells the agent that it is in Plan Mode: inspect the codebase, do not edit files, and call `ExitPlanMode` when the plan is complete. The tool definitions do not change.

Because `EnterPlanMode` is itself a tool, the model can also enter Plan Mode when it recognizes that a problem needs deeper planning, without invalidating the cached prefix.

### Tool Search: defer loading instead of removing tools

The same principle applies to Tool Search. Claude Code may have dozens of MCP tools available, but sending every full tool schema on every request would be expensive. Removing tools mid-conversation would still break the cache.

The solution is `defer_loading`. Claude Code sends stable, lightweight tool stubs marked with `defer_loading: true`. When needed, the model uses `ToolSearch` to load the full tool schema. The same stubs remain in the same order, preserving the prefix.

The API exposes `ToolSearch` so applications can use the same pattern.

## Compaction and caching

![Compaction and caching diagram](https://pbs.twimg.com/media/HBitEdRbUAMVSnM?format=jpg&name=large)

Compaction is what happens when a conversation approaches the context-window limit. The system produces a summary and continues with that smaller representation.

This creates several prompt-caching edge cases.

### The problem

To produce the summary, the model needs the conversation history. A naive implementation makes a separate request with different system prompts and no tools. That request no longer matches the main conversation's prefix, so all of those input tokens must be processed at full price.

### The solution: a cache-safe fork

Claude Code treats compaction as a cache-safe fork. The compaction request uses the same system prompts, user and system context, tool definitions, and conversation history as the parent request. It appends the compaction instruction as a new user message at the end.

From an input-prefix accounting perspective, the request shares the parent's prefix, tools, and history. The cached prefix can therefore be reused, so mainly only the input tokens for the newly appended compaction instruction need fresh processing. The model must still generate the summary, so that computation and its output tokens are still billed.

This also requires a compaction buffer: enough context-window capacity must remain for the appended compaction instruction and the summary the model will generate.

## Five lessons learned

Compaction is subtle, but the broader lessons apply to any agent built on Prompt Caching.

<div class="info-box">

**1. Prompt Caching is prefix matching**

Any change inside the prefix invalidates everything after it. Design the request around stable ordering from the start.

</div>

<div class="tip-box">

**2. Send updates as messages**

For changing dates, runtime state, or modes, append a message instead of rewriting earlier system prompts.

</div>

<div class="warning-box">

**3. Do not change models or tools mid-conversation**

Use handoffs for model changes, tools for state transitions, and deferred loading for large tool catalogs.

</div>

<div class="info-box">

**4. Monitor the prompt cache hit rate like uptime**

A few percentage points can materially affect cost and latency, so cache regressions deserve operational alerts.

</div>

<div class="tip-box">

**5. Forked work should preserve the parent prefix**

Compaction, summaries, and other side computations should reuse the parent's cache-safe request shape whenever possible.

</div>

## Conclusion

Claude Code was built around Prompt Caching from the beginning. The practical lesson is not that every agent must copy one exact layout, but that cache stability should be treated as a first-class architectural constraint.

---

> Structured adaptation of an X Article by Thariq Shihipar, drawing on the Claude Code team's production practices.

</div>
