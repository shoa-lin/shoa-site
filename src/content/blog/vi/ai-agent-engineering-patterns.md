---
translationKey: "ai-agent-engineering-patterns"
locale: "vi"
title: "Mẫu thiết kế kỹ thuật AI Agent (Phần 2): Triển khai đáng tin cậy"
description: "Từ Strategy, Factory và Chain of Responsibility đến sandbox, checkpoint và state machine: cách tổ chức cùng các đánh đổi kỹ thuật của một hệ thống agent đáng tin cậy."
publishedAt: "2026-04-09"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-engineering-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Trong phần trước, chúng ta đã bàn về **cách agent làm việc**: suy luận, gọi công cụ, phân chia và phối hợp nhiệm vụ, cũng như nơi đặt bộ nhớ và ranh giới an toàn. Khi bắt đầu triển khai, độ phức tạp chuyển từ “bước tiếp theo là gì?” sang một vấn đề khác: **làm thế nào tổ chức các năng lực này thành một hệ thống có thể bảo trì lâu dài?**

Khi đi vào triển khai thực tế, các vấn đề thường rất cụ thể:

- Có ba công cụ tìm kiếm: Tavily, Exa và Gemini. Làm sao để agent **không cần quan tâm cụ thể đang dùng công cụ nào**?
- Các agent tài chính, nghiên cứu và vận hành đều cần tìm kiếm nhưng dùng tham số khác nhau. Làm sao **quản lý đăng ký công cụ tại một nơi**?
- Trước và sau khi gọi công cụ, hệ thống cần ghi log, rate limit và kiểm tra quyền. Làm sao **không trộn logic nghiệp vụ với logic xuyên suốt**?
- Nội dung do agent tạo cần được review, định dạng và dịch. Làm sao **ghép chúng thành một pipeline xử lý**?

Đây không phải là những “vấn đề AI” trừu tượng, mà là những hình thức mới của các vấn đề kỹ thuật phần mềm cổ điển trong hệ thống Agent. Bài viết này không yêu cầu bạn phải thuộc lòng 12 mô hình; mục tiêu là trước tiên phải hiểu rõ mô hình nào đang cô lập thay đổi và hạn chế rủi ro cho bạn.

## Trước tiên hãy thiết lập một bản đồ kỹ thuật

Bạn có thể bắt đầu bằng cách chia các mô hình sau thành ba loại theo vấn đề mà chúng giải quyết:

- **Thay thế và kết hợp**: Strategy, Factory và Adapter giúp mô hình, công cụ và cấu hình agent có thể thay thế cho nhau, thay vì rải rác trong hàng loạt nhánh điều kiện.
- **Kiểm soát xuyên suốt**: Chain of Responsibility, Observer và Decorator tách quyền, log, rate limit, cache và review khỏi logic nghiệp vụ cốt lõi.
- **Trạng thái và ranh giới**: Sandbox, Checkpoint, Prompt Composition và State Machine xử lý các thách thức đặc thù của agent như cách ly, khôi phục, ngữ cảnh và vòng đời.

Với tấm bản đồ này, khi nhìn lại từng mô hình, trọng tâm không phải là “Nó tên là gì”, mà là “Hệ thống của tôi đang phải đối mặt với loại thay đổi hoặc mất kiểm soát nào”.

## 1. Các mẫu GoF cổ điển trong hệ thống agent

### 01 Strategy — Cốt lõi của việc lựa chọn công cụ

**Định nghĩa cổ điển**: Xác định một họ thuật toán, đóng gói từng thuật toán và làm cho chúng có thể thay thế lẫn nhau.

**Tình huống Agent**: Cùng một thao tác “tìm kiếm”, phía sau có nhiều cách triển khai – Tavily, Exa, Gemini. Người gọi không nên biết cụ thể nên sử dụng cách nào.

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

💡 **Đây cũng là thiết kế cốt lõi của dịch vụ tìm kiếm hợp nhất**. Strategy giúp mở rộng fallback chain một cách tự nhiên: muốn thêm nguồn tìm kiếm mới, chỉ cần triển khai interface `SearchProvider` và đưa nó vào danh sách.

