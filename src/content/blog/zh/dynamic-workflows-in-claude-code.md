---
translationKey: "dynamic-workflows-in-claude-code"
locale: "zh"
title: "为每个任务打造专属 harness：Claude Code 中的 dynamic workflow"
description: "根据任务动态组合工具、上下文和验证步骤，而不是把所有工作塞进固定流程。"
publishedAt: "2026-06-03"
updatedAt: "2026-06-03"
category: "development"
sourceLocale: "zh"
sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code"
sourceAuthor: "Thariq Shihipar, Sid Bidasaria"
contentType: "adaptation"
translationStatus: "reviewed"
---

上周，我们在 Claude Code 中发布了 dynamic workflow。Claude 现在可以即时编写自己的 harness，针对当前任务量身定制。

> **Harness**：指 AI agent 中除模型本身之外的所有外围控制层——包括 prompt 组装、工具调度、上下文管理、错误恢复等。可以把 Claude Code 理解为 **Model + Harness**。下文中的 "harness" 均不翻译。

Claude Code 的默认 harness 是为编码构建的，但它对许多其他类型的任务也同样有用，因为事实证明，许多任务本质上与编码任务相似。但对于某些特定类别的任务，我们必须在 Claude Code 之上构建自定义 harness 才能达到最佳性能，例如 Research、安全分析、agent 团队协作或 Code Review。

Workflow 允许你动态创建构建在 Claude Code 之上的 harness，使 Claude 能够更原生地解决所有这些问题。你还可以与他人分享和复用这些 workflow。

在本文中，我将分享我在 workflow 方面的初步经验和心得，帮助你充分利用它们。请记住，最佳实践仍在发展中：dynamic workflow 通常会消耗更多 token，最适合复杂、高价值的任务。

## 示例 prompt

在深入技术细节之前，我想先用几个示例 prompt 来启发你思考 workflow 的可能性：

"这个测试大约每 50 次运行会失败 1 次。设置一个 workflow 来复现它。对竞争条件形成竞争性假设，不要停下来，直到某个假设能经受住证据的检验。"

"使用一个 workflow，检查我最近 50 个 session，挖掘我一直反复做的修正，把反复出现的那些变成 `CLAUDE.md` 规则。"

"使用一个 workflow 深入 Slack 的 #incidents 频道过去六个月的内容，找出没有提交过 ticket 的反复出现的根因。"

"拿我的商业计划书，运行一个 workflow，让不同的 agent 分别从投资者、客户和竞争对手的角度来挑毛病。"

"这里有一个文件夹里有 80 份简历，使用一个 workflow 来为后端岗位对它们排名，并复核前 10 名。用 AskUserQuestion 工具根据评分标准来面试我。"

"我需要给这个 CLI 工具起个名字。使用一个 workflow 头脑风暴一堆选项，然后运行一个锦标赛选出前 3 名。"

"使用一个 workflow 把我们的 User model 重命名为 Account，覆盖所有出现的地方。"

"过一遍我的博客草稿，用 workflow 针对代码库验证每一个技术声明，我不想发布任何有错误的内容。"

## Dynamic workflow 的工作原理

Dynamic workflow 执行一个 JavaScript 文件，其中包含几个特殊函数，用于生成和协调 subagent：

![Dynamic workflow 执行示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1684f559cc83ff4b465b_image1.png)

Dynamic workflow 还包含标准的 JavaScript 函数，如 JSON、Math 和 Array，帮助处理数据。

特别值得注意的是，dynamic workflow 可以决定 agent 使用哪个模型，以及 subagent 是否在自己的 worktree 中运行，这让 Claude 能够选择所需的智能级别和隔离程度。

如果 workflow 被中断（例如用户操作或退出终端），恢复 session 将允许 workflow 从中断的地方继续执行。

## 为什么需要 dynamic workflow

当你要求 Claude Code 的默认 harness 执行任务时，它需要在同一个 context window 中同时规划和执行。对于许多编码任务来说，这非常高效，但在长时间运行、大规模并行、高度结构化和/或对抗性任务中，可能会出问题。

这是因为 Claude 在单个 context window 中处理复杂任务的时间越长，就越容易出现以下几种特定的失败模式：

- **Agentic laziness（agent 懒惰）** 指 Claude 在完成一个特别复杂的多部分任务之前就停下来，在只完成部分进度后宣布任务完成，例如在安全 review 中只处理了 50 项中的 35 项。
- **Self-preferential bias（自我偏好偏差）** 指 Claude 倾向于偏好自己的结果或发现，尤其是在被要求根据 rubric 验证或评判自己的工作时。
- **Goal drift（目标漂移）** 指在多轮对话中逐渐偏离原始目标，尤其是在 compaction 之后。每次摘要步骤都是有损的，边缘情况的需求或"不要做 X"这样的约束可能会丢失。

