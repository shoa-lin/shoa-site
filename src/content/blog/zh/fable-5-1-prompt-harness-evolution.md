---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "zh"
title: "从 Fable 5 到 Fable 5.1：系统提示词正在长成 Agent OS"
description: "对比两代 Claude Runtime 提示词，拆解 Memory、Past Chats、Skills、工具路由与安全治理的结构性升级，并判断 Agent Harness 的下一步。"
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## 结论先说

2026 年 9 月 1 日，Anthropic 发布 Claude Fable 5.1。大多数讨论集中在模型能力、价格和基准测试，但我更关注一个看起来没那么“性感”、实际上更能解释产品方向的材料：**Claude 在真实产品里运行时所使用的 System Prompt 与 Runtime Prompt。**

我对比了 2026 年 6 月 9 日的 Fable 5 完整运行时提示词归档，以及 2026 年 9 月 2 日获得的 Fable 5.1 运行时提示词快照。前者约 1,580 行、126,943 字节，后者为 2,195 行、275,723 字节；工具定义也从 18 个增加到 44 个。

但这次变化不能简单概括成“提示词翻倍了”。文件大小里包含大量工具 Schema、示例和动态运行环境说明，**长度不等于智能，也不等于产品能力。**真正值得关注的是结构：

> Fable 5 已经是一个挂载了工具、Skills、MCP 和 Artifact 的 Agent；Fable 5.1 则开始把记忆、历史会话、能力发现、输出路由、权限与安全治理组织成一套更完整的 Agent Runtime。

换句话说，Claude 外围的 Harness 正在从“给模型配工具”，走向“为模型提供操作系统”。

## 先把比较口径说清楚

本文比较的不是模型权重，也不是训练数据，更不是 Anthropic 的服务端源码，而是两份可观察到的**提示词与运行时配置快照**。

Anthropic 公开的 System Prompt 页面主要展示 claude.ai 与移动端使用的核心行为提示；完整运行时快照还会包含当前会话可用的工具定义、Skills、文件系统、网络权限、用户上下文占位符和产品路由规则。因此，本文把它们统称为 **Runtime Prompt Bundle**。

这意味着本文可以较有把握地回答“产品在怎样组织模型外围能力”，但不能仅凭提示词断言“基础模型的推理能力提高了多少”。模型能力与 Harness 能力必须分开看。

## 一张表看完主要变化

| 维度 | Fable 5 | Fable 5.1 | 结构性变化 |
| --- | --- | --- | --- |
| Memory | 只有对记忆能力的简短说明 | 完整的文件分类、提取、读写、版本、隐私和应用规则 | 从功能描述变成受治理的数据平面 |
| Past Chats | 没有独立的历史会话检索体系 | `conversation_search`、`recent_chats`、`read_conversation` | 将摘要记忆与原始证据分开 |
| 工具数量 | 18 个工具定义 | 44 个工具定义 | 从通用工具箱扩展为多类能力接口 |
| 能力扩展 | Skills 与 MCP Apps | Skills、Plugin Catalog、MCP Apps | 从静态配置走向能力发现与安装 |
| 输出形态 | 文本、文件、Artifact、地图等 | 增加图表、对比卡片、步骤卡片、测验、翻译、商品与链接等类型化输出 | 输出从字符串变成可路由的 UI 类型 |
| 输出路由 | 分散在各工具说明中 | 明确区分 MCP、文件与 Visualizer 的优先级 | Harness 开始承担 Capability Router |
| 工作过程 | 没有通用的进度汇报要求 | 多次工具调用时应持续给出简短更新，并在工具结束后交付完整结论 | 产品开始显式治理长任务体验 |
| 写作格式 | 强烈压制列表、标题与加粗 | 根据内容复杂度选择最少但必要的格式 | Prompt 随模型默认行为重新校准 |
| 搜索策略 | 已要求验证时效性信息 | 进一步强调快速变化的产品、模型和工具即使“认识”也要搜索 | 防止熟悉感制造过时答案 |
| 安全与隐私 | 已有较完整的拒绝与健康规则 | 增加儿童安全、版权连续性、记忆隐私、删除语义和会话终止等细粒度状态规则 | 安全从输出过滤走向生命周期治理 |

