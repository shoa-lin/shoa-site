---
translationKey: "loop-engineering"
locale: "en"
title: "Loop Engineering"
description: "Design a continuously improving Agent loop starting from goals, observations, feedback, stopping conditions, and safety boundaries."
publishedAt: "2026-06-09"
updatedAt: "2026-06-09"
category: "development"
sourceLocale: "zh"
sourceUrl: "https://addyosmani.com/blog/loop-engineering/"
sourceAuthor: "Addy Osmani"
contentType: "translation"
translationStatus: "draft"
---

**Loop engineering is using a design system to replace yourself as the prompt agent. ** The loop here can be understood as a recursive goal - you define a goal, and the AI ​​iterates until it is completed. I think this may be the future of how we collaborate with coding agents. It's still early, I'm skeptical, and you absolutely **must** pay attention to the token cost (usage patterns vary greatly depending on how token-rich you are), so I wanted to break down what it is and what it means.

---

Peter Steinberger recently said: "You should no longer manually prompt Claude code agents. You should design loops to prompt your agents." Similarly, Boris Cherny, head of Anthropic Claude Code, said: "I don't prompt Claude anymore. I have loops running that prompt Claude and figure out what to do. My job is to write the loops."

Okay, what does any of this really mean?

For about two years, the way you got output from a coding agent was to write a good prompt and share enough context. You enter something, what is read back, and then enter the next thing. The agent is a tool, and you hold it every step of the way, round after round. This part is basically over, or at least that's what some people think.

Now you build a small system to discover work, assign work, check work, record completion, and then decide the next step, you let this system drive the agent instead of you. I've written before about its close cousins ​​- agent harness engineering, the environment in which a single agent runs, and the factory model - the system for building software. Loop engineering sits one level above the harness. It's a harness, but it runs on a timer, spawns helpers, and feeds itself.

To my surprise, this isn't a tool level thing anymore. A year ago, if you wanted a loop, you wrote a bunch of bash scripts and maintained that thing forever, and it was yours and yours alone. These components are now built directly into the product. Steinberger's list corresponds almost exactly to the Codex app, and then almost equally to Claude Code. Once you notice that the shapes are the same, you're no longer debating which tool to use, you're just designing a loop that will work no matter which tool it's sitting in.

## Five components, and some instructions

A loop requires five things, plus a place to remember state. Let me list them first and then go through them one by one.

1. **Automations**, run automatically according to plan, complete discovery and triage by themselves.
2. **Worktrees**, so that two agents working in parallel will not step on each other's feet.
3. **Skills**, write down project knowledge so that the agent no longer has to guess.
4. **Plugins and connectors**, connect the agent to the tools you are already using.
5. **Sub-agents**, let one be responsible for coming up with the plan, and the other is responsible for checking.

Then comes the sixth thing - memory. A markdown file, or a Linear panel, anything that lives beyond a single conversation and records what's been done and what's to be done. It sounds too simple to be worth mentioning. But this is the same trick that every long-running agent relies on - I discuss it in detail in long-running agents , the model forgets everything between runs, so the memory has to be on disk rather than in the context. The agent will forget, but the repo will not.

Both products now have these five components.

| Primitives | Responsibilities in Loop | Codex app | Claude Code |
| --- | --- | --- | --- |
| **Automations** | Scheduled discovery + triage | Automations tab: Select project, prompt, frequency, environment; results enter Triage inbox; `/goal` implements running until completion | Scheduled tasks and cron, `/loop`, `/goal`, hooks, GitHub Actions |
| **Worktrees** | Isolated parallel feature | Built-in worktree for each thread | `isolation: worktree` of `git worktree`, `--worktree`, subagent |
| **Skills** | Solidified project knowledge | Agent Skills (`SKILL.md`), called through `$name` or triggered implicitly | Agent Skills (`SKILL.md`) |
| **Plugins/connectors** | Connect your tools | Connectors (MCP) + plugins for distribution | MCP servers + plugins |
| **Sub-agents** | Solution development and verification | Define subagent in TOML in `.codex/agents/` | Subagent, agent teams in `.claude/agents/` |
| **State** | Track completed work | markdown or Linear via connector | markdown (`AGENTS.md`, progress file) or Linear via MCP |

