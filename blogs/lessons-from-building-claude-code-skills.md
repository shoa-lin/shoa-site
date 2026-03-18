# 构建 Claude Code 的经验：我们如何使用 Skills

> 原文链接：[Lessons from Building Claude Code: How We Use Skills](https://x.com/trq212/status/2033949937936085378)
>
> 作者：Thariq（Anthropic 工程师）
>
> 翻译日期：2025年3月17日

![封面图片](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Skills 已成为 Claude Code 中使用最广泛的扩展点之一。它们灵活、易于制作，且分发简单。

但这种灵活性也让人难以知道什么才是最佳实践。什么样的 Skills 值得制作？写好一个 Skill 的秘诀是什么？什么时候应该与他人分享？

在 Anthropic，我们在 Claude Code 中大量使用 Skills，目前有数百个 Skills 在活跃使用。以下是我们关于如何使用 Skills 来加速开发的经验教训。

---

## 什么是 Skills？

如果你对 Skills 还不熟悉，我建议你先阅读[我们的文档](https://code.claude.com/docs/en/skills)或观看我们最新的 [Agent Skills 课程](https://anthropic.skilljar.com/introduction-to-agent-skills)，本文假设你已经对 Skills 有一定了解。

我们经常听到的一个误解是，Skills "只是 markdown 文件"，但 Skills 最有趣的部分在于它们不仅仅是文本文件。它们是文件夹，可以包含脚本、资源、数据等，agent 可以发现、探索和操作这些内容。

在 Claude Code 中，Skills 还有[丰富的配置选项](https://code.claude.com/docs/en/skills#frontmatter-reference)，包括注册动态钩子。

我们发现 Claude Code 中一些最有趣的 Skills 创造性地使用了这些配置选项和文件夹结构。

---

## Skills 的类型

在对我们所有的 Skills 进行分类后，我们注意到它们聚集在几个常见的类别中。最好的 Skills 能干净地归入某一类；而令人困惑的那些则跨越了多个类别。这不是一份详尽的清单，但如果你想知道自己的组织内部是否缺少某些 Skills，这是一个很好的思考方式。

![Skills 类型图表](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. 库与 API 参考

解释如何正确使用库、CLI 或 SDK 的 Skills。这些可以是内部库，也可以是 Claude Code 有时处理不好的常见库。这些 Skills 通常包含一个参考代码片段文件夹和一个 Claude 在编写脚本时应避免的陷阱列表。

**示例：**

- **billing-lib** — 你的内部计费库：边缘情况、易错点等
- **internal-platform-cli** — 你的内部 CLI 包装器的每个子命令，以及何时使用它们的示例
- **frontend-design** — 让 Claude 更好地理解你的设计系统

---

### 2. 产品验证

描述如何测试或验证代码是否正常工作的 Skills。这些通常与外部工具（如 playwright、tmux 等）配对进行验证。

验证 Skills 对于确保 Claude 的输出正确非常有用。让一位工程师花一周时间完善你的验证 Skills 可能是值得的。

考虑一些技巧，比如让 Claude 录制其输出的视频，这样你就能看到它确切测试了什么，或者在每一步对状态强制执行程序化断言。这些通常通过在 Skill 中包含各种脚本来完成。

**示例：**

- **signup-flow-driver** — 在无头浏览器中运行注册 → 邮箱验证 → 引导流程，并在每一步都有断言状态的钩子
- **checkout-verifier** — 使用 Stripe 测试卡驱动结账 UI，验证发票实际上是否进入正确状态
- **tmux-cli-driver** — 用于交互式 CLI 测试，当你验证的内容需要 TTY 时

---

### 3. 数据获取与分析

连接到你的数据和监控栈的 Skills。这些 Skills 可能包含使用凭据获取数据的库、特定的仪表板 ID 等，以及关于常见工作流或获取数据方法的说明。

**示例：**

- **funnel-query** — "我需要连接哪些事件才能看到注册 → 激活 → 付费"，以及实际拥有规范 user_id 的表
- **cohort-compare** — 比较两个队列的留存率或转化率，标记统计上显著的差异，链接到细分定义
- **grafana** — 数据源 UID、集群名称、问题 → 仪表板查找表

---

### 4. 业务流程与团队自动化

将重复性工作流自动化为一个命令的 Skills。这些 Skills 通常是比较简单的说明，但可能对其他 Skills 或 MCP 有更复杂的依赖。对于这些 Skills，将之前的结果保存在日志文件中可以帮助模型保持一致并反思工作流的先前执行。

**示例：**

- **standup-post** — 聚合你的工单跟踪器、GitHub 活动和之前的 Slack → 格式化的站会，只显示变化
- **create-<ticket-system>-ticket** — 强制执行模式（有效的枚举值、必填字段）加上创建后的工作流（通知审查者、在 Slack 中链接）
- **weekly-recap** — 合并的 PR + 关闭的工单 + 部署 → 格式化的回顾帖子

---

### 5. 代码脚手架与模板

为代码库中的特定功能生成框架样板代码的 Skills。你可以将这些 Skills 与可组合的脚本结合使用。当你的脚手架有无法纯粹用代码覆盖的自然语言需求时，它们特别有用。

**示例：**

- **new-<framework>-workflow** — 用你的注解脚手架新的服务/工作流/处理器
- **new-migration** — 你的迁移文件模板加上常见的陷阱
- **create-app** — 新的内部应用，预配置你的认证、日志和部署配置

---

### 6. 代码质量与审查

在组织内部强制执行代码质量并帮助审查代码的 Skills。这些可以包含确定性脚本或工具以获得最大的健壮性。你可能希望将这些 Skills 作为钩子的一部分或在 GitHub Action 中自动运行。

**示例：**

- **adversarial-review** — 生成一个全新的子 agent 来批评，实施修复，迭代直到发现的问题变成吹毛求疵
- **code-style** — 强制执行代码风格，特别是 Claude 默认做得不好的风格
- **testing-practices** — 关于如何编写测试以及测试什么的说明

---

### 7. CI/CD 与部署

帮助你在代码库中获取、推送和部署代码的 Skills。这些 Skills 可能引用其他 Skills 来收集数据。

**示例：**

- **babysit-pr** — 监控 PR → 重试不稳定的 CI → 解决合并冲突 → 启用自动合并
- **deploy-<service>** — 构建 → 冒烟测试 → 逐步流量推出并比较错误率 → 回归时自动回滚
- **cherry-pick-prod** — 隔离的 worktree → cherry-pick → 冲突解决 → 带模板的 PR

---

### 8. 运行手册

接收症状（如 Slack 线程、警报或错误特征），通过多工具调查，并生成结构化报告的 Skills。

**示例：**

- **<service>-debugging** — 为你最高流量的服务映射症状 → 工具 → 查询模式
- **oncall-runner** — 获取警报 → 检查常见嫌疑 → 格式化发现
- **log-correlator** — 给定请求 ID，从可能接触它的每个系统中拉取匹配的日志

---

### 9. 基础设施运维

执行例行维护和操作程序的 Skills — 其中一些涉及受益于防护栏的破坏性操作。这些使工程师更容易在关键操作中遵循最佳实践。

**示例：**

- **<resource>-orphans** — 找到孤立的 pods/volumes → 发布到 Slack → 观察期 → 用户确认 → 级联清理
- **dependency-management** — 你组织的依赖批准工作流
- **cost-investigation** — "为什么我们的存储/出口账单激增"，包含特定的存储桶和查询模式

---

## 制作 Skills 的技巧

![制作 Skills 的技巧](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

一旦你决定要制作什么 Skill，该如何编写它？以下是我们发现的一些最佳实践、技巧和窍门。

我们还最近发布了 [Skill Creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)，让在 Claude Code 中创建 Skills 变得更容易。

---

### 不要陈述显而易见的内容

Claude Code 对你的代码库了解很多，而 Claude 对编码也了解很多，包括许多默认观点。如果你发布一个主要是关于知识的 Skill，试着专注于那些能推动 Claude 跳出其常规思维方式的信息。

[frontend design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) 是一个很好的例子 — 它是由 Anthropic 的一位工程师通过与客户迭代来改进 Claude 的设计品味而构建的，避免像 Inter 字体和紫色渐变这样的经典模式。

---

### 构建 Gotchas 部分

![Gotchas 部分](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

任何 Skill 中信号最高的内容是 Gotchas（陷阱）部分。这些部分应该从 Claude 在使用你的 Skill 时遇到的常见失败点积累而成。理想情况下，你会随着时间的推移更新你的 Skill 来捕获这些陷阱。

---

### 使用文件系统和渐进式披露

![文件系统](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

如前所述，Skill 是一个文件夹，不仅仅是一个 markdown 文件。你应该把整个文件系统视为一种上下文工程和渐进式披露的形式。告诉 Claude 你的 Skill 中有哪些文件，它会在适当的时候读取它们。

渐进式披露最简单的形式是指向其他 markdown 文件供 Claude 使用。例如，你可能将详细的函数签名和使用示例拆分到 references/api.md 中。

另一个例子：如果你的最终输出是一个 markdown 文件，你可能会在 assets/ 中包含一个模板文件供复制和使用。

你可以有引用、脚本、示例等文件夹，这些都有助于 Claude 更有效地工作。

---

### 避免过度约束 Claude

Claude 通常会尽量遵循你的指示，而且因为 Skills 是如此可重用，你要小心在指示中过于具体。给 Claude 它需要的信息，但给它适应情况的灵活性。例如：

![避免过度约束](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### 仔细考虑设置

![设置](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

某些 Skills 可能需要从用户那里获取上下文设置。例如，如果你正在制作一个将站会发布到 Slack 的 Skill，你可能希望 Claude 询问要发布到哪个 Slack 频道。

一个很好的模式是将此设置信息存储在 Skill 目录中的 config.json 文件中，如上面的示例。如果配置未设置，agent 可以向用户询问信息。

如果你希望 agent 呈现结构化的多选问题，你可以指示 Claude 使用 AskUserQuestion 工具。

---

### Description 字段是给模型看的

当 Claude Code 启动会话时，它会构建每个可用 Skill 及其描述的列表。这个列表是 Claude 扫描以决定"是否有适合此请求的 Skill"的内容。这意味着 description 字段不是摘要 — 它是描述何时触发此 Skill 的说明。

![Description 字段](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### 内存与数据存储

![内存与数据存储](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

某些 Skills 可以通过在其中存储数据来包含某种形式的内存。你可以将数据存储在像仅追加的文本日志文件或 JSON 文件这样简单的东西中，或者像 SQLite 数据库这样复杂的东西中。

例如，一个 standup-post Skill 可能保留一个 standups.log，记录它写过的每个帖子，这意味着下次你运行它时，Claude 会读取自己的历史记录，并可以告诉自昨天以来发生了什么变化。

存储在 Skill 目录中的数据可能会在你升级 Skill 时被删除，所以你应该将其存储在一个稳定的文件夹中。截至今天，我们提供 `${CLAUDE_PLUGIN_DATA}` 作为每个插件的稳定文件夹来存储数据。

---

### 存储脚本与生成代码

你能给 Claude 的最强大的工具之一是代码。给 Claude 脚本和库让 Claude 可以把它的回合花在组合上，决定下一步做什么，而不是重建样板代码。

例如，在你的数据科学 Skill 中，你可能有一个从事件源获取数据的函数库。为了让 Claude 进行复杂的分析，你可以给它一组辅助函数，如下所示：

![脚本示例 1](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

然后 Claude 可以即时生成脚本来组合这些功能，为像"周二发生了什么？"这样的提示进行更高级的分析。

![脚本示例 2](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### 按需钩子

Skills 可以包含仅在调用 Skill 时激活的钩子，并在会话期间持续。这用于你不希望一直运行但有时极其有用的更有主见的钩子。

例如：

- **/careful** — 通过 PreToolUse 匹配器在 Bash 上阻止 rm -rf、DROP TABLE、force-push、kubectl delete。你只在你知道要触碰生产环境时才需要这个 — 一直开着会让你发疯
- **/freeze** — 阻止任何不在特定目录中的 Edit/Write。在调试时很有用："我想添加日志，但我总是不小心'修复'不相关的东西"

---

## 分发 Skills

Skills 最大的好处之一是你可以与团队其他成员分享它们。

你可能通过两种方式与他人分享 Skills：

- 将你的 Skills 提交到你的仓库（在 ./.claude/skills 下）
- 制作一个插件，并建立一个 Claude Code 插件市场，用户可以在其中上传和安装插件（在[文档](https://code.claude.com/docs/en/plugin-marketplaces)中阅读更多）

对于在相对较少的仓库中工作的较小团队，将 Skills 提交到仓库效果很好。但每个提交的 Skill 也会增加模型的上下文一点。随着规模扩大，内部插件市场允许你分发 Skills 并让你的团队决定安装哪些。

---

### 管理市场

你如何决定哪些 Skills 进入市场？人们如何提交它们？

我们没有集中的团队来做决定；相反，我们尝试有机地找到最有用的 Skills。如果你有一个你想让人们尝试的 Skill，你可以将它上传到 GitHub 中的沙盒文件夹，并在 Slack 或其他论坛中指向它。

一旦一个 Skill 获得了关注（这由 Skill 所有者决定），他们可以提交 PR 将其移动到市场中。

需要注意的是，创建糟糕或冗余的 Skills 可能很容易，所以在发布前确保你有某种策划方法很重要。

---

### 组合 Skills

你可能希望有相互依赖的 Skills。例如，你可能有一个上传文件的文件上传 Skill，以及一个生成 CSV 并上传它的 CSV 生成 Skill。这种依赖管理目前尚未原生内置到市场或 Skills 中，但你可以通过名称引用其他 Skills，如果它们已安装，模型将调用它们。

---

### 衡量 Skills

为了了解 Skill 的表现，我们使用 PreToolUse 钩子，让我们在公司内部记录 Skill 使用情况（[示例代码在这里](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5)）。这意味着我们可以找到流行的 Skills 或与我们预期相比触发不足的 Skills。

---

## 结论

Skills 是 agent 非常强大、灵活的工具，但现在还为时过早，我们都在弄清楚如何最好地使用它们。

把这更多地看作是我们发现有效的一袋有用技巧，而不是确定的指南。理解 Skills 最好的方式是开始、实验，看看什么对你有效。我们大多数 Skills 开始时只有几行和一个陷阱，然后变得更好是因为人们在 Claude 遇到新的边缘情况时不断添加。

希望这对你有帮助，如果你有任何问题，请告诉我。
