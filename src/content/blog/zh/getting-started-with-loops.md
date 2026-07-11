---
translationKey: "getting-started-with-loops"
locale: "zh"
title: "Claude Code Loops 入门：从手动回合到主动循环"
description: "从手动回合到目标、时间与主动循环，理解四种 loop 的触发方式和停止条件。"
publishedAt: "2026-07-07"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Getting started with loops 封面图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

最近围绕“设计 loops，而不是只 prompt 你的 coding agent”有很多讨论。如果你在 X 上试图弄清楚 loop 到底是什么，会看到好几种不同答案。

在 Claude Code 团队的定义里，loop 是 agent 反复执行工作循环，直到某个停止条件被满足。团队会按几个维度来区分 loop 类型：

1. 它如何被触发。
2. 它如何停止。
3. 使用哪个 Claude Code primitive。
4. 哪类任务最适合它。

本文会覆盖主要 loop 类型、它们分别适合什么时候用，以及如何在控制 token 用量的同时保持代码质量。不是所有任务都需要复杂 loop。应该从最简单的方案开始，只在合适的地方选择性使用这些模式。

## 四种 loop

原文围绕四类 loop 展开：Turn-based loop、Goal-based loop、Time-based loop 和 Proactive loop。它们的差异不只是“自动化程度”不同，而是触发方式、停止条件和任务边界不同。

### Turn-based loop

