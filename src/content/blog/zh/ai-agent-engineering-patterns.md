---
translationKey: "ai-agent-engineering-patterns"
locale: "zh"
title: "AI Agent 工程设计模式（下）：可靠落地"
description: "从策略、工厂、责任链等经典模式，到沙箱、检查点和状态机，拆解 Agent 系统的工程组织方式与技术取舍。"
publishedAt: "2026-04-09"
updatedAt: "2026-07-13"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-engineering-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

上篇讨论的是 Agent **怎样工作**：怎样推理、调用工具、分工协作，以及在哪里放进记忆与安全边界。但当你开始实现它，复杂度会从“下一步做什么”转移到另一个问题：**这些能力该怎样组织成一个能长期维护的系统。**

真正落地时，问题往往很具体：

-   搜索工具有 Tavily、Exa、Gemini 三种，怎么让 Agent **不关心具体用哪个**？
-   不同 Agent（财务、研究、运营）都需要搜索，但参数不同，怎么**统一管理工具注册**？
-   Agent 调用工具前后需要做日志、限流、权限检查，怎么**不把业务代码和横切逻辑混在一起**？
-   Agent 生成的内容需要审核、格式化、翻译，怎么**串成一条处理管线**？

这些不是抽象的“AI 问题”，而是经典软件工程问题在 Agent 系统中的新形态。本文不要求你背下 12 个模式；目标是先看清每一种模式在替你隔离什么变化、约束什么风险。

## 先建立一张工程地图

可以先把下面的模式按它们解决的问题分成三类：

-   **替换与组合**：Strategy、Factory、Adapter 让模型、工具和 Agent 配置可以替换，而不是散落成大量条件判断。
-   **横切控制**：责任链、Observer、Decorator 把权限、日志、限流、缓存和审核从核心业务里抽出来。
-   **状态与边界**：Sandbox、Checkpoint、Prompt Composition、State Machine 处理隔离、恢复、上下文和生命周期这些 Agent 特有的难题。

有了这张地图，再看每个模式时，重点不是“它叫什么”，而是“我的系统正面临哪一种变化或失控”。

## 一、经典 GoF 模式在 Agent 中的新生命

### 01 Strategy — 工具选择的灵魂

**经典定义**：定义一族算法，封装每一个，使它们可以互相替换。

**Agent 场景**：同一个"搜索"操作，背后有多种实现——Tavily、Exa、Gemini。调用方不应该知道具体用哪个。

```python
# ❌ 没有策略模式 — 到处都是 if-else
def search(query: str):
    if use_tavily:
        return tavily_client.search(query)
    elif use_exa:
        return exa_client.search(query)
    else:
        return gemini_search(query)

# ✅ 策略模式 — 搜索器是可替换的
from abc import ABC, abstractmethod

class SearchProvider(ABC):
    @abstractmethod
    async def search(self, query: str, n: int = 5) -> list[SearchResult]:
        ...

class TavilySearch(SearchProvider):
    async def search(self, query, n=5):
        resp = await http_post("https://api.tavily.com/search", ...)
        return [SearchResult(title=r["title"], ...) for r in resp["results"]]

class ExaSearch(SearchProvider):
    async def search(self, query, n=5):
        resp = await http_post("https://api.exa.ai/search", ...)
        return [SearchResult(title=r["title"], ...) for r in resp["results"]]

# 统一搜索服务 — FallbackChain 本身也是一种策略
class UnifiedSearch(SearchProvider):
    def __init__(self, providers: list[SearchProvider]):
        self.providers = providers  # [TavilySearch(), ExaSearch()]

    async def search(self, query, n=5):
        for provider in self.providers:
            try:
                results = await provider.search(query, n)
                if results:
                    return results
            except Exception:
                continue
        raise AllProvidersFailedError()
```

💡 **这也是统一搜索服务的核心设计**。Strategy 模式让 fallback 链路的扩展变得自然——新增一个搜索源，只需实现 `SearchProvider` 接口，加到列表里。

**框架实践**：**DeerFlow** Lead Agent 选择子 Agent 本质就是策略选择；**AgentScope** `Toolkit.register_tool_function()` 注册工具——工具就是策略。

