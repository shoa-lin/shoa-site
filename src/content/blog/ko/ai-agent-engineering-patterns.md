---
translationKey: "ai-agent-engineering-patterns"
locale: "ko"
title: "AI 에이전트 엔지니어링 설계 패턴 (하): 신뢰성 있게 구현하기"
description: "Strategy, Factory, Chain of Responsibility부터 Sandbox, Checkpoint, State Machine까지. 변화, 통제, 복구에 견디는 AI 에이전트 시스템을 구성하는 방법을 다룹니다."
publishedAt: "2026-04-09"
updatedAt: "2026-07-13"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-engineering-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

이전 기사에서는 Agent의 **작동** 방식, 즉 추론, 도구 호출, 분할 및 협업 방법, 메모리 및 안전 경계 설정 위치에 대해 설명했습니다. 그러나 구현을 시작하면 복잡성은 "다음에 수행할 작업"에서 또 다른 질문인 **장기적으로 유지 관리할 수 있는 시스템으로 이러한 기능을 구성하는 방법에 대한 질문으로 전환됩니다. **

구현과 관련하여 질문은 종종 매우 구체적입니다.

- Tavily, Exa, Gemini의 세 가지 검색 도구가 있습니다. 에이전트는 어떤 것을 사용할지 어떻게 신경 쓰지 않을 수 있습니까?
- 서로 다른 에이전트(재무, 연구, 운영)를 검색해야 하지만 매개변수가 다릅니다. **관리 도구 등록을 통합**하는 방법은 무엇인가요?
- 에이전트는 도구 호출 전후에 로깅, 전류 제한, 권한 확인을 수행해야 합니다. 비즈니스 코드와 크로스커팅 로직을 혼합해 보는 것은 어떨까요?
- 에이전트가 생성한 콘텐츠를 검토하고 형식을 지정하고 번역해야 합니다. 처리 파이프라인에 어떻게 넣을 수 있나요?

이는 추상적인 "AI 문제"가 아니라 에이전트 시스템의 새로운 형태의 고전적인 소프트웨어 엔지니어링 문제입니다. 이 글에서는 12가지 패턴을 외울 필요가 없습니다. 목표는 먼저 각 패턴이 어떤 변화를 가져오고 어떤 위험을 격리하는지 명확하게 확인하는 것입니다.

## 먼저 엔지니어링 맵을 생성합니다.

먼저 다음 패턴을 해결하는 문제에 따라 세 가지 범주로 나눌 수 있습니다.

- **교체 및 조합**: 전략, 공장 및 어댑터를 사용하면 모델, 도구 및 에이전트 구성을 수많은 조건부 판단으로 흩어지는 대신 교체할 수 있습니다.
- **교차적 제어**: 책임 체인, 관찰자 ​​및 데코레이터는 핵심 비즈니스에서 권한, 로그, 전류 제한, 캐싱 및 감사를 추출합니다.
- **상태 및 경계**: 샌드박스, 체크포인트, 프롬프트 구성 및 상태 머신은 격리, 복구, 컨텍스트 및 수명 주기의 에이전트별 문제를 처리합니다.

이 지도에서는 ​​각 패턴을 볼 때 '무엇이라고 불리는가?'에 초점이 맞춰져 있지 않습니다. 하지만 "내 시스템이 어떤 종류의 변화나 통제력 상실에 직면하고 있습니까?"

## 1. Agent에서 고전적인 GoF 모델의 새로운 삶

### 01 전략 — 도구 선택의 핵심

**고전적인 정의**: 알고리즘 계열을 정의하고 서로 교체할 수 있도록 각 알고리즘을 캡슐화합니다.

**에이전트 시나리오**: 동일한 "검색" 작업 뒤에는 Tavily, Exa, Gemini 등 여러 구현이 있습니다. 호출자는 어느 것을 사용해야 할지 알 수 없습니다.

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

💡 **이 역시 통합검색 서비스의 핵심 디자인입니다**. 전략 모드에서는 대체 링크의 확장이 자연스럽게 이루어집니다. 새로운 검색 소스를 추가하려면 'SearchProvider' 인터페이스를 구현하고 목록에 추가하기만 하면 됩니다.

