---
title: "揭秘 AI Agent 评估：从零到一的完整指南"
date: "2025-01-19"
source: "Anthropic Engineering"
sourceUrl: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents"
author: "Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, Jiri De Jonghe"
tags: ["AI", "Agent", "Evaluation", "Anthropic", "LLM"]
---

<style>
.blog-article-body {
    font-size: 1.05rem;
    line-height: 1.8;
}
.article-content h2 {
    margin-top: 2.5rem;
    margin-bottom: 1.25rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
}
.article-content h3 {
    margin-top: 2rem;
    margin-bottom: 1rem;
}
.article-content h4 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
}
.article-content p {
    margin-bottom: 1.25rem;
}
.article-content ul, .article-content ol {
    margin-bottom: 1.5rem;
}
.article-content li {
    margin-bottom: 0.5rem;
}
.article-content blockquote {
    border-left: 4px solid #667eea;
    padding-left: 1rem;
    margin: 1.5rem 0;
    color: #4b5563;
}
.article-content code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
}
.article-content pre {
    background-color: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5rem 0;
}
.article-content pre code {
    background-color: transparent;
    padding: 0;
}
/* 表格容器：支持横向滚动 */
.article-content .table-wrapper {
    overflow-x: auto;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.article-content table {
    border-collapse: collapse;
    width: 100%;
    min-width: 600px;
    margin: 0;
    font-size: 0.95rem;
}
.article-content table thead {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}
.article-content table thead th {
    border: 1px solid #5568d3;
    padding: 0.875rem 1rem;
    text-align: left;
    font-weight: 600;
    white-space: nowrap;
}
.article-content table tbody tr {
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.2s ease;
}
.article-content table tbody tr:nth-child(even) {
    background-color: #f9fafb;
}
.article-content table tbody tr:hover {
    background-color: #eef2ff;
}
.article-content table td {
    padding: 0.75rem 1rem;
    border-right: 1px solid #e5e7eb;
    text-align: left;
    vertical-align: top;
    line-height: 1.6;
}
.article-content table td:last-child {
    border-right: none;
}
.article-content table td:first-child {
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
}
.article-content img {
    max-width: 100%;
    height: auto;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
@media (max-width: 768px) {
    .blog-article-body {
        font-size: 1rem;
    }
    .article-content .table-wrapper {
        margin: 1.5rem -1rem;
        border-radius: 0;
    }
    .article-content table {
        font-size: 0.85rem;
        min-width: 500px;
    }
    .article-content table th,
    .article-content table td {
        padding: 0.5rem 0.75rem;
    }
}
</style>

---

*发布于 2025年1月19日*
*原文：[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | 作者：Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, Jiri De Jonghe*

---

## 引言

良好的评估（evaluations，简称 evals）帮助团队更有信心地发布 AI Agent。没有它们，团队很容易陷入被动循环——只在生产环境中发现问题，修复一个失败却造成另一个失败。评估在问题影响用户之前就让行为变化可见，其价值在 Agent 的整个生命周期中不断累积。

正如我们在《构建高效 Agent》中所述，Agent 通过多轮操作运行：调用工具、修改状态、根据中间结果进行适应。这些使 AI Agent 有用的能力——自主性、智能和灵活性——也让它们更难评估。

通过我们的内部工作以及与处于 Agent 发展前沿的客户合作，我们学会了为 Agent 设计更严谨、更有用的评估方法。以下是在真实部署中适用于多种 Agent 架构和用例的有效方法。

## 评估的结构

**评估（evaluation，简称 "eval"）**是对 AI 系统的测试：给 AI 一个输入，然后对其输出应用评分逻辑来衡量成功。在本文中，我们专注于可以在开发过程中运行的**自动化评估（automated evals）**，无需真实用户参与。

**单轮评估（single-turn evaluations）**很简单：一个提示、一个响应和评分逻辑。对于早期的 LLM，单轮、非 Agent 的评估是主要的评估方法。随着 AI 能力的进步，**多轮评估（multi-turn evaluations）**变得越来越普遍。

![单轮评估与多轮评估对比](https://www-cdn.anthropic.com/images/4zrzovbb/website/bd42e7b2f3e9bb5218142796d3ede4816588dec0-4584x2834.png)

在简单的评估中，Agent 处理一个提示，评分器检查输出是否符合预期。对于更复杂的多轮评估，编码 Agent 接收工具、任务（在这种情况下是构建 MCP 服务器）和环境，执行"Agent 循环"（工具调用和推理），并使用实现更新环境。然后评分使用单元测试来验证工作的 MCP 服务器。

**Agent 评估**更加复杂。Agent 在多轮中使用工具，修改环境中的状态并随时适应——这意味着错误可以传播和复合。前沿模型还可以找到超越静态评估限制的创造性解决方案。例如，Opus 4.5 通过发现策略中的漏洞解决了 τ2-bench 中关于预订航班的问题。它在书面评估中"失败"了，但实际上为用户找到了更好的解决方案。

### 核心概念定义

在构建 Agent 评估时，我们使用以下定义：

- **任务（task，也称 problem 或 test case）**：是具有定义输入和成功标准的单个测试
- **试验（trial）**：每次尝试任务是一次试验。由于模型输出在运行之间变化，我们运行多个试验以产生更一致的结果
- **评分器（grader）**：用于评分 Agent 性能某些方面的逻辑，包含多个断言（assertion，也称 checks）
- **轨录（transcript，也称 trace 或 trajectory）**：试验的完整记录，包括输出、工具调用、推理、中间结果等
- **结果（outcome）**：试验结束时环境的最终状态
- **评估框架（evaluation harness）**：端到端运行评估的基础设施
- **Agent 框架（agent harness，也称 scaffold）**：使模型能够充当 Agent 的系统
- **评估套件（evaluation suite）**：旨在衡量特定能力或行为的任务集合

![Agent 评估的组件](https://www-cdn.anthropic.com/images/4zrzovbb/website/0205b36f9639fc27f2f6566f73cb56b06f59d555-4584x2580.png)

## 为什么要构建评估？

当团队第一次开始构建 Agent 时，他们可以通过手动测试、内部使用（dogfooding）和直觉的组合取得惊人的进展。更严格的评估甚至可能被视为减缓发布的开销。但在早期的原型阶段之后，一旦 Agent 投入生产并开始扩展，没有评估的构建开始崩溃。

**崩溃点**通常出现在用户报告 Agent 在更改后感觉更差，团队"盲目飞行"，除了猜测和检查之外无法验证。没有评估，调试是被动的：等待投诉，手动重现，修复错误，希望没有其他回归。

### 真实案例

- **Claude Code**：最初基于反馈快速迭代，后来添加评估——首先是简洁性和文件编辑等狭窄领域，然后是过度工程等更复杂的行为
- **Descript**：围绕成功编辑工作流程的三个维度构建评估（不破坏东西、做我要求的事、做得好）
- **Bolt AI**：在 3 个月内构建了评估系统，运行 Agent 并使用静态分析对输出进行评分

### 评估的价值

评估还可以成为产品团队和研究团队之间最高带宽的沟通渠道，定义研究人员可以优化的指标。它们的累积价值很容易被忽视，因为成本前期可见，而效益后来累积。

## 如何评估 AI Agents

我们看到今天大规模部署的几种常见类型的 Agent：

- 编码 Agent
- 研究 Agent
- 计算机使用 Agent
- 对话 Agent

### Agent 的评分器类型

Agent 评估通常结合三种类型的评分器：基于代码、基于模型和基于人工。

#### 基于代码的评分器

<div class="table-wrapper">

| **方法** | **优势** | **劣势** |
| --- | --- | --- |
| 字符串匹配检查、二元测试、静态分析、结果验证、工具调用验证、轨录分析 | 快速、便宜、客观、可重现、易于调试 | 对于不完全符合预期模式的有效变体很脆弱、缺乏细微差别 |

</div>

#### 基于模型的评分器

<div class="table-wrapper">

| **方法** | **优势** | **劣势** |
| --- | --- | --- |
| 基于标准的评分、自然语言断言、成对比较、基于参考的评估、多评判共识 | 灵活、可扩展、捕获细微差别、处理开放式任务 | 不确定性、比代码更昂贵、需要与人工评分器校准 |

</div>

#### 人工评分器

<div class="table-wrapper">

| **方法** | **优势** | **劣势** |
| --- | --- | --- |
| SME 审查、众包判断、抽查采样、A/B 测试、评分者间一致性 | 黄金标准质量、匹配专家用户判断 | 昂贵、慢、通常需要大规模访问人工专家 |

</div>

### 能力 vs 回归评估

- **能力或"质量"评估**：询问"这个 Agent 能做什么好？"应该以低通过率开始
- **回归评估**：询问"Agent 是否仍然处理它以前处理的所有任务？"应该具有接近 100% 的通过率

### 评估编码 Agents

**编码 Agents**编写、测试和调试代码，导航代码库，并像人类开发人员一样运行命令。现代编码 Agent 的有效评估通常依赖于明确指定的任务、稳定的测试环境和生成代码的彻底测试。

### 评估对话 Agents

**对话 Agents**在支持、销售或教练等领域与用户互动。与传统聊天机器人不同，它们保持状态、使用工具并在对话中间采取行动。

### 评估研究 Agents

**研究 Agents**收集、综合和分析信息，然后产生答案或报告等输出。研究质量只能相对于任务来判断。

### 计算机使用 Agents

**计算机使用 Agents**通过与人相同的界面与软件交互——屏幕截图、鼠标点击、键盘输入和滚动。

### 非确定性问题

两个指标有助于捕捉这种细微差别：

- **pass@k**：衡量 Agent 在 k 次尝试中至少获得一个正确解决方案的可能性
- **pass^k**：衡量所有 k 次试验都成功的概率

![pass@k 和 pass^k 随试验增加而分歧](https://www-cdn.anthropic.com/images/4zrzovbb/website/3ddac5be07a0773922ec9df06afec55922f8194a-4584x2580.png)

## 从零到一：构建优秀 Agent 评估的路线图

### 收集初始评估数据集的任务

#### 步骤 0：尽早开始

从真实失败中得出的 20-50 个简单任务是一个很好的开始。

#### 步骤 1：从您已经手动测试的内容开始

从您在开发期间运行的手动检查开始。

#### 步骤 2：编写明确的任务和参考解决方案

一个好的任务是两个领域专家独立得出相同的通过/失败 verdict 的任务。

#### 步骤 3：构建平衡的问题集

测试行为**应该**发生和**不应该**发生的情况。

### 设计评估框架和评分器

#### 步骤 4：构建具有稳定环境的强大评估框架

评估中的 Agent 的功能大致与生产中使用的 Agent 相同。

#### 步骤 5：深思熟虑地设计评分器

- 选择确定性评分器
- LLM 评分器用于额外的灵活性
- 人工评分器用于额外验证

### 长期维护和使用评估

#### 步骤 6：检查轨录

阅读来自多次试验的轨录和评分。

#### 步骤 7：监控能力评估饱和

当 Agent 通过所有可解决的任务时，就会发生**评估饱和**。

#### 步骤 8：通过开放贡献和维护长期保持评估套件健康

评估套件是一个活的人工制品，需要持续的关注和明确的所有权。

![创建有效评估的过程](https://www-cdn.anthropic.com/images/4zrzovbb/website/0db40cc0e14402222a179fc6297b9c8818e97c8a-4584x2580.png)

## 评估与其他方法的结合

可以对 Agent 在数千个任务中运行自动化评估，而无需部署到生产或影响真实用户。但这只是了解 Agent 性能的多种方式之一。

完整的画面包括：

- 生产监控
- 用户反馈
- A/B 测试
- 手动轨录审查
- 系统性人类评估

![了解 AI Agent 性能的方法对比](https://www-cdn.anthropic.com/images/4zrzovbb/website/b77b8dbb7c2e57f063fbc8a087a853d5809b74b0-4584x2580.png)

### 方法对比表

<div class="table-wrapper">

| 方法 | 优点 | 缺点 |
| --- | --- | --- |
| 自动化评估 | 更快的迭代、完全可重现、无用户影响、可以在每次提交时运行 | 需要更多的前期投资来构建、需要持续维护 |
| 生产监控 | 在大规模显示真实用户行为、捕获合成评估错过的东西 | 被动问题在您知道之前达到用户、信号可能有噪声 |
| A/B 测试 | 衡量实际用户结果（留存、任务完成）、控制混淆 | 慢几天或几周才能达到显著性并需要足够的流量 |
| 用户反馈 | 显露您没有预料到的问题、来自实际人类用户的真实示例 | 稀疏和自我选择、偏向严重问题 |
| 手动轨录审查 | 建立对失败模式的直觉、捕获自动化检查错过的微妙质量问题 | 时间密集、不扩展、覆盖不一致 |
| 系统性人类研究 | 来自多个人类评分员的黄金标准质量判断 | 相对昂贵和慢周转、难以频繁运行 |

</div>

## 结论

没有评估的团队陷入被动循环——修复一个失败，造成另一个，无法区分真正的回归和噪声。早期投资的团队发现相反：随着失败变成测试用例，测试用例防止回归，指标取代猜测，开发加速。

### 关键要点

1. **尽早开始**，不要等待完美的套件
2. **从您看到的失败中收集现实的任务**
3. **定义明确、强大的成功标准**
4. **深思熟虑地设计评分器并结合多种类型**
5. **确保问题对模型来说足够难**
6. **迭代评估以提高其信噪比**
7. **阅读轨录！**

AI Agent 评估仍然是一个新生、快速发展的领域。随着 Agent 承担更长的任务，在多 Agent 系统中协作，并处理越来越主观的工作，我们将需要适应我们的技术。

## 附录：评估框架

几个开源和商业框架可以帮助团队从零开始构建基础设施来实现 Agent 评估：

- **Harbor**：在容器化环境中运行 Agent，具有跨云提供商大规模运行试验的基础设施
- **Promptfoo**：轻量级、灵活的开源框架，专注于用于提示测试的声明性 YAML 配置
- **Braintrust**：结合离线评估与生产可观察性和实验跟踪的平台
- **LangSmith**：提供跟踪、离线和在线评估以及数据集管理，与 LangChain 生态系统紧密集成
- **Langfuse**：提供类似的功能作为自我托管的开源替代方案

---

*致谢：由 Mikaela Grace、Jeremy Hadfield、Rodrigo Olivares 和 Jiri De Jonghe 撰写。特别感谢 David Hershey、Gian Segato、Mike Merrill、Alex Shaw、Nicholas Carlini、Ethan Dixon、Pedram Navid、Jake Eaton、Alyssa Baum、Lina Tawfik、Karen Zhou、Alexander Bricken、Sam Kennedy、Robert Ying 等人的贡献。*
