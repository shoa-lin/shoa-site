# 面向编码 Agent 用户的 Harness 工程

> 原文链接：[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
>
> 作者：Birgitta Böckeler (Thoughtworks)
>
> 原文修改日期：2026年4月2日
>
> 翻译日期：2026年4月7日

---

> **术语说明**
>
> **Harness**：指 AI Agent 中除模型本身之外的所有组成部分，即 Agent = Model + Harness。在编码 Agent 的上下文中，它包括系统提示词、代码检索机制、编排系统等内置组件，也包括用户可以自定义的外层控制——如规则文件、Skills、自定义检查脚本等。本文中 Harness 一词保留不译。
>
> **Guides / Sensors**：Guides 是前馈控制（feedforward），在 Agent 行动之前提供引导；Sensors 是反馈控制（feedback），在 Agent 行动之后检测问题并触发自我修正。
>
> **Computational / Inferential**：Computational 指由 CPU 执行的确定性工具（如 linter、类型检查器）；Inferential 指由 GPU/NPU 执行的语义分析（如 AI code review、LLM-as-judge）。

---

如今 "harness" 已经成为 AI Agent 领域的常用简称，指代模型之外的一切——**Agent = Model + Harness**。但这个定义太宽泛了，值得针对不同的 Agent 类别做进一步收窄。本文聚焦于编码 Agent 这个限界上下文。

在编码 Agent 中，一部分 harness 是由构建者（builder）内建的——系统提示词、代码检索机制、编排系统等。但编码 Agent 同时也为用户提供了丰富的能力，让我们可以针对自己的用例和系统构建一层**外层 harness**。

![三个同心圆：模型在核心（被 harness 的最终对象），编码 Agent 的 builder harness 是中间一圈，编码 Agent 的 user harness 是最外层](images/harness-engineering/harness-bounded-contexts.png)

图 1：同一个词 "harness" 在不同限界上下文中含义不同。

一个精心构建的外层 harness 有两个目标：**提高 Agent 首次生成的成功率**，以及**在问题暴露给人类之前通过反馈循环尽可能自我修正**。最终效果是减少人工 review 的工作量、提升系统质量，同时还能节省 token 消耗。

![概览：Guides 通过 feedforward 输入编码 Agent；Sensors 通过 feedback 观察 Agent 的输出并输入其自修正循环；左侧的人类同时操控 Guides 和 Sensors。](images/harness-engineering/harness-overview.png)

## Feedforward 与 Feedback

为编码 Agent 构建 harness 的核心思路有两条：

- **Guides（前馈控制）**：预判 Agent 可能出问题的地方，在它行动**之前**就加以引导，从而提高首次生成的成功率。
- **Sensors（反馈控制）**：在 Agent 行动**之后**检测问题，帮助它自我修正。效果最佳的情况是：Sensor 输出的信号专门为 LLM 优化过——例如自定义 linter 消息中附带修正指令。这其实是一种"正向"的 prompt injection。

只用 feedback 而没有 feedforward，Agent 会反复犯同样的错误；只用 feedforward 而没有 feedback，Agent 写好了规则却永远不知道规则是否生效。两者缺一不可。

## Computational vs Inferential

Guides 和 Sensors 各有两种执行方式：

- **Computational（计算型）**：确定性、快速，由 CPU 执行。典型例子：测试、linter、类型检查器、结构分析。运行时间从毫秒到秒级，结果可靠。
- **Inferential（推理型）**：语义分析、AI code review、"LLM as judge"。通常由 GPU 或 NPU 执行，更慢、更贵，且结果具有非确定性。

Computational guides 用确定性工具为 Agent 铺路；Computational sensors 便宜且快速，可以配合 Agent 在每次代码变更时运行。Inferential 控制虽然更贵且非确定性，但能提供丰富的语义指导和判断——当与一个强模型（或说适合当前任务的模型）配合时，inferential sensors 对提升信任感尤其有效。

**示例**

| 场景 | 方向 | 类型 | 示例实现 |
| --- | --- | --- | --- |
| 编码规范 | feedforward | Inferential | AGENTS.md, Skills |
| 项目初始化说明 | feedforward | 两者 | 包含说明 + bootstrap 脚本的 Skill |
| Codemods | feedforward | Computational | 集成 OpenRewrite recipes 的工具 |
| 结构测试 | feedback | Computational | pre-commit hook 运行 ArchUnit 测试，检查模块边界 |
| Code review 说明 | feedback | Inferential | Skills |

## Steering Loop

人类在这个过程中的核心任务是 **steer（驾驭）** ——通过持续迭代 harness 来引导 Agent。每当某个问题反复出现，就应该改进 feedforward 和 feedback 控制，降低该问题再次发生的概率，甚至彻底杜绝。

我们同样可以利用 AI 来改进 harness 本身。编码 Agent 大幅降低了构建自定义控制和静态分析的成本——Agent 可以帮你编写结构测试、从已有模式中生成规则草案、搭建自定义 linter，甚至通过代码考古生成 how-to 指南。

## 时机：将质量左移

持续集成的团队一直面临一个问题：如何根据成本、速度和关键性，将测试、检查和人工 review 合理分布在开发时间线上。追求持续交付的团队甚至希望每个 commit 都是可部署状态。核心原则是：**检查点尽量左移**——越早发现问题，修复成本越低。

Feedback sensors——包括新兴的 inferential sensors——需要相应地分布在整个生命周期中。

**变更生命周期中的 feedforward 和 feedback**

- 哪些检查足够快，应该在集成之前、甚至在 commit 生成之前就运行？（例如 linter、快速测试套件、基础 code review agent）
- 哪些检查成本更高，应该仅在集成后于 pipeline 中运行，作为快速检查的补充？（例如 mutation testing、需要纵观全局的 code review）

![变更生命周期中 feedforward 和 feedback 的示例](images/harness-engineering/harness-change-lifecycle-examples.png)

**持续 drift 和 health sensors**

除了变更生命周期内的检查，还有两类持续运行的 sensors：

- **Codebase drift sensors**：监控逐渐积累的代码库退化。例如死代码检测、测试覆盖率质量分析、依赖扫描。
- **运行时 health sensors**：让 Agent 监控运行时指标。例如关注 SLO 恶化并主动提出改进建议，或用 AI judge 持续采样响应质量并标记日志异常。

![变更集成后的持续 feedback sensors 示例](images/harness-engineering/harness-continuous-feedback-examples.png)

## 调节类别

Harness 就像一个调节器，通过 feedforward 和 feedback 将 codebase 逐步推向期望状态。这个"期望状态"本身有多个维度，每个维度对应一种 harness 类别。做这个区分很有必要——不同类别的 harnessability 和复杂度差异很大，而且用限定词修饰 "harness" 这个泛化的词，能让讨论更精确。

目前我识别出三个有用的类别：

### Maintainability Harness（可维护性）

本文绝大部分示例都属于这一类——调节内部代码质量和可维护性。这是目前最容易构建的 harness 类型，因为我们拥有大量现成工具。

为了评估 maintainability harness 在多大程度上提升了信任感，我将之前归纳的常见编码 Agent 失败模式与之做了映射：

- **Computational sensors 能可靠捕获的**：重复代码、圈复杂度、缺失的测试覆盖率、架构 drift、风格违规。这些工具廉价、成熟、确定性高。
- **LLM 能部分应对、但代价高昂的**：语义重复代码、冗余测试、暴力修复、过度工程。这些问题需要语义判断，只能以概率性方式处理，不可能每次 commit 都跑。
- **目前两者都难以可靠捕获的高影响问题**：问题误诊、过度工程和不必要的功能、被误解的指令。它们偶尔能被检测到，但不足以减少人类监督。**如果人类从一开始就没说清楚自己要什么，正确性就超出了任何 sensor 的能力范围。**

### Architecture Fitness Harness（架构适应度）

这类 guides 和 sensors 负责定义和验证应用的架构特征——本质上就是 **Fitness Functions**（适应度函数）。

示例：

- Skills 前馈描述性能需求，配合性能测试向 Agent 反馈改进或退化情况。
- Skills 描述可观测性编码规范（如日志标准），配合调试说明要求 Agent 反思其日志质量。

### Behaviour Harness（行为）

这是最难的问题——如何引导和检测应用的功能行为是否符合预期？目前大多数赋予编码 Agent 高度自主权的团队采用这样的方式：

- **Feedforward**：功能规格说明（详细程度从简短 prompt 到多文件描述不等）
- **Feedback**：检查 AI 生成的测试套件是否通过、覆盖率是否合理，部分团队还会用 mutation testing 监控测试质量。最后辅以手动测试。

这种方式对 AI 生成的测试寄予了过多信任。我的一些同事在使用 **approved fixtures pattern**（已批准的 fixtures 模式）方面取得了不错的效果，但它并非适用于所有场景——团队只在合适的地方选择性使用，算不上测试质量问题的全面解决方案。

总的来说，在 behaviour harness 方面我们还有很长的路要走——需要找到足够好的方案来提升信心，从而真正减少人工监督和手动测试。

![harness 简化概览：水平方向为 guides 和 sensors，垂直方向为三个调节维度——maintainability、architecture fitness 和 behaviour](images/harness-engineering/harness-types.png)

## Harnessability（可 Harness 性）

并非所有 codebase 都同样适合构建 harness。用强类型语言编写的 codebase 天然拥有类型检查作为 sensor；清晰的模块边界使得架构约束规则成为可能；像 Spring 这样的框架把许多细节抽象掉了，Agent 无需关心，因此间接提升了成功率。**缺乏这些特性的 codebase，相应的控制手段就无从构建。**

Greenfield（绿地）和 Legacy（棕地）项目面临的挑战截然不同：

- **Greenfield 团队**可以从第一天起就把 harnessability 纳入设计——技术选型和架构决策决定了 codebase 的可治理程度。
- **Legacy 团队**，尤其是积累了大量技术债的项目，面临的是更棘手的困境：harness 最需要的地方，恰恰是最难构建的地方。

## Harness 模板

大多数企业都有少数几种常见的服务拓扑，覆盖了 80% 的需求——通过 API 暴露数据的业务服务、事件处理服务、数据仪表盘。在成熟的工程组织中，这些拓扑通常已经被编码为 service template。

未来这些可能演变为 **harness template**——一组 guides 和 sensors 的捆绑，将编码 Agent 约束在特定拓扑的结构、规范和技术栈之内。团队在选择技术栈和架构时，可能会优先考虑已有现成 harness 的方案。

![拓扑示例：Node 数据仪表盘、JVM CRUD 业务服务、Golang 事件处理器](images/harness-engineering/harness-templates.png)

当然，与 service template 一样，一旦团队实例化模板，就会逐渐与上游更新脱节。Harness template 同样面临版本管理和贡献的问题——甚至可能更严重，因为非确定性的 guides 和 sensors 更难测试。

## 人类的角色

作为人类开发者，我们把自己的技能和经验当作一层隐式 harness 带到每个 codebase。我们内化了编码规范和最佳实践，我们亲身体验过复杂性带来的认知负担，我们知道自己要对每个 commit 负责。我们还承载着组织层面的上下文——知道团队在做什么、哪些技术债是业务可以容忍的、在这个特定场景中"好的代码"长什么样。我们小步前进，以人类的节奏工作，这种节奏恰好为经验发挥作用提供了思考空间。

编码 Agent 没有这些：它没有社会问责感，不会对 300 行的函数产生本能的厌恶，没有"我们这里不这么做"的直觉，也没有组织记忆。它分不清哪些规范是核心约束、哪些只是习惯，也不知道技术上正确的方案是否符合团队的实际意图。

Harness 的本质是试图把人类开发者经验中那些隐性的东西**外化、显式化**——但这有极限。构建一套 coherent 的 guides、sensors 和 self-correction loops 代价不低，所以必须聚焦核心目标：**一个好的 harness 不是要完全替代人类输入，而是把人类输入引导到最关键的地方。**

## 起点与开放问题

本文描述的思维模型总结了实践中已经在发生的技术，并试图为"我们还缺什么"提供讨论框架。它的目的是将对话从具体功能（某个 skill、某个 MCP server）提升到系统层面——我们如何**战略性地设计一套控制系统**，让 Agent 的产出真正值得信赖。

当前领域中一些与 harness 相关的实践：

- **OpenAI 团队**记录了他们的 harness 做法：用自定义 linter 和结构测试强制执行分层架构，加上定期扫描 drift 并让 Agent 建议修复的"垃圾回收"。他们的结论是："我们现在最困难的挑战集中在设计环境、feedback loops 和控制系统上。"
- **Stripe 的 minions 文章**描述了基于启发式运行相关 linter 的 pre-push hooks，强调了 **"shift feedback left"** 对他们的重要性，他们的 "blueprints" 展示了如何将 feedback sensors 集成到 Agent 工作流中。
- **Mutation testing 和结构测试**作为 computational feedback sensors 过去一直未被充分利用，现在正迎来复兴。
- **LSP 和代码智能集成**到编码 Agent 中的讨论越来越多——这些正是 computational feedforward guides 的例子。
- **Thoughtworks 的团队**分享了用 computational 和 inferential sensors 应对架构 drift 的经验，例如用 Agent + 自定义 linter 的组合提升 API 质量，或用 "janitor army" 提升代码质量。

但仍有大量问题待解——不仅限于前文提到的 behaviour harness：

- 如何在 harness 不断扩展的过程中保持一致性，避免 guides 和 sensors 互相矛盾？
- 当指令和 feedback 信号指向不同方向时，Agent 能做出合理权衡吗？我们能信任它到什么程度？
- 如果某个 sensor 从未触发过——是质量确实高，还是检测能力不足？
- 我们需要一种评估 harness 覆盖率和质量的方法，就像 code coverage 和 mutation testing 之于测试那样。
- 目前 feedforward 和 feedback 控制散落在各个交付环节中，这里有很大的工具化空间——帮助配置、同步、将它们作为一个系统来审视。

构建外层 harness 正在从一次性配置演变为**持续的工程实践**。