创建 workflow 通过编排各自拥有独立 context window 和专注、隔离目标的 Claude subagent，来帮助应对这些问题。

## Dynamic workflow vs Static workflow

你可能之前已经使用 Claude Agent SDK 或 `claude -p` 创建过 static workflow，来协调多个 Claude Code 实例。

但由于 static workflow 需要应对所有边缘情况，它们通常更通用。借助 Claude Opus 4.8 和 dynamic workflow，Claude 现在足够智能，能够为你的具体用例编写量身定制的 harness。

![Static workflow 与 Dynamic workflow 对比](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f3a0e17e2844bed86f22a_image9.png)

## Dynamic workflow 的常用模式

你可以直接要求 Claude 创建一个 dynamic workflow，或者使用触发词 "`ultracode`" 来确保 Claude Code 创建 workflow。

但建立 dynamic workflow 工作原理的思维模型，将帮助你理解何时使用它们，以及如何通过 prompt 来引导 Claude。

以下是 Claude 在构建 workflow 时可能会使用和组合的几种常见模式：

![Workflow 常用模式概览](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f16d86247e586b929a407_image10.png)

### Classify-and-act（分类后行动）

使用一个分类 agent 来判断任务类型，然后根据任务路由到不同的 agent 或行为。或者，在最后使用分类器来确定输出。

### Fan-out-and-synthesize（扇出后综合）

将任务拆分为许多较小的步骤，在每个步骤上运行一个 agent，然后综合这些结果。这在有大量较小步骤时特别有用，或者当每个步骤受益于自己独立的 context window，以免互相干扰或交叉污染时。综合步骤是一个屏障——它等待所有扇出的 agent 完成，然后将它们的结构化输出合并为一个结果。

### Adversarial verification（对抗性验证）

对于每个生成的 agent，运行一个独立的 agent 来根据 rubric 或标准对抗性地验证其输出。

### Generate-and-filter（生成后过滤）

针对某个主题生成大量想法，然后通过 rubric 或验证来过滤它们，去除重复项，只返回经过测试的最高质量想法。

### Tournament（锦标赛）

不是分割工作，而是让 agent 竞争。生成 N 个 agent，每个 agent 用不同的方法尝试同一任务。然后通过 prompt 或模型使用评判 agent 以两两对决的方式评判结果，直到产生赢家。

### Loop until done（循环直到完成）

对于工作量未知的任务，循环生成 agent 直到满足停止条件（没有新发现，或者日志中没有更多错误），而不是固定次数的迭代。

## 使用场景

创造性地思考何时以及如何让 Claude Code 创建 dynamic workflow。我发现 workflow 有时甚至对非技术工作更有用。

### 迁移和重构

Bun 从 Zig 重写到 Rust 就是使用 workflow 完成的。你可以在 Jarred 的 X 帖子中了解更多细节。

关键是将任务分解为一系列需要处理的步骤，例如调用点、失败的测试、模块等。为每个修复在一个 worktree 中启动一个 subagent 来执行修复，然后让另一个 agent 对抗性 review，最后 merge 它们。考虑告诉 agent 不要使用资源密集型命令，这样你就可以最大化并行度，而不会耗尽机器上的资源。

### 深度研究

我们在 Claude Code 中发布了一个深度研究 skill（`/deep-research`），它使用了 dynamic workflow。具体来说，它扇出网络搜索、获取来源、对抗性验证其声明，然后综合生成一份带引用的报告。

但你可能不仅仅对网络搜索需要这种研究。例如，让 Claude 从 Slack 中的上下文编译状态报告，或者通过深入探索代码库来研究某个功能的工作原理。

### 深度验证

![深度验证 workflow 示意](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1721824a27cf13da87f4_image2.png)

另一方面，如果你有一份报告，想要检查和溯源其中引用的每一个事实声明，你可能想生成一个 workflow：一个 agent 识别所有事实声明，然后为每个声明启动一个 subagent 来详细检查。你还可以让一个验证 agent 检查来源 subagent，确保其来源质量可靠。

### 排序

![排序 workflow 示意](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f173ce727a972001584cc_image3.png)

你可能有一组项目想按照某种你认为 Claude Code 擅长评估的定性指标来排序，例如：按 bug 严重程度对支持工单排序。但如果你试图在一个 prompt 中对 1000+ 行进行排序，质量会下降，而且无法放入 context 中。相反，可以运行一个锦标赛、一个两两比较 agent 的 pipeline（比较判断比绝对评分更可靠），或者分桶并行排序后合并。每次比较都是一个独立的 agent，因此确定性循环持有对阵表，只有运行顺序留在 context 中。

### 记忆和规则遵守

![记忆和规则遵守 workflow 示意](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17517076bb59050d90bb_image8.png)

如果你有一组特定的规则发现 Claude 经常遗漏或难以遵守，即使写进了 `CLAUDE.md`，也可以创建一个 workflow，列出必须由验证 agent 检查的规则——每条规则一个验证者。创建一个怀疑者角色的 subagent 来审查规则，确保规则合理，有助于避免过多误报。

