---
translationKey: "state-of-ai-agent-memory-2026"
locale: "zh"
title: "2026 年 AI Agent 记忆现状：Benchmark、架构与生产缺口"
description: "梳理 AI Agent 记忆的基准、架构选择、生产需求与仍未解决的问题。"
publishedAt: "2026-06-04"
updatedAt: "2026-06-04"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://mem0.ai/blog/state-of-ai-agent-memory-2026"
sourceAuthor: "Mem0 Team"
contentType: "adaptation"
translationStatus: "reviewed"
---

**核心要点**

> - LoCoMo、LongMemEval 和 BEAM benchmark 现已成为比较记忆架构的标准。
>
> - LoCoMo 得分 92.5，LongMemEval 得分 94.4，每次查询约消耗 6,900 token。
>
> - 最大增益：时间推理 +29.6 分，多跳推理 +23.1 分。
>
> - 已集成 21 个框架和 20 个向量存储。
>
> - 最困难的开放问题：跨 session 身份解析、大规模时间抽象、记忆过期。

---

三年前，"AI agent 记忆"意味着把对话历史塞进 context window，然后指望模型能记住。无状态 agent、重复指令、跨 session 零个性化——这些被视为用 LLM 构建应用的固有代价。

那种认知已经过时了。2026 年，记忆已成为一等架构组件：拥有自己的 benchmark 套件、独立的研究文献、可量化的方案间性能差距，以及围绕它构建的生态系统。

本报告覆盖了当前的真实状况：benchmark 测量什么、各方案如何比较、集成生态长什么样、过去 18 个月技术工作集中在哪，以及哪些问题仍然是真正未解决的。

本文所有内容均来源于已发表的研究、真实发布日志和文档化的集成规范。没有预测，没有市场规模宣称。

## 研究与方法论

### 我们在测量什么？

AI agent 记忆研究中最重要的发展，是标准化 benchmark 的出现——它使得完全不同的记忆架构能在同一评估集上进行比较。目前有三个 benchmark 定义了测量格局：

1. **LoCoMo**：1,540 个问题，横跨四个类别，在多 session 对话数据上测试不同难度级别的记忆召回：单跳（single-hop）、多跳（multi-hop）、开放域（open-domain）和时间记忆召回。在 LoCoMo 之前，记忆质量大多是自报的，或者基于临时任务评估，无法跨实验室复现。
2. **LongMemEval**：500 个问题，横跨六个类别：单 session 用户召回、单 session 助手召回、单 session 偏好召回、知识更新、时间推理和跨 session 召回。它测试了更广泛的记忆场景，在知识更新和跨 session 任务方面尤其严苛。
3. **BEAM**：该 benchmark 在 1M 和 10M token 规模上运行，测试记忆系统在上下文量级远超典型 benchmark 时的表现。BEAM 无法通过简单扩展 context window 来解决，这使它成为生产规模部署最相关的 benchmark。它的十个类别包括偏好遵循、指令遵循、信息抽取、知识更新、跨 session 推理、摘要、时间推理、事件排序、弃权和矛盾解决。

三个 benchmark 的评估框架结合了五个维度：

| 指标 | 测量内容 |
| --- | --- |
| BLEU score | 与 ground truth 的 token 级相似度 |
| F1 score | 响应 token 的精确率和召回率 |
| LLM score | LLM judge 的二元正确性判定 |
| Token 消耗 | 每次查询所需的总 token 数 |
| 延迟 | 搜索和响应生成的实际耗时 |

这种组合防止了在一个轴上优化而牺牲其他轴。一个准确率很高但每次查询需要 26,000 token 的系统不适合生产。一个延迟低但召回率差的系统没有实用价值。

### 研究基础

发表在 ECAI 2025 的 Mem0 研究论文（arXiv:2504.19413）首次对十种记忆方法进行了广泛的正面比较，包括文献基线、开源工具、RAG、full-context、OpenAI Memory 和 Zep，在 LoCoMo benchmark 上运行。该论文确立了选择性记忆能达到的基线。Mem0 的新算法显著提升了这个基线。

2026 年 4 月，我们发布了一种新的 token 高效记忆算法，基于单遍层次提取（single-pass hierarchical extraction）和多信号检索（multi-signal retrieval）。以下是改进后的 benchmark 结果：