## 变化一：Memory 从两句话变成一个文件系统

Fable 5 的 Memory 部分非常薄，只说明 Claude 可以获得从历史对话中提炼的记忆，以及当前用户是否启用了这项能力。它描述了“有 Memory”，却没有展开 Memory 怎样形成、怎样更新、怎样删除，也没有定义不同记忆之间的边界。

Fable 5.1 则把 Memory 设计成一个持久化文件系统，至少区分五类内容：

- `/profile.md`：相对稳定的身份与角色信息；
- `/topics/`：习惯、偏好和长期讨论主题；
- `/areas/`：持续中的项目、责任与决策；
- `/people/`：与用户当前问题有关的人际上下文；
- `/preferences.md`：用户希望 Claude 怎样回答和协作。

更重要的是，它没有停在文件命名上。新的规则继续定义了后台 Memory Pass、`[stated]` 等来源标记、读前写、版本冲突、追加与替换、整文件删除、敏感信息边界，以及“什么时候可以使用一条记忆、什么时候即使存在也不应该主动提起”。

```text
对话完成
   ↓
后台提取 Durable Facts
   ↓
分类、去重、隐私过滤、版本合并
   ↓
持久化 Memory Files
   ↓
未来问题按相关性读取
   ↓
只把真正改变答案的内容注入上下文
```

这不是传统意义上的“把聊天记录做 Embedding，再 Top-K 召回”。它更接近一个带有 Schema、Provenance、Lifecycle 和 Access Policy 的**上下文数据库**。

我的判断是：Agent Memory 的竞争重点会从“能不能记住”转向“记住什么、凭什么相信、谁能修改、何时失效、如何撤回”。向量检索只是其中一个实现细节。

## 变化二：Past Chats 与 Memory 被拆成两个上下文平面

Fable 5.1 新增了独立的历史会话工具：`conversation_search`、`recent_chats` 和 `read_conversation`。这不是对 Memory 的简单补充，而是在架构上承认了两类信息的本质差异：

- **Memory 保存经过压缩的 Durable Claim**，适合快速复用；
- **Past Chats 保存原始对话证据**，适合还原语境和核对来源。

提示词特别要求区分“用户明确说过或决定了什么”和“Claude 当时建议过什么”。如果旧会话里只有 Assistant 提出的方案，系统不能在下一次对话中把它升级成用户已经作出的决定；如果当时只是头脑风暴，也不能在摘要中把假设变成事实。

这解决的是所有长记忆系统都会遇到的一个核心问题：**压缩会提高可用性，也会损失证据。**

因此更可靠的结构不是用一个万能记忆库解决所有问题，而是：

```text
Memory = 可复用的结论
Past Chats = 可追溯的证据
Current Session = 正在发生的任务状态
```

未来成熟的 Agent 不只要“记得”，还要能够回答：这条记忆来自哪里，是用户说的、工具验证的，还是模型推断的？

## 变化三：Skills、Plugins 与 MCP 形成能力供应链

Fable 5 已经具备 Skills 和 MCP Apps。它知道在创建文档、表格、演示文稿或代码前读取对应的 `SKILL.md`，也知道在访问外部服务时优先使用已连接的 MCP。

Fable 5.1 没有推翻这套结构，而是在上面增加了 Plugin 与 Skill Catalog，包括搜索、推荐和安装入口。新的能力层可以这样理解：

- **Skill** 封装一类任务的经验、规范与执行方法；
- **Plugin** 把多个工具、命令和 Skill 组合成可分发能力包；
- **MCP** 连接外部数据、系统与真实世界权限；
- **Tool Schema** 把具体动作暴露给模型；
- **Router** 决定当前任务应该使用哪一类能力。

工具数量从 18 增加到 44，也不是简单“多了 26 个函数”。新增能力高度集中在几类方向：Memory CRUD、历史会话读取、Plugin/Skill 发现、Research 建议，以及图表、对比、步骤、翻译、测验、商品和链接等结构化 UI。

这说明 Agent 生态正在出现类似软件工程的分层：模型不需要永久记住每一种工作方法，也不应该直接持有每一种外部权限。能力可以被发现、加载、授权、调用和卸载。

