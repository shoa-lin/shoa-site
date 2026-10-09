---
translationKey: "agent-memory-multitenancy"
locale: "zh"
title: "AI Agent 的多租户记忆：LangGraph 给了积木，没给成品"
description: "SaaS 化 Agent 的记忆隔离，LangGraph 用三层原语（thread_id / namespace / LangMem）落在数据库键空间上；原语全部 MIT 开源，收费分界线在生产运维层。客观评估它离企业级云原生还差什么，以及为什么 Agent 界还没等到自己的 Kubernetes 时刻。"
publishedAt: "2026-10-10"
updatedAt: "2026-10-10"
category: "evaluation"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/agent-memory-multitenancy/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "draft"
---

# AI Agent 的多租户记忆：LangGraph 给了积木，没给成品

> 兼论 Agent 界为什么还没等到它的 "Kubernetes 时刻"
>
> 2026-10-09 · 基于 LangChain/LangGraph 官方文档、PyPI 包信息与 GitHub 数据的调研笔记

**TL;DR**

1. LangGraph 已经把"不同用户 / 任务 / 团队的记忆与上下文隔离"做成了三层原语（thread_id / namespace / LangMem），本质是**数据库键空间隔离**——你的直觉是对的。
2. 这套原语**全部 MIT 开源**，可以完全自建；收费的分界线在**生产运维层**（Agent Server 运行时，Elastic License 2.0）。
3. 但它离"企业级云原生解决方案"还差三块：租户体系、许可模型、生态中立性。
4. 我的判断：Agent 界还没等到它的 Kubernetes 时刻。今天上生产可以选它，押注三年请拆开下注。

---

## 一、问题起点：SaaS 化的 Agent，记忆就是多租户数据

当一个 Agent 不再是本地脚本，而是线上服务——同时服务成百上千个用户、跑着不同任务、分属不同团队——它立刻撞上一个传统 Web 应用早就解决过的问题：**数据隔离**。

聊天上下文、任务状态、长期记忆，本质上都是数据库里的行。谁能在哪一行读写，决定了这是不是一个能商用的系统。而 Agent 特有的难点在于：它不仅要隔离，还要**跨会话召回**——用户上周说过的话，这次新对话里要记得，但绝不能泄漏给另一个用户。

## 二、LangGraph 的答案：三层原语

LangChain 官方栈对这个问题给出的解法，工程上相当克制，一句话概括：**隔离不发明新概念，直接用数据库的键空间**。

![LangGraph 多租户记忆隔离三层架构](/assets/blog/agent-memory-multitenancy/langgraph-memory-layers.svg)

**第一层：Checkpointer + thread_id —— 会话与任务的隔离。**
每个 thread_id 对应一条独立的 checkpoint 链（PostgresSaver / RedisSaver / SQLite）。线程之间完全看不见彼此。"每个任务一个 thread"，就是天然的任务级隔离。

**第二层：Store + namespace —— 跨会话的长期记忆。**
记忆以 JSON 文档形式存入 Store，挂在 namespace 元组之下。官方惯例就是把身份编进元组：`(user_id, "memories")`；多租户就是 `(org_id, user_id, "memories")`。组织、用户、任务三级隔离，全靠元组前缀约定。PostgresStore 还内置 pgvector 语义检索——"回忆相关的事"和"严格隔离"在同一层解决。

**第三层：LangMem —— 记忆的形成。**
一个构建在 Store 之上的 SDK，负责"什么值得记、怎么提炼、热路径还是后台写入"，同样按 namespace 隔离。

但必须泼一盆冷水：**框架给你的隔离单位是 thread 和 namespace，不是"租户"**。身份认证、某个用户能不能碰某个 namespace、配额、按租户计费、GDPR 删除——全都不管。namespace 是你在请求入口手工拼接的，**拼错一段就是跨租户泄漏**，这是此类方案最常见的坑。要硬隔离，得自己上 Postgres 行级安全（RLS）。

## 三、开源边界：绑架你的不是数据模型，是运维层

这套东西开源吗？**开源，而且很彻底**：

- `langgraph` 核心（BaseStore / InMemoryStore / namespace 协议）：MIT
- `langgraph-checkpoint-postgres`（PostgresSaver + PostgresStore，含 pgvector）：MIT
- MongoDB / Redis / Upstash 后端、LangMem：开源
- 不想要官方后端？`BaseStore` 就是个抽象类，subclass 实现几个方法即可接任意数据库

