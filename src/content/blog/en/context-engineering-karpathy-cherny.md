---
translationKey: "context-engineering-karpathy-cherny"
locale: "en"
title: "Context Engineering and Loop Engineering: Turn Prompts into a Running System"
description: "From Karpathy's context-window framing to Boris Cherny's engineering loops: agent quality depends on what it sees, how it verifies work, and how it retains experience."
publishedAt: "2026-07-08"
updatedAt: "2026-07-26"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/vartekxx/status/2074864291568664646"
sourceAuthor: "vartekx"
contentType: "adaptation"
translationStatus: "reviewed"
---

> This is a structured adaptation of [vartekx's article](https://x.com/vartekxx/status/2074864291568664646), not a line-by-line translation. Claims about people, products, and performance figures should be checked against the cited source.

## The conclusion first

A prompt is only a small part of an agent's input. Reliable delivery depends on the whole context system: which facts are visible for the current step, how history is selected and compressed, how sub-tasks are isolated, and whether an independent gate verifies the result.

Karpathy frames the context window as a new programming interface. Boris Cherny extends that idea into an engineering loop that runs repeatedly, verifies its work, and accumulates usable experience. The goal is not a longer prompt; it is a system that can keep doing the right thing.

- **Context engineering** answers what the model should know now.
- **Loop engineering** answers how that context keeps running, checking, and improving.
- **Verifiers** decide whether the system is actually learning rather than merely producing more output.
- **Persistent state** lets the next run inherit validated experience.

![Project rules, memory, skills, hooks, and learning records forming an agent context window](/assets/blog/context-engineering-karpathy-cherny/cover.jpg)

*Figure: Context-engineering architecture (vartekx, English image).*

## After prompting, context becomes the working environment

The same model can produce very different results with different context. It is not executing one sentence in isolation: it interprets the task, reads files, calls tools, processes previous results, and chooses the next action inside a finite working memory.

The useful questions are therefore:

1. Which facts, files, and constraints does this step really need?
2. Which older information is stale, duplicated, or noisy?
3. Which investigations must stay separate from the main task?
4. How is output checked independently instead of being self-certified by the same agent?

The article describes three layers: **prompt engineering** writes a good one-off instruction; **context engineering** designs the environment the model sees; **loop engineering** places that design inside an automated, repeatable execution cycle.

![The progression from prompt engineering to context engineering and loop engineering](/assets/blog/context-engineering-karpathy-cherny/three-layers.png)

*Figure: The three layers build on one another rather than replace one another (vartekx, English image).*

## The context window is working memory that must be orchestrated

Karpathy's analogy is practical: the model is a processor and the context window is its working memory. The task is not to pack in every document, but to put the right information there at the right moment.

![Multiple turns consuming a finite context window](/assets/blog/context-engineering-karpathy-cherny/context-window-program.jpg)

*Figure: Multi-turn input and output share a finite context window (vartekx, English image).*

Four operations make this manageable.

![System prompts, rules, memory, tools, history, and examples composing a context window](/assets/blog/context-engineering-karpathy-cherny/context-operations.png)

*Figure: The prompt written by a user is usually only a small fraction of the full context (vartekx, English image).*

**Write: keep reusable facts outside the window.**

Project conventions, commands, architectural decisions, debugging conclusions, and reusable scripts should not live only in one conversation. Store concise, searchable records so an agent can retrieve them when needed. Their value is not length; it is executability: tested commands, protected paths, interface invariants, and confirmed failure causes.

**Select: retrieve only what the current step needs.**

More context is not necessarily better context. When fixing an interface, load its entry point, callers, tests, contract, and recent failure—not unrelated directories, old discussions, or long logs. The hard problem is defining dependable retrieval boundaries, not enlarging the input.

**Compress: make history serve the next decision.**

Long tasks accumulate history. Compression should retain conclusions, constraints, failures, and next-step state while giving newer source, tests, and tool results priority. Without it, irrelevant tokens gradually dilute the signal even when the window size stays unchanged.

**Isolate: give sub-tasks a context firewall.**

Parallel investigation is useful only when it does not pollute the main task. An isolated sub-agent should return a structured, reviewable result; the coordinator keeps task boundaries, combines evidence, and resolves conflicts.

## Loop engineering turns those operations into a mechanism

The article cites Claude Code lead Boris Cherny: human work should move from repeatedly prompting an agent to designing loops that let it operate. Each run reads state, executes, checks, records the result, and starts the next run better informed.

![Manual prompting compared with a system that executes context and verification automatically](/assets/blog/context-engineering-karpathy-cherny/loop-context.png)

*Figure: “You are the engine” versus “the system is the engine” (vartekx, English image).*

A healthy loop repeatedly writes important state, selects only task-relevant state, summarizes obsolete execution history, and delegates independent work to isolated contexts. Context engineering is the recipe; loop engineering is the kitchen. Automation magnifies either disciplined selection or existing mistakes.

## A minimal loop that can be used in practice

Start with five components:

1. **Cadence and stop conditions** to avoid endless retries or premature completion.
2. **Project knowledge** containing short, verified constraints, commands, and known traps.
3. **Task isolation** between implementation and review, information gathering and decisions.
4. **Real connectors** to the code, tests, tickets, or CI state the task needs, with matched permissions.
5. **Independent verifiers** such as tests, type checks, builds, contract checks, or human approval.

The last component is easy to neglect. Without it, a loop may only keep agreeing with its own conclusions. Verification should come from outside the implementation step, or at least from a distinct context, standard, and role.

![A loop automating context writing, selection, compression, isolation, and verification](/assets/blog/context-engineering-karpathy-cherny/loop-building-blocks.png)

*Figure: Loop engineering automates context engineering (vartekx, English image).*

## Upgrade a prompt into a specification

A one-off prompt sounds like a wish: “refactor the authentication system.” An executable specification states the goal, scope, output, conflict handling, and stopping conditions. A migration task should name the directories in scope, protected areas, tests to add or update, when to escalate a conflict, and which checks must pass.

This does not mean turning project guidance into an encyclopedia. Keep durable rules compact and grounded in actual constraints, real failures, or reproducible verification needs.

![Context before and after editing to make room for useful information](/assets/blog/context-engineering-karpathy-cherny/claude-code-context-workflow.jpg)

*Figure: Selection and compression make room for useful context (vartekx, English image).*

## Accumulate experience, not chat transcripts

After a task, record a small number of action-oriented lessons: what worked, what failed, and what should be checked earlier next time. Repeated failures can then become project rules or automated checks.

This closes the loop: execution produces evidence; evidence becomes state; the next run reads that state selectively; verifiers continue to filter errors. Experience becomes runnable context rather than a long, scattered memory of conversations.

![Time and quality claims for specifications, accumulated context, and verification](/assets/blog/context-engineering-karpathy-cherny/self-improving-loop.png)

*Figure: The figures shown are the author's claims and have not been independently verified here (vartekx, English image).*

## Closing thought

Context engineering does not eliminate hallucinations, replace domain judgment, make more material better, or make unverified automation reliable. The durable idea is an engineering perspective: the context window is part of the program; loops make that program repeatable; and verification keeps repetition from scaling mistakes. Design the context first, build the loop second, and use independent evidence last.