**Thực tiễn framework**: **DeerFlow** để lead agent lựa chọn sub-agent theo chiến lược; **AgentScope** đăng ký công cụ qua `Toolkit.register_tool_function()` — mỗi công cụ là một strategy.

### 02 Factory — Tạo agent theo một chuẩn thống nhất

Định nghĩa cổ điển: Đóng gói logic tạo đối tượng, người gọi không cần biết loại cụ thể.

**Tình huống agent**: Hệ thống có nhiều agent, mỗi agent dùng model, system prompt và bộ công cụ khác nhau. Logic khởi tạo không nên bị rải rác khắp nơi.

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

**Thực tiễn framework**: **DeepAgents** `create_deep_agent()` ẩn chi tiết biên dịch đồ thị LangGraph; **AgentScope** `ReActAgent()` ẩn việc khởi tạo bộ nhớ và formatter. Cấu hình runtime cũng có thể khai báo danh sách agent và tạo instance tương ứng theo ID.

### 03 Chuỗi Trách nhiệm – Đường dẫn gọi công cụ

Định nghĩa cổ điển: Chuyển yêu cầu dọc theo chuỗi trình xử lý, mỗi trình xử lý quyết định xử lý hoặc chuyển tiếp cho trình xử lý tiếp theo.

**Kịch bản Agent**: Khi Agent gọi một công cụ, cần phải trải qua nhiều lớp kiểm tra – quyền → hạn chế luồng → nhật ký → thực thi → xử lý kết quả.

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

💡 **Plugin Hook có thể tạo thành một Chain of Responsibility ngầm**: logic xuyên suốt được chèn trước khi dựng prompt và sau khi gọi công cụ.

### 04 Observer – Kết nối lỏng dựa trên sự kiện

Định nghĩa cổ điển: Tự động thông báo cho tất cả các đối tượng phụ thuộc khi trạng thái của một đối tượng thay đổi.

**Kịch bản Agent**: Sau khi lệnh gọi công cụ hoàn thành, nhiều hệ thống cần biết rằng hàng đợi lỗi cần được ghi lại, giám sát cần được báo cáo và công cụ học tập cần được phân tích. Chúng không nên được ghép nối với nhau.

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

💡 **Mô-đun học tập có thể áp dụng kiến trúc người quan sát**: Người quan sát sau khi công cụ được gọi sẽ nghe các sự kiện, khi thêm khả năng mới chỉ cần đăng ký người quan sát mới.

### 05 Decorator - Cải tiến chức năng không xâm nhập

Định nghĩa cổ điển: Linh động thêm trách nhiệm bổ sung vào đối tượng mà không thay đổi giao diện của nó.

**Kịch bản Agent**: Thêm các lần thử lại, bộ nhớ đệm, nhật ký, giới hạn luồng vào Agent — không sửa đổi mã của chính Agent.

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

**Khác biệt với chuỗi trách nhiệm**: Chuỗi trách nhiệm là “hàng ống” - yêu cầu đi qua từng trình xử lý theo trình tự. Đồ trang trí là “bao bì” - mỗi lớp đồ trang trí bao bọc chức năng cốt lõi. Hiệu quả tương tự, nhưng đồ trang trí nhẹ hơn.

### 06 Adapter - Giao diện thống nhất cho các công cụ không đồng nhất

Định nghĩa cổ điển: Chuyển đổi giao diện của một lớp thành giao diện khác mà máy khách mong muốn.

**Kịch bản Agent**: Các nhà cung cấp LLM khác nhau (OpenAI, Google, Spectrum) có các định dạng API khác nhau và mã Agent không nên quan tâm đến những khác biệt này.

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

**Thực tiễn framework**: **DeepAgents** dùng `init_chat_model("openai:gpt-4o")` để thích ứng nhiều nhà cung cấp; **OpenClaw** dùng định dạng thống nhất `provider/model`, như `zai/glm-5` và `google/gemini-2.5-flash`.

### 07 Template Method – Khung của quy trình thực thi Agent