### 02 Factory — Agent 的统一创建

**经典定义**：将对象的创建逻辑封装起来，调用方不需要知道具体类。

**Agent 场景**：系统里有多个 Agent，每个有不同的 model、system prompt、工具集。创建逻辑不应该散落在各处。

```python
# ❌ 没有工厂 — 每次都要记住每个 Agent 的配置
financial_advisor = Agent(model="model-a", system_prompt="你是专业财务顾问", tools=[search, message])
researcher = Agent(model="model-b", system_prompt="你是信息搜集专家", tools=[search, web_fetch])

# ✅ 工厂模式 — 配置驱动，一处定义
AGENT_REGISTRY = {
    "financial-advisor": AgentConfig(
        name="Financial Advisor", model="model-a",
        system_prompt="你是专业财务顾问。",
        tools=["search", "message"],
    ),
    "researcher": AgentConfig(
        name="Researcher", model="model-b",
        system_prompt="你是信息搜集专家。",
        tools=["search", "web-fetch", "browser"],
    ),
}

class AgentFactory:
    @staticmethod
    def create(agent_id: str) -> Agent:
        config = AGENT_REGISTRY[agent_id]
        tools = [ToolRegistry.get(tool) for tool in config.tools]
        return Agent(model=config.model, prompt=config.system_prompt, tools=tools)

agent = AgentFactory.create("financial-advisor")
result = agent.run("分析最新财报")
```

**框架实践**：**DeepAgents** `create_deep_agent()` 隐藏了 LangGraph graph 编译细节；**AgentScope** `ReActAgent()` 隐藏了 memory、formatter 初始化；运行时配置也可以声明 Agent 列表，并按标识创建相应实例。

### 03 Chain of Responsibility — 工具调用管线

**经典定义**：将请求沿处理者链传递，每个处理者决定处理或传递给下一个。

**Agent 场景**：Agent 调用一个工具时，需要经过多层检查——权限 → 限流 → 日志 → 执行 → 结果处理。

```python
class ToolHandler(ABC):
    def __init__(self, next_handler: "ToolHandler | None" = None):
        self.next = next_handler

    def handle(self, ctx: ToolContext) -> ToolResult:
        if self.next:
            return self.next.handle(ctx)
        return ctx.execute()

class PermissionCheck(ToolHandler):
    def handle(self, ctx):
        if ctx.tool_name == "exec" and ctx.command in DANGEROUS_COMMANDS:
            if not ctx.has_approval():
                return ToolResult(approval_required=True)
        return super().handle(ctx)

class RateLimiter(ToolHandler):
    def handle(self, ctx):
        if self.limiter.is_limited(ctx.tool_name):
            return ToolResult(error="Rate limited, retry later")
        return super().handle(ctx)

class AuditLogger(ToolHandler):
    def handle(self, ctx):
        logger.info(f"[TOOL_CALL] {ctx.tool_name}({ctx.params})")
        result = super().handle(ctx)
        logger.info(f"[TOOL_RESULT] status={result.status}")
        return result

# 组装管线
pipeline = PermissionCheck(RateLimiter(AuditLogger()))
result = pipeline.handle(ToolContext(tool_name="exec", command="rm -rf /"))
# → PermissionCheck 拦截 → 返回 approval_required
```

💡 **插件 Hook 的设计哲学**可以形成一条隐式责任链：在构建提示词前和工具调用后分别插入横切逻辑。

### 04 Observer — 事件驱动的松耦合

**经典定义**：一个对象状态变化时，自动通知所有依赖它的对象。

**Agent 场景**：工具调用完成后，多个系统需要知道——错误队列要记录、监控要上报、学习引擎要分析。它们不应该互相耦合。

