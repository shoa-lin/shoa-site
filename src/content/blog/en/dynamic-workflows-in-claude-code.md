---
translationKey: "dynamic-workflows-in-claude-code"
locale: "en"
title: "A harness for every task: dynamic workflows in Claude Code"
description: "Claude Code can write and orchestrate a task-specific multi-agent harness on the fly."
publishedAt: "2026-06-02"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code"
sourceAuthor: "Thariq Shihipar, Sid Bidasaria"
contentType: "adaptation"
translationStatus: "reviewed"
---

Last week, we released [dynamic workflows](https://code.claude.com/docs/en/workflows) in Claude Code. Claude can now write its own [harness](https://code.claude.com/docs/en/glossary#agentic-harness) on the fly, custom-built for the task at hand.

> **Harness** refers to the control layer around an AI model, including prompt assembly, tool orchestration, context management, and error recovery. Claude Code can be understood as **Model + Harness**. This article keeps the term "harness" in English.

The default Claude Code harness is built for coding, but it is useful for many other tasks because many tasks turn out to resemble coding tasks. Certain classes of work, however, have required custom harnesses on top of Claude Code to reach peak performance, including [Research](https://support.claude.com/en/articles/11088861-using-research-on-claude), [security analysis](https://support.claude.com/en/articles/11932705-automated-security-reviews-in-claude-code), [agent teams](https://code.claude.com/docs/en/agent-teams), and [Code Review](https://code.claude.com/docs/en/code-review).

Workflows let Claude dynamically create those task-specific harnesses on top of Claude Code. They can also be saved, shared, and reused.

This article covers our early experiences and lessons from using workflows. Best practices are still developing: dynamic workflows often use more tokens and are best suited to complex, high-value tasks.

## Example prompts

Before diving into the technical details, here are several prompts that show the range of possibilities:

"This test fails maybe 1 in 50 runs. Set up a workflow to reproduce it. Form competing theories about the race, and don't stop until one theory survives the evidence."

"Using a workflow, go through my last 50 sessions, find corrections I keep making, and turn the recurring ones into `CLAUDE.md` rules."

"Use a workflow to dig through the past six months of #incidents in Slack and find recurring root causes where nobody has filed a ticket."

"Take my business plan and run a workflow where different agents tear it apart from an investor's, a customer's, and a competitor's perspective."

"Here's a folder of 80 resumes. Use a workflow to rank them for the backend role and double-check the top ten. Interview me with the AskUserQuestion tool to define the rubric."

"I need a name for this CLI tool. Use a workflow to brainstorm a wide range of options, then run a tournament to select the top three."

"Use a workflow to rename our User model to Account everywhere."

"Go through my blog post draft and verify every technical claim against the codebase with a workflow. I don't want to publish anything incorrect."

## How dynamic workflows work

Dynamic workflows execute a JavaScript file with a few special functions that spawn and coordinate [subagents](https://code.claude.com/docs/en/sub-agents):

![Diagram showing how a dynamic workflow spawns and coordinates subagents](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1684f559cc83ff4b465b_image1.png)

They also provide standard JavaScript objects such as JSON, Math, and Array for processing data.

A dynamic workflow can choose which model an agent uses and whether a subagent runs in its own worktree, allowing Claude to select the intelligence level and isolation appropriate to each step.

If a workflow is interrupted by user action or by quitting the terminal, resuming the session lets it continue from where it stopped.

## Why dynamic workflows

The default Claude Code harness has to plan and execute a task in the same context window. That works extremely well for many coding tasks, but it can break down during long-running, massively parallel, highly structured, or adversarial work.

The longer Claude works on a complex task in one context window, the more vulnerable it becomes to several failure modes:

- **Agentic laziness**: Claude stops before finishing a complex, multi-part task and declares success after partial progress, such as addressing only 35 of 50 findings in a security review.
- **Self-preferential bias**: Claude tends to favor its own results, especially when asked to verify or judge them against a rubric.
- **Goal drift**: fidelity to the original objective gradually erodes across many turns, especially after compaction. Each summarization step is lossy, so edge-case requirements and constraints such as "don't do X" can disappear.

A workflow counters these failure modes by orchestrating separate Claude subagents, each with its own context window and a focused, isolated goal.

## Dynamic vs static workflows

You may already have built a static workflow with the Claude Agent SDK or `claude -p` to coordinate multiple Claude Code instances.

Because static workflows must account for every edge case in advance, they tend to be generic. With [Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8) and dynamic workflows, Claude can instead write a custom harness tailored to the current use case.

![Comparison of static and dynamic workflows](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f3a0e17e2844bed86f22a_image9.png)

## Helpful patterns for dynamic workflows

You can start by simply asking Claude to create a dynamic workflow, or use the trigger word `ultracode` to make that intent explicit.

A mental model of the common patterns helps you recognize when workflows are useful and how to steer Claude through the prompt.

Claude can use and compose patterns such as these:

![Overview of common dynamic workflow patterns](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f16d86247e586b929a407_image10.png)

### Classify-and-act

Use a classifier agent to identify the task type, then route to different agents or behaviors. A classifier can also run at the end to determine how to handle the output.

### Fan-out-and-synthesize

Split a task into smaller steps, run an agent on each step, and synthesize the results. This is particularly useful when there are many steps or when each step benefits from a clean context window that prevents interference and cross-contamination. The synthesis step acts as a barrier: it waits for every fan-out agent, then merges their structured outputs into one result.

### Adversarial verification

For every agent that produces an output, spawn an independent agent to challenge that output against a rubric or explicit criteria.

### Generate-and-filter

Generate many ideas, filter them through a rubric or verification step, remove duplicates, and return only the strongest tested candidates.

### Tournament

Instead of dividing the work, have agents compete. Spawn N agents to attempt the same task with different approaches, then use a judge agent or model to compare results pairwise until one winner remains.

### Loop until done

For tasks with an unknown amount of work, keep spawning agents until a stopping condition is met, such as no new findings or no remaining errors in the logs, rather than choosing a fixed number of passes.

## Use cases

Think creatively about when to ask Claude Code for a dynamic workflow. Workflows can be even more useful for non-technical work than for coding.

### Migrations and refactors

[Bun](https://bun.com/) was rewritten from Zig to Rust with workflows. [Jarred's X thread](https://x.com/jarredsumner/status/2060050578026189172) explains how the team approached it.

The key is to break the migration into concrete units such as call sites, failing tests, or modules. Spawn a subagent in a worktree for each fix, have another agent review it adversarially, and then merge the changes. Tell agents to avoid resource-intensive commands when necessary so the machine can sustain more parallel work.

### Deep research

Claude Code includes a deep research skill, `/deep-research`, built with dynamic workflows. It fans out web searches, fetches sources, adversarially verifies their claims, and synthesizes a cited report.

The same pattern applies beyond web search. Claude can compile a status report from Slack context or investigate how a feature works by exploring a codebase in depth.

### Deep verification

![Deep verification workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1721824a27cf13da87f4_image2.png)

If you already have a report and want to check every factual claim, create a workflow in which one agent identifies the claims and a separate subagent investigates each one. Another verifier can assess whether every cited source is sufficiently reliable.

### Sorting

![Sorting workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f173ce727a972001584cc_image3.png)

Suppose you need to rank a list by a qualitative measure that Claude Code can evaluate, such as support tickets ordered by bug severity. Trying to sort more than 1,000 rows in one prompt will degrade quality and exceed the useful context. Instead, use a tournament, a pipeline of pairwise-comparison agents, or parallel bucket ranking followed by a merge. Comparative judgment is more reliable than absolute scoring, and each comparison gets an independent context window.

### Memory and rule adherence

![Memory and rule-adherence workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17517076bb59050d90bb_image8.png)

If Claude repeatedly misses a set of rules even when they are in `CLAUDE.md`, create a workflow with one verifier per rule. A skeptic subagent can review the rules themselves to reduce false positives.

The reverse also works: mine recent sessions and code review comments for recurring corrections, cluster them with parallel agents, adversarially test whether each candidate rule would have prevented a real mistake, and distill the survivors back into `CLAUDE.md`.

### Root-cause investigation

Debugging works best when several independent hypotheses are formed and tested. A single context window makes self-preferential bias more likely.

A workflow can prevent this structurally by assigning separate agents to disjoint evidence such as logs, files, and data. Each hypothesis can then face independent verifiers and refuters.

This pattern is not limited to code. It applies to sales analysis, data engineering failures, and any post-mortem investigation.

### Triaging at scale

![Large-scale triage workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1778dc00d34cca70819d_image6.png)

Every team has a support queue, bug reports, or another backlog that humans cannot process completely.

A triage workflow classifies each item, deduplicates it against what is already tracked, and takes the appropriate action, whether attempting a fix or escalating to a person.

Quarantine is a useful pattern here: agents that read untrusted public content are barred from high-privilege actions. Separate agents act on the resulting information.

Pair triage workflows with [`/loop`](https://claude.com/blog/getting-started-with-loops) to keep Claude running them continuously.

### Exploration and taste

Workflows are useful for exploring multiple solutions when the final choice depends on taste, such as design or naming, and can be expressed through a rubric.

Ask Claude to explore many options, then give a review agent a rubric for a good solution. The task ends when the reviewer finds that the criteria have been met. A tournament can also rank or select candidates against the rubric.

### Evals

Run lightweight evals by spawning independent agents in worktrees and comparison agents that grade their outputs against a rubric. This can be used to evaluate and refine a skill against specific criteria.

### Model and intelligence routing

Create a classifier agent tuned to the task and let it choose the model. This is useful when preliminary research and tool calls reveal how much intelligence the actual execution requires.

For example, the right model for "explain how the auth module works" depends on the size and shape of that module. A classifier can inspect it, then route the task to Sonnet or Opus based on the expected complexity.

## When not to use dynamic workflows

Workflows are new. They can produce outsized results, but they are not necessary for every task and may use significantly more tokens.

Use them when parallelism, specialization, or adversarial checks earn their coordination cost. Most conventional coding tasks do not need a panel of five reviewers. The same judgment applies at the architecture level when choosing between a [multi-agent and a single-agent system](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them).

## Tips for building dynamic workflows

### Prompting

Detailed prompts that name the relevant workflow patterns produce the best results.

Workflows are not limited to large tasks. You can ask for a "quick workflow," such as a short adversarial review of one assumption.

### Combine with `/goal` and `/loop`

For repeatable workflows such as triage, research, or verification, pair [`/loop`](https://claude.com/blog/getting-started-with-loops) with [`/goal`](https://code.claude.com/docs/en/workflows) to run at regular intervals and set a hard completion requirement.

### Token usage budgets

You can set an explicit token budget for a dynamic workflow. A prompt such as "use 10k tokens" sets a 10k-token cap for the task.

### Saving and sharing dynamic workflows

Press `s` in the workflow menu to save a workflow. You can check it into `~/.claude/workflows` or distribute it through a skill.

![Saving a workflow from the workflow menu](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17b1ca20533e666c867c_image4.png)

To share it through a skill, place the JavaScript workflow files in the skill folder and reference them in `SKILL.md`. For greater flexibility, tell Claude to treat the workflow as a template rather than a script that must be executed verbatim.

![Sharing a workflow through a skill](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17cb835cf4f9fd5da921_image7.png)

## A new starting point for discovery

Workflows are a useful new way to extend Claude Code. Treat them as a starting point for discovering new ways Claude can help with your work; there is still much to learn about using them well.

For guidance on what belongs in a harness, see Anthropic's [three harness design patterns](https://claude.com/blog/harnessing-claudes-intelligence).

---

*This article was written by Thariq Shihipar and Sid Bidasaria, members of technical staff at Anthropic working on Claude Code.*