The names are slightly different here and there, but the abilities are the same thing. Let me go through them one by one, because honestly, the details are what determine whether a loop is solid or quietly leaking here and there.

## Automations, this is the heartbeat

Automation is what makes a loop a real loop rather than a single run that you only do once. In the Codex app, you create one in the Automations tab, select the project, the prompt to run, how often, and whether to run it on a local checkout or a background worktree. Runs that find problems go into the Triage inbox, and runs that find nothing are automatically archived, which is a nice touch. OpenAI uses them internally to do boring things, such as daily issue triage, summarizing CI failures, writing commit briefings, and tracking down bugs introduced by someone last week. And automation can call skills, so you keep reusable things maintainable, you trigger `$skill-name` instead of sticking a bunch of instructions into a plan that no one will update.

Claude Code gets to the same place via dispatch and hooks. You can use `/loop` to run a prompt or command at intervals, you can schedule cron tasks, you can use hooks to trigger shell commands at specific moments in the agent lifecycle, or just push the whole thing to GitHub Actions if you want it to continue running after you close your laptop. The exact same idea - you define an autonomous task, give it a frequency, and problems found will come to you, and you don't need to check everywhere by yourself.

There is another intra-session primitive worth knowing about that is closer to the heart of this article. `/loop` runs repeatedly in rhythm. `/goal` continues to run until the conditions you wrote are actually true. After each round, a small independent model checks whether you have completed it, so the agent who writes the code is not the one who scores himself. You give it conditions like "all tests in test/auth pass and lint is clean" and then walk away. Codex has the same thing, also called `/goal`, which works continuously across turns until a verifiable stopping condition is met, supporting pause, resume and clear. The same primitives, two tools, this is also the pattern of the entire article.

So this is the discovery part. The rest of the loop is to act on it.

## Worktrees, keep parallelism from becoming chaos

The moment you run more than one agent, files start to conflict, and that's the point of failure. Two agents write the same file, submit the same line of code to two engineers, and neither one says hello to the other. It’s the exact same headache. git worktree solves it - it's a separate working directory on a separate branch that shares the same repo history, so it's literally impossible for one agent's edits to hit another's checkout.

Codex has built-in worktree support directly, so multiple threads working on the same repo at the same time will not collide with each other. Claude Code provides the same isolation through `git worktree`, a `--worktree` flag to open the session in its own checkout, and an `isolation: worktree` option set on the subagent, giving each assistant a fresh checkout that is automatically cleaned after use. I wrote about the human side of this in orchestration tax - worktree eliminates mechanical collisions, but **you** are still the ceiling, and your review bandwidth determines how many you can actually run, not the tool.

## Skills so you don’t have to explain your project every time

Skills are how you stop being like a goldfish and reinterpreting the same project context every session. Both tools use the same format - a folder containing `SKILL.md`, which holds instructions and metadata, followed by optional scripts, references, and resources. Codex runs the skill when you call it via `$` or `/skills`, or triggers itself when your task matches the skill description - which is why a tight, boring description is better than a clever one. Claude Code works in the same way, a pattern I wrote about in agent skills.

Skills is also where intention stops consuming you repeatedly. I argued in intent debt that the agent starts from scratch every session and will fill in any gaps in your intent with confident guesses. Skills are intentions written out there - conventions, build steps, "we didn't do this because of that accident" - written once and read by the agent every time it runs. Without skill, each cycle of loop re-derives your entire project from scratch; with skill, it is a bit like growing with compound interest.

One thing to be clear about: skill is the authoring format, plugin is the distribution method. When you want to share a skill across repos or package several together, you package them as plugins. This is true for both Codex and Claude Code.

A loop that only sees the file system is a very small loop. Connectors (based on MCP) allow the agent to read your issue tracker, check the database, open the staging API, and send messages in Slack. Both Codex and Claude Code support MCP, so a connector you write for one will usually work in the other. Plugins package connectors and skills together, so your teammates install your entire configuration in one go, rather than rebuilding the entire thing from memory.