```python
from typing import Protocol

class ToolEventObserver(Protocol):
    def on_tool_call(self, tool: str, params: dict, result: ToolResult):
        ...

class ErrorQueueObserver:
    """自动将错误记录到队列"""
    def on_tool_call(self, tool, params, result):
        if result.exit_code != 0:
            error_queue.append({
                "tool": tool, "error": result.stderr,
                "timestamp": datetime.now().isoformat()
            })

class MetricsObserver:
    """记录工具调用耗时和成功率"""
    def on_tool_call(self, tool, params, result):
        metrics.record(tool, duration=result.duration_ms, success=result.ok)

class LearningReminderObserver:
    """检测到重复错误时注入学习提醒"""
    def on_tool_call(self, tool, params, result):
        if is_repeated_error(tool, result.stderr):
            inject_reminder(f"你之前犯过同样的错误：{result.stderr[:100]}")

class ToolEventBus:
    def __init__(self):
        self._observers: list[ToolEventObserver] = []

    def register(self, observer: ToolEventObserver):
        self._observers.append(observer)

    def emit(self, tool, params, result):
        for obs in self._observers:
            obs.on_tool_call(tool, params, result)

# 注册观察者（松耦合，互不知道对方存在）
bus = ToolEventBus()
bus.register(ErrorQueueObserver())
bus.register(MetricsObserver())
bus.register(LearningReminderObserver())
```

💡 **学习模块可以采用观察者架构**：工具调用后的观察者监听事件，新增能力时只需注册新的观察者。

### 05 Decorator — 无侵入的功能增强

**经典定义**：动态地给对象添加额外职责，不改变其接口。

**Agent 场景**：给 Agent 加上重试、缓存、日志、限流——不修改 Agent 本身的代码。

```python
def with_retry(max_retries=3, delay=1.0):
    """工具调用自动重试装饰器"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except RateLimitError:
                    if attempt < max_retries - 1:
                        await asyncio.sleep(delay * (attempt + 1))
                    else:
                        raise
        return wrapper
    return decorator

def with_cache(ttl_seconds=300):
    """搜索结果缓存装饰器"""
    cache: dict[str, tuple[float, Any]] = {}

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(query: str, *args, **kwargs):
            key = f"{func.__name__}:{query}"
            if key in cache:
                ts, result = cache[key]
                if time.time() - ts < ttl_seconds:
                    return result  # 缓存命中
            result = await func(query, *args, **kwargs)
            cache[key] = (time.time(), result)
            return result
        return wrapper
    return decorator

# 组合使用 — 搜索工具自动缓存 + 重试
@with_cache(ttl_seconds=300)
@with_retry(max_retries=3, delay=2.0)
async def search_web(query: str, n: int = 5) -> list[SearchResult]:
    return await unified_search.search(query, n)
```

**与责任链的区别**：责任链是"管线式"的——请求依次经过每个处理者。装饰器是"包裹式"的——每层装饰器包裹住核心功能。效果类似，但装饰器更轻量。

### 06 Adapter — 异构工具的统一接口

**经典定义**：将一个类的接口转换成客户端期望的另一个接口。

**Agent 场景**：不同的 LLM 提供商（OpenAI、Google、智谱）有不同的 API 格式，Agent 代码不应该关心这些差异。

```python
class LLMAdapter(ABC):
    @abstractmethod
    async def complete(self, messages: list[dict], tools: list = None) -> str:
        ...

class OpenAIAdapter(LLMAdapter):
    async def complete(self, messages, tools=None):
        resp = await openai_client.chat.completions.create(
            model="gpt-4o", messages=messages, tools=tools
        )
        return resp.choices[0].message.content

class GeminiAdapter(LLMAdapter):
    async def complete(self, messages, tools=None):
        resp = await gemini_client.generate_content(
            contents=messages, tools=tools
        )
        return resp.text

class GLMAdapter(LLMAdapter):
    async def complete(self, messages, tools=None):
        resp = await glm_client.chat.completions.create(
            model="glm-5", messages=messages
        )
        return resp.choices[0].message.content

# Agent 代码完全不关心底层用的是哪个模型
class Agent:
    def __init__(self, llm: LLMAdapter):
        self.llm = llm

    async def run(self, task: str):
        response = await self.llm.complete([
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": task}
        ])
        return response
```

**框架实践**：**DeepAgents** `init_chat_model("openai:gpt-4o")` 一个函数适配所有提供商；**OpenClaw** `zai/glm-5`、`google/gemini-2.5-flash` 统一的 `provider/model` 格式。

### 07 Template Method — Agent 执行流程的骨架

**经典定义**：在基类中定义算法骨架，将某些步骤延迟到子类实现。