反向操作也有效：挖掘你最近的 session 和 code review 评论中反复做的修正，用并行 agent 对它们聚类，对抗性验证每个候选规则（这条规则是否能阻止一个真实的错误？），然后将幸存者提炼回 `CLAUDE.md`。

### 根因调查

调试在提出多个独立假设并逐一验证时效果最好，但如果你只使用一个 context window，Claude 可能会遇到 self-preferential bias。

Workflow 可以从结构上防止这种情况，方法是启动 agent 从不重叠的证据中生成假设。例如，分别针对日志、文件和数据的独立 agent。每个假设然后面对一组验证者和反驳者。

这不仅适用于代码。Workflow 可用于销售（为什么三月份销量下降了？）、数据工程（为什么这个 pipeline 失败了？），或任何事后分析。

### 大规模分诊

![大规模分诊 workflow 示意](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1778dc00d34cca70819d_image6.png)

每个团队都有支持队列、bug 报告或其他无法由人力完全处理的工作积压。

分诊 workflow 对每个项目进行分类、对已跟踪的内容去重，然后采取行动。这可能意味着尝试修复或将问题升级给人工处理。

分诊 workflow 的一个有用模式是隔离（quarantine）。这涉及禁止读取不受信任公开内容的 agent 执行高权限操作，这些操作由负责根据信息采取行动的 agent 来完成。

将分诊 workflow 与 `/loop` 配对使用，让 Claude 持续执行。

### 探索和审美判断

Workflow 在探索解决方案的不同方法时很有用，尤其是当选择基于审美时，如设计或命名，并且可以从 rubric 中受益。

尝试让 Claude 探索一堆解决方案，并给 review agent 一个好方案应具备的 rubric。当 review agent 认为满足标准时，任务完成。解决方案也可以根据 rubric 通过锦标赛进行排序或选择。

### Eval

你可以通过在 worktree 中启动独立的 agent，然后启动比较 agent 来根据 rubric 比较和评级特定输出，从而为特定任务运行轻量级 eval。例如，根据特定标准评估和改进你创建的 skill。

### 模型和智能级别路由

创建一个针对你的任务调优的分类 agent，决定使用哪个模型。当你的任务将涉及大量工具调用，并且在执行前进行研究可以确定最佳模型时，这会很有帮助。

例如，任务"解释 auth 模块的工作原理"的最佳模型取决于 auth 模块中有多少文件以及代码库的结构。分类 agent 可以进行这项研究，然后根据任务的预期复杂度路由到 Sonnet 或 Opus。

## 何时不该使用 dynamic workflow

Workflow 是新功能。虽然许多用例会产生超预期的效果，但它们并非每个任务都需要，可能最终消耗显著更多的 token。

最好创造性地使用 workflow，以之前未尝试过的方式推动 Claude Code。对于常规编码任务，问问自己：它真的需要更多计算吗？例如，大多数传统编码任务不需要 5 个 reviewer 组成的评审团。

## 构建 dynamic workflow 的技巧

### Prompting

使用我们上面描述的特定技术进行详细的 prompt，能为 dynamic workflow 带来最佳结果。

Workflow 不仅适用于大型任务。你可以 prompt 模型使用"快速 workflow"。例如，你可以对某个假设进行一次快速的对抗性 review。

### 与 `/goal` 和 `/loop` 配合使用

当使用可重复的 workflow 时（例如分诊、研究或验证），将它们与 `/loop` 配对以定期运行，与 `/goal` 配对以设置硬性完成条件。

### Token 用量预算

你可以为 dynamic workflow 设置明确的 token 用量预算，以限制任务消耗的 token 数量。你可以用这样的 prompt 设置预算："使用 10k token"，这将设置上限。

### 保存和分享 dynamic workflow

你可以通过在 workflow 菜单中按 "s" 来保存 workflow。你可以将它们提交到 `~/.claude/workflows` 或通过 skill 分发。

![保存 workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17b1ca20533e666c867c_image4.png)

要通过 skill 分享，将你的 JavaScript workflow 文件放在 skill 文件夹中，并在 `SKILL.MD` 中引用它们。为了获得更大的灵活性，你可能想 prompt Claude 将 skill 中的 workflow 视为模板，而不是需要逐字执行的脚本。

![通过 skill 分享 workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17cb835cf4f9fd5da921_image7.png)

## 探索的新起点

Workflow 是扩展 Claude Code 的一种有益新方式。我鼓励你将它们视为一个起点，去探索使用 Claude 帮助完成任务的新方法。关于如何最好地使用它们，还有很多有待发现。告诉我你的发现。

---

*本文由 Thariq Shihipar 和 Sid Bidasaria 撰写，他们是 Anthropic 的技术团队成员，在 Claude Code 团队工作。*
