---
translationKey: "loop-engineering"
locale: "zh"
title: "Loop Engineering"
description: "从目标、观察、反馈、停止条件和安全边界出发，设计可持续改进的 Agent 循环。"
publishedAt: "2026-06-09"
updatedAt: "2026-06-09"
category: "development"
sourceLocale: "en"
sourceUrl: "https://addyosmani.com/blog/loop-engineering/"
sourceAuthor: "Addy Osmani"
contentType: "adaptation"
translationStatus: "reviewed"
---

> 原文链接：[Loop Engineering](https://addyosmani.com/blog/loop-engineering/)
>
> 作者：Addy Osmani
>
> 原文发布日期：2026 年 6 月 7 日
>
> 翻译日期：2026 年 6 月 9 日

---

**Loop engineering 是用设计系统来替代你自己成为那个 prompt agent 的人。** 这里的 loop 可以理解为一个递归目标——你定义一个目的，AI 迭代直到完成。我认为这可能是我们与编码 agent 协作方式的未来。不过现在还早，我对此持怀疑态度，而且你绝对**必须**注意 token 成本（使用模式因你的 token 充裕程度而大相径庭），所以我想拆解一下它是什么、意味着什么。

---

Peter Steinberger 最近说："你不应该再手动 prompt 编码 agent 了。你应该设计 loop 来 prompt 你的 agent。" 类似地，Anthropic Claude Code 负责人 Boris Cherny 说："我不再 prompt Claude 了。我有 loop 在运行，由它们 prompt Claude 并自己弄清楚该做什么。我的工作是写 loop。"

好吧，这些到底意味着什么？

大约两年来，你从编码 agent 获得产出的方式是写一个好的 prompt 并分享足够的上下文。你输入一个东西，读回来的是什么，再输入下一个东西。agent 是一个工具，你全程握着它，一轮接一轮。这部分基本上结束了，或者至少有些人认为是这样。

现在你构建一个小系统来发现工作、分配工作、检查工作、记录完成情况，然后决定下一步，你让这个系统去驱动 agent，而不是你自己。我之前写过它的近亲——agent harness engineering，即让单个 agent 运行的环境，以及 factory model——构建软件的系统。Loop engineering 坐在 harness 的上一层。它是 harness，但它按定时器运行，生成小助手，并且自我投喂。

让我惊讶的是，这不再是一个工具层面的事情了。一年前，如果你想要一个 loop，你写一堆 bash 脚本然后永远维护那堆东西，而且它是你的、只属于你的。现在这些组件直接内置于产品中。Steinberger 的清单几乎完全对应 Codex app，然后几乎同样对应 Claude Code。一旦你注意到形状是相同的，你就不再争论用哪个工具，你只是设计一个无论坐在哪个工具里都能工作的 loop。

## 五个组件，以及一些说明

一个 loop 需要五样东西，外加一个记住状态的地方。让我先列出来，然后逐一对应。

1. **Automations**，按计划自动运行，自行完成发现和分诊。
2. **Worktrees**，让两个并行工作的 agent 不会互相踩脚。
3. **Skills**，写下项目知识，让 agent 不再靠猜。
4. **Plugins 和 connectors**，把 agent 接入你已经在用的工具。
5. **Sub-agents**，让一个负责出方案，另一个负责检查。

然后是第六样东西——记忆。一个 markdown 文件，或一个 Linear 面板，任何存活在单次对话之外、记录已完成和待做事项的东西。听起来简单到不值一提。但这是每个长期运行 agent 依赖的同一个技巧——我在 long-running agents 中详细讨论过，模型在运行之间忘掉一切，所以记忆必须在磁盘上而不是在 context 中。Agent 会遗忘，但 repo 不会。

两个产品现在都有这五个组件。

| 原语 | Loop 中的职责 | Codex app | Claude Code |
| --- | --- | --- | --- |
| **Automations** | 定时发现 + 分诊 | Automations tab：选择项目、prompt、频率、环境；结果进入 Triage 收件箱；`/goal` 实现运行直到完成 | Scheduled tasks 和 cron、`/loop`、`/goal`、hooks、GitHub Actions |
| **Worktrees** | 隔离并行 feature | 每个线程内置 worktree | `git worktree`、`--worktree`、subagent 的 `isolation: worktree` |
| **Skills** | 固化项目知识 | Agent Skills（`SKILL.md`），通过 `$name` 调用或隐式触发 | Agent Skills（`SKILL.md`） |
| **Plugins / connectors** | 连接你的工具 | Connectors（MCP）+ plugins 用于分发 | MCP servers + plugins |
| **Sub-agents** | 出方案和验证 | 在 `.codex/agents/` 中以 TOML 定义 subagent | `.claude/agents/` 中的 subagent、agent teams |
| **State** | 跟踪已完成的工作 | 通过 connector 的 markdown 或 Linear | markdown（`AGENTS.md`、progress 文件）或通过 MCP 的 Linear |

名称在各处略有不同，但能力是同一回事。让我逐一说来，因为说实话，细节是决定一个 loop 是稳固还是悄悄到处漏水的地方。

## Automations，这是心跳

Automation 是让 loop 成为真正的 loop 而不是你只做过一次的单次运行。在 Codex app 中，你在 Automations tab 中创建一个，选择项目、要运行的 prompt、频率，以及是在本地 checkout 还是后台 worktree 上运行。发现问题的运行会进入 Triage 收件箱，什么都没发现的运行会自动归档，这很贴心。OpenAI 内部用它们做枯燥的事情，比如日常 issue 分诊、总结 CI 失败、写 commit 简报、追查上周有人引入的 bug。而且 automation 可以调用 skill，所以你保持可复用的东西可维护，你触发 `$skill-name` 而不是把一大堆指令粘到一个没人会去更新的计划中。

Claude Code 通过调度和 hooks 到达同一个地方。你可以用 `/loop` 按间隔运行一个 prompt 或命令，你可以安排 cron 任务，你可以用 hooks 在 agent 生命周期的特定时刻触发 shell 命令，或者如果你想让它在合上笔记本后继续运行，就把整个东西推到 GitHub Actions。完全相同的思路——你定义一个自主任务，给它一个频率，发现的问题来找你，你不需要自己去到处检查。

还有一个 session 内的原语值得了解，它更接近这篇文章要讨论的核心。`/loop` 按节奏重复运行。`/goal` 持续运行直到你写的条件真正为真，每一轮之后一个独立的小模型检查你是否完成了，所以写代码的 agent 不是给自己打分的那个。你给它类似"test/auth 中所有测试通过且 lint 干净"这样的条件，然后走开。Codex 有同样的东西，也叫 `/goal`，它跨 turn 持续工作直到一个可验证的停止条件成立，支持暂停、恢复和清除。同样的原语，两个工具，这也是整篇文章的模式。

所以这是发现工作的部分。loop 的其余部分是对它采取行动。

## Worktrees，让并行不变成混乱

当你运行超过一个 agent 的那一刻，文件就开始冲突，这就是故障点。两个 agent 写同一个文件，跟两个工程师提交同一行代码、谁也没跟谁打过招呼，是完全一样的头痛。git worktree 解决了它——它是一个独立分支上的独立工作目录，共享同一个 repo 历史，所以一个 agent 的编辑字面上不可能碰到另一个的 checkout。

Codex 直接内置了 worktree 支持，所以多个线程同时打同一个 repo 不会互相碰撞。Claude Code 通过 `git worktree`、一个 `--worktree` 标志在自己的 checkout 中打开 session、以及一个设置在 subagent 上的 `isolation: worktree` 选项提供同样的隔离，让每个助手获得一个用完后自动清理的全新 checkout。我在 orchestration tax 中写过这方面的人的层面——worktree 消除了机械碰撞，但**你**仍然是天花板，你的 review 带宽决定了你实际能运行多少个，而不是工具。

## Skills，让你不再每次都解释你的项目

Skill 是你停止像金鱼一样每个 session 重新解释相同项目上下文的方式。两个工具使用相同的格式——一个包含 `SKILL.md` 的文件夹，里面持有指令和元数据，然后是可选的脚本、参考、资源。Codex 在你通过 `$` 或 `/skills` 调用时运行 skill，或者在你的任务匹配 skill 描述时自行触发——这就是为什么一个紧凑、无聊的描述胜过一个聪明的描述。Claude Code 以同样的方式工作，我在 agent skills 中写过这个模式。

Skills 也是意图停止反复消耗你的地方。我在 intent debt 中论证过，agent 每个 session 都从零开始，它会用自信的猜测填补你意图中的任何空白。Skill 是写在外面的意图——约定、构建步骤、"我们不这样做是因为那次事故"——写一次，agent 每次运行都会读。没有 skill，loop 每个 cycle 都从零重新推导你整个项目；有了 skill，它有点像在复利增长。

要弄清楚的一件事：skill 是创作格式，plugin 是分发方式。当你想跨 repo 分享一个 skill 或把几个打包在一起时，你把它们打包为 plugin。Codex 和 Claude Code 都是如此。

一个只能看到文件系统的 loop 是一个很小的 loop。Connectors（基于 MCP）让 agent 能读你的 issue tracker、查数据库、打 staging API、在 Slack 里发消息。Codex 和 Claude Code 都支持 MCP，所以你为一个写的 connector 通常在另一个里也能用。Plugins 把 connector 和 skill 打包在一起，所以你的队友一次性安装你的整套配置，而不是凭记忆重建整个东西。

这是"这是修复方案"的 agent 和自动打开 PR、关联 Linear ticket、CI 变绿后在频道里 ping 的 loop 之间的区别。Connectors 是 loop 能在你真实环境中行动而不只是告诉你它如果能的话会做什么的原因。

## Sub-agents，让制造者和检查者分开

在一个 loop 中，到目前为止最有用的结构化手段，是把写的人和检查的人分开。写了代码的模型在给自己的作业打分时太客气了。一个有着不同指令、有时甚至是不同模型的第二个 agent，能抓住第一个自我说服的东西。

Codex 只在你要求时才生成 subagent，同时运行它们，然后把结果折叠回一个答案。你在 `.codex/agents/` 中以 TOML 文件定义自己的 agent，每个有名称、描述、指令和可选的 model 及 reasoning effort，所以你的安全 reviewer 可以是一个高 effort 的强模型，而你的探索器是某个快速的只读东西。Claude Code 通过 `.claude/agents/` 中的 subagent 和在它们之间传递工作的 agent teams 做同样的事。两者中常见的拆分是一个 agent 探索、一个实现、一个对照 spec 验证。

我已经论证过这个两次了——一次是 code agent orchestra，一次是 adversarial code review。它特别在 loop 内部重要的原因是 loop 在你没有看的时候运行，所以一个你真正信任的验证者是你能走开的唯一理由。Subagent 确实会消耗更多 token，因为每个都做自己的模型和工具工作，所以把 token 花在值得付第二意见的地方。这也是 Claude Code 的 `/goal` 底层做的事——一个全新的模型决定 loop 是否完成，而不是做工作的那个——制造者和检查者的拆分应用到了停止条件本身。

## 一个 loop 长什么样

把它们粘在一起，一个单线程就变成了一个小控制面板。这是一个我一直在用的模式。

一个 automation 每天早上在 repo 上运行。它的 prompt 调用一个分诊 skill，读取昨天的 CI 失败、开放的 issue、最近的 commit，把发现写入一个 markdown 文件或 Linear 面板。对于每个值得处理的发现，线程打开一个隔离的 worktree，发送一个 subagent 起草修复，第二个 subagent 对照项目 skill 和现有测试 review 那个草稿。

Connectors 让 loop 打开 PR 并更新 ticket。loop 处理不了的东西进入我的分诊收件箱。状态文件是整个系统的主心骨——它记住了什么被尝试过、什么通过了、什么还开着，所以明天早上的运行从今天停下的地方继续。

看看你实际做了什么。你设计了一次。你没有 prompt 其中任何一个步骤。这就是 Steinberger 的观点变成了现实，而且它在 Codex 和 Claude Code 中是同一个 loop，因为组件是同样的组件。

## Loop 仍然不能为你做什么

Loop 改变了工作，它没有把你从工作中删除。三个问题随着 loop 变强实际上变得更加尖锐，而不是更轻松。

**验证仍然是你。** 无人值守运行的 loop 也是无人值守犯错的 loop。你把验证 subagent 和制造者分开的全部原因，是让 loop 的"完成了"意味着一些东西，即便如此，"完成了"是一个声明而非证明。我一直在重复 code review in the age of AI 中的同一句话——你的工作是发布你确认能工作的代码。

**你的理解力如果允许的话仍然会退化。** Loop 越快地发布你没写过的代码，存在的东西和你实际理解的之间的差距就越大。这就是 comprehension debt，一个顺畅的 loop 只会让它增长得更快，除非你读 loop 生成的东西。

**舒适的姿势是危险的。** 当 loop 自己运行时，非常诱人地不再持有意见，直接拿它给回来的任何东西。我称之为 cognitive surrender。带着判断力设计 loop 是解药，为了逃避思考而设计 loop 是加速器——同样的动作，相反的结果。

## 构建 loop。保持工程师身份。

我认为这是我们工作将如何演变的预览。也就是说，如果我不自己 review 代码，或者完全依赖自动化 loop 来修复，我的产品质量会受损。我可能最终陷入一个向下的螺旋，不断把自己挖进一个更深的坑。

话虽如此，继续搭建你的 loop，但不要忘记直接 prompt 你的 agent 同样有效。关键在于找到正确的平衡。

Loop 也可能因你而产生不同的结果。两个人可以构建完全相同的 loop，获得完全相反的结果。一个用它来在自己深刻理解的工作上走得更快。另一个用它来避免理解工作本身。Loop 不知道区别。你知道。

这就是让 loop 设计比 prompt engineering 更难而不是更容易的原因。Cherny 的观点不是说工作变简单了。而是杠杆的支点移动了。

构建 loop。但要像一个打算保持工程师身份的人那样构建，而不是一个只是按下启动按钮的人。