**프레임워크 실습**: **DeerFlow** 리드 에이전트는 기본적으로 전략 선택인 하위 에이전트를 선택합니다. **AgentScope** `Toolkit.register_tool_function()`은 도구를 등록합니다. 도구는 전략입니다.

### 02 Factory — 에이전트 통합 생성

**고전적인 정의**: 객체의 생성 논리를 캡슐화하며 호출자는 특정 클래스를 알 필요가 없습니다.

**에이전트 시나리오**: 시스템에는 각각 다른 모델, 시스템 프롬프트 및 도구 세트를 가진 여러 에이전트가 있습니다. 창조 논리가 여기저기 흩어져 있어서는 안 됩니다.

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

**프레임워크 실습**: **DeepAgents** `create_deep_agent()`는 LangGraph 그래프 컴파일 세부 정보를 숨깁니다. **AgentScope** `ReActAgent()`는 메모리 및 포맷터 초기화를 숨깁니다. 런타임 구성은 에이전트 목록을 선언하고 식별자에 따라 해당 인스턴스를 생성할 수도 있습니다.

### 03 책임 사슬 — 도구 호출 파이프라인

**고전적인 정의**: 요청은 일련의 핸들러를 따라 전달되며, 각 핸들러는 이를 처리하거나 다음 핸들러로 전달하기로 결정합니다.

**에이전트 시나리오**: 에이전트가 도구를 호출할 때 권한 → 현재 제한 → 로그 → 실행 → 결과 처리 등 여러 계층의 확인을 거쳐야 합니다.

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

💡 **플러그인 후크의 디자인 철학**은 암시적인 책임 사슬을 형성할 수 있습니다. 프롬프트 단어를 작성하기 전과 도구 호출 후에 교차 논리를 삽입합니다.

### 04 관찰자 — 이벤트 기반 느슨한 결합

**고전적인 정의**: 개체의 상태가 변경되면 해당 개체에 종속된 모든 개체에 자동으로 알림이 전달됩니다.

**에이전트 시나리오**: 도구 호출이 완료된 후 여러 시스템에서 이를 알아야 합니다. 즉, 오류 대기열을 기록하고 모니터링을 보고하며 학습 엔진을 분석해야 합니다. 서로 결합되어서는 안 됩니다.

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

💡 **학습 모듈은 관찰자 아키텍처를 채택할 수 있습니다**: 도구가 호출된 후 관찰자는 이벤트를 수신합니다. 기능을 추가할 때는 새로운 관찰자만 등록하면 됩니다.

### 05 데코레이터 — 방해가 되지 않는 기능 향상

**고전적인 정의**: 인터페이스를 변경하지 않고 객체에 추가 책임을 동적으로 추가합니다.

**에이전트 시나리오**: 에이전트 자체의 코드를 수정하지 않고 에이전트에 재시도, 캐싱, 로깅 및 현재 제한을 추가합니다.

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

**책임 체인과의 차이점**: 책임 체인은 "파이프라인"되어 있습니다. 즉, 요청이 각 프로세서를 차례로 통과합니다. 데코레이터는 "래핑"되어 있습니다. 데코레이터의 각 레이어는 핵심 기능을 둘러쌉니다. 효과는 비슷하지만 데코레이터가 더 가볍습니다.

### 06 어댑터 — 이기종 도구를 위한 통합 인터페이스

**고전적인 정의**: 클래스의 인터페이스를 클라이언트가 기대하는 다른 인터페이스로 변환합니다.

**에이전트 시나리오**: LLM 제공업체(OpenAI, Google, Wisdom)마다 API 형식이 다르므로 에이전트 코드는 이러한 차이점을 고려하지 않아야 합니다.

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

**프레임워크 실습**: **DeepAgents** `init_chat_model("openai:gpt-4o")` 하나의 함수는 모든 공급자에 적용됩니다. **OpenClaw** `zai/glm-5`, `google/gemini-2.5-flash` 통합 `공급자/모델` 형식.

