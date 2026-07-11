---
translationKey: "dynamic-workflows-in-claude-code"
locale: "en"
title: "Create a unique harness for each task: dynamic workflow in Claude Code"
description: "Dynamically combine tools, context, and validation steps based on the task rather than cramming everything into a fixed process."
publishedAt: "2026-06-03"
updatedAt: "2026-06-03"
category: "development"
sourceLocale: "zh"
sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code"
sourceAuthor: "Thariq Shihipar, Sid Bidasaria"
contentType: "translation"
translationStatus: "draft"
---

Last week, we launched dynamic workflow in Claude Code. Claude can now write his own harness on the fly, tailored to the task at hand.

> **Harness**: refers to all peripheral control layers in the AI ​​agent except the model itself - including prompt assembly, tool scheduling, context management, error recovery, etc. Claude Code can be understood as **Model + Harness**. The words "harness" below are not translated.

Claude Code's default harness is built for coding, but it's equally useful for many other types of tasks, as it turns out that many tasks are inherently similar to coding tasks. But for some specific categories of tasks, we have to build custom harnesses on top of Claude Code to achieve optimal performance, such as research, security analysis, agent team collaboration, or code review.

Workflow allows you to dynamically create harnesses built on top of Claude Code, allowing Claude to solve all of these problems more natively. You can also share and reuse these workflows with others.

In this article, I’ll share my initial experiences and insights with workflows to help you get the most out of them. Keep in mind that best practices are still evolving: dynamic workflows generally consume more tokens and are best suited for complex, high-value tasks.

## Example prompt

Before getting into the technical details, I want to start with a few example prompts to get you thinking about workflow possibilities:

"This test will fail approximately 1 time in 50 runs. Set up a workflow to reproduce it. Form competing hypotheses about race conditions, and don't stop until a hypothesis is tested by evidence."

"Using a workflow, go through my last 50 sessions, dig out the fixes I keep making over and over again, and turn the recurring ones into `CLAUDE.md` rules."

"Use a workflow to dive into the past six months of content in Slack's #incidents channel to identify recurring root causes of unsubmitted tickets."

"Take my business plan, run a workflow, and let different agents find faults from the perspectives of investors, customers, and competitors."

"Here is a folder with 80 resumes, use a workflow to rank them for backend positions and review the top 10. Use the AskUserQuestion tool to interview me based on the scoring criteria."

"I need a name for this CLI tool. Use a workflow to brainstorm a bunch of options, then run a tournament to pick the top 3."

"Use a workflow to rename our User model to Account, covering all occurrences of it."

"Going through my blog draft and using workflow to verify every technical statement against the code base, I don't want to publish anything with errors."

## How Dynamic workflow works

Dynamic workflow executes a JavaScript file that contains several special functions for generating and coordinating subagents:

![Dynamic workflow execution diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1684f559cc83ff4b465b_image1.png)

Dynamic workflow also includes standard JavaScript functions such as JSON, Math, and Array to help process data.

Of particular note, the dynamic workflow can decide which model the agent uses and whether the subagent runs in its own worktree, allowing Claude to choose the level of intelligence and isolation required.

If the workflow is interrupted (such as by user action or exiting the terminal), resuming the session will allow the workflow to continue execution from where it left off.

## Why do we need dynamic workflow?

When you ask Claude Code's default harness to perform a task, it needs to be planned and executed simultaneously in the same context window. This is very efficient for many coding tasks, but can be problematic in long-running, massively parallel, highly structured, and/or adversarial tasks.

This is because the longer Claude works on complex tasks in a single context window, the more likely he is to experience certain failure modes:

- **Agentic laziness** refers to Claude stopping before completing a particularly complex multi-part task and declaring the task complete after only completing part of the progress, such as only working on 35 out of 50 items in a security review.
- **Self-preferential bias** refers to Claude's tendency to favor his own results or findings, especially when asked to verify or judge his own work against rubrics.
- **Goal drift** refers to the gradual deviation from the original goal over multiple rounds of dialogue, especially after compaction. Each digest step is lossy, edge case requirements or constraints like "don't do X" may be lost.

Creating workflows helps address these issues by orchestrating Claude subagents, each with their own independent context window and focused, isolated goals.