**Định nghĩa cổ điển**: Xác định khung thuật toán trong lớp cơ sở, trì hoãn một số bước đến khi thực hiện lớp con.

**Kịch bản Agent**: Quy trình thực thi của tất cả các Agent đều là “Nhận tác vụ → Suy nghĩ → Gọi công cụ → Xử lý kết quả → Trả về”, nhưng mỗi bước thực hiện cụ thể lại khác nhau.

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

**Thực tiễn framework**: **AgentScope** cho phép `ReActAgent` ghi đè `think_and_act`; **DeepAgents** `create_deep_agent()` trả về một LangGraph StateGraph đã biên dịch.

## 2, Mô hình thiết kế kỹ thuật đặc thù của Agent

Trên đây là ánh xạ của các mô hình GoF cổ điển trong Agent. Các mô hình sau đây mang tính “Agent-native” hơn – không phổ biến trong phần mềm truyền thống, nhưng gần như không thể thiếu trong quá trình phát triển Agent.

### 08 Sandbox - Thực thi mã không đáng tin cậy một cách an toàn

Mã/lệnh do Agent tạo ra được thực thi trong môi trường cách ly mà không ảnh hưởng đến hệ thống máy chủ.

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

⚠️ **Đây không phải mẫu GoF, nhưng là ranh giới cuối cùng của hệ thống agent** — cho agent thực thi lệnh shell tùy ý mà không có sandbox tương đương với trao quyền điều khiển hệ thống cho một hộp đen.

**Thực tiễn framework**: **DeerFlow** chạy mỗi tác vụ trong một container Docker riêng; **DeepAgents** hỗ trợ sandbox từ xa E2B; **OpenClaw** có allowlist cho công cụ exec.

### 09 Skill — Mô-đun năng lực tải theo nhu cầu

Khả năng của Agent không phải là cố định, mà là các kỹ năng mô-đun được tải theo yêu cầu. Giống như sách kỹ năng mà các nhân vật trong trò chơi được trang bị khác nhau.

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

💡 **Điểm quan trọng**: Skill không chỉ là “một tập hợp công cụ” — nó còn bao gồm **hướng dẫn sử dụng** (instructions), cho agent biết khi nào và cách sử dụng chúng. Vì vậy, `SKILL.md` không chỉ nên ghi địa chỉ API mà còn phải nêu rõ chính sách sử dụng.

**Thực tiễn framework**: **DeerFlow** định nghĩa Skill bằng tệp Markdown; **OpenClaw** dùng Skill = SKILL.md + script/hook tùy chọn.

### 10 Checkpoint – Sự bền vững và khôi phục cho các tác vụ dài

Các tác vụ chạy trong thời gian dài có thể bị gián đoạn (thời gian chờ, hỏng hóc, giới hạn lưu lượng API), yêu cầu lưu trạng thái tại các nút quan trọng**, hỗ trợ khôi phục từ các điểm gián đoạn.

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

**Tại sao Agent đặc biệt cần**: Việc thử lại các chương trình truyền thống là “chạy lại một lần”. Việc thử lại Agent không thể bắt đầu lại từ đầu - LLM đã mất 30 giây để suy nghĩ ra kế hoạch, 5 bước đầu tiên đã được thực hiện xong, việc thực hiện lại là sự lãng phí lớn.

### 11 Prompt Composition – Xây dựng cấp bậc System Prompt

System prompt của Agent không phải là một đoạn văn bản chết, mà là sản phẩm của sự kết hợp động nhiều lớp.

> System Prompt cuối cùng =
> Nguyên tắc ứng xử cơ bản
> + Định nghĩa vai trò
> + Tùy chọn người dùng
> + ngữ cảnh tác vụ hiện tại
> + Hướng dẫn sử dụng Skill được trang bị sẵn
> + Cảnh báo học tập đang chờ xử lý
> + Danh sách mô tả công cụ

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

**Thực tiễn framework**: Nhiều runtime chèn nội dung động trong giai đoạn dựng prompt; **AgentScope** có hai lớp `sys_prompt + formatter`; **DeerFlow** kết hợp động Skill + nhiệm vụ + định nghĩa công cụ.