**Agent 场景**：所有 Agent 的执行流程都是"接收任务 → 思考 → 调用工具 → 处理结果 → 返回"，但每一步的具体实现不同。

```python
class BaseAgent(ABC):
    """所有 Agent 的执行骨架"""

    async def run(self, task: str) -> str:
        context = await self.before_run(task)
        result = await self.think_and_act(context)
        return await self.after_run(result)

    async def before_run(self, task):
        logger.info(f"[{self.name}] 开始任务: {task[:50]}...")
        return TaskContext(task=task, memory=self.load_memory())

    @abstractmethod
    async def think_and_act(self, ctx: TaskContext) -> str:
        ...

    async def after_run(self, result):
        self.save_memory(result)
        return result

class ReActAgent(BaseAgent):
    async def think_and_act(self, ctx):
        while not ctx.is_complete():
            thought = await self.llm.complete(ctx.to_messages())
            action = self.parse_action(thought)
            observation = await self.execute_tool(action)
            ctx.add_step(thought, action, observation)
        return ctx.final_answer()

class PlanExecuteAgent(BaseAgent):
    async def think_and_act(self, ctx):
        plan = await self.generate_plan(ctx.task)
        for step in plan.steps:
            result = await self.execute_step(step)
            plan.mark_done(step, result)
        return plan.compile_results()
```

**框架实践**：**AgentScope** `ReActAgent` 重写 `think_and_act`；**DeepAgents** `create_deep_agent()` 返回编译后的 LangGraph StateGraph。

## 二、Agent 特有的工程设计模式

以上是经典 GoF 模式在 Agent 中的映射。下面几个模式更"Agent-native"——在传统软件中不常见，但在 Agent 开发中几乎必不可少。

### 08 Sandbox — 安全执行不可信代码

Agent 生成的代码/命令在**隔离环境**中执行，不影响宿主系统。

```text
Agent 生成的代码
      │
      ▼
┌─────────────┐
│  Docker 容器  │  ← 隔离的文件系统、网络、进程
│  或 E2B 沙箱  │
└─────────────┘
      │
      ▼
  执行结果（ stdout / 产出文件 ）
```

⚠️ **这不是一个 GoF 模式，但它是 Agent 系统的底线**——让 Agent 执行任意 shell 命令而不做沙箱，等于把系统控制权交给一个黑箱。

**框架实践**：**DeerFlow** 每个任务运行在独立 Docker 容器中；**DeepAgents** 支持远程沙箱（E2B）；**OpenClaw** exec 工具有 allowlist 机制。

### 09 Skill — 按需加载的能力模块

Agent 的能力不是固定的，而是**按需加载的模块化技能**。就像游戏角色装备不同的技能书。

```python
class Skill(ABC):
    name: str
    description: str  # Agent 读取这段描述决定是否使用

    @abstractmethod
    def get_tools(self) -> list[Tool]: ...

    @abstractmethod
    def get_instructions(self) -> str: ...

class Agent:
    def equip_skill(self, skill: Skill):
        self.skills[skill.name] = skill
        for tool in skill.get_tools():
            self.register_tool(tool)
        self.append_system_prompt(skill.get_instructions())
```

💡 **关键洞察**：Skill 不仅仅是"工具的集合"——它还包含**使用指南**（instructions），告诉 Agent \*什么时候用、怎么用\*。因此 `SKILL.md` 不应只写 API 地址，也应写清使用策略。

**框架实践**：**DeerFlow** Skill 是 Markdown 文件；**OpenClaw** Skill = SKILL.md + 可选的脚本/hook。

### 10 Checkpoint — 长任务的持久化与恢复

长时间运行的任务可能中断（超时、崩溃、API 限流），需要在关键节点**保存状态**，支持从断点恢复。

```python
class CheckpointManager:
    def save(self, task_id: str, state: TaskState):
        db.put(f"checkpoint:{task_id}", state.to_json())

    def restore(self, task_id: str) -> TaskState | None:
        data = db.get(f"checkpoint:{task_id}")
        return TaskState.from_json(data) if data else None

# 第一次运行：执行到第 3 步超时
agent.run(task_id="report-001", task="生成 AI 周报")
# → 保存 checkpoint：{completed_steps: [1,2,3], current: 4}

# 恢复运行：从第 4 步继续
agent.run(task_id="report-001", task="生成 AI 周报")
# → 加载 checkpoint → 跳过步骤 1-3 → 从步骤 4 继续
```