### 07 템플릿 방법 - 에이전트 실행 프로세스의 뼈대

**클래식 정의**: 기본 클래스에서 알고리즘 뼈대를 정의하고 특정 단계를 하위 클래스 구현으로 연기합니다.

**에이전트 시나리오**: 모든 에이전트의 실행 프로세스는 "작업 수신 → 생각 → 도구 호출 → 처리 결과 → 반환"이지만 각 단계의 구체적인 구현은 다릅니다.

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

**프레임워크 실습**: **AgentScope** `ReActAgent`는 `think_and_act`를 재정의합니다. **DeepAgents** `create_deep_agent()`는 컴파일된 LangGraph StateGraph를 반환합니다.

## 2. 에이전트의 고유한 엔지니어링 설계 모드

위는 Agent의 클래식 GoF 모드 매핑입니다. 다음 패턴은 "에이전트 고유"에 가깝습니다. 기존 소프트웨어에서는 일반적이지 않지만 에이전트 개발에서는 거의 필수적입니다.

### 08 샌드박스 — 신뢰할 수 없는 코드를 안전하게 실행

에이전트가 생성한 코드/명령은 **격리된 환경**에서 실행되며 호스트 시스템에 영향을 주지 않습니다.

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

⚠️ **이것은 GoF 모드는 아니지만 에이전트 시스템의 핵심입니다** - 에이전트가 샌드박싱 없이 임의의 쉘 명령을 실행할 수 있도록 허용하는 것은 시스템 제어권을 블랙박스에 넘겨주는 것과 같습니다.

**프레임워크 실습**: **DeerFlow** 각 작업은 독립적인 Docker 컨테이너에서 실행됩니다. **DeepAgents**는 원격 샌드박스(E2B)를 지원합니다. **OpenClaw** 실행 도구에는 허용 목록 메커니즘이 있습니다.

### 09 Skill — 요청 시 로드되는 능력 모듈

상담원의 능력은 고정되어 있지 않지만 필요에 따라 로드되는 모듈식 기술입니다. 다양한 스킬북을 갖춘 게임 캐릭터와 같습니다.

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

💡 **주요 통찰**: 스킬은 단순한 "도구 모음"이 아닙니다. 스킬에는 에이전트에게 \*사용 시기와 사용 방법\*을 알려주는 **사용 지침**(지침)도 포함되어 있습니다. 따라서 `SKILL.md`에는 API 주소뿐만 아니라 사용 정책도 작성해야 합니다.

**프레임워크 연습**: **DeerFlow** 스킬은 마크다운 파일입니다. **OpenClaw** 스킬 = SKILL.md + 선택적 스크립트/후크.

### 10 체크포인트 — 장기 작업의 지속성 및 복구

장기 실행 작업은 중단될 수 있으며(시간 초과, 충돌, API 현재 제한) 중단점 복구를 지원하기 위해 주요 노드에 상태를 저장해야 합니다.

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

**에이전트가 특히 필요한 이유**: 기존 프로그램의 재시도는 "다시 실행"하는 것입니다. 에이전트는 처음부터 다시 시도할 수 없습니다. LLM은 이미 계획에 대해 생각하는 데 30초를 소비했으며 처음 5단계가 실행되었습니다. 재실행은 엄청난 낭비이다.

### 11 프롬프트 구성 — 계층형 구성 시스템 프롬프트

에이전트의 시스템 프롬프트는 하드 코딩된 텍스트가 아니라 **다층 동적 조합**의 산물입니다.

> 최종 시스템 프롬프트 =
> 기본 행동강령
> + 역할 정의
> + 사용자 환경설정
> + 현재 작업 컨텍스트
> + 장착 스킬 사용 안내
> + 대기 중인 학습 알림
> + 도구 설명 목록

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

**프레임워크 실습**: 많은 런타임은 프롬프트 단어 구성 단계 중에 콘텐츠를 동적으로 삽입합니다. **AgentScope** `sys_prompt + formatter` 2개의 레이어; **DeerFlow** 스킬 + 작업 + 도구 정의 동적 조합.