## 变化四：Prompt 开始围绕模型行为做反向校准

Fable 5 的提示词曾经非常用力地压制标题、列表和加粗，因为当时的模型容易生成格式过度、看起来像模板拼装的回答。Fable 5.1 的规则反而放松为：内容复杂时可以使用列表，只使用澄清信息所需的最少格式。

这不是产品审美突然改变，而是模型默认行为变了。Anthropic 的 Fable 5.1 Prompting Guide 明确指出，新模型比 Fable 5 更少主动使用标题、列表和加粗；如果继续沿用旧的 Anti-formatting Prompt，结果可能变成过密的大段文字。

同样的补偿关系还出现在两个地方：

- Fable 5.1 在长工具链中更少主动汇报进度，因此新 Prompt 增加了“每隔若干次工具调用给出简短更新”的要求；
- Fable 5.1 在较低 Effort 下更容易凭已有知识回答，因此新 Prompt 对快速变化的产品、模型与工具加强了搜索校验要求。

这给 Prompt Engineering 一个很重要的提醒：**System Prompt 不是一次写完的产品规范，而是模型行为的控制器。**模型升级后，旧 Prompt 不一定失效，但它可能对新模型施加过度补偿，甚至把新模型调差。

真正成熟的做法不是在所有模型上复用一份“万能 Prompt”，而是基于 Eval 观察失败模式，再针对当前模型做最小必要校准。

## 变化五：安全从“不能回答什么”走向状态与数据治理

Fable 5 已经拥有详细的安全规则。Fable 5.1 的变化不只是增加更多禁止项，而是把安全要求延伸到整个交互生命周期。

例如，新的提示词会处理：一次拒绝之后后续请求怎样继承上下文；版权请求被缩小或改写后是否仍应保持边界；哪些信息永远不能进入长期记忆；删除一条记忆时是否必须同时删除仅由它推导出的结论；什么时候可以读取敏感记忆；用户要求结束会话时怎样确认；以及模型面对辱骂、自伤风险或潜在暴力风险时能否终止对话。

这些规则关注的已不只是最终输出，而是：

- 数据能不能被保存；
- 保存时采用什么来源标记；
- 后续能不能再次使用；
- 用户是否有权撤回；
- 工具副作用如何受到约束；
- 会话状态怎样影响下一步决策。

这意味着 Safety 正在从一个回答前后的分类器，变成 Agent Runtime 中的 Policy Engine。

## 哪些东西其实没有变

为了避免把每个细节都包装成“革命性变化”，还需要看清 Fable 5 已经具备什么。

Fable 5 里已经存在 Artifact 持久化存储、MCP 连接器、Skills、文件创建、Computer Use、Web Search、图片搜索和类型化地图等能力。它不是一个只能聊天的模型，Fable 5.1 也不是突然从零发明了 Agent。

真正的升级是：Fable 5.1 为这些既有能力补上了更清晰的上下文分类、证据回溯、能力目录、输出路由、过程反馈和治理规则。

所以这次变化更像从“有很多部件”走向“部件之间开始形成操作系统级的责任边界”。

## 我的总结：四个平面正在成形

把这次变化重新抽象，我认为 Claude 的 Runtime 已经可以划分为四个平面：

```text
Instruction Plane
System Prompt / Turn Instruction / User Preference / Skill

Context Plane
Current Session / Memory / Past Chats / Files / Web

Capability Plane
Tools / Plugins / MCP / Computer / Typed UI

State & Governance Plane
Provenance / Version / Permission / Safety / Audit
```

Fable 5 更像是在不断增加 Capability；Fable 5.1 则开始认真建设 Context 与 State Governance。

因此我现在更愿意用下面这个公式理解 Agent 产品：

> **Agent 产品能力 = Model × Context × Capability × State Governance**

这不是加法。模型很强但上下文错误，答案仍然会错；工具很多但权限失控，产品不能进入企业；记忆丰富但没有来源和删除机制，长期使用反而会积累污染；流程完整但没有可验证的反馈，Agent 只是更自动地犯错。