### 12 State Machine – Kiểm soát chính xác vòng đời của Agent

Lập mô hình quá trình thực thi của Agent dưới dạng máy trạng thái hữu hạn, với mỗi trạng thái có quy tắc chuyển đổi rõ ràng.

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

**Tại sao cần máy trạng thái**: Không có máy trạng thái, các chuyển đổi trạng thái của Agent rải rác trong các trường hợp nếu không khác nhau — “Nếu thực thi thất bại và số lần thử lại < 3 thì thử lại, nếu không thì hạ cấp, hạ cấp cũng thất bại thì hết thời gian chờ” — logic này nhanh chóng trở thành mì Ý.

**Thực tiễn framework**: **DeepAgents** dựa trên LangGraph StateGraph; **DeerFlow** dùng state graph + supervisor; **OpenClaw** quản lý trạng thái Cron job theo chuỗi ok → error → retry → timeout.

## 3. So sánh bốn framework chính

| Chiều so sánh | OpenClaw | AgentScope | DeepAgents | DeerFlow |
| --- | --- | --- | --- | --- |
| **Định vị** | Nền tảng trợ lý AI cá nhân | Framework agent tổng quát | Agent Harness (SDK) | Super Agent Harness |
| **Ngôn ngữ** | TypeScript | Python | Python | Python (backend) |
| **Nền tảng** | Tự phát triển (Pi Agent) | Tự phát triển | LangGraph + LangChain | LangGraph + LangChain |
| **Mẫu cốt lõi** | Plugin + Hook + Skill | ReAct Agent + Workflow | StateGraph + Tool | Supervisor + Sandbox |
| **Sandbox** | exec allowlist | không có | E2B Sandbox từ xa | Container Docker |
| **Đa agent** | Supervisor | Workflow + MessageHub | SubAgent (công cụ task) | Supervisor (Lead → child) |
| **Bộ nhớ** | Hệ thống tệp | InMemory + Database | Tự động tóm tắt | Persistent + TIAMAT |
| **MCP** | mcporter | tích hợp | langchain-mcp-adapters | không có |
| **Trường hợp phù hợp** | Trợ lý hằng ngày, tự động hóa | Nghiên cứu, xác minh prototype | Coding agent, SDK | Nhiệm vụ dài, sản xuất nội dung |

#### OpenClaw TypeScript · Plugin + Hook

Không phải là SDK Python truyền thống, mà là một nền tảng thời gian chạy. Mô hình thiết kế cốt lõi: Phần mở rộng Plugin, Chuỗi trách nhiệm Hook, Bộ điều hợp Kênh, Hệ thống Skill.

- **Chế độ Plugin**: Phần mở rộng của bên thứ ba được ghép nối với lõi pin thông qua plugin đăng ký hook và công cụ
- Chế độ Hook: `before_prompt_build`, `after_tool_call`, `agent_end` tạo thành chuỗi trách nhiệm ngầm
- **Channel Abstraction**: Giao diện thống nhất các kênh như Telegram, Discord, Feishu - Chế độ Adapter
- Hệ thống Skill: Tải kỹ năng dựa trên Markdown – Ngưỡng không mã

💡 **Ưu điểm độc đáo**: Skill được định nghĩa bằng Markdown thuần túy, ngưỡng không mã. Bất kỳ ai cũng có thể viết một Skill, không cần Python.

#### AgentScope Python · Alibaba DAMO Academy

Sự nghiêm ngặt về mặt học thuật + lộ trình thực dụng về kỹ thuật. Chế độ ReAct tích hợp, trừu tượng hóa Toolkit, sắp xếp Workflow, phân lớp Bộ nhớ, hỗ trợ giao thức A2A.

- **ReAct tích hợp sẵn**: `ReActAgent` là công dân hạng nhất, mở hộp là dùng ngay
- **Toolkit trừu tượng**: `Toolkit.register_tool_function()`—Factory + Strategy
- **Workflow Orchestration**: Chế độ Pipeline Kết hợp nhiều Agent
- Phân lớp bộ nhớ: InMemory + Cơ sở dữ liệu + ReMe (bộ nhớ dài hạn được tăng cường)
- **Giao thức A2A**: Tiêu chuẩn giao tiếp giữa các agent—Hợp tác phi tập trung

