# 面向编码 Agent 用户的 Harness 工程

> 原文链接：[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
>
> 作者：Martin Fowler
>
> 原文修改日期：2026年4月2日
>
> 翻译日期：2026年4月7日

---

"harness"（套件）这个词已经成为一个简写，用来指代 AI agent 中除模型本身之外的所有东西——Agent = Model + Harness。这个定义非常宽泛，因此值得针对常见的 agent 类别进行收窄。我想在这里对编码 agent 这一限界上下文中的含义做一个界定。在编码 agent 中，一部分 harness 已经内建（例如通过系统提示词、选定的代码检索机制，甚至精密的编排系统）。但编码 agent 也为我们——它的用户——提供了许多功能，来构建专门针对我们用例和系统的外层 harness。

![三个同心圆，模型在核心（被 harness 的最终对象），编码 agent 的构建者 harness 是中间一圈，编码 agent 的用户 harness 是最外层](https://martinfowler.com/harness-engineering/harness-bounded-contexts.png)

图 1："harness" 这个词在不同的限界上下文中有不同的含义。

一个构建良好的外层 harness 服务于两个目标：它提高 agent 第一次就做对的概率，并提供一个反馈循环，在问题到达人类视线之前尽可能自我修正。最终它应该减少审查的工作量并提高系统质量，同时还带来额外的好处——减少沿途浪费的 token。

![标题 "Harness engineering for coding agent users"。概览展示了 guides（示例包括[推理型] principles、CfRs、Rules、Ref Docs、How-tos；[计算型] Language Servers、CLIs、scripts、codemods）作为前馈输入编码 agent；以及 feedback sensors（示例包括[推理型] review agents；[计算型] static analysis、logs、browser）。feedback sensors 指向编码 agent，同时输入其自纠正循环。左侧有一个人类图标，操控着 guides 和 sensors。](https://martinfowler.com/harness-engineering/harness-overview.png)

## 前馈与反馈

要 harness 一个编码 agent，我们既要预判不想要的输出并试图阻止它们，又要设置传感器让 agent 能够自我修正：

- **Guides（前馈控制）** —— 预判 agent 的行为，旨在其行动_之前_进行引导。Guides 提高 agent 在第一次尝试中创建良好结果的概率。
- **Sensors（反馈控制）** —— 在 agent 行动_之后_进行观察，帮助其自我修正。当它们产生的信号经过优化适合 LLM 消费时尤为强大，例如包含自修正指令的自定义 linter 消息——一种积极的 prompt 注入形式。

如果只用反馈而没有前馈，你会得到一个不断重复相同错误的 agent；如果只用前馈而没有反馈，你会得到一个编码了规则但永远不知道它们是否有效的 agent。

## 计算型 vs 推理型

Guides 和 sensors 有两种执行类型：

- **计算型（Computational）** —— 确定性的、快速的，由 CPU 运行。测试、linter、类型检查器、结构分析。运行时间为毫秒到秒级；结果可靠。
- **推理型（Inferential）** —— 语义分析、AI 代码审查、"LLM as judge"。通常由 GPU 或 NPU 运行。更慢、更昂贵；结果更具非确定性。

计算型 guides 通过确定性工具提高良好结果的概率。计算型 sensors 足够便宜和快速，可以在每次变更时与 agent 一起运行。推理型控制当然更昂贵且非确定性，但允许我们提供丰富的指导，并添加额外的语义判断。尽管存在非确定性，当推理型 sensors 与一个强模型（或者说是适合当前任务的模型）配合使用时，特别能增加我们的信任。

**示例**

|  | 方向 | 计算型 / 推理型 | 示例实现 |
| --- | --- | --- | --- |
| 编码规范 | 前馈 | 推理型 | AGENTS.md, Skills |
| 如何引导新项目的说明 | 前馈 | 两者 | 包含说明和引导脚本的 Skill |
| Code mods | 前馈 | 计算型 | 可以访问 OpenRewrite 配方的工具 |
| 结构测试 | 反馈 | 计算型 | 运行 ArchUnit 测试的 pre-commit（或编码 agent）hook，检查模块边界违规 |
| 如何审查的说明 | 反馈 | 推理型 | Skills |

## 操控循环

人类在这个过程中的任务是**操控** agent，通过迭代 harness 来实现。每当一个问题多次发生时，前馈和反馈控制都应该得到改进，使该问题在未来发生的概率降低，甚至完全阻止它。

在操控循环中，我们当然也可以使用 AI 来改进 harness。编码 agent 现在使构建更多自定义控制和更多自定义静态分析变得便宜得多。Agent 可以帮助编写结构测试，从观察到的模式中生成规则草案，搭建自定义 linter，或通过代码库考古创建操作指南。

## 时机：将质量左移

持续集成的团队一直面临着一个挑战：根据成本、速度和关键性，将测试、检查和人工审查分布在开发时间线上。当你渴望持续交付时，理想情况下你甚至希望每个提交状态都是可部署的。你希望在通往生产的路径上尽可能靠左地放置检查点，因为越早发现问题，修复成本越低。反馈 sensors，包括新的推理型 sensors，需要相应地分布在整个生命周期中。

**变更生命周期中的前馈和反馈**

- 什么是足够快的、应该在集成之前甚至在提交创建之前运行的？（例如 linter、快速测试套件、基础代码审查 agent）
- 什么是更昂贵的、因此只应在集成后的流水线中运行的，作为快速控制的补充？（例如变异测试、能够考虑更大局面的更全面的代码审查）

![变更生命周期中前馈和反馈的示例。前馈：LSP、architecture.md、/how-to-test skill、AGENTS.md、可以访问团队知识管理工具的 MCP server、/xyz-api-docs skill；它们输入 agent 的初始生成；第一次自纠正循环的反馈 sensor 示例有 /code-review、npx eslint、semgrep、npm run coverage、npm run dep-cruiser；然后人工审查是额外的反馈 sensor；然后集成发生；集成后，流水线中重新运行所有之前的 sensors，额外的更昂贵 sensors 示例有 /architecture-review skill、/detailed-review skill、变异测试。箭头显示反馈可以导致 agent 或人类创建新的提交。](https://martinfowler.com/harness-engineering/harness-change-lifecycle-examples.png)

**持续漂移和健康 sensors**

- 什么类型的漂移是逐渐积累的、应该由持续运行在代码库上的 sensors 来监控的？（例如死代码检测、测试覆盖率质量分析、依赖扫描器）
- agent 可以监控什么运行时反馈？（例如让它们查看恶化的 SLO 来提出改进建议，或 AI judge 持续采样响应质量并标记日志异常）

![变更集成后持续反馈 sensors 的示例。代码库中的持续漂移检测，例如 /find-dead-code、/code-coverage-quality、dependabot；或持续运行时反馈，例如延迟、错误率或可用性 SLO 导致编码 agent 建议，或 /response-quality-sampling、/log-anomalies AI judges。](https://martinfowler.com/harness-engineering/harness-continuous-feedback-examples.png)

## 调节类别

Agent harness 的作用就像一个控制论调节器，结合前馈和反馈将代码库调节到期望的状态。区分该期望状态的多个维度是有用的，按 harness 应该调节什么来分类。区分这些类别是有帮助的，因为 harness 能力和复杂性在不同类别之间有所不同，并且用限定词修饰这个词能为我们提供更精确的语言，否则这个词是非常泛化的。

以下是我目前认为有用的三个类别：

### 可维护性 harness

本文中我给出的几乎所有示例都是关于调节内部代码质量和可维护性的。这是目前最容易构建的 harness 类型，因为我们有大量预先存在的工具可以使用。

为了反思上述可维护性 harness 的想法在多大程度上增加了我对 agent 的信任，我将我之前编目的常见编码 agent 失败模式与之映射。

计算型 sensors 可靠地捕获结构性问题：重复代码、圈复杂度、缺失的测试覆盖率、架构漂移、风格违规。这些是廉价、成熟且确定性的。

LLM 可以部分解决需要语义判断的问题——语义重复代码、冗余测试、暴力修复、过度工程的解决方案——但代价高昂且是概率性的。不能在每次提交时运行。

更高影响的问题两者都不能可靠地捕获：问题的误诊、过度工程和不必要的功能、被误解的指令。它们有时能捕获这些，但不够可靠，无法减少监督。如果人类在一开始没有清楚地说明他们想要什么，正确性就超出了任何 sensor 的职责范围。

### 架构适应度 harness

这组 guides 和 sensors 定义并检查应用的架构特征。基本上就是：适应度函数。

示例：

- 前馈我们的性能需求的 Skills，以及向 agent 反馈其是改善还是恶化了性能的性能测试。
- 描述更好的可观测性编码规范（如日志标准）的 Skills，以及要求 agent 反思其可用日志质量的调试说明。

### 行为 harness

这是房间里的大象——我们如何引导和感知应用是否按我们需要的方式在功能上运行？目前，我看到大多数给予编码 agent 高度自主权的人这样做：

- 前馈：功能规格说明（详细程度各异，从简短的 prompt 到多文件描述）
- 反馈：检查 AI 生成的测试套件是否通过，覆盖率是否合理，有些人甚至用变异测试来监控其质量。然后结合手动测试。

这种方法对 AI 生成的测试寄予了很大的信任，但目前还不够好。我的一些同事在使用已批准的 fixtures 模式方面看到了不错的效果，但它在某些领域比其他领域更容易应用。他们有选择性地在适合的地方使用，这不是测试质量问题的全面解决方案。

所以总体而言，我们在找到良好的功能行为 harness 以增加信心从而减少监督和手动测试方面，还有很多工作要做。

![harness 的简化概览，水平方向显示 guides 和 sensors，垂直方向显示调节维度——可维护性、架构适应度和行为。行为 harness 的示例展示了 spec 作为前馈 guide，测试套件作为混合推理型和计算型的反馈 sensor，加上一个人工图标表示人工审查和手动测试作为主要额外反馈 sensor。](https://martinfowler.com/harness-engineering/harness-types.png)

## Harness 能力

并非每个代码库都同样适合 harness。用强类型语言编写的代码库自然拥有类型检查作为 sensor；清晰可定义的模块边界允许架构约束规则；像 Spring 这样的框架抽象掉了 agent 甚至不需要关心的细节，因此隐含地提高了 agent 成功的概率。没有这些属性，那些控制就无法构建。

这在绿地和棕地项目中表现不同。绿地团队可以从第一天起就把 harness 能力融入其中——技术决策和架构选择决定了代码库的可治理程度。棕地团队，特别是那些积累了大量技术债务的应用，面临更困难的问题：harness 最需要的地方恰恰是最难构建的地方。

## Harness 模板

大多数企业都有几种常见的服务拓扑，覆盖了他们 80% 的需求——通过 API 暴露数据的业务服务；事件处理服务；数据仪表盘。在许多成熟的工程组织中，这些拓扑已经被编码在服务模板中。未来这些可能演变为 harness 模板：一组 guides 和 sensors 的捆绑，将编码 agent 拴在拓扑的结构、规范和技术栈上。团队可能会根据已有可用的 harness 来部分地选择技术栈和结构。

![拓扑示例的堆叠（Node 中的数据仪表盘、JVM 上的 CRUD 业务服务、Golang 中的事件处理器）。最上面的数据仪表盘展示了详细信息，作为结构定义和技术栈的组合。图表指示了一个 "harness template"，包含每种拓扑的 guides 和 sensors，可以被实例化。](https://martinfowler.com/harness-engineering/harness-templates.png)

我们当然会面临与服务模板类似的挑战。一旦团队实例化它们，它们就开始与上游改进脱节。Harness 模板将面临相同的版本管理和贡献问题，甚至可能更严重，因为非确定性的 guides 和 sensors 更难测试。

## 人类的角色

作为人类开发者，我们将我们的技能和经验作为隐式 harness 带到每个代码库。我们吸收了规范和良好实践，我们感受过复杂性的认知痛苦，我们知道我们的名字在提交上。我们还承载着组织对齐——意识到团队试图实现什么，哪些技术债务出于商业原因被容忍，以及在这个特定上下文中"好"是什么样的。我们以小步前进，以人类的节奏，这为经验被触发和应用创造了思考空间。

编码 agent 没有这些：没有社会问责，没有对 300 行函数的审美厌恶，没有"我们这里不这么做"的直觉，没有组织记忆。它不知道哪个规范是承重的、哪个只是习惯，也不知道技术上正确的解决方案是否符合团队想要做的事情。

Harness 是试图将人类开发者经验带来的东西外化和明确化的尝试，但它只能走这么远。构建一个连贯的 guides、sensors 和自纠正循环的系统是昂贵的，所以我们必须以明确的目标来优先排序：一个好的 harness 不一定旨在完全消除人类输入，而是将其引导到我们的输入最重要的地方。

## 起点——和开放问题

我在这里描述的思维模型描述了已经在实践中发生的技术，并帮助构建关于我们仍然需要弄清楚什么的讨论框架。它的目标是将对话提升到功能层面之上——从 skills 和 MCP 服务器，到我们如何战略性地设计一个控制系统，使我们对 agent 产出的东西有真正的信心。

以下是当前讨论中一些与 harness 相关的示例：

- 一个 OpenAI 团队记录了他们的 harness 是什么样的：通过自定义 linter 和结构测试强制执行的分层架构，以及定期扫描漂移并让 agent 建议修复的"垃圾回收"。他们的结论是："我们现在最困难的挑战集中在设计环境、反馈循环和控制系统上。"
- Stripe 关于其 minions 的文章描述了诸如基于启发式运行相关 linter 的 pre-push hooks，他们强调了"将反馈左移"对他们的重要性，他们的"blueprints"展示了如何将反馈 sensors 集成到 agent 工作流中。
- 变异测试和结构测试是计算型反馈 sensors 的示例，过去一直未被充分利用，但现在正在复兴。
- 开发者之间关于在编码 agent 中集成 LSP 和代码智能的讨论越来越多，这些是计算型前馈 guides 的示例。
- 我听到 Thoughtworks 团队关于用计算型和推理型 sensors 解决架构漂移的故事，例如通过 agent 和自定义 linter 的混合来提高 API 质量，或通过"清洁工军团"来提高代码质量。

还有很多需要弄清楚的，不仅仅是已经提到的行为 harness。我们如何在 harness 增长的过程中保持其一致性，让 guides 和 sensors 保持同步、不相互矛盾？当指令和反馈信号指向不同方向时，我们能多大程度上信任 agent 做出合理的权衡？如果 sensors 从未触发，那是高质量的标志还是检测机制不足？我们需要一种评估 harness 覆盖率和质量的方法，类似于代码覆盖率和变异测试对测试所做的事情。前馈和反馈控制目前分散在交付步骤中，确实有潜力开发帮助配置、同步和将它们作为系统来推理的工具。构建这个外层 harness 正在成为一种持续的工程实践，而不是一次性配置。