## Dynamic workflow vs Static workflow

You may have previously created a static workflow using the Claude Agent SDK or `claude -p` to coordinate multiple instances of Claude Code.

But since static workflows need to deal with all edge cases, they are usually more general. With Claude Opus 4.8 and dynamic workflow, Claude is now smart enough to write tailor-made harnesses for your specific use cases.

![Static workflow vs. Dynamic workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f3a0e17e2844bed86f22a_image9.png)

## Common patterns of Dynamic workflow

You can directly ask Claude to create a dynamic workflow, or use the trigger word "`ultracode`" to ensure that Claude Code creates the workflow.

But building a mental model of how dynamic workflows work will help you understand when to use them and how to guide Claude through prompts.

Here are a few common patterns that Claude might use and combine when building workflows:

![Overview of Common Workflow Patterns](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f16d86247e586b929a407_image10.png)

### Classify-and-act (action after classification)

Use a classification agent to determine the task type, and then route to different agents or behaviors based on the task. Alternatively, use a classifier at the end to determine the output.

### Fan-out-and-synthesize (synthesize after fan-out)

Split the task into many smaller steps, run an agent on each step, and synthesize the results. This is particularly useful when there are a large number of smaller steps, or when each step benefits from its own independent context window to avoid interfering with each other or cross-contamination. The synthesis step is a barrier - it waits for all fan-out agents to complete and then merges their structured outputs into a single result.

### Adversarial verification (adversarial verification)

For each generated agent, run an independent agent to adversarially validate its output against rubrics or criteria.

### Generate-and-filter (filter after generation)

Generate a large number of ideas for a topic, then filter them through rubric or validation, removing duplicates and returning only the highest quality tested ideas.

### Tournament

Instead of dividing the work, let the agents compete. Generate N agents, each trying the same task in different ways. Then use the judging agent through prompts or models to judge the results in a pairwise showdown until a winner is found.

### Loop until done

For tasks with unknown workloads, agents are spawned in a loop until a stopping condition is met (no new discoveries, or no more errors in the log), rather than a fixed number of iterations.

## Usage scenarios

Think creatively about when and how to let Claude Code create dynamic workflows. I find workflow sometimes even more useful for non-technical work.

### Migration and Refactoring

Bun was rewritten from Zig to Rust using workflow. You can read more details in Jarred’s X post.

The key is to break down the task into a series of steps that need to be addressed, such as call points, failing tests, modules, etc. For each fix, start a subagent in a worktree to perform the fix, then have another agent adversarially review them, and finally merge them. Consider telling the agent not to use resource-intensive commands so that you can maximize parallelism without exhausting resources on the machine.

### In-depth research

We have released a deep research skill (`/deep-research`) in Claude Code, which uses dynamic workflow. Specifically, it fans out a web search, obtains sources, adversarially verifies their claims, and then comprehensively generates a report with citations.

But you may need this kind of research for more than just web searches. For example, have Claude compile a status report from context in Slack, or explore how a feature works by drilling down into the code base.

### In-depth verification

![Depth verification workflow diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1721824a27cf13da87f4_image2.png)

On the other hand, if you have a report and want to inspect and trace every fact statement referenced in it, you might want to generate a workflow: an agent identifies all fact statements, and then launches a subagent for each statement to inspect it in detail. You can also have a verification agent check the source subagent to ensure that its source is of reliable quality.

### Sort

![Sorting workflow diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f173ce727a972001584cc_image3.png)

You might have a set of projects that you want to sort by some qualitative metric that you think Claude Code is good at measuring, for example: sorting support tickets by bug severity. But if you try to sort 1000+ rows in a prompt, the quality will degrade and it won't fit into context. Instead, you can run a tournament, a pipeline that compares agents pairwise (comparative judgments are more reliable than absolute scores), or buckets, sorted in parallel, and then merged. Each comparison is an independent agent, so the deterministic loop holds the alignment list and only the running order remains in the context.

### Memorization and Rule Following

![Memory and rule-following workflow diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17517076bb59050d90bb_image8.png)

If you have a specific set of rules that you find Claude often misses or has difficulty complying with, even if written into `CLAUDE.md`, you can create a workflow that lists the rules that must be checked by a validation agent - one validator per rule. Creating a subagent with a skeptic role to review the rules to ensure they make sense can help avoid too many false positives.

