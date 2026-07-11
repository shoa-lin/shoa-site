---
translationKey: "loop-engineering"
locale: "en"
title: "Loop Engineering"
description: "A breakdown of loop engineering's five components and external state, plus why verification, comprehension debt, and cognitive surrender remain the engineer's responsibility."
publishedAt: "2026-06-09"
updatedAt: "2026-06-09"
category: "development"
sourceLocale: "en"
sourceUrl: "https://addyosmani.com/blog/loop-engineering/"
sourceAuthor: "Addy Osmani"
contentType: "adaptation"
translationStatus: "reviewed"
---

**Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead.** A loop here can be understood as a recursive goal: you define the purpose, and the AI iterates until it is complete. I think this may be the future of how we work with coding agents. But it is still early, I remain skeptical, and you absolutely **must** be [careful](https://x.com/weswinder/status/2063700289710964906) about token costs because usage patterns change dramatically with the available token budget. So I want to unpack what loop engineering is and what it means.

---

Peter Steinberger recently [said](https://x.com/steipete/status/2063697162748260627): "You shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents." Similarly, Boris Cherny, head of Claude Code at Anthropic, [said](https://x.com/rohanpaul_ai/status/2063289804708835412): "I don't prompt Claude anymore. I have loops running that prompt Claude and figuring out what to do. My job is to write loops."

So what does any of that actually mean?

For roughly two years, getting something useful from a coding agent meant writing a good prompt and providing enough context. You typed something, read what came back, then typed the next thing. The agent was a tool you held throughout the process, one turn after another. That part is basically over, or at least some people think it is.

Now you build a small system that finds work, assigns it, checks it, records what is done, and decides what comes next. You let that system drive the agents instead of doing it yourself. I have written about two close relatives: [agent harness engineering](https://addyosmani.com/blog/agent-harness-engineering/), which designs the environment a single agent runs inside, and the [factory model](https://addyosmani.com/blog/factory-model/), the system that builds the software. Loop engineering sits one level above the harness. It is a harness that runs on a timer, spawns helpers, and feeds results into the next cycle.

What surprised me is that this is no longer really a tool-level concern. A year ago, if you wanted a loop, you wrote a pile of bash scripts, maintained them forever, and owned a one-off system no one else had. Now the pieces ship inside the products. Steinberger's list maps almost exactly to the Codex app, and nearly as closely to Claude Code. Once you see that the shape is the same, you stop arguing about tools and start designing a loop that works no matter which product it runs in.

## The five components, plus a note on state

A [loop](https://x.com/reach_vb/status/2063713960495558940) needs five things, plus somewhere to remember state. Here they are before we map them in detail.

1. **Automations** that run on a schedule and handle discovery and triage on their own.
2. **Worktrees** so two agents working in parallel do not step on each other's files.
3. **Skills** that record project knowledge the agent would otherwise have to guess.
4. **Plugins and connectors** that connect the agent to the tools you already use.
5. **Sub-agents** so one can propose a solution and another can check it.

Then there is a sixth element: memory. It might be a Markdown file, a Linear board, or anything else that outlives a single conversation and records what is done and what comes next. It sounds almost too simple to matter. But it is the same technique every long-running agent depends on, as I discussed in [long-running agents](https://addyosmani.com/blog/long-running-agents/): the model forgets everything between runs, so memory must live on disk rather than in the context. The agent forgets; the repo does not.

Both products now provide all five components.

| Primitive | Job in the loop | Codex app | Claude Code |
| --- | --- | --- | --- |
| **Automations** | Scheduled discovery + triage | [Automations tab](https://developers.openai.com/codex/app/automations): choose a project, prompt, cadence, and environment; results land in a Triage inbox; `/goal` provides run-until-done behavior | Scheduled tasks and cron, `/loop`, `/goal`, hooks, GitHub Actions |
| **Worktrees** | Isolate parallel features | Built-in worktree per thread | `git worktree`, `--worktree`, and `isolation: worktree` on a subagent |
| **Skills** | Codify project knowledge | [Agent Skills](https://developers.openai.com/codex/skills) (`SKILL.md`), invoked with `$name` or triggered implicitly | [Agent Skills](https://addyosmani.com/blog/agent-skills/) (`SKILL.md`) |
| **Plugins / connectors** | Connect your tools | Connectors (MCP) plus plugins for distribution | MCP servers plus plugins |
| **Sub-agents** | Develop and verify solutions | [Subagents](https://developers.openai.com/codex/subagents), defined as TOML in `.codex/agents/` | Subagents in `.claude/agents/`, plus agent teams |
| **State** | Track completed work | Markdown or Linear through a connector | Markdown (`AGENTS.md`, progress files) or Linear through MCP |

The names differ slightly, but the capabilities are the same. The details matter because they determine whether a loop holds together or quietly leaks everywhere.

## Automations: the heartbeat

Automations are what make a loop an actual loop instead of a run you performed once. In the Codex app, you create one in the Automations tab, choose the project, the prompt, the cadence, and whether it runs against a local checkout or a background worktree. Runs that find something enter the Triage inbox; runs that find nothing archive themselves. OpenAI uses automations internally for routine work such as daily issue triage, summarizing CI failures, writing commit briefings, and tracking down bugs introduced the week before. An automation can also call a skill, which keeps reusable behavior maintainable: trigger `$skill-name` instead of pasting a wall of instructions into a schedule no one will update.

Claude Code reaches the same destination through scheduling and hooks. You can use `/loop` to run a prompt or command at an interval, schedule cron tasks, use hooks to fire shell commands at specific moments in the agent lifecycle, or move the whole process into GitHub Actions so it continues after you close your laptop. The idea is identical: define an autonomous task, give it a cadence, and let findings come to you instead of checking every system yourself.

There is also an in-session primitive that gets closer to the core of this article. `/loop` repeats on a cadence. `/goal` keeps working until a condition you wrote is actually true. After every turn, a separate small model checks whether the condition has been met, so the agent that wrote the code is not grading its own work. Give it a condition such as "all tests in test/auth pass and lint is clean," then walk away. Codex has the same primitive, also called `/goal`: it continues across turns until a verifiable stop condition holds, with support for pause, resume, and clear. The same primitive exists in both tools, which is the pattern throughout this article.

That is the part that surfaces the work. The rest of the loop acts on it.

## Worktrees keep parallel work from becoming chaos

The moment you run more than one agent, files begin to collide. Two agents editing the same file create the same headache as two engineers changing the same lines without coordinating. A git worktree solves the mechanical problem: it is an independent working directory on its own branch that shares the repository history, so one agent's edits cannot touch another agent's checkout.

Codex builds worktree support directly into the app, allowing multiple threads to work on the same repository without modifying one another's checkout. Claude Code provides the same isolation through `git worktree`, a `--worktree` flag that opens a session in its own checkout, and an `isolation: worktree` setting for subagents that gives each helper a fresh checkout and cleans it up afterward. I wrote about the human side in [the orchestration tax](https://addyosmani.com/blog/orchestration-tax/): worktrees remove mechanical collisions, but **you** remain the ceiling. Your review bandwidth, not the tool, determines how many agents you can actually run.

## Skills stop you from re-explaining the project

A skill saves you from re-explaining the same project context in every session. Both tools use the same format: a folder containing `SKILL.md` with instructions and metadata, plus optional scripts, references, and assets. Codex runs a skill when you invoke it with `$` or `/skills`, or triggers it automatically when the task matches the skill description. That is why a concise, literal description beats a clever one. Claude Code works the same way, a pattern I described in [agent skills](https://addyosmani.com/blog/agent-skills/).

Skills are also where intent stops costing you repeatedly. In [intent debt](https://addyosmani.com/blog/intent-debt/), I argued that an agent begins every session cold and fills gaps in your intent with confident guesses. A skill externalizes that intent: conventions, build steps, and notes such as "we do not do it this way because of that incident." Write it once, and the agent reads it on every run. Without skills, the loop re-derives the project from zero in every cycle. With skills, project knowledge can accumulate across cycles.

One distinction matters: a skill is the authoring format, while a plugin is how you distribute it. When you want to share a skill across repositories or bundle several together, you package them as a plugin. That is true in both Codex and Claude Code.

## Plugins and connectors let the loop reach real tools

A loop that can only see the filesystem is a very small loop. Connectors, built on MCP, let the agent read your issue tracker, query a database, call a staging API, or send a message in Slack. Codex and Claude Code both support MCP, so a connector written for one will usually work in the other. Plugins bundle connectors and skills together, allowing a teammate to install the full setup at once instead of reconstructing it from memory.

This is the difference between an agent that says "here is the fix" and a loop that opens the PR, links the Linear ticket, and pings the channel when CI turns green. Connectors let the loop act inside your actual environment instead of merely describing what it would do if it had access.

## Sub-agents separate the maker from the checker

The most useful structural technique in a loop is separating the agent that writes from the agent that checks. A model is too generous when grading its own work. A second agent with different instructions, and sometimes a different model, can catch the things the first one talked itself into accepting.

Codex spawns subagents when you ask, runs them concurrently, and folds their results back into one answer. You define custom agents as TOML files in `.codex/agents/`, each with a name, description, instructions, and optional model and reasoning effort. That means a security reviewer can use a strong model at high effort while an explorer uses something fast and read-only. Claude Code does the same through subagents in `.claude/agents/` and agent teams that pass work between them. A common division in both tools is one agent to explore, one to implement, and one to verify against the specification.

I have made this case twice already: once in [the code agent orchestra](https://addyosmani.com/blog/code-agent-orchestra/) and again in [agentic code review](https://addyosmani.com/blog/agentic-code-review/). It matters especially inside a loop because the loop runs while you are not watching. A verifier you genuinely trust is what makes it possible to step away. Subagents do consume more tokens because each performs its own model and tool work, so spend those tokens where a second opinion is worth the cost. This is also the structure behind Claude Code's `/goal`: a fresh model decides whether the loop is done instead of the model that performed the work. The maker-checker split is applied to the stop condition itself.

## What a loop looks like

Put the pieces together and a single thread becomes a small control panel. Here is one pattern I keep using.

An automation runs against the repository every morning. Its prompt calls a triage skill that reads yesterday's CI failures, open issues, and recent commits, then writes its findings to a Markdown file or Linear board. For every finding worth pursuing, the thread opens an isolated worktree, sends one subagent to draft the fix, and sends a second subagent to review that draft against the project skill and existing tests.

Connectors let the loop open the PR and update the ticket. Anything the loop cannot handle lands in my triage inbox. The state file is the backbone of the system: it remembers what was attempted, what passed, and what remains open, so tomorrow morning's run can continue where today's stopped.

Look at what you actually did. You designed the process once. You did not prompt any of the individual steps. That is Steinberger's point made concrete, and it is the same loop in Codex and Claude Code because the components are the same.

## What the loop still cannot do for you

The loop changes the work; it does not remove you from it. Three problems become sharper as the loop improves, not easier.

**Verification is still your responsibility.** A loop running unattended can also make mistakes unattended. The reason for separating the verifier subagent from the maker is to give the loop's claim of "done" more weight. Even then, done is still a claim, not proof. I keep repeating the same line from [code review in the age of AI](https://addyosmani.com/blog/code-review-ai/): your job is to ship code you have confirmed works.

**Your understanding still degrades if you let it.** The faster the loop ships code you did not write, the wider the gap becomes between the system that exists and the system you actually understand. That is [comprehension debt](https://addyosmani.com/blog/comprehension-debt/). Unless you carefully read what the loop produces, a smooth loop only makes that debt grow faster.

**A comfortable posture is dangerous.** When the loop runs itself, it is tempting to stop forming judgments and accept whatever comes back. I call this [cognitive surrender](https://addyosmani.com/blog/cognitive-surrender/). Designing a loop with judgment can be the cure; designing one to avoid thinking accelerates the problem. The action looks the same, but the outcome is the opposite.

## Build the loop. Stay the engineer.

I think this is a preview of how our work will evolve. That said, if I stopped reviewing the code myself or relied entirely on automated loops to fix it, my product's quality would suffer. I would likely end up in a downward spiral, continuously digging a deeper hole.

So go ahead and build your loops, but remember that prompting your agents directly is still effective. The goal is to find the right balance.

Loops can also produce very different outcomes depending on the person using them. Two people can build the exact same loop and get opposite results. One uses it to move faster on work they understand deeply. The other uses it to avoid understanding the work at all. The loop does not know the difference. You do.

That is what makes loop design harder than prompt engineering, not easier. Cherny's point is not that the work became easier. The leverage point moved.

Build the loop. But build it like someone who intends to stay the engineer, not someone who only presses go.