**为什么 Agent 特别需要**：传统程序的重试是"重新执行一遍"。Agent 的重试不能从头来——LLM 已经花了 30 秒思考出计划、前 5 步已经执行完毕，重新执行是巨大的浪费。

### 11 Prompt Composition — 分层构建 System Prompt

Agent 的 system prompt 不是一段写死的文本，而是**多层动态组合**的产物。

> 最终 System Prompt =
>     基础行为准则
>   + 角色定义
>   + 用户偏好
>   + 当前任务上下文
>   + 已装备 Skill 的使用指南
>   + 待处理的学习提醒
>   + 工具描述列表

```python
class PromptComposer:
    def build(self, agent: Agent, context: RunContext) -> str:
        parts = []
        # 1. 核心身份（固定）
        parts.append(read_file(agent.soul_path))
        parts.append(read_file(agent.identity_path))
        # 2. 动态注入
        if context.pending_learnings:
            parts.append(f"## 待处理学习\n{context.pending_learnings}")
        if context.equipped_skills:
            for skill in context.equipped_skills:
                parts.append(skill.get_instructions())
        # 3. 工具描述
        parts.append("## 可用工具\n")
        for tool in agent.tools:
            parts.append(f"- {tool.name}: {tool.description}")
        return "\n\n".join(parts)
```

**框架实践**：许多运行时会在提示词构建阶段动态注入内容；**AgentScope** `sys_prompt + formatter` 两层；**DeerFlow** Skill + 任务 + 工具定义动态组合。

### 12 State Machine — Agent 生命周期的精确控制

将 Agent 的执行过程建模为**有限状态机**，每个状态有明确的转换规则。

```text
[PLANNING]
  │ plan_ready
  ▼
[EXECUTING]
  ├─ success
  │   └─ [REVIEW]
  │       └─ [COMPLETE]
  ├─ error
  │   └─ [FALLBACK]
  │       ├─ recovered
  │       │ └─ [REVIEW]
  │       └─ failed
  │         └─ [TIMEOUT]
  └─ timeout
      └─ [TIMEOUT]

[TIMEOUT]
  └─ retry
      └─ [EXECUTING]
```

**为什么需要状态机**：没有状态机，Agent 的状态转换散落在各种 if-else 里——"如果执行失败且重试次数 < 3 就重试，否则降级，降级也失败就超时"——这种逻辑很快变成意大利面条。

**框架实践**：**DeepAgents** 底层就是 LangGraph StateGraph；**DeerFlow** 状态图 + supervisor 模式；**OpenClaw** Cron job 状态管理（ok → error → retry → timeout）。

## 三、四大框架对比分析

| 维度 | OpenClaw | AgentScope | DeepAgents | DeerFlow |
| --- | --- | --- | --- | --- |
| **定位** | 个人 AI 助手平台 | 通用 Agent 框架 | Agent Harness（SDK） | 超级 Agent Harness |
| **语言** | TypeScript | Python | Python | Python (后端) |
| **底层** | 自研 (Pi Agent) | 自研 | LangGraph + LangChain | LangGraph + LangChain |
| **核心模式** | Plugin + Hook + Skill | ReAct Agent + Workflow | StateGraph + Tool | Supervisor + Sandbox |
| **沙箱** | exec allowlist | 无内置 | E2B 远程沙箱 | Docker 容器 |
| **多 Agent** | Supervisor | Workflow + MessageHub | SubAgent (task 工具) | Supervisor (Lead→子) |
| **记忆** | 文件系统 | InMemory + Database | Auto-summarization | Persistent + TIAMAT |
| **MCP** | mcporter | 内置 | langchain-mcp-adapters | 无 |
| **适用场景** | 日常助手、自动化 | 研究、原型验证 | 编码 Agent、SDK | 长任务、内容生产 |

#### OpenClaw TypeScript · Plugin + Hook

