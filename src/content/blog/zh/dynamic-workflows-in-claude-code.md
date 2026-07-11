---
translationKey: "dynamic-workflows-in-claude-code"
locale: "zh"
title: "为每个任务打造专属 harness：Claude Code 中的 dynamic workflows"
description: "Claude Code 现在可以即时编写并编排面向具体任务的多 agent harness。"
publishedAt: "2026-06-02"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code"
sourceAuthor: "Thariq Shihipar, Sid Bidasaria"
contentType: "adaptation"
translationStatus: "reviewed"
---

上周，我们在 Claude Code 中发布了 [dynamic workflows](https://code.claude.com/docs/en/workflows)。Claude 现在可以即时编写自己的 [harness](https://code.claude.com/docs/en/glossary#agentic-harness)，为手头的任务量身定制。

> **Harness** 指 AI 模型周围的控制层，包括 prompt 组装、工具编排、上下文管理和错误恢复等。可以把 Claude Code 理解为 **Model + Harness**。本文保留 harness 原词。

Claude Code 的默认 harness 面向编码，但许多其他任务本质上也很像编码任务，因此同样适用。不过，有些工作要达到最佳效果，仍需要在 Claude Code 之上构建专门的 harness，例如 [Research](https://support.claude.com/en/articles/11088861-using-research-on-claude)、[安全分析](https://support.claude.com/en/articles/11932705-automated-security-reviews-in-claude-code)、[agent teams](https://code.claude.com/docs/en/agent-teams) 和 [Code Review](https://code.claude.com/docs/en/code-review)。

Workflows 让 Claude 能够在 Claude Code 之上动态创建这些面向任务的 harness，也可以保存、分享和复用。

本文整理我们使用 workflows 的早期经验。最佳实践仍在发展中：dynamic workflows 往往消耗更多 token，更适合复杂且高价值的任务。

## 示例 prompts

在进入技术细节之前，先看几个例子，感受 workflows 可以解决什么问题：

"这个测试大约每运行 50 次会失败一次。建立一个 workflow 来复现它。针对竞争条件提出相互竞争的理论，在某个理论经受住证据检验之前不要停。"

"用一个 workflow 检查我最近 50 个 session，找出我反复做出的修正，把重复出现的修正写成 `CLAUDE.md` 规则。"

"用一个 workflow 深挖 Slack 的 #incidents 频道过去六个月的内容，找出那些反复发生、却一直没人提交 ticket 的根因。"

"拿我的商业计划书运行一个 workflow，让不同 agent 分别从投资者、客户和竞争对手的视角来挑问题。"

"这里有 80 份简历。用一个 workflow 为后端岗位排序，并复核前十名。使用 AskUserQuestion 工具采访我，确定评分 rubric。"

"我需要给这个 CLI 工具起名。用一个 workflow 广泛发散，再运行 tournament 选出前三名。"

"用一个 workflow 把 User model 在所有地方重命名为 Account。"

"检查我的博客草稿，用 workflow 对照代码库验证每一项技术声明。我不想发布任何错误内容。"

## Dynamic workflows 如何工作

Dynamic workflows 会执行一个 JavaScript 文件，其中包含若干用于生成和协调 [subagents](https://code.claude.com/docs/en/sub-agents) 的特殊函数：

![Dynamic workflow 生成并协调 subagents 的示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1684f559cc83ff4b465b_image1.png)

它也提供 JSON、Math、Array 等标准 JavaScript 对象来处理数据。

Dynamic workflow 可以决定 agent 使用哪个模型，以及 subagent 是否在独立 worktree 中运行，让 Claude 为每一步选择合适的智能水平和隔离程度。

如果 workflow 因用户操作或退出终端而中断，恢复 session 后可以从中断处继续。

## 为什么需要 dynamic workflows

Claude Code 的默认 harness 必须在同一个 context window 中规划并执行任务。对许多编码任务而言，这非常有效；但面对长时间运行、大规模并行、高度结构化或对抗性的工作时，它可能失效。

Claude 在单个 context window 中处理复杂任务越久，就越容易出现几类失败模式：

- **Agentic laziness**：复杂的多部分任务还没完成，Claude 就在取得部分进展后宣布结束，例如安全 review 的 50 项只处理了 35 项。
- **Self-preferential bias**：Claude 倾向于偏好自己的结果，尤其是在按 rubric 验证或评判自己的工作时。
- **Goal drift**：多轮交互后逐渐偏离原始目标，compaction 之后尤其明显。每次摘要都有信息损失，边缘需求和“不要做 X”之类的约束可能被漏掉。

Workflow 通过编排多个独立的 Claude subagents 来应对这些问题：每个 subagent 都有自己的 context window，以及聚焦、隔离的目标。

## Dynamic 与 static workflows

你可能已经用 Claude Agent SDK 或 `claude -p` 构建过 static workflow，用来协调多个 Claude Code 实例。

Static workflows 必须提前覆盖各种边缘情况，因此通常更通用。借助 [Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8) 和 dynamic workflows，Claude 可以针对当前用例编写专属 harness。

![Static 与 dynamic workflows 对比](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f3a0e17e2844bed86f22a_image9.png)

## Dynamic workflows 的常用模式

你可以直接要求 Claude 创建 dynamic workflow，也可以使用触发词 `ultracode` 明确表达这个意图。

理解常见模式，有助于判断何时该用 workflow，以及如何在 prompt 中引导 Claude。

Claude 可以使用并组合以下模式：

![Dynamic workflows 常用模式概览](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f16d86247e586b929a407_image10.png)

### Classify-and-act

由 classifier agent 判断任务类型，再路由到不同的 agent 或行为。也可以在流程末尾运行 classifier，决定如何处理输出。

### Fan-out-and-synthesize

把任务拆成较小步骤，为每一步运行独立 agent，再综合结果。这适合步骤很多的任务，也适合让每一步使用干净的 context window，避免相互干扰和交叉污染。综合步骤是一道屏障：等待所有 fan-out agents 完成，再把结构化输出合并为一个结果。

### Adversarial verification

每当一个 agent 产出结果，就启动另一个独立 agent，依据 rubric 或明确标准对其进行对抗性验证。

### Generate-and-filter

先生成大量想法，再通过 rubric 或验证步骤筛选、去重，只返回经过检验的最佳候选。

### Tournament

不拆分工作，而是让 agents 竞争。生成 N 个 agents，用不同方法尝试同一任务，再由 judge agent 或模型两两比较，直到选出赢家。

### Loop until done

面对工作量未知的任务，不预设固定轮次，而是持续生成 agents，直到没有新发现、日志中不再有错误等停止条件成立。

## 使用场景

可以更大胆地思考何时让 Claude Code 创建 dynamic workflow。对某些非技术工作，workflows 甚至比对编码更有价值。

### 迁移与重构

[Bun](https://bun.com/) 从 Zig 重写到 Rust 时使用了 workflows。[Jarred 的 X thread](https://x.com/jarredsumner/status/2060050578026189172) 介绍了具体做法。

关键是把迁移拆成调用点、失败测试、模块等具体单元。为每个修复在 worktree 中启动 subagent，再让另一个 agent 做对抗性 review，最后合并。必要时要求 agents 避免资源密集型命令，让机器能够承受更高并行度。

### Deep research

Claude Code 内置了基于 dynamic workflows 的深度研究 skill：`/deep-research`。它会 fan out 网络搜索、获取来源、对声明进行对抗性验证，最后综合为带引用的报告。

这一模式不限于网络搜索。Claude 也可以根据 Slack 上下文整理状态报告，或深入代码库研究某个功能如何工作。

### Deep verification

![Deep verification workflow 示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1721824a27cf13da87f4_image2.png)

如果已有一份报告，需要逐项检查其中的事实声明，可以让一个 agent 识别全部声明，再为每项声明启动独立 subagent。还可以增加 verifier，判断每个来源是否足够可靠。

### 排序

![排序 workflow 示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f173ce727a972001584cc_image3.png)

假设你要按某种 Claude Code 擅长判断的定性指标排序，例如按 bug 严重程度排列支持工单。把 1,000 多行一次塞进 prompt，会导致质量下降，也超出有效 context。更合适的方式是 tournament、两两比较 agents 组成的 pipeline，或先并行分桶排序再合并。比较判断通常比绝对打分更可靠，而且每次比较都有独立 context window。

### 记忆与规则遵守

![记忆与规则遵守 workflow 示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17517076bb59050d90bb_image8.png)

如果 Claude 即使面对 `CLAUDE.md` 仍反复遗漏某些规则，可以建立 workflow，每条规则配一个 verifier。再用 skeptic subagent 审查规则本身，以减少误报。

反向操作也成立：从近期 sessions 和 code review 评论中挖掘反复出现的修正，用并行 agents 聚类，对抗性检验每条候选规则是否真的能避免一次错误，再把有效规则提炼回 `CLAUDE.md`。

### 根因调查

调试最适合先提出多个独立假设，再逐一验证。只使用一个 context window，更容易出现 self-preferential bias。

Workflow 可以从结构上规避这一点：让独立 agents 分别分析日志、文件、数据等互不重叠的证据，再让每个假设接受独立 verifier 和 refuter 的检验。

这一模式不限于代码，也适用于销售分析、数据工程故障和各种事后复盘。

### 大规模分诊

![大规模分诊 workflow 示意图](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1778dc00d34cca70819d_image6.png)

每个团队都有支持队列、bug 报告或其他人力无法完全处理的积压。

分诊 workflow 会分类每个项目，与已跟踪内容去重，再采取相应行动，例如尝试修复或升级给人工处理。

Quarantine 是这里很有用的模式：读取不受信任公开内容的 agents 不得执行高权限操作，由另一组 agents 根据信息采取行动。

把分诊 workflows 与 [`/loop`](https://claude.com/blog/getting-started-with-loops) 配合，让 Claude 持续运行。

### 探索与品味判断

当需要探索多种方案，而最终选择取决于品味，例如设计或命名，并且可以通过 rubric 表达时，workflows 很有用。

让 Claude 探索多种方案，再给 review agent 一套好方案应满足的 rubric。Review agent 判断标准已满足时，任务结束。也可以用 tournament 按 rubric 排序或选出候选。

### Evals

可以在 worktrees 中启动独立 agents，再由 comparison agents 按 rubric 评价输出，从而运行轻量 eval。例如，根据具体标准评估并改进某个 skill。

### 模型与智能路由

创建针对任务调优的 classifier agent，让它选择模型。这适合先通过研究和工具调用判断实际执行需要多少智能的任务。

例如，“解释 auth 模块如何工作”该用哪个模型，取决于模块规模和代码库结构。Classifier 可以先检查这些信息，再按预期复杂度路由到 Sonnet 或 Opus。

## 何时不该使用 dynamic workflows

Workflows 仍是新能力。它们可能带来超预期结果，但不是每个任务都需要，而且可能显著增加 token 用量。

只有当并行、专业分工或对抗性检查值得其协调成本时才使用。多数常规编码任务不需要五人 reviewer 小组。系统架构层面对 [multi-agent 与 single-agent](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them) 的选择也遵循同样原则。

## 构建 dynamic workflows 的技巧

### Prompting

在 prompt 中明确需要的 workflow 模式，通常能得到更好的结果。

Workflows 也不只用于大型任务。你可以要求一个“quick workflow”，例如快速对抗性 review 某个假设。

### 与 `/goal` 和 `/loop` 配合

对于分诊、研究、验证等可重复 workflows，把 [`/loop`](https://claude.com/blog/getting-started-with-loops) 与 [`/goal`](https://code.claude.com/docs/en/workflows) 配合使用：前者按周期运行，后者设置硬性完成条件。

### Token 用量预算

可以为 dynamic workflow 设置明确的 token 预算。像“use 10k tokens”这样的 prompt，会为任务设置 10k token cap。

### 保存与分享 dynamic workflows

在 workflow 菜单中按 `s` 即可保存。你可以把它提交到 `~/.claude/workflows`，或通过 skill 分发。

![从 workflow 菜单保存 workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17b1ca20533e666c867c_image4.png)

通过 skill 分享时，把 JavaScript workflow 文件放入 skill 文件夹，并在 `SKILL.md` 中引用。为了保留灵活性，可以让 Claude 把 workflow 当作模板，而不是必须逐字执行的脚本。

![通过 skill 分享 workflow](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17cb835cf4f9fd5da921_image7.png)

## 探索的新起点

Workflows 是扩展 Claude Code 的一种新方式。可以把它们当作探索起点，寻找 Claude 协助完成工作的更多方法；关于如何用好它们，仍有很多值得发现。

关于 harness 中应该包含什么，可参阅 Anthropic 的[三种 harness 设计模式](https://claude.com/blog/harnessing-claudes-intelligence)。

---

*本文由 Anthropic Claude Code 团队的 technical staff Thariq Shihipar 和 Sid Bidasaria 撰写。*
