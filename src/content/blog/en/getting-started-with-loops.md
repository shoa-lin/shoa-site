---
translationKey: "getting-started-with-loops"
locale: "en"
title: "Getting Started with Claude Code Loops: From Manual Rounds to Active Loops"
description: "From manual turns to target, time and active loops, understand the triggering methods and stop conditions of the four loops."
publishedAt: "2026-07-07"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "zh"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "translation"
translationStatus: "draft"
---

![Getting started with loops cover image](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

There's been a lot of discussion lately around "designing loops instead of just prompting your coding agent". If you try to figure out what loop is on X, you'll see several different answers.

In the definition of the Claude Code team, a loop is an agent that repeatedly executes a work loop until a certain stopping condition is met. The team will distinguish loop types according to several dimensions:

1. How it is triggered.
2. How it stops.
3. Which Claude Code primitive to use.
4. Which types of tasks are best suited for it.

This article will cover the main loop types, when they are suitable for use, and how to control token usage while maintaining code quality. Not all tasks require complex loops. You should start with the simplest solution and only use these patterns selectively where appropriate.

## Four types of loops

The original article revolves around four types of loops: Turn-based loop, Goal-based loop, Time-based loop and Proactive loop. The difference between them is not only the "degree of automation", but also the triggering methods, stopping conditions and task boundaries.

### Turn-based loop

![Turn-based loop diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **Trigger method**: user prompt.
- **Stop condition**: Claude determines that the task has been completed, or more context is needed.
- **Best for**: Shorter, one-time jobs that are not a set process or recurring task.
- **Methods to control usage**: Write more specific prompts, and use skills to improve the verification steps, thereby reducing back and forth rounds.

Each prompt you send starts a manual loop, with you directing each round. Claude will gather context, take action, review his work, repeat if necessary, and get back to you. This is what the original text calls agentic loop.

For example, you ask Claude to make a like button. It reads the code, modifies the files, runs the tests, and hands back a result it thinks is usable. Then you manually check and write a prompt.

To improve this verification step, you can write your original manual checks into `SKILL.md`, so that Claude can check more of his own work end-to-end. This skill should give Claude tools or connectors that allow him to see, measure, or directly interact with the results. The more quantitative the inspection, the easier it is for Claude to verify himself.

For example, the front-end validation skill can be expressed as follows:

```markdown
---
name: verify-frontend-change
description: 在宣布任何 UI 变更完成前，端到端验证它。
---

# 验证前端变更

不要只因为代码编辑成功就说 UI 已完成。要像人工 reviewer 一样验证：

1. 启动 dev server，并在浏览器中打开被修改页面。
2. 直接交互这次改动。新增按钮、输入框或切换控件时，要点击它，确认状态变化，并保存前后截图。
3. 检查浏览器 console，确认没有新增 error 或 warning。
4. 使用 Chrome DevTools MCP 跑 performance trace，并检查 Core Web Vitals。

如果任何步骤失败，修复问题并从第 1 步重新验证，不要交付半验证结果。
```

The point of this paragraph is not to "write a universal skill", but to write down your true standards for "completion". Otherwise Claude has to rely on his own judgment to decide when to stop.

### Goal-based loop

![Goal-based loop diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **Trigger method**: real-time manual prompt.
- **Stop condition**: The goal is achieved, or the maximum number of rounds is reached.
- **Best for**: Tasks with verifiable exit conditions.
- **Methods to control usage**: Set specific completion standards and clarify the upper limit of rounds, such as "maximum 5 attempts".

One round is not enough for some tasks, especially complex tasks. Agents generally do better when they can iterate. You can extend the time Claude can continue iterating by defining "what the finish will look like" using `/goal`.

When the success criteria are clearly defined by you, Claude doesn't have to judge for himself what "good enough" means, and it's less likely to end the loop prematurely. Every time Claude tries to stop, an evaluator model checks your condition. If the condition is not met, send it back and continue working until the goal is achieved or the number of rounds you set is reached.

This is why deterministic conditions are particularly effective, such as the number of passed tests, reaching a certain score threshold, clearing the error list, etc.

An example:

```text
/goal 把首页 Lighthouse 分数提升到 90 或更高，最多尝试 5 次。
```

The core of this type of loop is to transfer the "right to stop" from the agent's subjective feeling to a checkable condition.

### Time-based loop

- **Trigger method**: Specified time interval.
- **Stop condition**: You cancel it, or the work is completed, e.g. PR merged, queue cleared.
- **Most Suitable**: Periodic work, or tasks that require interaction with the external environment or external systems.
- **Methods to control usage**: Set a longer interval, or try to trigger based on events instead of fixed time.

Some agentic work occurs periodically: the task itself does not change, but the input changes. Like summarizing Slack messages every morning. Other work relies on external systems, and a simple way to interact with them is to regularly check and respond to changes. For example, a PR may receive code review, or CI may fail.

In this type of scenario, you can use `/loop` to rerun prompt at intervals. Example:

```text
/loop 5m 检查我的 PR，处理 review 评论，并修复失败的 CI。
```

`/loop` runs on your computer, so when the computer is turned off, it will stop. If you want to move the loop to the cloud, you can use `/schedule` to create a routine.

The key here is not to let the routine run more often than there are real changes. A queue that only changes once an hour should not consume tokens every minute to scan it.

### Proactive loop

![Proactive loop diagram](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **Trigger method**: event or schedule, no need for people to trigger in real-time conversation.
- **Stop condition**: Each task exits when its goal is achieved; the routine itself will continue to run until you close it.
- **Best for**: Recurring, well-bounded workflows, such as bug reports, issue triage, migrations, dependency upgrades, etc.
- **Methods to control usage**: Route routines to smaller, faster models, and only hand over judgmental work to the strongest model.

The previous primitives, plus other capabilities of Claude Code, such as auto mode and dynamic workflows (research preview), can be combined into long-running loops.

For example, to handle ongoing incoming feedback, you can combine these capabilities:

1. Use `/schedule` (research preview) to run a routine regularly to check whether there are new reports.
2. Use `/goal` to define what "completion" looks like, and use skills to record how to verify it.
3. Use dynamic workflows to orchestrate multiple agents to triage reports, fix problems, and review repairs respectively.
4. Use auto mode so that the routine does not have to stop and ask for permission at every step.

The combined prompt can look like this:

```text
/schedule 每小时检查 #project-feedback 里的 bug reports。
/goal 本轮发现的每条 report 都必须完成分诊、采取行动并回复，不要提前停止。
修 bug 时，用 workflow 在三个并行 worktree 中探索三种方案，并让 judge 做对抗性 review。
```

This is not about making a prompt longer, but putting triggering, stopping, parallel exploration, review and permission boundaries into the same runtime system.

## Maintain code quality

Loop output quality depends on the system surrounding it. When designing this system, the original article emphasized several things:

1. **Keep the codebase itself clean**: Claude will follow existing patterns and conventions in the codebase. If the code base is messy, loops will amplify that mess.
2. **Method for Claude to self-verify**: Use skills to write clearly what “good” is in the eyes of you and the team.
3. **Make documentation accessible**: Framework and library documentation contains updated best practices, and Claude needs to be able to reach them.
4. **Use a second agent for code review**: The reviewer with the new context has smaller deviations and will not be affected by the main agent's reasoning chain. You can use the built-in `/code-review` skill, or GitHub’s Code Review.

When a single result is not up to par, don’t just fix that problem. A better approach would be to encode this failure back into the system so that all future iterations can benefit. That is, a failure should be turned into a skill, test, script, rule, or review rubric, not just a temporary patch.

## Manage token usage

To manage token usage, loops must have clear boundaries. The suggestions given in the original article can be summarized as follows:

1. **Choose the appropriate primitive and model for the task**: Small tasks do not require multiple agents or complex loops. Some tasks can use cheaper and faster models.
2. **Clearly define success conditions and stopping conditions**: The more specific, the more likely Claude will reach the solution faster, but not stop too early.
3. **Pilot before running on a large scale**: Dynamic workflows may start a large number of agents, so estimate the usage on small slices first.
4. **Scripts for deterministic work**: It’s cheaper to run scripts than to have the model re-infer each time. For example, the PDF skill can come with its own form-filling script, allowing Claude to run it directly every time instead of rewriting the code.
5. **Don't let the routine run more frequently than necessary**: the period should match the true frequency of changes of the observed object.
6. **Review usage**: `/usage` can break down recent usage by skills, subagents, and MCP; `/goal` without parameters will display the current round and token usage; `/workflows` will display the token usage of each agent and allow you to stop the agent at any time.

In a word: loop is not to let the agent run infinitely, but to let it work repeatedly within clear boundaries.

## Getting started

The original article gives a comparison table at the end, which can be understood as "which part of the work do you give to the loop":

| Loop | The part you handed over | Applicable time | Priority use |
| --- | --- | --- | --- |
| Turn-based | Check steps | Are you still exploring or making decisions | Custom verification skills |
| Goal-based | Stopping conditions | You know what completion looks like | `/goal` |
| Time-based | Trigger | Work happens according to time, or outside the project | `/loop`, `/schedule` |
| Proactive | prompts and run processes | repetitive and well-defined work | all of the above, plus dynamic workflows |

When starting to use loops, start by looking at what you're already doing. Pick a task that you are bottlenecking and ask: Can I write the validation check? Is the goal clear enough to judge completion? Does this type of work come according to plan or external events?

Once you have an idea, run the loop, see where it gets stuck, where it crosses the line, and then keep iterating on it.

For more information, see the Claude Code documentation pages on parallel agents, loops, schedules, goals, and dynamic workflows.