真正不开源的是 **Agent Server 运行时**（`langgraph-api`，即 `langgraph build` 打出的那个镜像）：Elastic License 2.0，API 服务、任务队列、流式重连、crons、Studio 调试 UI 都在里面。生产级自托管要 LangSmith license key，启动时回连 langchain.com 验证——对金融、政务、内网隔离环境是硬伤。

有意思的是社区的反应：已经出现 `langhost`（MIT，clean-room 重写 Postgres+Redis 运行时，插回官方 `langgraph-api`）、`agent-protocol-server`（FastAPI+Postgres，兼容 LangGraph Client SDK）这类替代品。"被 license 卡住"的痛点，市场已经在动手拆了。

**一句话：记忆隔离的原语没有绑架你，绑架的是生产运维层。** 数据模型本身没有任何专有成分——哪天要迁走，数据就是 Postgres 里的普通表。

## 四、旁证：记忆层已经是独立赛道

如果只看编排框架，容易高估 LangGraph 的垄断程度。专门做"多用户记忆层"的产品已经自成一体：

- **mem0**：`user_id / agent_id / run_id / org_id` 是 API 一等公民，就是为线上多用户服务设计的，可嵌入任何框架
- **Zep (Graphiti)**：图谱式记忆，按 Group / Actor 隔离
- **Letta（MemGPT）**：每用户独立 agent + memory blocks

一个数据点（GitHub stars，2026-10）：**mem0 ⭐ 66.9k，已经超过 langgraph 本体的 42.9k**。记忆层的社区热度不低于编排框架本身——这说明"记忆隔离"作为独立需求是真实存在的，而且足够大。

## 五、客观评估：这是"企业级云原生"了吗？

LangGraph Platform 是目前 agent 领域**工程完成度最高**的基础设施：checkpoint、恢复、任务队列、流式重连、crons 打包成一个产品，LangSmith 补上 tracing/eval。说它是"Agent 专用基础设施的领跑者"，成立。

![Agent 运行时竞争格局](/assets/blog/agent-memory-multitenancy/agent-runtime-landscape.svg)

但按"企业级"的清单逐项对，缺口明显：

- **租户不是产品单位**：RBAC、配额、审计、计费全要自己写
- **许可模型反噬**：Elastic 2.0 + license 回连验证
- **运行时耦合**：业务逻辑写成 LangGraph graph，框架与运维层同源，执行逻辑的迁移成本真实存在
- **云原生动作不全**：有 Helm/K8s，但没有 multi-region HA、scale-to-zero 这些 K8s 生态惯例——它更像"打包好的单体服务"，不是组件化云原生架构

更关键的是，**格局没定，而且对手不弱**：Temporal 把 durable execution 做了七八年（多语言、multi-region、大厂验证），很多团队选"薄框架 + Temporal + Postgres"；AWS Bedrock AgentCore、Azure、GCP 在把 agent 运行时塞进云控制台，企业天然信任自家云厂商的合规证书；而 OpenAI 的 stateful API、Anthropic 的 Agent SDK 正在把"记忆与恢复"下沉到模型 API 层——这一层若成标准，编排框架的价值会被抽空一块。LangChain 自己也在对冲，推 Agent Protocol 开放标准——就是知道不能只靠私有运行时。

## 六、判断与建议

我的判断：**AI Agent 界还没等到它的 "Kubernetes 时刻"**。

2015 年前，容器编排也是 Mesos、Swarm、K8s 混战。K8s 最终胜出，不是功能最强，而是它**中立、组件化、每家云厂商都肯背书**。LangGraph Platform 是"某个强框架厂商把自己的运行时卖成基础设施"——这个模式历史上（Cloud Foundry 之于 K8s、Heroku 之于云原生）通常不是终局形态。

所以建议分两种情况：

- **今天就要上生产**：LangGraph OSS + PostgresStore + namespace 惯例 + RLS + 请求级身份注入，是当前最成熟的主流路径；预算够就直接 LangSmith，运维层全包。它值得"领跑者"这个地位。
- **押注三年的技术底座**：把赌注拆开——durable execution 用中立层（Temporal 或队列 + DB）；agent 逻辑用薄框架写；记忆层按 mem0 / Store 模式自己掌控 namespace。**架构上留退路，等格局收敛。**

隔离靠数据库键空间，这个设计判断是对的，也会活得比任何一家厂商都久。会变的是谁替你运维它——而这场比赛，才刚刚开始。

---

*数据口径：GitHub stars 取自 GitHub API（2026-10-09）；许可证信息取自 PyPI 与官方文档；langgraph 42,925 · mem0 66,860 · graphiti 31,579 · letta 25,082 · temporal 23,549。*