| Benchmark | 得分 | 平均 Token / 查询 |
| --- | --- | --- |
| LoCoMo | **92.5** | 6,956 |
| LongMemEval | **94.4** | 6,787 |
| BEAM (1M) | **64.1** | 6,719 |
| BEAM (10M) | **48.6** | 6,914 |

*注：2025 年论文报告的是每次对话的 token 数（full-context 约 26,000）。2026 年算法报告的是每次检索调用的平均 token 数（LoCoMo 约 6,956）。这是不同的计量单位，但衡量的是同一底层效率。*

新算法的两个最大增益来自时间查询（比旧算法 +29.6 分）和多跳推理（+23.1 分）。这两个类别最能反映 agent 如何处理真实用户历史——其中事实会积累、变化，并随时间相互关联。

**两个架构变更驱动了这些结果：**

- **单遍 ADD-only 提取：** Mem0 现在将 agent 生成的事实视为一等公民，以与用户陈述的事实同等的权重存储 agent 确认和推荐，显著缩小了记忆覆盖的缺口。
- **多信号检索：** 检索栈并行运行三轮评分——语义相似度、关键词匹配和实体匹配——然后融合结果。组合分数优于任何单一信号。

> 完整评估框架已在 github.com/mem0ai/memory-benchmarks 开源。

## 集成生态

AI agent 记忆增长最快的领域不是核心 pipeline，而是集成层。截至 2026 年初，Mem0 的官方集成文档覆盖了 21 个框架和平台，横跨 Python 和 TypeScript。

### Agent 框架

Agent 框架覆盖范围反映了 agent 生态系统的碎片化程度。没有哪个单一框架赢得了市场。开发者在所有框架上构建，一个绑定到单一框架的记忆层，是开发者不会大规模采用的记忆层。

当前已文档化的 13 个 agent 框架集成：

- LangChain（Python，以及独立的 LangChain Tools 集成）
- LangGraph，用于有状态 agent workflow
- LlamaIndex，用于文档密集型 RAG pipeline
- CrewAI，用于多 agent 团队
- AutoGen，用于对话式多 agent 系统
- Agno
- CAMEL AI，用于角色扮演和协作 agent
- Dify，用于无代码和低代码 agent 构建者
- Flowise，用于可视化 agent 构建者
- Google ADK，用于多 agent 层级结构
- OpenAI Agents SDK
- Mastra，一个 TypeScript 原生 agent 框架

Mastra 集成值得关注，因为它是 TypeScript-first 的。`@mastra/mem0` 包提供了一等集成，无需管理 Python 服务端。它将记忆暴露为两个工具：`Mem0-memorize` 和 `Mem0-remember`，Mastra agent 通过标准 tool-calling 使用，记忆异步保存，避免阻塞响应生成。

### 语音 Agent 集成

三个专用语音集成代表了持久记忆最重要的新兴用例之一：ElevenLabs 用于对话式语音 AI、LiveKit 用于实时语音和视频 agent、Pipecat 用于语音优先的 AI 应用。

语音 agent 有一个在质上不同于文本 agent 的记忆问题。在语音交互中，用户无法回滚、从之前的 session 复制粘贴上下文，或手动提醒 agent 过去的对话。如果 agent 不记得，摩擦是即时且明显的。

ElevenLabs 集成通过暴露两个异步工具函数来处理这个问题：`addMemories` 和 `retrieveMemories`，语音 agent 通过 ElevenLabs 的 function-calling 系统调用。记忆写入是异步的，不会增加语音延迟。确定记忆范围的 `USER_ID` 来自调用应用中已认证用户的身份，而非由记忆系统生成，使记忆隔离与应用级认证绑定，而不需要单独的身份层。

### 开发者工具集成

Vercel AI SDK（通过 `@mem0/vercel-ai-provider` 用于 TypeScript Web 应用，自 2025 年 8 月起支持 Vercel AI SDK V5，支持多模态文件和 Google provider）、AgentOps 用于 agent 监控和可观测性、Raycast 用于 AI 驱动的开发者生产力工具、OpenClaw 通过 `@mem0/openclaw-mem0`，以及 AWS Bedrock 用于托管 LLM 基础设施。

### 向量存储的扩散

Mem0 的开源和云产品目前支持 20 个向量存储后端。

