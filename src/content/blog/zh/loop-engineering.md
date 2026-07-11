---
translationKey: "loop-engineering"
locale: "zh"
title: "Loop Engineering"
description: "拆解 loop engineering 的五个组件与外部 state，并说明 verification、comprehension debt 和 cognitive surrender 仍需工程师负责。"
publishedAt: "2026-06-09"
updatedAt: "2026-06-09"
category: "development"
sourceLocale: "en"
sourceUrl: "https://addyosmani.com/blog/loop-engineering/"
sourceAuthor: "Addy Osmani"
contentType: "adaptation"
translationStatus: "reviewed"
---

**Loop engineering 是不再由你亲自 prompt agent，而是设计一个替你完成这件事的系统。** 这里的 loop 可以理解为一个递归目标——你定义目的，AI 迭代直到完成。我认为这可能是我们与 coding agents 协作方式的未来。不过现在还早，我仍持怀疑态度，而且你绝对**必须**[谨慎看待](https://x.com/weswinder/status/2063700289710964906) token 成本（使用模式会因 token 预算而大幅变化），所以我想拆解一下它是什么、意味着什么。

---

Peter Steinberger 最近[说](https://x.com/steipete/status/2063697162748260627)："你不应该再手动 prompt coding agents 了。你应该设计 loop 来 prompt 你的 agents。" 类似地，canonical 原文[转述](https://addyosmani.com/blog/loop-engineering/)了 Anthropic Claude Code 负责人 Boris Cherny 的说法："我不再 prompt Claude 了。我有 loop 在运行，由它们 prompt Claude 并弄清楚该做什么。我的工作是写 loop。"

好吧，这些到底意味着什么？

大约两年来，你从编码 agent 获得产出的方式是写一个好的 prompt 并分享足够的上下文。你输入一个东西，读回来的是什么，再输入下一个东西。agent 是一个工具，你全程握着它，一轮接一轮。这部分基本上结束了，或者至少有些人认为是这样。

现在你构建一个小系统来发现工作、分配工作、检查工作、记录完成情况，然后决定下一步，让这个系统去驱动 agent，而不是你自己。我之前写过它的近亲——[agent harness engineering](https://addyosmani.com/blog/agent-harness-engineering/)，即单个 agent 运行其中的环境，以及 [factory model](https://addyosmani.com/blog/factory-model/)——构建软件的系统。Loop engineering 位于 harness 的上一层：它像 harness，但会按定时器运行、生成小助手，并把结果反馈给下一轮。

让我惊讶的是，这不再是一个工具层面的事情了。一年前，如果你想要一个 loop，你写一堆 bash 脚本然后永远维护那堆东西，而且它是你的、只属于你的。现在这些组件直接内置于产品中。Steinberger 的清单几乎完全对应 Codex app，然后几乎同样对应 Claude Code。一旦你注意到形状是相同的，你就不再争论用哪个工具，你只是设计一个无论坐在哪个工具里都能工作的 loop。

## 五个组件，以及一些说明

一个 [loop](https://x.com/reach_vb/status/2063713960495558940) 需要五样东西，外加一个记住状态的地方。让我先列出来，然后逐一对应。

1. **Automations**，按计划自动运行，自行完成发现和分诊。
2. **Worktrees**，让两个并行工作的 agent 不会互相踩脚。
3. **Skills**，写下项目知识，让 agent 不再靠猜。
4. **Plugins 和 connectors**，把 agent 接入你已经在用的工具。
5. **Sub-agents**，让一个负责出方案，另一个负责检查。

然后是第六样东西——记忆。一个 markdown 文件，或一个 Linear 面板，任何存活在单次对话之外、记录已完成和待做事项的东西。听起来简单到不值一提。但这是每个长期运行 agent 依赖的同一个技巧——我在 [long-running agents](https://addyosmani.com/blog/long-running-agents/) 中详细讨论过，模型在运行之间会忘掉一切，所以记忆必须在磁盘上而不是在 context 中。Agent 会遗忘，但 repo 不会。

两个产品现在都有这五个组件。

| 原语 | Loop 中的职责 | Codex app | Claude Code |
| --- | --- | --- | --- |
| **Automations** | 定时发现 + 分诊 | [Automations tab](https://developers.openai.com/codex/app/automations)：选择项目、prompt、频率、环境；结果进入 Triage 收件箱；`/goal` 实现运行直到完成 | Scheduled tasks 和 cron、`/loop`、`/goal`、hooks、GitHub Actions |
| **Worktrees** | 隔离并行 feature | 每个线程内置 worktree | `git worktree`、`--worktree`、subagent 的 `isolation: worktree` |
| **Skills** | 固化项目知识 | [Agent Skills](https://developers.openai.com/codex/skills)（`SKILL.md`），通过 `$name` 调用或隐式触发 | [Agent Skills](https://addyosmani.com/blog/agent-skills/)（`SKILL.md`） |
| **Plugins / connectors** | 连接你的工具 | Connectors（MCP）+ plugins 用于分发 | MCP servers + plugins |
| **Sub-agents** | 出方案和验证 | [Subagents](https://developers.openai.com/codex/subagents)，在 `.codex/agents/` 中以 TOML 定义 | `.claude/agents/` 中的 subagent、agent teams |
| **State** | 跟踪已完成的工作 | 通过 connector 的 markdown 或 Linear | markdown（`AGENTS.md`、progress 文件）或通过 MCP 的 Linear |

名称在各处略有不同，但能力是同一回事。让我逐一说来，因为说实话，细节是决定一个 loop 是稳固还是悄悄到处漏水的地方。

## Automations，这是心跳

Automation 让一次性运行变成真正的 loop。在 Codex app 中，你可以从 Automations tab 创建 automation，选择项目、prompt、运行频率，以及使用本地 checkout 还是后台 worktree。发现问题的运行会进入 Triage 收件箱，未发现问题的运行则自动归档。OpenAI 内部用 automation 处理日常 issue 分诊、总结 CI 失败、撰写 commit 简报，以及追查上周引入的 bug 等例行工作。Automation 还可以调用 skill，让可复用行为保持可维护：触发 `$skill-name`，而不是把大段指令粘进一个无人更新的计划任务。

Claude Code 通过调度和 hooks 到达同一个地方。你可以用 `/loop` 按间隔运行一个 prompt 或命令，你可以安排 cron 任务，你可以用 hooks 在 agent 生命周期的特定时刻触发 shell 命令，或者如果你想让它在合上笔记本后继续运行，就把整个东西推到 GitHub Actions。完全相同的思路——你定义一个自主任务，给它一个频率，发现的问题来找你，你不需要自己去到处检查。

还有一个 session 内的原语值得了解，它更接近这篇文章要讨论的核心。`/loop` 按节奏重复运行。`/goal` 持续运行直到你写的条件真正为真，每一轮之后一个独立的小模型检查你是否完成了，所以写代码的 agent 不是给自己打分的那个。你给它类似"test/auth 中所有测试通过且 lint 干净"这样的条件，然后走开。Codex 有同样的东西，也叫 `/goal`，它跨 turn 持续工作直到一个可验证的停止条件成立，支持暂停、恢复和清除。同样的原语，两个工具，这也是整篇文章的模式。

这部分负责发现需要处理的工作，loop 的其余部分则对这些工作采取行动。

## Worktrees，让并行不变成混乱

当你运行超过一个 agent 的那一刻，文件就开始冲突，这就是故障点。两个 agent 写同一个文件，跟两个工程师提交同一行代码、谁也没跟谁打过招呼，是完全一样的头痛。git worktree 解决了它——它是一个独立分支上的独立工作目录，共享同一个 repo 历史，所以一个 agent 的编辑字面上不可能碰到另一个的 checkout。

Codex 直接内置了 worktree 支持，所以多个线程同时处理同一个 repo 时不会直接修改彼此的 checkout。Claude Code 通过 `git worktree`、一个 `--worktree` 标志在自己的 checkout 中打开 session、以及一个设置在 subagent 上的 `isolation: worktree` 选项提供同样的隔离，让每个助手获得一个用完后自动清理的全新 checkout。我在 [orchestration tax](https://addyosmani.com/blog/orchestration-tax/) 中写过人的这一面——worktree 消除了机械碰撞，但**你**仍然是天花板，你的 review 带宽决定了你实际能运行多少个，而不是工具。

## Skills，让你不再每次都解释你的项目

Skill 让你不必在每个 session 重新解释同一份项目上下文。两个工具使用相同的格式——一个包含 `SKILL.md` 的文件夹，里面放指令和元数据，再配上可选的脚本、参考和资源。Codex 在你通过 `$` 或 `/skills` 调用时运行 skill，或者在任务匹配 skill 描述时自行触发——这就是为什么一个紧凑、直白的描述胜过一个故作聪明的描述。Claude Code 以同样的方式工作，我在 [agent skills](https://addyosmani.com/blog/agent-skills/) 中写过这个模式。

Skills 也是意图不再反复消耗你的地方。我在 [intent debt](https://addyosmani.com/blog/intent-debt/) 中论证过，agent 每个 session 都从零开始，它会用自信的猜测填补你意图中的任何空白。Skill 是写在外面的意图——约定、构建步骤、"我们不这样做是因为那次事故"——写一次，agent 每次运行都会读。没有 skill，loop 每个 cycle 都从零重新推导整个项目；有了 skill，项目知识才可能逐轮积累。

要弄清楚的一件事：skill 是创作格式，plugin 是分发方式。当你想跨 repo 分享一个 skill 或把几个打包在一起时，你把它们打包为 plugin。Codex 和 Claude Code 都是如此。

## Plugins 和 connectors，让 loop 触达真实工具

一个只能看到文件系统的 loop 是一个很小的 loop。Connectors（基于 MCP）让 agent 能读你的 issue tracker、查数据库、打 staging API、在 Slack 里发消息。Codex 和 Claude Code 都支持 MCP，所以你为一个写的 connector 通常在另一个里也能用。Plugins 把 connector 和 skill 打包在一起，所以你的队友一次性安装你的整套配置，而不是凭记忆重建整个东西。

这是"这是修复方案"的 agent 和自动打开 PR、关联 Linear ticket、CI 变绿后在频道里 ping 的 loop 之间的区别。Connectors 是 loop 能在你真实环境中行动而不只是告诉你它如果能的话会做什么的原因。

## Sub-agents，让制造者和检查者分开

在一个 loop 中，到目前为止最有用的结构化手段，是把写的人和检查的人分开。写了代码的模型在给自己的作业打分时太客气了。使用不同指令、有时甚至不同模型的第二个 agent，可以避免仅仅因为第一份结果看起来合理，就把其中的问题一并接受下来。

Codex 只在你要求时才生成 subagent，同时运行它们，然后把结果折叠回一个答案。你在 `.codex/agents/` 中以 TOML 文件定义自己的 agent，每个有名称、描述、指令和可选的 model 及 reasoning effort，所以你的安全 reviewer 可以使用高 effort 的强模型，而探索任务可以交给快速、只读的探索模型或代理。Claude Code 通过 `.claude/agents/` 中的 subagent 和在它们之间传递工作的 agent teams 做同样的事。两者中常见的拆分是一个 agent 探索、一个实现、一个对照 spec 验证。

我已经两次论证过这个观点——一次是在 [code agent orchestra](https://addyosmani.com/blog/code-agent-orchestra/)，另一次是在 [agentic code review](https://addyosmani.com/blog/agentic-code-review/)。它在 loop 中尤其重要，因为 loop 会在无人观察时继续运行。一个真正可信的验证者，能让这种无人值守运行更值得信赖，但并不意味着你可以免除最终检查。Subagent 确实会消耗更多 token，因为每个 subagent 都要独立完成模型和工具工作，所以应把这些 token 花在值得获得第二意见的地方。这也是 Claude Code `/goal` 采用的结构：由一个全新的模型判断 loop 是否完成，而不是让执行工作的模型自我评判，也就是把制造者与检查者的分离应用到停止条件本身。

## 一个 loop 长什么样

把这些组件组合起来，一个 thread 就会变成小型控制面板。下面是我一直在使用的一种模式。

一个 automation 每天早上在 repo 上运行。它的 prompt 调用一个分诊 skill，读取昨天的 CI 失败、开放的 issue、最近的 commit，把发现写入一个 markdown 文件或 Linear 面板。对于每个值得处理的发现，线程打开一个隔离的 worktree，发送一个 subagent 起草修复，第二个 subagent 对照项目 skill 和现有测试 review 那个草稿。

Connectors 让 loop 打开 PR 并更新 ticket。loop 处理不了的东西进入我的分诊收件箱。状态文件是整个系统的主心骨——它记住了什么被尝试过、什么通过了、什么还开着，所以明天早上的运行从今天停下的地方继续。

看看你实际做了什么。你设计了一次。你没有 prompt 其中任何一个步骤。这就是 Steinberger 的观点变成了现实，而且它在 Codex 和 Claude Code 中是同一个 loop，因为组件是同样的组件。

## Loop 仍然不能为你做什么

Loop 改变了工作，它没有把你从工作中删除。三个问题随着 loop 变强实际上变得更加尖锐，而不是更轻松。

**验证仍然由你负责。** 无人值守运行的 loop 也可能在无人看守时犯错。你把验证 subagent 和制造者分开的原因，是让 loop 的"完成了"更有依据；即便如此，"完成了"仍是一个声明，而不是证明。我一直在重复 [code review in the age of AI](https://addyosmani.com/blog/code-review-ai/) 中的同一句话——你的工作是发布你确认能工作的代码。

**如果放任不管，你的理解仍会退化。** Loop 越快地交付你没写过的代码，实际存在的系统与你真正理解的系统之间差距就越大。这就是 [comprehension debt](https://addyosmani.com/blog/comprehension-debt/)；除非你认真阅读 loop 生成的内容，否则顺畅的 loop 只会让这笔债增长得更快。

**过于舒适的姿态很危险。** 当 loop 自己运行时，人很容易不再形成判断，直接接受它返回的内容。我称之为 [cognitive surrender](https://addyosmani.com/blog/cognitive-surrender/)。带着判断力设计 loop 可能是解药；为了逃避思考而设计 loop，则会加速问题——同样的动作，结果相反。

## 构建 loop。保持工程师身份。

我认为这是我们工作将如何演变的预览。也就是说，如果我不自己 review 代码，或者完全依赖自动化 loop 来修复，我的产品质量会受损。我可能最终陷入一个向下的螺旋，不断把自己挖进一个更深的坑。

话虽如此，继续搭建你的 loop，但不要忘记直接 prompt 你的 agent 同样有效。关键在于找到正确的平衡。

Loop 也可能因你而产生不同的结果。两个人可以构建完全相同的 loop，获得完全相反的结果。一个用它来在自己深刻理解的工作上走得更快。另一个用它来避免理解工作本身。Loop 不知道区别。你知道。

这就是让 loop 设计比 prompt engineering 更难而不是更容易的原因。Cherny 的观点不是说工作变简单了。而是杠杆的支点移动了。

构建 loop。但要像一个打算保持工程师身份的人那样构建，而不是一个只是按下启动按钮的人。
