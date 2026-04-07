# 面向编码 Agent 用户的 Harness 工程

> 原文链接：[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
>
> 作者：Birgitta Böckeler (Thoughtworks)
>
> 原文修改日期：2026年4月2日
>
> 翻译日期：2026年4月7日

---

"harness" 这个词已经成为一个简写，用来指代 AI agent 中除模型本身之外的所有东西——Agent = Model + Harness。这个定义非常宽泛，因此值得针对常见的 agent 类别进行收窄。我想在这里对编码 agent 这一限界上下文（bounded context）中的含义做一个界定。在编码 agent 中，一部分 harness 已经内建（例如通过 system prompt、选定的代码检索机制，甚至精密的编排系统）。但编码 agent 也为我们——它的用户——提供了许多功能，来构建专门针对我们用例和系统的外层 harness。

![三个同心圆：模型在核心（被 harness 的最终对象），编码 agent 的 builder harness 是中间一圈，编码 agent 的 user harness 是最外层](images/harness-engineering/harness-bounded-contexts.png)

图 1："harness" 这个词在不同的限界上下文中有不同的含义。

一个构建良好的外层 harness 服务于两个目标：它提高 agent 第一次就做对的概率，并提供一个 feedback loop，在问题到达人类视线之前尽可能自我修正。最终它应该减少 review 工作量并提高系统质量，同时还带来额外的好处——减少沿途浪费的 token。

![标题 "Harness engineering for coding agent users"。概览展示了 guides（示例包括 [inferential] principles、CfRs、Rules、Ref Docs、How-tos；[computational] Language Servers、CLIs、scripts、codemods）作为 feedforward 输入编码 agent；以及 feedback sensors（示例包括 [inferential] review agents；[computational] static analysis、logs、browser）。feedback sensors 指向编码 agent，同时输入其 self-correcting loop。左侧有一个人形图标，steer 着 guides 和 sensors。](images/harness-engineering/harness-overview.png)

## Feedforward 与 Feedback

要 harness 一个编码 agent，我们既要预判不想要的输出并试图阻止它们，又要设置 sensor 让 agent 能够自我修正：

- **Guides（feedforward 控制）** —— 预判 agent 的行为，旨在其行动_之前_进行引导。Guides 提高 agent 在第一次尝试中产出良好结果的概率。
- **Sensors（feedback 控制）** —— 在 agent 行动_之后_进行观察，帮助其自我修正。当它们产生的信号经过优化适合 LLM 消费时尤为强大，例如包含自修正指令的自定义 linter 消息——一种正向的 prompt injection。

如果只用 feedback 没有 feedforward，你会得到一个不断重复相同错误的 agent；如果只用 feedforward 没有 feedback，你会得到一个编码了规则但永远不知道它们是否有效的 agent。

## Computational vs Inferential

Guides 和 sensors 有两种执行类型：

- **Computational** —— 确定性的、快速的，由 CPU 运行。测试、linter、类型检查器、结构分析。运行时间为毫秒到秒级；结果可靠。
- **Inferential** —— 语义分析、AI code review、"LLM as judge"。通常由 GPU 或 NPU 运行。更慢、更昂贵；结果更具非确定性。

Computational guides 通过确定性工具提高良好结果的概率。Computational sensors 足够便宜和快速，可以在每次变更时与 agent 一起运行。Inferential 控制当然更昂贵且非确定性，但允许我们提供丰富的指导，并添加额外的语义判断。尽管存在非确定性，当 inferential sensors 与一个强模型（或者说是适合当前任务的模型）配合使用时，特别能增加我们的信任。

**示例**

|  | 方向 | Computational / Inferential | 示例实现 |
| --- | --- | --- | --- |
| 编码规范 | feedforward | Inferential | AGENTS.md, Skills |
| 如何引导新项目的说明 | feedforward | 两者 | 包含说明和 bootstrap 脚本的 Skill |
| Codemods | feedforward | Computational | 可以访问 OpenRewrite recipes 的工具 |
| 结构测试 | feedback | Computational | 运行 ArchUnit 测试的 pre-commit（或编码 agent）hook，检查模块边界违规 |
| 如何 review 的说明 | feedback | Inferential | Skills |

## Steering Loop

人类在这个过程中的任务是 **steer** agent——通过迭代 harness 来实现。每当一个问题多次发生时，feedforward 和 feedback 控制都应该得到改进，使该问题在未来发生的概率降低，甚至完全阻止。

在 steering loop 中，我们当然也可以使用 AI 来改进 harness。编码 agent 现在使构建更多自定义控制和自定义 static analysis 变得便宜得多。Agent 可以帮助编写结构测试，从观察到的模式中生成规则草案，搭建自定义 linter，或通过 codebase archaeology 创建 how-to 指南。

## 时机：将质量左移

持续集成的团队一直面临着一个挑战：根据成本、速度和关键性，将测试、检查和人工 review 分布在开发时间线上。当你渴望持续交付时，理想情况下你甚至希望每个 commit 状态都是可部署的。你希望在通往生产的路径上尽可能靠左地放置检查点，因为越早发现问题，修复成本越低。Feedback sensors，包括新的 inferential sensors，需要相应地分布在整个生命周期中。

**变更生命周期中的 feedforward 和 feedback**

- 什么是足够快的、应该在集成之前甚至在 commit 创建之前运行的？（例如 linter、快速测试套件、基础 code review agent）
- 什么是更昂贵的、因此只应在集成后于 pipeline 中运行的，作为快速控制的补充？（例如 mutation testing、能够考虑更大局面的更全面的 code review）

![变更生命周期中 feedforward 和 feedback 的示例](images/harness-engineering/harness-change-lifecycle-examples.png)

**持续 drift 和 health sensors**

- 什么类型的 drift 是逐渐积累的、应该由持续运行在 codebase 上的 sensors 来监控的？（例如 dead code detection、测试覆盖率质量分析、dependency scanner）
- agent 可以监控什么运行时 feedback？（例如让它们查看恶化的 SLO 来提出改进建议，或 AI judge 持续采样 response quality 并标记 log anomalies）

![变更集成后持续 feedback sensors 的示例](images/harness-engineering/harness-continuous-feedback-examples.png)

## 调节类别

Agent harness 的作用就像一个 cybernetic governor，结合 feedforward 和 feedback 将 codebase 调节到期望的状态。区分该期望状态的多个维度是有用的，按 harness 应该调节什么来分类。区分这些类别是有帮助的，因为 harnessability 和复杂性在不同类别之间有所不同，并且用限定词修饰这个词能为我们提供更精确的语言，否则这个词是非常泛化的。

以下是我目前认为有用的三个类别：

### Maintainability harness

本文中我给出的几乎所有示例都是关于调节内部代码质量和可维护性的。这是目前最容易构建的 harness 类型，因为我们有大量预先存在的工具可以使用。

为了反思上述 maintainability harness 的想法在多大程度上增加了我对 agent 的信任，我将我之前编目的常见编码 agent 失败模式与之映射。

Computational sensors 可靠地捕获结构性问题：重复代码、圈复杂度、缺失的测试覆盖率、架构 drift、风格违规。这些是廉价、成熟且确定性的。

LLM 可以部分解决需要语义判断的问题——语义重复代码、冗余测试、暴力修复、过度工程的解决方案——但代价高昂且是概率性的。不能在每次 commit 时运行。

更高影响的问题两者都不能可靠地捕获：问题的误诊、过度工程和不必要的功能、被误解的指令。它们有时能捕获这些，但不够可靠，无法减少监督。如果人类在一开始没有清楚地说明他们想要什么，正确性就超出了任何 sensor 的职责范围。

### Architecture fitness harness

这组 guides 和 sensors 定义并检查应用的架构特征。基本上就是：Fitness Functions。

示例：

- 前馈性能需求的 Skills，以及向 agent 反馈其是改善还是恶化了性能的性能测试。
- 描述更好的 observability 编码规范（如 logging 标准）的 Skills，以及要求 agent 反思其可用日志质量的调试说明。

### Behaviour harness

这是房间里的大象——我们如何引导和感知应用是否按我们需要的方式在功能上运行？目前，我看到大多数给予编码 agent 高度自主权的人这样做：

- Feedforward：功能规格说明（详细程度各异，从简短的 prompt 到多文件描述）
- Feedback：检查 AI 生成的测试套件是否通过，覆盖率是否合理，有些人甚至用 mutation testing 来监控其质量。然后结合手动测试。

这种方法对 AI 生成的测试寄予了很大的信任，但目前还不够好。我的一些同事在使用 approved fixtures pattern 方面看到了不错的效果，但它在某些领域比其他领域更容易应用。他们有选择性地在适合的地方使用，这不是测试质量问题的全面解决方案。

所以总体而言，我们在找到良好的 behaviour harness 以增加信心从而减少监督和手动测试方面，还有很多工作要做。

![harness 的简化概览，水平方向显示 guides 和 sensors，垂直方向显示调节维度——maintainability、architecture fitness 和 behaviour](images/harness-engineering/harness-types.png)

## Harnessability

并非每个 codebase 都同样适合 harness。用强类型语言编写的 codebase 自然拥有类型检查作为 sensor；清晰可定义的模块边界允许架构约束规则；像 Spring 这样的框架抽象掉了 agent 甚至不需要关心的细节，因此隐含地提高了 agent 成功的概率。没有这些属性，那些控制就无法构建。

这在 greenfield 和 legacy 项目中表现不同。Greenfield 团队可以从第一天起就把 harnessability 融入其中——技术决策和架构选择决定了 codebase 的可治理程度。Legacy 团队，特别是那些积累了大量技术债务的应用，面临更困难的问题：harness 最需要的地方恰恰是最难构建的地方。

## Harness 模板

大多数企业都有几种常见的服务拓扑，覆盖了他们 80% 的需求——通过 API 暴露数据的业务服务；事件处理服务；数据仪表盘。在许多成熟的工程组织中，这些拓扑已经被编码在 service template 中。未来这些可能演变为 harness template：一组 guides 和 sensors 的捆绑，将编码 agent 拴在拓扑的结构、规范和技术栈上。团队可能会根据已有可用的 harness 来部分地选择技术栈和结构。

![拓扑示例的堆叠（Node 中的数据仪表盘、JVM 上的 CRUD 业务服务、Golang 中的事件处理器）](images/harness-engineering/harness-templates.png)

我们当然会面临与 service template 类似的挑战。一旦团队实例化它们，它们就开始与上游改进脱节。Harness template 将面临相同的版本管理和贡献问题，甚至可能更严重，因为非确定性的 guides 和 sensors 更难测试。

## 人类的角色

作为人类开发者，我们将我们的技能和经验作为隐式 harness 带到每个 codebase。我们吸收了规范和良好实践，我们感受过复杂性的认知痛苦，我们知道我们的名字在 commit 上。我们还承载着组织对齐——意识到团队试图实现什么，哪些技术债务出于商业原因被容忍，以及在这个特定上下文中"好"是什么样的。我们以小步前进，以人类的节奏，这为经验被触发和应用创造了思考空间。

编码 agent 没有这些：没有社会问责，没有对 300 行函数的审美厌恶，没有"我们这里不这么做"的直觉，没有组织记忆。它不知道哪个规范是承重的、哪个只是习惯，也不知道技术上正确的解决方案是否符合团队想要做的事情。

Harness 是试图将人类开发者经验带来的东西外化和明确化的尝试，但它只能走这么远。构建一个连贯的 guides、sensors 和 self-correction loops 的系统是昂贵的，所以我们必须以明确的目标来优先排序：一个好的 harness 不一定旨在完全消除人类输入，而是将其引导到我们的输入最重要的地方。

## 起点——和开放问题

我在这里描述的思维模型描述了已经在实践中发生的技术，并帮助构建关于我们仍然需要弄清楚什么的讨论框架。它的目标是将对话提升到 feature 层面之上——从 skills 和 MCP server，到我们如何战略性地设计一个控制系统，使我们对 agent 产出的东西有真正的信心。

以下是当前讨论中一些与 harness 相关的示例：

- 一个 OpenAI 团队记录了他们的 harness 是什么样的：通过自定义 linter 和结构测试强制执行的分层架构，以及定期扫描 drift 并让 agent 建议修复的"垃圾回收"。他们的结论是："我们现在最困难的挑战集中在设计环境、feedback loops 和控制系统上。"
- Stripe 关于其 minions 的文章描述了诸如基于启发式运行相关 linter 的 pre-push hooks，他们强调了"shift feedback left"对他们的重要性，他们的"blueprints"展示了如何将 feedback sensors 集成到 agent 工作流中。
- Mutation testing 和结构测试是 computational feedback sensors 的示例，过去一直未被充分利用，但现在正在复兴。
- 开发者之间关于在编码 agent 中集成 LSP 和代码智能的讨论越来越多，这些是 computational feedforward guides 的示例。
- 我听到 Thoughtworks 团队关于用 computational 和 inferential sensors 解决架构 drift 的故事，例如通过 agent 和自定义 linter 的混合来提高 API 质量，或通过"janitor army"来提高代码质量。

还有很多需要弄清楚的，不仅仅是已经提到的 behaviour harness。我们如何在 harness 增长的过程中保持其一致性，让 guides 和 sensors 保持同步、不相互矛盾？当指令和 feedback 信号指向不同方向时，我们能多大程度上信任 agent 做出合理的权衡？如果 sensors 从未触发，那是高质量的标志还是检测机制不足？我们需要一种评估 harness coverage 和质量的方法，类似于 code coverage 和 mutation testing 对测试所做的事情。Feedforward 和 feedback 控制目前分散在交付步骤中，确实有潜力开发帮助配置、同步和将它们作为系统来推理的工具。构建这个外层 harness 正在成为一种持续的工程实践，而不是一次性配置。