💡 **Lợi thế độc đáo**: Hỗ trợ giao thức A2A cho phép Agent tương tác giữa các hệ thống và khung. Khả năng điều chỉnh mô hình tích hợp (Agentic RL) cũng là độc đáo.

#### DeepAgents Python · LangChain chính thức

Triết lý thiết kế: Tin tưởng LLM, hạn chế ở cấp độ công cụ. Agent Harness sẵn sàng sử dụng.

- **create\_deep\_agent Factory**: Tạo Agent đầy đủ bằng một dòng mã
- **Lập kế hoạch tích hợp sẵn**: Công cụ `write_todos` cho phép Agent tự động phân tích tác vụ
- **Hệ thống tệp tích hợp**: read/write/edit/ls/glob/grep
- **Phân phối Sub-Agent**: Công cụ `task` tạo Sub-Agent cách ly
- **Tự động tóm tắt**: Tự động tóm tắt các cuộc hội thoại quá dài

💡 **Triết lý thiết kế**: _“Enforce boundaries at the tool/sandbox level, not by expecting the model to self-police.”_ (Áp đặt ranh giới ở tầng công cụ/sandbox, thay vì kỳ vọng mô hình tự kiểm soát.)

#### DeerFlow Python · ByteDance

Sự khác biệt cốt lõi: Hầu hết các khung là “lớp suy luận”, DeerFlow là “lớp thực thi”.

- **Supervisor + Sub-Agent**: Lead Agent phân tách tác vụ, gửi các Agent con để thực thi song song
- **Docker Sandbox**: Mỗi tác vụ chạy trong một bộ chứa cách ly, với hệ thống tệp thực tế và bash
- Hệ thống Skill: Xác định kỹ năng Markdown, tải theo yêu cầu
- **Persistent Memory**: Bộ nhớ liên phiên, cập nhật không đồng bộ
- **Stateful Pipeline**: Dựa trên kiểm tra LangGraph, các tác vụ dài có thể được khôi phục sau gián đoạn

💡 **Ưu điểm độc đáo**: Thật sự cho Agent “một máy tính” — không chỉ tạo ra văn bản, mà còn tạo ra PPT có thể tải xuống, mã có thể chạy, trang web có thể triển khai.

## 4. Bảng tra cứu nhanh để chọn mẫu

| Vấn đề cần giải quyết | Mẫu đề xuất | Mẫu cổ điển tương ứng |
| --- | --- | --- |
| Cùng một thao tác có nhiều cách triển khai | **Strategy** | Strategy Pattern |
| Tạo thống nhất các agent có cấu hình khác nhau | **Factory** | Factory Pattern |
| Xử lý nhiều lớp trước và sau khi gọi công cụ | **Chain of Responsibility** | Chain of Responsibility Pattern |
| Nhiều listener sau khi công cụ được thực thi | **Observer** | Observer |
| Thêm cache/retry cho công cụ mà không sửa mã lõi | **Decorator** | Decorator Pattern |
| Thống nhất interface giữa các nhà cung cấp LLM | **Adapter** | Adapter Pattern |
| Xác định khung quy trình thực thi agent | **Template Method** | Template Method Pattern |
| Cách ly việc thực thi mã không đáng tin cậy | **Sandbox** | — |
| Tải mô-đun năng lực theo nhu cầu | **Skill** | — |
| Khôi phục tác vụ dài sau khi bị gián đoạn | **Checkpoint** | — |
| Kết hợp System Prompt theo ngữ cảnh | **Prompt Composition** | — |
| Kiểm soát chính xác chuyển đổi trạng thái của agent | **State Machine** | State Machine Pattern |

Đọc mở rộng: [OpenClaw](https://github.com/openclaw/openclaw) · [AgentScope](https://github.com/agentscope-ai/agentscope) · [DeepAgents](https://github.com/langchain-ai/deepagents) · [DeerFlow](https://github.com/bytedance/deer-flow)
