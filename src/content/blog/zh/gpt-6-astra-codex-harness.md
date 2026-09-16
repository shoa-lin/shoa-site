---
translationKey: "gpt-6-astra-codex-harness"
locale: "zh"
title: "从回合制到控制平面：GPT-6 Astra 如何重写 Codex Harness"
description: "异步工具调用、Mid-turn steering、动态推理与 Agents API，正在把 Agent 开发从自建运行时推向能力与责任重新分层。"
publishedAt: "2026-09-15"
updatedAt: "2026-09-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://developers.openai.com/api/docs/guides/latest-model"
sourceAuthor: "OpenAI Developers 与社区资料"
contentType: "adaptation"
translationStatus: "published"
---

## 结论先说

GPT-6 Astra 带来的变化，不只是模型更强，而是 Agent 的时间模型、控制模型和运行时边界都在改变。

异步工具调用让模型可以在慢工具运行时继续处理独立工作；Mid-turn steering 让用户可以在模型尚未完成时改变要求；`configuration_update` 让应用可以在不改写请求级推理参数的情况下调整后续推理强度，并保留 prompt cache 前缀。

更大的变化来自 2026 年 9 月 10 日公开测试的 Agents API。它通过 API 提供 OpenAI 管理的 Codex Harness：应用提供模型指令、业务工具和执行环境，OpenAI 管理会话、编排、上下文压缩、恢复和事件流。

这意味着 Agent 开发正在发生一次责任迁移：

> 平台吸收通用运行时，模型吸收部分交互协议，应用团队把精力放回业务能力、权限边界、执行环境和结果验证。

## 我曾经为什么要自己造这些东西

早期做 Agent 时，异步工具调用和“边做边改方向”往往不是两个 API 参数，而是一组状态机问题。

要保存未完成任务，区分模型回合和后台任务，处理进程重启、超时、取消、重复回调和乱序结果；要把用户的新指令插入正在运行的流程，还要判断旧输出是否作废、已经执行的动作是否可回滚。推理强度变化又会影响请求结构、缓存命中和上下文重放。

这些工程并不产生业务价值，却决定 Agent 能否稳定运行。团队常常花大量时间维护一个围绕模型限制搭建的“补偿层”。

Astra 开始把其中一部分变成协议语义。

## Astra 让模型不再被慢工具卡住

Responses API 的异步工具调用要求在 function 或 custom tool 定义中设置 `async: true`。模型发出调用后可以继续完成不依赖该结果的工作，应用则在任务完成后使用原始 `call_id` 回传结果。

这里减少的是模型侧的等待，不是应用侧的工作。OpenAI 不替应用运行后台任务，也不提供业务队列。生产系统仍需决定任务由谁负责、如何授权、怎样重试、结果保存多久以及失败如何呈现。

如果多个任务同时运行，应用还可以定义普通的 `wait_for_tasks` 工具，让模型在真正需要比较结果时才等待。这个 wait 工具属于应用自己的协议。

因此，异步能力的价值不在于给所有工具都加上 async，而在于把真正独立的工作提前启动，同时保留明确的依赖屏障。

## Mid-turn steering 把用户变成运行中的控制信号

Astra 的 Mid-turn steering 通过 Responses API 的 WebSocket 模式提供。应用发送 `response.steer`，API 将新的用户要求排入当前响应，并自动生成后续 continuation。

它不会改写已经发送的输出，也不会撤销已经开始的工具。`accepted` 只表示输入已排队，模型是否已经执行仍要继续读取事件确认。

因此，steering 是“追加约束”，不是“时间倒流”。Harness 仍需维护：

- 当前响应和 successor 响应的关系；
- 多次 steering 的顺序；
- 已发生副作用的权限边界；
- 工具结果与新方向之间的冲突处理；
- 连接中断和重复投递时的恢复策略。

这比过去手写“终止请求再重建上下文”更可靠，因为协议已经表达了 continuation 的生命周期；但它没有替应用定义业务上的撤销语义。

## configuration_update 把推理强度变成会话状态

应用可以在历史中插入：

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

请求级的 `reasoning.effort` 保持原值，更新项只影响后续响应。这样可以在普通任务使用较低推理强度，遇到故障分析或风险评估时提高强度，同时保持原有 prompt 前缀，有利于缓存复用。