## 未来会怎么发展

### 1. 单体 System Prompt 会被拆成模块化 Policy

今天我们还能看到一份两千多行的 Runtime Prompt Bundle，但其中很多规则并不适合永远作为自然语言塞给模型。未来它们会逐渐被拆成可版本化的 Policy、Skill、Router、权限配置和任务级指令。

Prompt 不会消失，但它会从“承载所有规则的文本”退回到“让模型理解当前目标与边界的一层接口”。

### 2. Context Engineering 会升级为 State Engineering

过去大家讨论怎样把更多上下文塞进窗口，未来更重要的问题是：状态属于谁、当前版本是什么、哪些事实已经过期、怎样回滚、怎样证明一项外部操作发生过。

Memory、Past Chats、Session、Tool Trace 与外部系统状态会被分别建模。Agent 的上下文将越来越像数据库和事件流，而不是一段越来越长的 Prompt。

### 3. 更多约束会从 Prompt 下沉到协议层

Fable 5.1 同期出现的 Turn-scoped System Message、Thinking Block Binding、Content Provenance 和 Per-message Effort 已经说明了这个方向：一些重要约束开始由 API 和 Runtime 直接表达，而不是依赖模型“记得遵守”。

能够由类型系统、权限系统、版本号或协议保证的事情，最终都不应该只写在 Prompt 里。

### 4. Agent 的输出会从文本变成类型化结果

44 个工具中大量新增项不是“做事工具”，而是图表、卡片、步骤、测验、翻译和商品列表等输出组件。这说明模型的最终产物正在从 Markdown 字符串变成可以被应用直接消费的 Typed Result。

未来前端不会只渲染一段回答，而会根据模型选择的结果类型展示可操作 UI，并继续把用户交互转成下一轮状态。

### 5. 模型与 Harness 会共同训练、共同迭代

最值得关注的长期趋势，是模型和 Harness 不再是两个独立产品。模型的后训练会越来越适配特定工具协议、进度反馈、文件编辑方式、记忆结构和权限边界；Harness 又会根据新模型的失败模式重新调整 Prompt、Router 与 Eval。

Fable 5 到 Fable 5.1 的格式规则反转，就是一个很小但清晰的证据：模型默认行为一变，外围控制也必须跟着变化。

最终的竞争不会只是“谁拥有更强的基础模型”，而是谁拥有更完整的真实环境、更高质量的任务轨迹、更可靠的反馈信号，以及把这些信号重新用于模型和 Harness 迭代的闭环。

## 对 Agent 建设者意味着什么

第一，不要把 System Prompt 当作产品架构。Prompt 只能描述边界，真正可靠的边界还需要权限、Schema、版本、幂等、审计和 Eval 来保证。

第二，不要把 Memory 等同于向量数据库。长期记忆首先是数据治理问题，其次才是召回算法问题。

第三，不要只评估最终回答。对于能够调用工具的 Agent，更关键的指标是任务轨迹是否正确、外部副作用是否可控、失败后能否恢复、证据是否能够追溯。

第四，不要假设更换模型后旧 Harness 会自动变好。每次模型升级都应该重新跑真实任务 Eval，观察搜索、工具并发、文件编辑、格式、停机条件和进度反馈是否发生漂移。

## 最后

Fable 5.1 的提示词变化最值得看的，不是多写了多少条规则，而是 Anthropic 开始更系统地回答几个 Agent 产品必须面对的问题：上下文来自哪里，能力怎样被加载，状态怎样延续，副作用怎样治理，结果怎样呈现，错误怎样被纠正。

我的最终判断是：

> 下一代 Agent 的竞争，不会是谁的 Prompt 更长，而是谁能把模型放进一个更真实、更有状态、更可验证、也能持续学习的环境。

当这些环境能力逐渐稳定下来，System Prompt 反而可能重新变短。因为最可靠的规则，最终都会从“告诉模型应该怎样做”，演化为“系统只允许它以正确的方式做”。

## 参考资料

- [Anthropic：System prompts 总览](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic：Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic：Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic：Claude Fable 5.1 模型概览](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic：Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Fable 5 完整 Runtime Prompt 社区归档](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