![Turn-based loop 示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **触发方式**：用户 prompt。
- **停止条件**：Claude 判断任务已经完成，或者需要更多上下文。
- **最适合**：较短、不是固定流程或定期任务的一次性工作。
- **控制用量的方式**：写更具体的 prompt，并用 skills 改善验证步骤，从而减少来回轮次。

你发送的每个 prompt 都会启动一个手动 loop，由你来指挥每一轮。Claude 会收集上下文、采取行动、检查自己的工作，如果需要就重复，然后回复你。这就是原文说的 agentic loop。

比如你让 Claude 做一个点赞按钮。它会读代码、修改文件、运行测试，然后交还一个它认为可用的结果。之后你人工检查，再写下一条 prompt。

要改善这个验证步骤，可以把你原本手动做的检查写进 `SKILL.md`，让 Claude 能端到端检查更多自己的工作。关于这类自动化应选择 skills、hooks 还是 subagents，可以参考 [steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) 指南。这个 skill 应该给 Claude 工具或 connector，让它能够看到、测量或直接交互结果。检查越量化，Claude 越容易自我验证。

例如，前端验证 skill 可以表达成这样：

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

If any step fails, fix the issue and rerun from step 1 - do not hand back partially verified work.
```

这段的重点不是“写一个万能 skill”，而是把你对“完成”的真实标准写出来。否则 Claude 只能靠自己的判断决定什么时候停。

### Goal-based loop

![Goal-based loop 示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **触发方式**：实时的手动 prompt。
- **停止条件**：目标达成，或者达到最大轮次数。
- **最适合**：有可验证退出条件的任务。
- **控制用量的方式**：设定具体完成标准，并明确轮次上限，例如“最多尝试 5 次”。

有些任务一轮不够，尤其是复杂任务。Agent 在可以迭代时通常会做得更好。你可以用 `/goal` 定义“完成长什么样”，从而延长 Claude 继续迭代的时间。

当成功标准由你明确定义时，Claude 就不必自己判断什么叫“够好”，也不容易过早结束 loop。每当 Claude 尝试停止时，一个 evaluator model 会检查你的条件。如果条件未满足，就把它送回去继续工作，直到目标达成或达到你设定的轮次数。

这也是为什么确定性的条件特别有效，例如通过的测试数量、达到某个分数阈值、清空错误列表等。

一个例子：

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

这类 loop 的核心是：把“停止权”从 agent 的主观感觉，转移到可检查的条件上。

### Time-based loop

- **触发方式**：指定的时间间隔。
- **停止条件**：你取消它，或者工作完成，例如 PR 已合并、队列已清空。
- **最适合**：周期性工作，或者需要和外部环境、外部系统交互的任务。
- **控制用量的方式**：设置更长的间隔，或者尽量基于事件而不是固定时间触发。

有些 agentic work 是周期性发生的：任务本身不变，变化的是输入。比如每天早上总结 Slack 消息。另一些工作依赖外部系统，一个简单的交互方式就是定期检查并响应变化。比如一个 PR 可能收到 code review，也可能 CI 失败。

这类场景可以用 `/loop` 按间隔重新运行 prompt。例子：

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

`/loop` 在你的电脑上运行，所以电脑关掉，它也会停止。如果要把 loop 移到云端，可以用 `/schedule` 创建 routine。

这里的关键是不要让 routine 比真实变化更频繁地运行。一个每小时才变化一次的队列，不应该每分钟消耗 token 去扫一遍。

### Proactive loop

![Proactive loop 示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **触发方式**：事件或 schedule，不需要人在实时对话里触发。
- **停止条件**：每个任务在自己的目标达成时退出；routine 本身会持续运行，直到你关闭它。
- **最适合**：重复出现、边界清楚的工作流，例如 bug reports、issue triage、迁移、依赖升级等。
- **控制用量的方式**：把 routine 路由给更小、更快的模型，只把判断性工作交给最强模型。

前面的 primitives，加上 Claude Code 的其他能力，例如 auto mode 和 dynamic workflows（research preview），可以组合成长时间运行的 loop。

例如，要处理持续进入的反馈，可以组合这些能力：

1. 用 `/schedule`（research preview）定期运行一个 routine，检查是否有新的报告。
2. 用 `/goal` 定义“完成”长什么样，并用 skills 记录如何验证。
3. 用 dynamic workflows 编排多个 agent，分别分诊报告、修复问题、review 修复。
4. 用 auto mode 让 routine 不必每一步都停下来请求许可。

组合起来的 prompt 可以是这种形状：

```text
/schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. When fixing a bug, use a workflow to explore three solutions in parallel worktrees and have a judge adversarially review them.
```

这不是把一个 prompt 写得更长，而是把触发、停止、并行探索、review 和权限边界放进同一个运行系统里。

## 保持代码质量

Loop 输出质量取决于它周围的系统。设计这个系统时，原文强调了几件事：

1. **保持代码库本身干净**：Claude 会跟随代码库里已有的模式和约定。如果代码库混乱，loop 会放大这种混乱。
2. **给 Claude 自我验证的方式**：用 [skills](https://code.claude.com/docs/en/skills) 写清楚你和团队眼里的“好”是什么。
3. **让文档容易访问**：框架和库文档包含更新的最佳实践，Claude 需要能触达它们。
4. **用第二个 agent 做 code review**：带着新上下文的 reviewer 偏差更小，也不会被主 agent 的推理链影响。可以用内置 `/code-review` skill，或 GitHub 的 [Code Review](https://code.claude.com/docs/en/code-review)。

当某个单次结果不达标时，不要只修这个问题。更好的做法是把这次失败编码回系统，让未来所有 iteration 都受益。也就是说，失败应该变成 skill、测试、脚本、规则或 review rubric，而不是只变成一次临时补丁。

## 管理 token 用量

要管理 token 用量，loop 必须有清晰边界。原文给出的建议可以整理成下面几条：

1. **为任务选择合适的 primitive 和模型**：小任务不需要多个 agent 或复杂 loop。有些任务可以用更便宜、更快的模型。
2. **定义清楚成功条件和停止条件**：越具体，Claude 越可能更快到达解法，但又不会太早停。
3. **大规模运行前先 pilot**：dynamic workflows 可能启动大量 agent，先在小切片上估算用量。
4. **确定性工作用脚本**：跑脚本比每次让模型重新推理更便宜。例如 PDF skill 可以自带表单填写脚本，让 Claude 每次直接运行，而不是重新写代码。
5. **不要让 routine 运行得比需要更频繁**：周期要匹配被观察对象的真实变化频率。
6. **复盘 usage**：`/usage` 可以按 skills、subagents、MCP 拆解近期用量；不带参数的 `/goal` 会显示目前轮次和 token 用量；`/workflows` 会显示每个 agent 的 token 用量，并允许你随时停止 agent。

[模型和 effort level](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) 也是决定 loop 成本的主要杠杆之一。

一句话：loop 不是让 agent 无限跑，而是让它在明确边界内重复工作。

## Getting started

原文最后给了一张对照表，可以理解为“你把哪部分工作交给 loop”：

| Loop | 你交出去的部分 | 适用时机 | 优先使用 |
| --- | --- | --- | --- |
| Turn-based | 检查步骤 | 你还在探索或决策 | 自定义验证 skills |
| Goal-based | 停止条件 | 你知道完成长什么样 | `/goal` |
| Time-based | 触发器 | 工作在项目外按计划发生 | `/loop`、`/schedule` |
| Proactive | prompt | 工作重复且定义清楚 | 以上全部，加 dynamic workflows |

开始使用 loops 时，先看你已经在做的工作。挑一个因你而卡住的任务，然后问：我能不能写出验证检查？目标是否清楚到足以判断完成？这类工作是不是按计划或外部事件到来？

一旦有了想法，就运行 loop，观察它在哪里卡住、在哪里越界，然后继续迭代它。

更多信息可以看 Claude Code 文档中关于 [parallel agents](https://code.claude.com/docs/en/agents)、[loop](https://code.claude.com/docs/en/goal)、[schedule](https://code.claude.com/docs/en/routines)、[goal](https://code.claude.com/docs/en/goal) 和 [dynamic workflows](https://code.claude.com/docs/en/workflows#orchestrate-subagents-at-scale-with-dynamic-workflows) 的页面。