### 12 상태 머신 — 에이전트 수명 주기의 정확한 제어

에이전트의 실행 프로세스는 유한 상태 기계로 모델링되며 각 상태에는 명확한 전환 규칙이 있습니다.

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

**상태 머신이 필요한 이유**: 상태 머신이 없으면 에이전트의 상태 전환은 다양한 if-else로 분산됩니다. - "실행이 실패하고 재시도 횟수가 < 3이면 재시도하고, 그렇지 않으면 다운그레이드하고, 다운그레이드가 실패하면 시간 초과됩니다." - 이러한 종류의 논리는 빠르게 스파게티가 됩니다.

**프레임워크 실습**: **DeepAgents** 맨 아래 레이어는 LangGraph StateGraph입니다. **DeerFlow** 상태 차트 + 감독자 모드; **OpenClaw** 크론 작업 상태 관리(정상 → 오류 → 재시도 → 타임아웃).

## III. 네 가지 주요 프레임워크 비교

| 치수 | 오픈클로 | 에이전트 범위 | 딥에이전트 | 디어플로우 |
| --- | --- | --- | --- | --- |
| **포지셔닝** | 개인 AI 비서 플랫폼 | 범용 에이전트 프레임워크 | 에이전트 하네스(SDK) | 슈퍼 에이전트 하네스 |
| **언어** | 타입스크립트 | 파이썬 | 파이썬 | Python(백엔드) |
| **하층 레이어** | 자기연구(Pi Agent) | 자기 연구 | 랭그래프 + 랭체인 | 랭그래프 + 랭체인 |
| **코어 모드** | 플러그인 + 후크 + 스킬 | ReAct 에이전트 + 워크플로 | StateGraph + 도구 | 감독자 + 샌드박스 |
| **샌드박스** | 임원 허용 목록 | 내장 없음 | E2B 원격 샌드박스 | 도커 컨테이너 |
| **다중 에이전트** | 감독자 | 워크플로 + MessageHub | SubAgent(작업 도구) | 감독자(리드→서브) |
| **기억** | 파일 시스템 | InMemory + 데이터베이스 | 자동 요약 | 지속성 + TIAMAT |
| **MCP** | 맥포터 | 내장 | 랭체인-mcp-어댑터 | 없음 |
| **적용 가능한 시나리오** | 일일 보조, 자동화 | 연구, 프로토타입 검증 | 코딩 에이전트, SDK | 장기작업, 콘텐츠 제작 |

#### OpenClaw TypeScript · 플러그인 + 후크

전통적인 Python SDK가 아니라 런타임 플랫폼입니다. 핵심 디자인 패턴: 플러그인 확장, 후크 책임 체인, 채널 어댑터, 스킬 시스템.

- **플러그인 모드**: 타사 확장 프로그램은 플러그인을 통해 후크와 도구를 등록하고 코어와 느슨하게 결합됩니다.
- **후크 모드**: `before_prompt_build`, `after_tool_call`, `agent_end`는 암시적 책임 체인을 형성합니다.
- **채널 요약**: Telegram, Discord, Feishu 등의 채널에 대한 통합 인터페이스 - 어댑터 모드
- **스킬 시스템**: 마크다운 기반 스킬 로딩 - 코드 임계값 0

💡 **독특한 장점**: 기술은 코딩 임계값이 0인 순수 마크다운으로 정의됩니다. 누구나 스킬을 작성할 수 있으며 Python이 필요하지 않습니다.

#### AgentScope Python · 알리바바 다모 아카데미

학문적 엄격함 + 엔지니어링 실무 경로. 내장형 ReAct 모드, 툴킷 추상화, 워크플로 조정, 메모리 계층화 및 A2A 프로토콜 지원.

- **ReAct 내장**: `ReActAgent`는 일류 시민이며 즉시 작동합니다.
- **툴킷 개요**: `Toolkit.register_tool_function()` - 팩토리 + 전략
- **워크플로 오케스트레이션**: 파이프라인 모드는 여러 에이전트를 결합합니다.
- **메모리 계층화**: InMemory + Database + ReMe(향상된 장기 메모리)
- **A2A 프로토콜**: 에이전트 간 통신 표준 - 분산형 협업