- **自托管和开源：** Qdrant、Chroma、Weaviate、Milvus、PGVector、Redis、Elasticsearch、FAISS、Apache Cassandra、Valkey、Kuzu（图）
- **云和托管：** Pinecone、ChromaDB Cloud、Azure AI Search、Azure MySQL、Amazon S3 Vectors、Databricks Mosaic AI、Neptune Analytics、OpenAI Store、MongoDB

Neptune Analytics 的加入（2025 年 9 月）带来了 AWS 原生图记忆支持。在 AWS 上运行的团队可以使用 Neptune 作为图后端，而不需要运行独立的 Neo4j 或 Kuzu 实例。Apache Cassandra 支持（v1.0.1，2025 年 11 月）和 Valkey 支持（v0.1.118，2025 年 9 月）服务于运行高吞吐量分布式存储的团队。FastEmbed 集成用于本地嵌入，允许团队在设备上运行整个嵌入 pipeline，无需 API 调用，降低成本和数据出口，适合对隐私敏感的部署。

## Graph Memory：从外部图存储到内置实体链接

AI agent 中的 Graph memory 在 2024 年基本处于实验阶段。到 2026 年，生产模式已经改变。重要的转变不是"每个 agent 现在都需要图数据库"，而是记忆系统正在超越纯向量相似度。