不是传统的 Python SDK，而是一个运行时平台。核心设计模式：Plugin 扩展、Hook 责任链、Channel Adapter、Skill 系统。

-   **Plugin 模式**：第三方扩展通过 plugin 注册 hook 和工具，与核心松耦合
-   **Hook 模式**：`before_prompt_build`、`after_tool_call`、`agent_end` 组成隐式责任链
-   **Channel 抽象**：Telegram、Discord、飞书等渠道统一接口——Adapter 模式
-   **Skill 系统**：Markdown 驱动的技能加载——零代码门槛

💡 **独特优势**：Skill 用纯 Markdown 定义，零代码门槛。任何人都能写一个 Skill，不需要 Python。

#### AgentScope Python · 阿里达摩院

学术严谨 + 工程实用路线。ReAct 模式内置，Toolkit 抽象，Workflow 编排，Memory 分层，A2A 协议支持。

-   **ReAct 内置**：`ReActAgent` 是一等公民，开箱即用
-   **Toolkit 抽象**：`Toolkit.register_tool_function()`——Factory + Strategy
-   **Workflow 编排**：Pipeline 模式组合多个 Agent
-   **Memory 分层**：InMemory + Database + ReMe（增强长期记忆）
-   **A2A 协议**：Agent-to-Agent 通信标准——去中心化协作

💡 **独特优势**：A2A 协议支持让 Agent 可以跨系统、跨框架互操作。内置的模型微调（Agentic RL）能力也是独一份。

#### DeepAgents Python · LangChain 官方

设计哲学：信任 LLM，在工具层面做约束。开箱即用的 Agent Harness。

-   **create\_deep\_agent 工厂**：一行代码创建完整 Agent
-   **内置 Planning**：`write_todos` 工具让 Agent 自主分解任务
-   **内置 Filesystem**：read/write/edit/ls/glob/grep
-   **Sub-Agent 派发**：`task` 工具创建隔离的子 Agent
-   **Auto-summarization**：对话过长时自动摘要

💡 **设计哲学**：_"Enforce boundaries at the tool/sandbox level, not by expecting the model to self-police."_（在工具/沙箱层面做约束，不要指望模型自律。）

#### DeerFlow Python · 字节跳动

核心差异：大多数框架是"推理层"，DeerFlow 是"执行层"。

-   **Supervisor + Sub-Agent**：Lead Agent 分解任务，派发子 Agent 并行执行
-   **Docker Sandbox**：每个任务在隔离容器中运行，有真实文件系统和 bash
-   **Skill 系统**：Markdown 定义技能，按需加载
-   **Persistent Memory**：跨会话记忆，异步更新
-   **Stateful Pipeline**：基于 LangGraph checkpointing，长任务可中断恢复

💡 **独特优势**：真正给 Agent "一台电脑"——不只是生成文本，而是生成可下载的 PPT、可运行的代码、可部署的网页。

## 四、模式选型速查

| 你要解决的问题 | 推荐模式 | 对应经典模式 |
| --- | --- | --- |
| 同一操作有多种实现 | **Strategy** | 策略模式 |
| 统一创建不同配置的 Agent | **Factory** | 工厂模式 |
| 工具调用前后的多层处理 | **Chain of Responsibility** | 责任链模式 |
| 工具执行后的多个监听者 | **Observer** | 观察者模式 |
| 不改代码给工具加缓存/重试 | **Decorator** | 装饰器模式 |
| 不同 LLM 提供商统一接口 | **Adapter** | 适配器模式 |
| 定义 Agent 执行流程骨架 | **Template Method** | 模板方法模式 |
| 隔离执行不可信代码 | **Sandbox** | — |
| 按需加载能力模块 | **Skill** | — |
| 长任务中断恢复 | **Checkpoint** | — |
| 动态组合 System Prompt | **Prompt Composition** | — |
| 精确控制 Agent 状态转换 | **State Machine** | 状态机模式 |

延伸阅读：[OpenClaw](https://github.com/openclaw/openclaw) · [AgentScope](https://github.com/agentscope-ai/agentscope) · [DeepAgents](https://github.com/langchain-ai/deepagents) · [DeerFlow](https://github.com/bytedance/deer-flow)