这个机制目前只支持 GPT-6 Astra 的标准单 Agent 模式，只改变 reasoning effort；相邻更新、自动 compaction 和自动 truncation 都有明确限制。

这里要区分三个层次：API 已支持该协议，Codex 底层可能已有部分数据结构，当前 Codex 客户端是否在普通设置变更时正确使用它，则需要按具体版本验证。公开的 [Codex Issue #42996](https://github.com/openai/codex/issues/42996) 仍在报告推理强度切换后的缓存命中问题，因此不能把 API 文档直接当作客户端已完成接入的证据。

## 从 Responses API 到 Codex Harness，再到 Agents API

OpenAI 现在把三种运行时边界说得很清楚：

| 方式 | 谁管理运行时 | 适合什么 |
| --- | --- | --- |
| Responses API | 应用自己 | 需要完全控制 Agent 循环 |
| Codex SDK / App Server | 复用本地 Codex 运行时 | 把 Codex 集成到自己的工具和产品 |
| Agents API | OpenAI 托管 Codex Harness | 希望平台管理会话、编排、压缩和恢复 |

Agents API 的意义在于，它把过去每个团队都要重复实现的通用 Harness 变成平台能力。官方文档列出的托管能力包括沙箱、Skills、MCP、steering、上下文管理、子 Agent 和会话恢复。

应用团队仍然需要提供工具和选择执行环境，但不必从零实现所有通用的 agent loop。

这不是“所有工作都交给平台”。平台负责通用运行机制，应用负责业务真相。比如：

- 哪个租户有权读取这份数据；
- 工具调用是否允许产生外部副作用；
- 重试会不会重复扣款或部署；
- 什么证据足以说明任务完成；
- 哪些结果必须经过人工审批。

## Harness 的复杂度不是消失，而是重新分层

可以把过去的工程复杂度分成三类：

1. **模型补偿复杂度**：等待、重建上下文、模拟中断、手写异步协议。Astra 正在吸收其中一部分。
2. **通用运行时复杂度**：会话、事件流、压缩、恢复、子 Agent 和沙箱。Codex Harness 与 Agents API 正在吸收其中一部分。
3. **业务正确性复杂度**：权限、数据一致性、审批、幂等、验收和审计。这些仍属于应用本身。

所以真正的变化不是“以后不用做工程”，而是工程重心发生了迁移：

```text
过去：自己建造 Agent Runtime
现在：连接能力、声明边界、验证结果
```

## 对 Codex 的启示

Codex Harness 如果继续演进，核心会从回合循环转向控制平面：

```text
事件流
  ├─ 模型响应
  ├─ 工具启动与完成
  ├─ 用户 steering
  ├─ 推理配置更新
  └─ continuation

控制平面
  ├─ 当前 conversation head
  ├─ pending task registry
  ├─ 权限与审批
  ├─ 缓存不变量
  ├─ 恢复与幂等
  └─ 结果验证
```

社区对 LangChain、Hermes、ZeroClaw 和其他网关的讨论也说明，协议出现后，生态适配仍需要时间。常见问题不是“能否发出 async 字段”，而是流式转换、消息重放、乱序完成、断线恢复和重复交付是否保留了原始语义。

## 最后的判断

Astra 和 Agents API 共同指向一个新的 Agent 分工：

> 模型负责更灵活地思考，协议负责表达运行中的控制，Harness 负责通用编排，应用负责业务世界里的真实约束。

这会大大降低新 Agent 的起步成本。过去需要数周搭建的异步循环、状态恢复和中途干预，未来可能变成配置运行时和接入工具。

但这也提高了应用团队对“定义问题”的要求。越多通用机制被平台接管，真正有差异的部分就越集中在工具设计、权限模型、环境边界、验证器和反馈闭环。

Agent 开发的核心问题，正在从“怎样让模型跑起来”，转向“怎样让它在真实世界里被可靠地使用”。

## 参考资料

- [OpenAI：Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI：Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI：Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI：Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
- [OpenAI：Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [OpenAI：Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI：Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI：Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Chasing Next：Async Tool Calling in the Responses API](https://chasingnext.com/updates/async-tool-calling-in-the-responses-api)
- [The Syntax Diaries：OpenAI Async Tool Calling Without Lost Results](https://thesyntaxdiaries.com/openai-async-tool-calling)
- [LangChain Issue #40204](https://github.com/langchain-ai/langchain/issues/40204)