![向量记忆与图记忆的对比：向量记忆使用嵌入相似度，图记忆映射实体关系和连接](https://framerusercontent.com/images/spAOWCO0vkktuAbZjdTyi1auejU.png)

*图：向量记忆与图记忆的比较*

**向量记忆**检索语义相似的事实。**图式记忆**通过实体和关系检索事实。两者都有用；单独使用任何一种都不够。

在我们新的开源算法中，我们用内置实体链接替代了外部图存储支持。在 `add()` 时，Mem0 从每条记忆中提取实体，并将它们存储在名为 `{collection}_entities` 的并行实体集合中。在搜索时，查询中的实体与该集合匹配。这些匹配结果然后在最终组合分数中提升相关记忆的排名。

这是更广泛的多信号检索重设计的一部分：语义相似度、BM25 关键词匹配和实体匹配——三者归一化并融合为一个结果分数。

*权衡：* 这不再是一个可查询的图接口。先前版本的 `relations` 字段已被移除。实体关系现在影响检索排名，但不能直接遍历。对于需要图接口做自定义推理的团队，这是一个退步。对于需要实体感知检索但不想承担 Neo4j 部署开销的团队，这是净改善。

## 多范围记忆：落地的 API 设计

AI agent 记忆领域中最干净的设计决策之一是 Mem0 的四范围记忆模型。每次记忆写入至少关联以下之一：

- `user_id`：属于特定用户、跨所有 session 持久的记忆
- `agent_id`：属于特定 agent 实例的记忆
- `run_id` 或 `session_id`：范围限定为单次对话或 workflow 运行的记忆
- `app_id` 或 `org_id`：共享的组织级上下文记忆

这些标识符决定了搜索时返回什么内容，而且它们可以组合。查询可以限定为特定 run 中的特定用户，或者检索某用户在所有 run 中的所有记忆。检索 pipeline 自动处理合并，将用户记忆排在 session 上下文之上，session 上下文排在原始历史之上。

这个范围模型在 v1.0.0 的 metadata 过滤功能加持下变得更加有用。在此之前，记忆搜索纯粹基于语义。有了 metadata 过滤，记忆可以携带结构化属性 `{"context": "healthcare"}`，独立于语义内容进行查询。这对多租户应用至关重要——同一个用户记忆存储处理不同的应用上下文。

## 多 Agent 系统中的 Actor 感知记忆

带 actor 感知记忆的 Group Chat 解决了多 agent 系统中一个真实的失败模式：搞不清谁说了什么。

在共享对话中，一条类似"用户需要部署方面的帮助"的记忆是模糊的。是用户直接说的吗？是监控 agent 推断的吗？还是规划 agent 作为中间步骤创建的？

Mem0 当前的 Group Chat 流程使用消息的 `name` 字段进行归属标记。用户消息存储在 `user_id` 下，助手或 agent 消息存储在 `agent_id` 下。在检索时，agent 可以按参与者和 session 进行过滤，帮助区分用户陈述的事实和 agent 生成的推断。随着多 agent 系统变得更加复杂，记忆层中的来源追溯成为可靠性的一部分，而不仅仅是调试工具。

## Procedural Memory：第三种记忆类型

大多数 AI 记忆系统关注两种类型：

- *Episodic memory*（情景记忆）：发生了什么
- *Semantic memory*（语义记忆）：知道什么

生产 agent 还需要第三种：*Procedural memory*（过程记忆）。

Procedural memory 存储事情应该怎么做。对 agent 来说，这意味着学到的 workflow、编码模式、工具使用习惯、review 规范和部署步骤。一个编码助手可能会学习团队如何组织 pull request、合并前运行哪些测试命令、如何处理 release note。这不仅仅是偏好或事实。这是 agent 应该一致应用的过程知识。

这是 Mem0 架构支持该概念的一个领域，但专门管理 procedural memory 的工具仍处于早期阶段。

## OpenMemory MCP：隐私优先分支

OpenMemory 是 Mem0 为开发者提供的本地优先记忆层，用于在 AI 工具之间实现持久记忆。它作为 MCP 兼容的记忆服务器运行，支持 Claude Desktop、Cursor、Windsurf、VS Code 和其他 MCP 兼容的 agent。记忆存储在本地，配有 dashboard 用于浏览和管理已保存的内容。

关键区别在于控制权。OpenMemory MCP 将记忆存储在本地，配有 dashboard 用于浏览和管理已保存的内容。Mem0 还提供托管的 OpenMemory 和云 MCP 路径以降低设置成本。面向的受众不同于托管平台：个人开发者、编码 agent 用户，以及希望在工具间获得可移植记忆而不构建产品特定记忆后端的团队。

## 生产记忆到底需要什么？

过去 18 个月发布的六个功能，标志着真实部署的实际需求：

![Mem0 在 18 个月内交付的六个生产记忆需求：异步模式、重排序、元数据过滤、更新时间戳、记忆深度配置和结构化异常](https://framerusercontent.com/images/bK41JaQimY0tyGl8MNoAmJSs.png)

*图：生产记忆需求*

- **异步模式为默认：** 阻塞响应 pipeline 的记忆写入会增加用户可感知的延迟。v1.0.0 将 `async_mode=True` 设为默认，消除了最常见的生产坑。
- **重排序（Reranking）：** 向量相似度能返回正确的候选结果，但顺序往往不对。二遍重排序器使用 Cohere、Hugging Face、Sentence Transformers 或基于 LLM 的模型对查询重新评分，然后内容才进入 context window。
- **Metadata 过滤：** 记忆上的结构化属性（`{"context": "healthcare"}`）使范围查询成为可能。按项目、时间范围或任何结构化属性过滤。
- **更新时间戳：** 用准确的创建时间回填记忆存储，在迁移历史数据时很重要。时间排序影响检索时新近度的权重。
- **记忆深度和用例配置：** 包含 prompt、排除 prompt 和深度现在是项目级设置。医疗助手存储更少并排除药物细节；客服机器人只存储产品和问题历史。
- **结构化异常：** 异常中的错误代码和建议操作取代了无法解析的字符串。在 changelog 中不起眼，但在凌晨 2 点的生产事故中价值巨大。

## 开放问题

尽管取得了进展，几个问题仍然是真正未解决或仅部分解决的：

![AI agent 记忆的六个开放问题：时间抽象、跨 session 结构、应用级评估、隐私与许可架构、跨 session 身份解析和记忆过期](https://framerusercontent.com/images/4vaSqjzyjwPtsvkH8WFCqPRq2o.png)

*图：AI agent 记忆的开放问题*

- **时间抽象：** BEAM 1M 到 BEAM 10M 的下降（64.1 → 48.6）是上下文规模扩大 10 倍时约 25% 的性能损失。时间查询是最难的类别，即使在新算法 +29.6 分的增益之后，提升空间仍然很大。
- **跨 session 结构：** 一个从纽约搬到旧金山的用户，这个变化应该被理解，而不仅仅是存储新城市。大多数系统将变化视为替换。正确的行为应将其视为演变。
- **应用级评估：** LoCoMo 上的 91.6 分并不能告诉你系统在医疗或法律工作负载上的表现。Benchmark 测量的是通用召回。应用级评估对大多数团队来说仍然是手工定制的过程。
- **隐私与许可架构：** 谁可以检查存储的记忆？保留多久？用户如何删除它们？这些目前是应用层的决策。随着消费产品添加持久记忆，监管预期将变得更加具体。
- **跨 session 身份解析：** 记忆模型假设 `user_id` 是稳定的。匿名 session、多设备用户和混合认证流程打破了这个假设。判断两次交互是否来自同一个人，是记忆层中未解决的身份问题。
- **记忆过期（Memory staleness）：** 一条被频繁检索的关于用户雇主的高相关性记忆，在用户换工作之前都是准确的，之后它就变成了"自信地错误"。衰减可以处理低相关性的记忆。高相关性记忆的过期是一个更难的开放问题。

## 快速开始

2026 年的 AI agent 记忆是一个生产工程学科，拥有真实的 benchmark、可量化的权衡和不断增长的运维知识体系。

部署记忆的基础设施已经扩展到覆盖 21 个框架、20 个向量存储和三种不同的托管模型——托管云、开源自托管和本地 MCP。剩余的开放问题是真实的，但它们是具体且有边界的，而非根本性的。

- **工程师**现在可以在一个下午内接入持久记忆。Mem0 Docker 自托管指南使用 Qdrant 作为向量后端，不到 20 分钟就能搭建一个可用的本地 API。
- **创始人和架构师**评估记忆层时：token 效率数字是需要压力测试的指标。LoCoMo 上每次检索调用 6,956 token vs full-context 约 26,000——在规模化推理账单上这是真正的差异。Benchmark 评估框架已开源——在确定架构之前，先在你自己的工作负载上运行。

| 选项 | 最适合 | 设置时间 |
| --- | --- | --- |
| Mem0 托管云 | 快速集成，无基础设施开销 | 2 分钟 |
| 自托管 OSS | 完全数据控制，规模化成本 | 20 分钟 |
| OpenMemory MCP | 跨开发工具的本地记忆（Claude、Cursor、Windsurf） | 5 分钟 |

- **研究人员**想深入了解评估方法论：我们最新的 token 高效记忆算法是最佳起点。两个架构变更将语义相似度、BM25 和实体匹配组合为单个融合分数。最大增益来自时间查询（+29.6 分）和多跳推理（+23.1 分）——这两个类别最能反映 agent 如何处理真实用户历史。

## 常见问题

### 问：什么是 AI agent 记忆？

AI agent 记忆是一个持久存储层，让 agent 能够跨 session 保留信息。没有它，每次对话都从零开始——没有用户偏好、没有之前上下文、没有连续性。有了记忆，agent 记住用户之前说过什么、需求如何变化、哪些问题已解决。2026 年，记忆被视为独立于模型 context window 的专用架构组件，而不仅仅是更长的 prompt。

### 问：AI agent 的记忆如何工作？

在对话过程中，记忆层提取事实并将它们存储在向量数据库中，按用户、session 和 agent 标识符索引。在新 session 开始时，使用语义相似度、关键词匹配和实体匹配检索相关记忆，然后在模型响应之前注入 context window。只有最相关的事实浮出水面，保持 token 使用量低且检索精确。

### 问：AI agent 记忆的开放问题有哪些？

关键剩余挑战包括大规模时间抽象；建模跨 session 结构使记忆演变而非覆盖；应用级评估框架；健壮的隐私与许可架构；跨设备和匿名 session 的跨 session 身份解析；以及处理用户情况变化后先前检索的事实变得不正确时的记忆过期。

### 问：什么是多范围记忆（multi-scope memory）？

多范围记忆是一种设计模式，其中每次记忆写入标记一个或多个身份范围：`user_id` 用于跨 session 持久的事实，`agent_id` 用于绑定到特定 agent 实例的事实，`run_id` 或 `session_id` 用于对话范围的事实，`app_id` 或 `org_id` 用于共享的组织级上下文。这些范围在检索时组合，pipeline 自动合并和排序结果。

### 问：哪些 benchmark 测量 AI agent 记忆质量？

三个 benchmark 通常定义了这个领域：LoCoMo（1,540 个问题，覆盖单跳、多跳、开放域和时间召回），LongMemEval（500 个问题，包括知识更新和跨 session 召回等类别），和 BEAM（在 1M 和 10M token 规模上跨多个类别评估）。这些 benchmark 同时测量准确率以及 token 消耗和延迟。