The reverse operation also works: mine your recent sessions and code review comments for recurring fixes, cluster them with a parallel agent, adversarially validate each candidate rule (did this rule prevent a real bug?), and refine the survivors back into `CLAUDE.md`.

### Root cause investigation

Debugging works best when you come up with multiple independent hypotheses and test them one by one, but if you only use one context window, Claude may encounter self-preferential bias.

Workflows can structurally prevent this by initiating agents to generate hypotheses from non-overlapping evidence. For example, separate agents for logs, files, and data. Each hypothesis then faces a set of verifiers and refutations.

This doesn't just apply to code. Workflow can be used for sales (Why did sales drop in March?), data engineering (Why did this pipeline fail?), or any post-mortem analysis.

### Large-scale triage

![Large-scale triage workflow diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1778dc00d34cca70819d_image6.png)

Every team has a backlog of support queues, bug reports, or other work that cannot be fully handled by humans.

The triage workflow categorizes each item, deduplicates tracked content, and takes action. This may mean trying to fix it or escalating the problem to manual handling.

A useful pattern for triage workflow is quarantine. This involves prohibiting agents that read untrusted public content from performing high-privilege operations that are performed by agents responsible for acting on the information.

Pair the triage workflow with `/loop` to keep Claude executing.

### Exploration and aesthetic judgment

Workflow is useful when exploring different approaches to a solution, especially when the choice is based on aesthetics, such as design or naming, and can benefit from rubrics.

Try letting Claude explore a bunch of solutions and give the review agent a rubric that a good solution should have. When the review agent determines that the criteria are met, the task is completed. Solutions can also be sorted or selected by tournament based on rubric.

### Eval

You can run lightweight evals for specific tasks by starting a standalone agent in a worktree and then starting a comparison agent to compare and rate specific outputs against rubrics. For example, evaluate and improve the skills you create based on specific criteria.

### Model and smart level routing

Create a classification agent tuned for your task and decide which model to use. This is helpful when your task will involve a lot of tool calls and research before execution can determine the best model.

For example, the best model for the task "Explain how the auth module works" depends on how many files there are in the auth module and the structure of the code base. A triage agent can conduct this research and then route to Sonnet or Opus based on the expected complexity of the task.

## When not to use dynamic workflow

Workflow is a new feature. While many use cases will produce unexpected results, they are not required for every task and may end up consuming significantly more tokens.

It's best to use workflow creatively to push Claude Code in ways you haven't tried before. For regular coding tasks, ask yourself: does it really require more calculations? For example, most traditional coding tasks do not require a panel of 5 reviewers.

## Tips for building dynamic workflow

### Prompting

Detailed prompting using the specific techniques we described above will give you the best results for dynamic workflows.

Workflow isn't just for large tasks. You can prompt models using the "quick workflow". For example, you can conduct a quick adversarial review of a hypothesis.

### Used with `/goal` and `/loop`

When using repeatable workflows (such as triage, research, or validation), pair them with `/loop` to run periodically, and `/goal` to set hard completion conditions.

### Token usage budget

You can set an explicit token usage budget for dynamic workflow to limit the number of tokens consumed by tasks. You can set the budget with a prompt like this: "Use 10k tokens", which will set the upper limit.

### Save and share dynamic workflow

You can save a workflow by pressing "s" in the workflow menu. You can submit them to `~/.claude/workflows` or distribute them via skills.

![Save workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17b1ca20533e666c867c_image4.png)

To share via a skill, place your JavaScript workflow files in the skill folder and reference them in `SKILL.MD`. For more flexibility, you may want to prompt Claude to treat the workflow in the skill as a template rather than a script that needs to be executed verbatim.

![Share workflow via skill](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17cb835cf4f9fd5da921_image7.png)

## A new starting point for exploration

Workflow is a helpful new way to extend Claude Code. I encourage you to consider them as a starting point to explore new ways to use Claude to help complete tasks. There is still much to be discovered about how best to use them. Tell me what you found.

---

*This article was written by Thariq Shihipar and Sid Bidasaria, technical team members at Anthropic who work on the Claude Code team. *
