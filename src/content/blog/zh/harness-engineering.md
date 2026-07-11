---
translationKey: "harness-engineering"
locale: "zh"
title: "面向编码 Agent 用户的 Harness 工程"
description: "用 guides、sensors、反馈回路和架构约束，提高编码 Agent 产出的可信度。"
publishedAt: "2026-04-02"
updatedAt: "2026-04-02"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://martinfowler.com/articles/harness-engineering.html"
sourceAuthor: "Birgitta Böckeler"
contentType: "adaptation"
translationStatus: "reviewed"
---

> **术语说明**
>
> **Harness** 指 AI Agent 中除模型之外的所有组成部分，即 Agent = Model + Harness。对编码 Agent 而言，它既包括构建者提供的系统 prompt、代码检索和编排，也包括用户控制的外层规则、Skills、脚本和检查。
>
> **Guides / Sensors**：Guides 是 feedforward 控制，在 Agent 行动前加以引导；Sensors 是 feedback 控制，在 Agent 行动后观察结果并触发自我修正。
>
> **Computational / Inferential**：Computational 控制是测试、linter、类型检查器等确定性工具；Inferential 控制依赖语义判断，例如 AI code review 或 LLM-as-judge。

---

“harness” 已成为 AI Agent 领域的常用简称，指模型之外的一切：[Agent = Model + Harness](https://blog.langchain.com/the-anatomy-of-an-agent-harness/)。这个定义非常宽，因此有必要在编码 Agent 的限界上下文中进一步收窄。

编码 Agent 的一部分 harness 由构建者提供，例如系统 prompt、代码检索，以及某些[复杂的编排系统](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)。同时，编码 Agent 也为用户提供能力，让我们针对自己的系统和用例构建外层 harness。

![三个同心圆，中心是模型，外侧依次是编码 Agent 的 builder harness 和用户构建的外层 harness](/assets/blog/harness-engineering/harness-bounded-contexts.png)

图 1：同一个“harness”在不同限界上下文中含义不同。

一个良好的外层 harness 有两个目标：提高 Agent 首次完成任务的概率，并通过反馈回路，在问题到达人类之前尽可能自我修正。预期结果是减少 review 负担、提高系统质量；沿途减少无效 token 消耗只是附带收益。

![Guides 输入编码 Agent，Sensors 将结果反馈给自我修正回路，人类同时驾驭两者的概览图](/assets/blog/harness-engineering/harness-overview.png)

## Feedforward 与 Feedback

Harness 工程结合两类控制：

- **Guides（feedforward controls）** 预判不希望出现的行为，在 Agent 行动**之前**引导它，提高首次产出正确结果的概率。
- **Sensors（feedback controls）** 在 Agent 行动**之后**观察结果并帮助其自我修正。当信号专门为 LLM 消费而设计时尤其有效，例如在自定义 linter 消息中直接附带修正指令，这是一种正向的 prompt injection。

两者单独使用都不完整。只有 feedback，Agent 会反复犯同样的错误；只有 feedforward，系统写下了规则，却永远不知道规则是否奏效。

## Computational vs Inferential

Guides 和 Sensors 可以采用两种执行类型：

- **Computational**：确定、快速，通常由 CPU 执行。测试、linter、类型检查和结构分析可以在毫秒到秒级完成，结果可靠。
- **Inferential**：语义分析、AI code review 和 LLM-as-judge，通常由 GPU 或 NPU 执行。它们更慢、更贵，而且具有非确定性。

Computational guides 用确定性工具提高首次产出质量。Computational sensors 足够便宜、快速，可以在每次变更时与 Agent 一起运行。Inferential 控制虽然更昂贵、结果会波动，但能提供丰富的语义指导和判断。只要模型足够强，或者更准确地说适合当前任务，inferential sensors 仍能提高信任度。

**示例**

| 场景 | 方向 | 类型 | 示例实现 |
| --- | --- | --- | --- |
| 编码规范 | feedforward | Inferential | AGENTS.md, Skills |
| 初始化新项目 | feedforward | Both | 包含说明和 bootstrap 脚本的 Skill |
| Codemods | feedforward | Computational | 可使用 OpenRewrite recipes 的工具 |
| 结构测试 | feedback | Computational | 在 pre-commit 或编码 Agent hook 中运行 ArchUnit，检查模块边界 |
| Review 说明 | feedback | Inferential | Skills |

### 与 context engineering 的关系

[Context engineering](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) 提供了把 guides 和 sensors 交给 Agent 的手段。为编码 Agent 构建 user harness，本身就是一种具体的 context engineering。

## Steering loop

人类的职责是通过持续迭代 harness 来 **steer** Agent。每当某个问题重复发生，就改进 feedforward 和 feedback 控制，让它以后更少发生，甚至彻底避免。

AI 也可以帮助改进 harness 本身。编码 Agent 大幅降低了定制控制和静态分析的构建成本：它们可以编写结构测试、从已有模式中提炼规则草案、搭建自定义 linter，或通过代码考古生成 how-to 指南。

## 时机：让质量左移

实践[持续集成](https://martinfowler.com/articles/continuousIntegration.html)的团队，一直需要按成本、速度和关键程度，把测试、检查和人工 review 分布在开发时间线上。追求[持续交付](https://martinfowler.com/bliki/ContinuousDelivery.html)的团队，理想上希望每个 commit 状态都可部署。检查应尽可能放在通往生产环境路径的左侧，因为问题越早发现，修复越便宜。

Feedback sensors，包括 inferential sensors，也应据此分布在整个生命周期中。

**变更生命周期中的 feedforward 与 feedback**

- 哪些控制足够快，应该在集成前，甚至 commit 创建前运行？例如 linter、快速测试套件和基础 code review agent。
- 哪些控制成本更高，应只在集成后的 pipeline 中运行，同时重复快速检查？例如 mutation testing，以及需要纵观全局的广泛 code review。

![变更生命周期中集成前后 feedforward guides 与 feedback sensors 的示例](/assets/blog/harness-engineering/harness-change-lifecycle-examples.png)

**持续 drift 与 health sensors**

- **Codebase drift sensors** 在变更生命周期之外持续运行，检测逐渐积累的退化，例如死代码、薄弱的测试覆盖和依赖问题。
- **Runtime health sensors** 让 Agent 监控生产信号，例如恶化的 SLO、抽样响应质量或异常日志，并提出改进建议。

![集成后的持续 codebase drift 检测和 runtime feedback sensors 示例](/assets/blog/harness-engineering/harness-continuous-feedback-examples.png)

## 调节类别

Agent harness 像一个[控制论](https://en.wikipedia.org/wiki/Cybernetics)中的 governor，结合 feedforward 与 feedback，把 codebase 调节到期望状态。这个状态有多个维度，每个维度需要不同的 harness。区分这些类别很重要，因为它们的 harnessability 和复杂度差异很大。

目前可以分为三类：

### Maintainability harness

本文的大多数例子都在调节内部代码质量和可维护性。因为已经有成熟工具，这是目前最容易构建的 harness。

要判断这些控制在多大程度上提高信任，可以把它们与[常见编码 Agent 失败模式](https://martinfowler.com/articles/exploring-gen-ai/13-role-of-developer-skills.html)对照：

- **Computational sensors 能可靠捕获结构问题**，例如重复代码、圈复杂度、覆盖率缺失、架构 drift 和风格违规。这些控制便宜、成熟且确定。
- **LLM 能部分处理语义问题**，例如语义重复、冗余测试、暴力修复和过度工程，但成本高、结果是概率性的。这类检查不适合每个 commit 都运行。
- **两者都无法可靠捕获某些高影响问题**，包括问题误诊、不必要的功能、过度工程和误解指令。它们偶尔能发现，但还不足以取消人类监督。如果人类从未清楚说明期望结果，正确性就超出了任何 sensor 的职责范围。

### Architecture fitness harness

这一类汇集定义并检查应用架构特征的 guides 和 sensors，本质上就是 [Fitness Functions](https://www.thoughtworks.com/en-de/radar/techniques/architectural-fitness-function)。

示例：

- Skills 前馈性能要求，性能测试则反馈 Agent 的改动带来了提升还是退化。
- Skills 描述可观测性规范，例如日志标准；调试说明要求 Agent 反思现有日志的质量。

### Behaviour harness

这是最难的一类：如何引导并检测应用是否按用户需要的方式运行？

- **Feedforward**：功能规格说明，详细程度可以从一段短 prompt 到多文件描述。
- **Feedback**：AI 生成的测试套件通过、覆盖率合理，有时再用 mutation testing 监控测试质量，并辅以手动测试。

这种方式对 AI 生成的测试寄予了过多信任。一些团队使用 [approved fixtures](https://lexler.github.io/augmented-coding-patterns/patterns/approved-fixtures/) pattern 取得了不错效果，但它在某些领域更容易应用。这是一种选择性工具，不是测试质量的完整答案。

在 behaviour harness 足以让团队放心减少监督和手动测试之前，我们还有很多工作要做。

![Guides 与 sensors 横跨 maintainability、architecture fitness 和 behaviour 三个维度的简化 harness 模型](/assets/blog/harness-engineering/harness-types.png)

## Harnessability

并非所有 codebase 都同样适合构建 harness。强类型语言天然提供类型检查 sensor；清晰的模块边界使架构约束成为可能；Spring 等框架隐藏了 Agent 无需处理的细节，间接提高成功率。缺少这些属性，相应的控制就无法构建。

Greenfield 和遗留系统面对不同约束：

- **Greenfield 团队**可以从第一天就把 harnessability 纳入设计。技术和架构选择决定 codebase 的可治理程度。
- **遗留系统团队**，尤其面对大量技术债时，问题更难：最需要 harness 的地方，往往也是最难构建 harness 的地方。

## Harness templates

多数企业依赖少数几种常见服务拓扑来覆盖大部分需求，例如通过 API 提供数据的业务服务、事件处理器和数据仪表盘。成熟组织通常已经把这些拓扑编码成 service templates。

这些模板未来可能演变为 **harness templates**：把 guides 和 sensors 组合起来，将编码 Agent 约束在特定拓扑的结构、规范和技术栈中。团队甚至可能部分依据现成 harness 来选择技术和架构。

![多种服务拓扑示例，每种拓扑都有包含 guides 和 sensors 的 harness template](/assets/blog/harness-engineering/harness-templates.png)

### Ashby's Law

[Ashby's Law of Requisite Variety](https://en.wikipedia.org/wiki/Variety_%28cybernetics%29#Law_of_requisite_variety) 为预定义拓扑提供了另一层论据：调节器至少要拥有与被调节系统同等的多样性，而且只能调节自己拥有模型的部分。基于 LLM 的编码 Agent 几乎可以生成任何东西；一旦承诺使用某种拓扑，就缩小了可能性空间，使完整 harness 更可实现。定义拓扑，本质上是在降低 variety。

Harness templates 也继承了 service templates 的维护问题：一旦实例化，就会逐渐偏离上游改进。当 guides 和 sensors 具有非确定性、难以测试时，版本管理和贡献可能更困难。

## 人类的角色

人类开发者把技能和经验作为隐式 harness 带入每个 codebase。我们吸收了规范和良好实践，体验过复杂性带来的认知代价，也知道自己的名字会出现在 commit 上。我们还携带组织上下文：团队想实现什么、业务允许哪些技术债、此处的“好”意味着什么。以人类节奏小步工作，为这些经验被触发和应用留下空间。

编码 Agent 没有这些。它没有社会问责感，不会本能地厌恶 300 行函数，没有“我们这里不这么做”的直觉，也没有组织记忆。它无法判断哪些规范是承重约束、哪些只是习惯，也不知道技术上正确的方案是否符合团队意图。

Harness 试图把人类经验的一部分外化并显式表达，但能力有限。一套 coherent 的 guides、sensors 和 self-correction loops 成本不低。好的 harness 不一定要消除人类输入，而是把人类注意力引向最重要的地方。

## 起点与开放问题

这个思维模型汇总了已经出现在实践中的技术，也帮助界定仍未解决的问题。它把讨论从 Skills、MCP servers 等单个功能，提升到如何战略性地设计控制系统，让我们真正信任 Agent 的产出。

当前实践包括：

- [OpenAI 团队记录了自己的 harness](https://openai.com/index/harness-engineering/)：用自定义 linter 和结构测试强制执行分层架构，并定期运行“垃圾回收”，扫描 drift、让 agents 建议修复。他们的结论是，当前最困难的挑战已经集中在环境、feedback loops 和控制系统的设计上。
- [Stripe 关于 minions 的文章](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents)介绍了基于启发式选择相关 linter 的 pre-push hooks，强调把 feedback 左移，并用“blueprints”把 feedback sensors 集成到 Agent workflows 中。
- Mutation testing 和结构测试是过去使用不足、如今重新受到重视的 computational feedback sensors。
- LSP 与代码智能集成，是 computational feedforward guides 的例子。
- Thoughtworks 团队正在结合 computational 与 inferential sensors 应对架构 drift，例如让 agents 配合自定义 linter，或用“janitor army”改善代码质量。

仍有许多问题待解：harness 扩大后，如何保持 guides 与 sensors 一致？当指令和 feedback 信号冲突时，Agent 能在多大程度上做出可靠权衡？如果 sensor 从未触发，是质量很高，还是检测太弱？我们需要类似 code coverage 和 mutation testing 的方法来评估 harness 覆盖率与质量。Feedforward 和 feedback 仍散落在各个交付步骤中，也为配置、同步和系统化推理工具留下了空间。

构建外层 harness 正在成为持续的工程实践，而不是一次性配置。