💡 **고유한 장점**: A2A 프로토콜 지원을 통해 에이전트는 시스템과 프레임워크 전반에서 상호 운용할 수 있습니다. 내장된 모델 미세 조정(Agentic RL) 기능도 독특합니다.

#### DeepAgents Python · LangChain 공식

디자인 철학: LLM을 신뢰하고 도구 수준에서 제약을 둡니다. Agent Harness는 즉시 사용할 수 있습니다.

- **create\_deep\_agent Factory**: 한 줄의 코드로 완전한 에이전트 생성
- **내장 계획**: 'write_todos' 도구를 사용하면 에이전트가 작업을 독립적으로 분해할 수 있습니다.
- **내장 파일 시스템**: 읽기/쓰기/편집/ls/glob/grep
- **하위 에이전트 파견**: 'task' 도구가 격리된 하위 에이전트를 생성합니다.
- **자동 요약**: 대화가 너무 길면 자동 요약

💡 **디자인 철학**: "모델이 스스로 감시할 것이라고 기대하는 것이 아니라 도구/샌드박스 수준에서 경계를 강화합니다."

#### DeerFlow Python · ByteDance

핵심 차이점: 대부분의 프레임워크는 "추론 계층"이고 DeerFlow는 "실행 계층"입니다.

- **수퍼바이저 + 하위 에이전트**: 리드 에이전트는 작업을 분해하고 병렬 실행을 위해 하위 에이전트를 파견합니다.
- **Docker Sandbox**: 각 작업은 실제 파일 시스템과 bash가 포함된 격리된 컨테이너에서 실행됩니다.
- **스킬 시스템**: 마크다운은 스킬을 정의하고 요청 시 로드합니다.
- **영구 메모리**: 교차 세션 메모리, 비동기 업데이트
- **상태 저장 파이프라인**: LangGraph 체크포인트를 기반으로 긴 작업을 중단하고 재개할 수 있습니다.

💡 **독특한 장점**: 에이전트에게 실제로 "컴퓨터"를 제공합니다. 텍스트를 생성할 뿐만 아니라 다운로드 가능한 PPT, 실행 가능한 코드 및 배포 가능한 웹 페이지를 생성합니다.

## IV. 패턴 선택 빠른 참고

| 해결하고 싶은 문제 | 권장 모드 | 클래식 모드에 해당 |
| --- | --- | --- |
| 동일한 작업의 다중 구현 | **전략** | 전략 패턴 |
| 다양한 구성으로 에이전트를 통합적으로 생성 | **공장** | 공장 모드 |
| 도구 호출 전후의 다층 처리 | **책임 사슬** | 책임 모델의 사슬 |
| 도구 실행 후 다중 리스너 | **관찰자** | 관찰자 패턴 |
| 코드를 변경하지 않고 도구 캐싱/재시도 | **데코레이터** | 데코레이터 모드 |
| 다양한 LLM 제공업체를 위한 통합 인터페이스 | **어댑터** | 어댑터 모드 |
| 에이전트 실행 프로세스 뼈대 정의 | **템플릿 방법** | 템플릿 메소드 패턴 |
| 신뢰할 수 없는 코드 실행 격리 | **샌드박스** | — |
| 필요에 따라 로드 기능 모듈 | **스킬** | — |
| 긴 작업 중단 복구 | **체크포인트** | — |
| 동적 구성 시스템 프롬프트 | **신속한 구성** | — |
| 에이전트 상태 전환을 정확하게 제어 | **상태 머신** | 상태 머신 모드 |

확장 읽기: [오픈클로](https://github.com/openclaw/openclaw) · [에이전트 범위](https://github.com/agentscope-ai/agentscope) · [DeepAgent](https://github.com/langchain-ai/deepagents) · [디어플로우](https://github.com/bytedance/deer-flow)