This is the difference between a "here's the fix" agent and a loop that automatically opens a PR, associates a Linear ticket, and pings in the channel after the CI turns green. Connectors are the reason the loop can act in your real environment rather than just telling you what it would do if it could.

## Sub-agents, keep makers and checkers separate

By far the most useful structuring device in a loop is to separate the people who write from the people who check. The model who wrote the code was too polite when grading his own work. A second agent, with different instructions and sometimes a different model, can capture what the first self-convinced.

Codex only generates subagents when you ask them to, runs them concurrently, and collapses the results back into a single answer. You define your agents as TOML files in `.codex/agents/`, each with a name, description, directives and optional model and reasoning effort, so your security reviewer can be a strong model with high effort, and your explorer is something fast and read-only. Claude Code does the same thing via subagents in `.claude/agents/` and agent teams that pass work between them. The common split between the two is an agent exploration, an implementation, and a comparison spec verification.

I've demonstrated this twice - once with code agent orchestra and once with adversarial code review. The reason it's important inside a loop specifically is that the loop runs when you're not looking, so a validator you really trust is the only reason you can walk away. Subagent does consume more tokens because each does its own model and tooling work, so the tokens spent are worth paying for a second opinion. This is also what Claude Code's `/goal` does under the hood - a completely new model determines whether the loop completes, rather than the one doing the work - the split of makers and checkers applies to the stop condition itself.

## What does a loop look like?

Glue them together and a single thread becomes a small control panel. This is a pattern I use all the time.

An automation runs on the repo every morning. Its prompt calls a triage skill, reads yesterday's CI failures, open issues, and recent commits, and writes the findings into a markdown file or Linear panel. For each finding worth working on, the thread opens an isolated worktree, sends a subagent to draft the fix, and a second subagent reviews that draft against the project skill and existing tests.

Connectors let the loop open the PR and update the ticket. Stuff that loop can't handle goes into my triage inbox. The state file is the backbone of the entire system - it remembers what was tried, what passed, and what is still open, so tomorrow morning's run picks up where it left off today.

See what you actually did. You designed it once. You don't prompt any of the steps. This is where Steinberger's point comes true, and it's the same loop in Codex and Claude Code because the components are the same components.

## Loop still can't do anything for you

The Loop changes work, it doesn't remove you from work. Three problems actually become more acute as the loop gets stronger, not easier.

**The verification is still yours. ** A loop that runs unattended is also a loop that makes an unattended error. The whole reason you separate the validation subagent from the producer is to make the loop's "completed" mean something, and even then, "completed" is a statement rather than a proof. I keep repeating the same line from code review in the age of AI - your job is to ship code that you confirm works.

**Your understanding will still degrade if allowed to do so. ** Loop The faster you release code you didn't write, the greater the gap between what exists and what you actually understand. This is comprehension debt, a smooth loop will only make it grow faster unless you read what the loop generates.

**Comfortable postures are dangerous. ** When the loop runs on its own, it's very tempting to stop holding an opinion and just take whatever it gives back. I call it cognitive surrender. Designing loops with judgment is the antidote, designing loops to avoid thinking is an accelerator - same action, opposite result.

## Build loop. Stay an engineer.

I think this is a preview of how our work will evolve. In other words, if I don't review the code myself, or rely entirely on automated loops to fix it, the quality of my product will suffer. I might end up in a downward spiral, digging myself into a deeper hole.

Having said that, go ahead and set up your loop, but don't forget that prompting your agent directly will work just as well. The key is to find the right balance.

Loops may also produce different results depending on you. Two people can build the exact same loop and get completely opposite results. One uses it to move faster on work that one deeply understands. Another uses it to avoid understanding the work itself. Loop doesn't know the difference. You know.

This is what makes loop design harder, not easier, than prompt engineering. Cherny's point is not that work has become easier. Rather, the fulcrum of the lever moves.

Build loop. But build like someone who intends to remain an engineer, not someone who just pushes the launch button.
