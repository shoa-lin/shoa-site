---
translationKey: "getting-started-with-loops"
locale: "en"
title: "Getting Started with Claude Code Loops: From Manual Turns to Proactive Loops"
description: "Learn how turn-based, goal-based, time-based, and proactive loops are triggered, how they stop, and when to use each one."
publishedAt: "2026-07-07"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Getting started with loops cover image](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

There is a lot of discussion right now about "designing loops" instead of simply prompting your coding agent. Spend a little time on X trying to pin down what a loop actually is, and you will find several different answers.

On the Claude Code team, a loop is an agent repeating cycles of work until a stop condition is met. The team distinguishes loop types along a few dimensions:

1. How the loop is triggered.
2. How it stops.
3. Which Claude Code primitive it uses.
4. Which kinds of tasks it suits best.

This article covers the main loop types, when to use each one, and how to maintain code quality while managing token usage. Not every task needs a complex loop. Start with the simplest solution, then apply these patterns selectively where they fit.

## Four types of loops

The original article describes four categories: turn-based, goal-based, time-based, and proactive loops. They differ in more than their degree of automation. Each has a distinct trigger, stop condition, and task boundary.

### Turn-based loop

![Turn-based loop diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **Triggered by**: A user prompt.
- **Stop condition**: Claude judges that it has completed the task or needs more context.
- **Best for**: Short, one-off tasks that are not part of a regular process or schedule.
- **Manage usage by**: Writing specific prompts and improving verification with skills to reduce the number of turns.

Every prompt you send starts a manual loop, with you directing each turn. Claude gathers context, takes action, checks its work, repeats if needed, and responds. This is the agentic loop described in the original article.

For example, ask Claude to create a like button. It reads the code, makes the edit, runs the tests, and hands back something it believes works. You then inspect the result and write the next prompt.

You can improve that verification step by encoding your manual checks in `SKILL.md`, allowing Claude to validate more of its own work end to end. For guidance on choosing between skills, hooks, and subagents for this kind of automation, see [steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more). The skill should give Claude tools or connectors that let it see, measure, or interact with the result. The more quantitative the checks are, the easier it is for Claude to verify its own work.

For example, a frontend verification skill might look like this:

```markdown
---
name: verify-frontend-change
description: Verify any UI change end-to-end before declaring it done.
---

# Verifying frontend changes

Never report a UI change as complete based on a successful edit alone. Verify it the way a human reviewer would:

1. Start the dev server and open the edited page in the browser.
2. Interact with the change directly. For a new control (button, input, toggle): click it, confirm the expected state change, and screenshot before/after.
3. Check the browser console: zero new errors or warnings.
4. Use the Chrome DevTools MCP, run a performance trace and audit Core Web Vitals.

If any step fails, fix the issue and rerun from step 1 — do not hand back partially verified work.
```

The point is not to write one universal skill. It is to make your real definition of "done" explicit. Otherwise, Claude has to rely on its own judgment to decide when to stop.

### Goal-based loop

![Goal-based loop diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **Triggered by**: A manual prompt in real time.
- **Stop condition**: The goal is achieved or the maximum number of turns is reached.
- **Best for**: Tasks with verifiable exit criteria.
- **Manage usage by**: Setting specific completion criteria and an explicit turn cap, such as "stop after 5 tries."

Sometimes a single turn is not enough, especially for complex tasks. Agents generally perform better when they can iterate. With `/goal`, you define what done looks like and give Claude more room to keep working toward it.

When you define the success criteria, Claude does not have to decide for itself what counts as "good enough," so it is less likely to end the loop too early. Each time Claude tries to stop, an evaluator model checks your condition. If the condition has not been met, it sends Claude back to work until the goal is achieved or the turn limit is reached.

This is why deterministic criteria work particularly well: a number of passing tests, a score threshold, or an empty error list.

For example:

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

The core idea is to move the authority to stop from the agent's subjective sense of completion to a condition that can be checked.

### Time-based loop

- **Triggered by**: A specified time interval.
- **Stop condition**: You cancel it, or the work completes, such as when a PR merges or a queue is empty.
- **Best for**: Recurring work or tasks that interact with external environments and systems.
- **Manage usage by**: Setting longer intervals or reacting to events instead of polling on a fixed schedule.

Some agentic work is recurring: the task stays the same while the inputs change. Summarizing Slack messages every morning is one example. Other work depends on external systems, where a simple interaction model is to check periodically and respond to changes. A PR, for instance, may receive review comments or fail CI.

For these cases, `/loop` can rerun a prompt at an interval. For example:

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

`/loop` runs on your computer, so it stops if the computer is turned off. To move the loop to the cloud, use `/schedule` to create a routine.

The key is not to run the routine more often than the underlying system actually changes. A queue that changes once an hour should not consume tokens by being scanned every minute.

### Proactive loops

![Proactive loop diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **Triggered by**: An event or schedule, with no human present in real time.
- **Stop condition**: Each task exits when its goal is met; the routine itself continues until you turn it off.
- **Best for**: Recurring streams of well-defined work, such as bug reports, issue triage, migrations, and dependency upgrades.
- **Manage usage by**: Routing routines to smaller, faster models and reserving the most capable model for judgment calls.

The primitives above, combined with other Claude Code capabilities such as auto mode and dynamic workflows (research preview), can form loops for long-running work.

For example, to handle a continuous stream of incoming feedback, you can combine these capabilities:

1. Use `/schedule` (research preview) to run a routine that checks for new reports.
2. Use `/goal` to define what done looks like, and use skills to document how to verify it.
3. Use dynamic workflows to orchestrate agents that triage each report, fix the issue, and review the fix.
4. Use auto mode so the routine can run without stopping at every step to request permission.

Putting it together, a prompt could look like this:

```text
/schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. When fixing a bug, use a workflow to explore three solutions in parallel worktrees and have a judge adversarially review them.
```

This is not about writing a longer prompt. It is about putting triggers, stop conditions, parallel exploration, review, and permission boundaries into one runtime system.

## Maintaining code quality

The quality of a loop's output depends on the system around it. The original article emphasizes several design principles:

1. **Keep the codebase itself clean**: Claude follows the patterns and conventions already present in your codebase. A messy codebase gives the loop messy patterns to amplify.
2. **Give Claude a way to verify its own work**: Use [skills](https://code.claude.com/docs/en/skills) to encode what good looks like for you and your team.
3. **Make documentation easy to reach**: Framework and library docs contain current best practices, and Claude needs access to them.
4. **Use a second agent for code review**: A reviewer with fresh context is less biased and is not influenced by the main agent's reasoning. You can use the built-in `/code-review` skill or GitHub [Code Review](https://code.claude.com/docs/en/code-review).

When an individual result falls short, do not stop after fixing that one issue. Encode the failure back into the system so every future iteration benefits. A failure should become a skill, test, script, rule, or review rubric, not just a one-off patch.

## Managing token usage

Loops need clear boundaries if you want to control token usage. The original article's advice can be summarized as follows:

1. **Choose the right primitive and model for the task**: Small tasks do not need multiple agents or complex loops. Some can use cheaper, faster models.
2. **Define clear success and stop criteria**: The more specific they are, the more quickly Claude can reach the solution without stopping too soon.
3. **Pilot before a large run**: Dynamic workflows can spawn many agents. Estimate usage on a small slice of the work first.
4. **Use scripts for deterministic work**: Running a script is cheaper than asking a model to reason through the same steps every time. A PDF skill, for example, can include a form-filling script that Claude runs directly instead of rewriting the code.
5. **Do not run routines more often than necessary**: Match the interval to the actual rate of change in the system being observed.
6. **Review usage**: `/usage` breaks down recent usage by skills, subagents, and MCP; `/goal` with no arguments shows the current turn count and token usage; `/workflows` shows each agent's token usage and lets you stop an agent at any time.

[Model and effort level](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) choices are also among the biggest levers on loop cost.

In short, a loop is not a way to let an agent run forever. It is a way to let the agent repeat work within explicit boundaries.

## Getting started

The original article closes with a comparison table that shows which part of the work you hand to each loop:

| Loop | What you hand off | Use it when | Reach for |
| --- | --- | --- | --- |
| Turn-based | The check | You are exploring or deciding | Custom verification skills |
| Goal-based | The stop condition | You know what done looks like | `/goal` |
| Time-based | The trigger | The work happens outside your project on a schedule | `/loop`, `/schedule` |
| Proactive | The prompt | The work is recurring and well-defined | All of the above, plus dynamic workflows |

To get started with loops, look at the work you already do. Pick one task where you are the bottleneck and ask: Can you write the verification check? Is the goal clear enough to judge completion? Does the work arrive on a schedule or through external events?

Once you have an idea, run the loop. Observe where it stalls or overreaches, then keep iterating on the system.

For more information, see the Claude Code documentation on [parallel agents](https://code.claude.com/docs/en/agents), [loop](https://code.claude.com/docs/en/goal), [schedule](https://code.claude.com/docs/en/routines), [goal](https://code.claude.com/docs/en/goal), and [dynamic workflows](https://code.claude.com/docs/en/workflows#orchestrate-subagents-at-scale-with-dynamic-workflows).
