---
translationKey: "ai-agent-engineering-patterns"
locale: "th"
title: "รูปแบบการออกแบบเชิงวิศวกรรมของ AI Agent (ภาค 2): สร้างระบบที่เชื่อถือได้"
description: "ตั้งแต่ Strategy, Factory และ Chain of Responsibility ไปจนถึง Sandbox, Checkpoint และ State Machine: วิธีจัดระบบ AI Agent ให้รับมือกับการเปลี่ยนแปลง ควบคุมได้ และกู้คืนได้"
publishedAt: "2026-04-09"
updatedAt: "2026-07-13"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-engineering-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

บทความก่อนหน้านี้ได้กล่าวถึงวิธีการทำงานของ Agent **ทำงาน**: วิธีให้เหตุผล เรียกใช้เครื่องมือ แบ่งและทำงานร่วมกัน และจะวางขอบเขตของหน่วยความจำและความปลอดภัยไว้ที่ใด แต่เมื่อคุณเริ่มนำไปปฏิบัติ ความซับซ้อนจะเปลี่ยนจาก "จะทำอย่างไรต่อไป" เป็นอีกคำถามหนึ่ง **จะจัดความสามารถเหล่านี้อย่างไรให้เป็นระบบที่สามารถรักษาได้ในระยะยาว **

เมื่อพูดถึงการนำไปปฏิบัติ มักจะมีคำถามที่เฉพาะเจาะจงมาก:

- มีเครื่องมือค้นหาสามแบบ: Tavily, Exa และ Gemini Agent จะไม่สนใจได้อย่างไรว่าจะใช้อันไหน?
- จำเป็นต้องค้นหาตัวแทนที่แตกต่างกัน (การเงิน การวิจัย การดำเนินงาน) แต่พารามิเตอร์ต่างกัน จะ **รวมการลงทะเบียนเครื่องมือการจัดการ** ได้อย่างไร
- เอเจนต์จำเป็นต้องทำการบันทึก การจำกัดกระแส และตรวจสอบสิทธิ์ก่อนและหลังการเรียกใช้เครื่องมือ ทำไมไม่ผสมผสานรหัสธุรกิจและตรรกะแบบ cross-cutting ล่ะ?
- เนื้อหาที่สร้างโดยตัวแทนจะต้องได้รับการตรวจสอบ จัดรูปแบบ และแปล จะใส่เข้าไปในไปป์ไลน์การประมวลผลได้อย่างไร?

สิ่งเหล่านี้ไม่ใช่ “ปัญหา AI” แบบนามธรรม แต่เป็นปัญหารูปแบบใหม่ของวิศวกรรมซอฟต์แวร์คลาสสิกในระบบตัวแทน บทความนี้ไม่จำเป็นต้องให้คุณจำ 12 รูปแบบ; เป้าหมายคือการเห็นอย่างชัดเจนก่อนว่าการเปลี่ยนแปลงใดและความเสี่ยงใดบ้างที่แต่ละรูปแบบแยกออกมาสำหรับคุณ

## ขั้นแรกให้สร้างแผนที่ทางวิศวกรรม

ขั้นแรก คุณสามารถแบ่งรูปแบบต่อไปนี้ออกเป็นสามประเภทตามปัญหาที่รูปแบบเหล่านั้นแก้ไข:

- **การเปลี่ยนและการผสมผสาน**: กลยุทธ์ โรงงาน และอะแดปเตอร์อนุญาตให้เปลี่ยนโมเดล เครื่องมือ และการกำหนดค่าเอเจนต์ได้ แทนที่จะกระจัดกระจายไปสู่การพิจารณาตามเงื่อนไขจำนวนมาก
- **การควบคุมแบบข้ามขั้นตอน**: ห่วงโซ่ความรับผิดชอบ ผู้สังเกตการณ์ และมัณฑนากรแยกสิทธิ์ บันทึก การจำกัดปัจจุบัน การแคช และการตรวจสอบจากธุรกิจหลัก
- **สถานะและขอบเขต**: Sandbox, Checkpoint, Prompt Composition และ State Machine จัดการปัญหาเฉพาะของ Agent ในด้านการแยก การกู้คืน บริบท และวงจรชีวิต

ด้วยแผนที่นี้เมื่อดูแต่ละรูปแบบจุดสนใจไม่ใช่ "เรียกว่าอะไร" แต่ "ระบบของฉันเผชิญกับการเปลี่ยนแปลงหรือการสูญเสียการควบคุมแบบใด"

## 1. ชีวิตใหม่ของโมเดล GoF สุดคลาสสิกใน Agent

### 01 กลยุทธ์ — จิตวิญญาณของการเลือกเครื่องมือ

**คำจำกัดความแบบคลาสสิก**: กำหนดกลุ่มอัลกอริธึมและสรุปแต่ละอัลกอริธึมเพื่อให้สามารถแทนที่ซึ่งกันและกันได้

**สถานการณ์ตัวแทน**: มีการใช้งานหลายอย่างที่อยู่เบื้องหลังการดำเนินการ "ค้นหา" เดียวกัน - Tavily, Exa, Gemini ผู้โทรไม่ควรรู้ว่าจะใช้อันไหน

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

💡 **นี่คือการออกแบบหลักของบริการค้นหาแบบรวมศูนย์ด้วย** โหมดกลยุทธ์ทำให้การขยายลิงก์สำรองเป็นไปอย่างเป็นธรรมชาติ หากต้องการเพิ่มแหล่งค้นหาใหม่ เพียงใช้อินเทอร์เฟซ `SearchProvider` และเพิ่มลงในรายการ

**แนวปฏิบัติด้านกรอบงาน**: **DeerFlow** ตัวแทนหลักจะเลือกตัวแทนย่อย ซึ่งเป็นการเลือกกลยุทธ์เป็นหลัก **AgentScope** `Toolkit.register_tool_function()` ลงทะเบียนเครื่องมือ - เครื่องมือคือกลยุทธ์

### 02 โรงงาน — การสร้างตัวแทนแบบรวมศูนย์

**คำจำกัดความแบบคลาสสิก**: สรุปตรรกะการสร้างของออบเจ็กต์ และผู้เรียกไม่จำเป็นต้องรู้คลาสเฉพาะ

**สถานการณ์ตัวแทน**: มีตัวแทนหลายรายในระบบ โดยแต่ละรายมีโมเดล พร้อมท์ของระบบ และชุดเครื่องมือที่แตกต่างกัน ตรรกะในการสร้างไม่ควรกระจัดกระจายไปทุกที่

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

**แนวปฏิบัติด้านกรอบงาน**: **DeepAgents** `create_deep_agent()` ซ่อนรายละเอียดการรวบรวมกราฟ LangGraph **AgentScope** `ReActAgent()` ซ่อนหน่วยความจำและการเริ่มต้นฟอร์แมตเตอร์ การกำหนดค่ารันไทม์ยังสามารถประกาศรายชื่อตัวแทนและสร้างอินสแตนซ์ที่เกี่ยวข้องตามตัวระบุ

### 03 ห่วงโซ่ความรับผิดชอบ - ไปป์ไลน์การเรียกเครื่องมือ

**คำจำกัดความแบบคลาสสิก**: คำขอถูกส่งไปตามสายของตัวจัดการ โดยตัวจัดการแต่ละคนจะตัดสินใจว่าจะประมวลผลหรือส่งต่อไปยังตัวจัดการถัดไป

**สถานการณ์ตัวแทน**: เมื่อตัวแทนเรียกใช้เครื่องมือ จะต้องผ่านการตรวจสอบหลายชั้น - สิทธิ์ → การจำกัดปัจจุบัน → บันทึก → การดำเนินการ → การประมวลผลผลลัพธ์

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

💡 **ปรัชญาการออกแบบ Plug-in Hook** สามารถสร้างสายโซ่ความรับผิดชอบโดยนัยได้: แทรกตรรกะแบบตัดขวางก่อนสร้างคำพร้อมท์และหลังการเรียกใช้เครื่องมือ

### 04 ผู้สังเกตการณ์ - ข้อต่อหลวมที่ขับเคลื่อนด้วยเหตุการณ์

**คำจำกัดความแบบคลาสสิก**: เมื่อสถานะของวัตถุเปลี่ยนแปลง วัตถุทั้งหมดที่ขึ้นอยู่กับวัตถุนั้นจะได้รับแจ้งโดยอัตโนมัติ

**สถานการณ์ตัวแทน**: หลังจากการเรียกเครื่องมือเสร็จสิ้น จำเป็นต้องทราบหลายระบบ - จำเป็นต้องบันทึกคิวข้อผิดพลาด ต้องมีการรายงานการตรวจสอบ และจำเป็นต้องวิเคราะห์กลไกการเรียนรู้ ไม่ควรนำมาต่อกัน

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

💡 **โมดูลการเรียนรู้สามารถนำสถาปัตยกรรมของผู้สังเกตการณ์มาใช้ได้**: ผู้สังเกตการณ์หลังจากเครื่องมือถูกเรียกให้ฟังเหตุการณ์ เมื่อเพิ่มความสามารถ คุณจะต้องลงทะเบียนผู้สังเกตการณ์ใหม่เท่านั้น

### 05 มัณฑนากร — การปรับปรุงคุณสมบัติที่ไม่ล่วงล้ำ

**คำจำกัดความแบบคลาสสิก**: เพิ่มความรับผิดชอบเพิ่มเติมให้กับออบเจ็กต์แบบไดนามิกโดยไม่ต้องเปลี่ยนอินเทอร์เฟซ

**สถานการณ์ตัวแทน**: เพิ่มการลองใหม่ การแคช การบันทึก และการจำกัดปัจจุบันให้กับตัวแทน - โดยไม่ต้องแก้ไขรหัสของตัวแทนเอง

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

**ความแตกต่างจากห่วงโซ่ความรับผิดชอบ**: ห่วงโซ่ความรับผิดชอบเป็นแบบ "ไปป์ไลน์" - คำขอจะส่งผ่านไปยังโปรเซสเซอร์แต่ละตัวตามลำดับ อุปกรณ์ตกแต่งเป็นแบบ "ห่อหุ้ม" - อุปกรณ์ตกแต่งแต่ละชั้นจะพันรอบการทำงานหลัก เอฟเฟกต์คล้ายกัน แต่มัณฑนากรจะเบากว่า

### 06 อะแดปเตอร์ — อินเทอร์เฟซแบบรวมสำหรับเครื่องมือที่ต่างกัน

**คำจำกัดความแบบคลาสสิก**: แปลงอินเทอร์เฟซของคลาสให้เป็นอินเทอร์เฟซอื่นที่ไคลเอ็นต์คาดหวัง

**สถานการณ์ตัวแทน**: ผู้ให้บริการ LLM ที่แตกต่างกัน (OpenAI, Google, Wisdom) มีรูปแบบ API ที่แตกต่างกัน และโค้ดตัวแทนไม่ควรสนใจความแตกต่างเหล่านี้

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

**แนวปฏิบัติด้านกรอบงาน**: **DeepAgents** `init_chat_model("openai:gpt-4o")` ฟังก์ชันเดียวปรับให้เข้ากับผู้ให้บริการทั้งหมด **OpenClaw** `zai/glm-5`, `google/gemini-2.5-flash` รูปแบบรวม `ผู้ให้บริการ/โมเดล`

### 07 Template Method — โครงสร้างกระบวนการดำเนินการของ Agent

**คำจำกัดความแบบคลาสสิก**: กำหนดโครงร่างอัลกอริทึมในคลาสพื้นฐานและเลื่อนขั้นตอนบางอย่างไปเป็นการใช้งานคลาสย่อย

**สถานการณ์ตัวแทน**: กระบวนการดำเนินการของตัวแทนทั้งหมดคือ "รับงาน → คิด → เครื่องมือเรียก → ผลลัพธ์ของกระบวนการ → กลับ" แต่การใช้งานเฉพาะของแต่ละขั้นตอนจะแตกต่างกัน

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

**แนวทางปฏิบัติด้านกรอบงาน**: **AgentScope** `ReActAgent` จะแทนที่ `think_and_act`; **DeepAgents** `create_deep_agent()` ส่งคืน LangGraph StateGraph ที่คอมไพล์แล้ว

## 2. โหมดการออกแบบทางวิศวกรรมอันเป็นเอกลักษณ์ของตัวแทน

ด้านบนนี้เป็นการจับคู่โหมด GoF แบบคลาสสิกใน Agent รูปแบบต่อไปนี้เป็นแบบ "Agent-native" มากกว่า - ​​ไม่ใช่เรื่องธรรมดาในซอฟต์แวร์แบบดั้งเดิม แต่เกือบจะจำเป็นในการพัฒนา Agent

### 08 Sandbox — รันโค้ดที่ไม่น่าเชื่อถืออย่างปลอดภัย

รหัส/คำสั่งที่สร้างโดยเอเจนต์จะถูกดำเนินการใน **สภาพแวดล้อมแบบแยกส่วน** และไม่ส่งผลกระทบต่อระบบโฮสต์

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

⚠️ **นี่ไม่ใช่โหมด GoF แต่เป็นส่วนสำคัญของระบบตัวแทน** - การอนุญาตให้ตัวแทนดำเนินการคำสั่งเชลล์ตามอำเภอใจโดยไม่ต้องใช้แซนด์บ็อกซ์ เทียบเท่ากับการมอบการควบคุมระบบให้กับกล่องดำ

**Framework Practice**: **DeerFlow** แต่ละงานจะทำงานในคอนเทนเนอร์ Docker อิสระ **DeepAgents** รองรับแซนด์บ็อกซ์ระยะไกล (E2B); เครื่องมือ exec **OpenClaw** มีกลไกรายการที่อนุญาต

### 09 ทักษะ — โมดูลความสามารถโหลดตามความต้องการ

ความสามารถของตัวแทนไม่ได้รับการแก้ไข แต่ทักษะแบบแยกส่วนจะโหลดตามความต้องการ เช่นเดียวกับตัวละครในเกมที่มีหนังสือทักษะต่างๆ

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

💡 **ข้อมูลเชิงลึกที่สำคัญ**: ทักษะไม่ได้เป็นเพียง "ชุดเครื่องมือ" เท่านั้น แต่ยังประกอบด้วย **แนวทางการใช้งาน** (คำแนะนำ) ที่บอกตัวแทน \*เมื่อใดควรใช้และวิธีใช้\* ดังนั้น `SKILL.md` ไม่ควรเขียนเฉพาะที่อยู่ API เท่านั้น แต่ยังรวมถึงนโยบายการใช้งานด้วย

**แบบฝึกหัดกรอบงาน**: ทักษะ **DeerFlow** เป็นไฟล์ Markdown; **OpenClaw** Skill = SKILL.md + สคริปต์เสริม/hook

### 10 จุดตรวจสอบ — ความคงอยู่และการกู้คืนของงานที่ยาวนาน

งานที่ใช้เวลานานอาจถูกขัดจังหวะ (หมดเวลา ข้อขัดข้อง ขีดจำกัดปัจจุบันของ API) และจำเป็นต้องบันทึกสถานะที่โหนดหลักเพื่อรองรับการกู้คืนจากจุดพัก

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

**เหตุใดจึงจำเป็นต้องใช้ Agent เป็นพิเศษ**: การลองโปรแกรมแบบเดิมๆ อีกครั้งคือการ "ดำเนินการอีกครั้ง" ตัวแทนไม่สามารถลองใหม่ตั้งแต่ต้นได้ - LLM ใช้เวลา 30 วินาทีในการคิดเกี่ยวกับแผนและดำเนินการ 5 ขั้นตอนแรกแล้ว การทำซ้ำถือเป็นการสูญเสียครั้งใหญ่

### 11 องค์ประกอบพร้อมท์ — พร้อมต์ระบบการก่อสร้างแบบหลายชั้น

พรอมต์ระบบของ Agent ไม่ใช่ส่วนหนึ่งของข้อความแบบฮาร์ดโค้ด แต่เป็นผลิตภัณฑ์ของ **ชุดค่าผสมไดนามิกหลายชั้น**

> พรอมต์ระบบสุดท้าย =
> หลักจรรยาบรรณพื้นฐาน
> + คำจำกัดความบทบาท
> + การตั้งค่าผู้ใช้
> + บริบทงานปัจจุบัน
> + คู่มือการใช้งานสำหรับทักษะที่สวมใส่
> + การแจ้งเตือนการศึกษาที่รอดำเนินการ
> + รายการคำอธิบายเครื่องมือ

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

**แนวทางปฏิบัติด้านกรอบงาน**: รันไทม์จำนวนมากจะแทรกเนื้อหาแบบไดนามิกระหว่างขั้นตอนการสร้างคำพร้อมท์ **AgentScope** `sys_prompt + ฟอร์แมตเตอร์` สองชั้น; **DeerFlow** ทักษะ + ภารกิจ + คำจำกัดความของเครื่องมือผสมผสานไดนามิก

### 12 State Machine — การควบคุมวงจรชีวิตของ Agent ได้อย่างแม่นยำ

กระบวนการดำเนินการของ Agent ได้รับการจำลองเป็นเครื่องสถานะจำกัด และแต่ละสถานะมีกฎการเปลี่ยนแปลงที่ชัดเจน

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

**เหตุใดจึงจำเป็นต้องใช้เครื่องสถานะ**: หากไม่มีเครื่องสถานะ การเปลี่ยนสถานะของ Agent จะกระจัดกระจายในรูปแบบ if-else ต่างๆ - "หากการดำเนินการล้มเหลวและจำนวนการลองใหม่ < 3 ให้ลองอีกครั้ง ไม่เช่นนั้นจะดาวน์เกรด หมดเวลาหากดาวน์เกรดล้มเหลว" - ตรรกะประเภทนี้จะกลายเป็นสปาเก็ตตี้อย่างรวดเร็ว

**แนวปฏิบัติเกี่ยวกับกรอบงาน**: **DeepAgents** ชั้นล่างสุดคือ LangGraph StateGraph; **DeerFlow** แผนภูมิสถานะ + โหมดหัวหน้างาน; **OpenClaw** การจัดการสถานะงาน Cron (ตกลง → ข้อผิดพลาด → ลองใหม่ → หมดเวลา)

## III. เปรียบเทียบ 4 เฟรมเวิร์กหลัก

| ขนาด | OpenClaw | เอเจนท์สโคป | ดีพเอเจนท์ | เดียร์โฟลว์ |
| --- | --- | --- | --- | --- |
| **ตำแหน่ง** | แพลตฟอร์มผู้ช่วย AI ส่วนบุคคล | กรอบงานตัวแทนสากล | สายรัดตัวแทน (SDK) | สายรัดซุปเปอร์เอเจนท์ |
| **ภาษา** | ประเภทสคริปต์ | หลาม | หลาม | Python (แบ็กเอนด์) |
| **ชั้นล่างสุด** | การค้นคว้าด้วยตนเอง (Pi Agent) | การค้นคว้าด้วยตนเอง | LangGraph + LangChain | LangGraph + LangChain |
| **โหมดคอร์** | ปลั๊กอิน + ตะขอ + ทักษะ | ReAct Agent + เวิร์กโฟลว์ | StateGraph + เครื่องมือ | หัวหน้างาน + แซนด์บ็อกซ์ |
| **แซนด์บ็อกซ์** | รายการที่อนุญาตของผู้บริหาร | ไม่มีบิวด์อิน | แซนด์บ็อกซ์ระยะไกล E2B | คอนเทนเนอร์นักเทียบท่า |
| **หลายตัวแทน** | หัวหน้างาน | เวิร์กโฟลว์ + MessageHub | SubAgent (เครื่องมืองาน) | หัวหน้างาน (ลีด→ย่อย) |
| **ความทรงจำ** | ระบบไฟล์ | ในหน่วยความจำ + ฐานข้อมูล | การสรุปอัตโนมัติ | ถาวร + TIAMAT |
| **เอ็มซีพี** | แมคพอร์ตเตอร์ | ในตัว | langchain-mcp-อะแดปเตอร์ | ไม่มี |
| **สถานการณ์ที่เกี่ยวข้อง** | ผู้ช่วยรายวันระบบอัตโนมัติ | การวิจัย การตรวจสอบต้นแบบ | ตัวแทนการเข้ารหัส, SDK | งานยาวๆ การผลิตคอนเทนต์ |

#### OpenClaw TypeScript · ปลั๊กอิน + ตะขอ

ไม่ใช่ Python SDK แบบดั้งเดิม แต่เป็นแพลตฟอร์มรันไทม์ รูปแบบการออกแบบหลัก: ส่วนขยายปลั๊กอิน, สายความรับผิดชอบของ Hook, อะแดปเตอร์ช่องสัญญาณ, ระบบทักษะ

- **โหมดปลั๊กอิน**: ส่วนขยายของบุคคลที่สามจะลงทะเบียน hooks และเครื่องมือผ่านปลั๊กอินและเชื่อมโยงกับแกนกลางอย่างอิสระ
- **โหมด Hook**: `before_prompt_build`, `after_tool_call`, `agent_end` สร้างสายโซ่แห่งความรับผิดชอบโดยนัย
- **สรุปช่อง**: อินเทอร์เฟซแบบรวมสำหรับช่องต่างๆ เช่น Telegram, Discord, Feishu ฯลฯ - โหมดอะแดปเตอร์
- **ระบบทักษะ**: การโหลดทักษะที่เน้นมาร์กดาวน์ - ขีดจำกัดโค้ดเป็นศูนย์

💡 **ข้อดีเฉพาะตัว**: ทักษะถูกกำหนดไว้ใน Markdown ล้วนๆ โดยมีเกณฑ์การเข้ารหัสเป็นศูนย์ ใครๆ ก็เขียน Skill ได้ ไม่จำเป็นต้องใช้ Python

#### AgentScope Python · อาลีบาบา Damo Academy

ความเข้มงวดทางวิชาการ+เส้นทางปฏิบัติทางวิศวกรรม โหมด ReAct ในตัว, Toolkit Abstraction, การจัดลำดับเวิร์กโฟลว์, การแบ่งชั้นหน่วยความจำ และรองรับโปรโตคอล A2A

- **ReAct ในตัว**: `ReActAgent` เป็นพลเมืองชั้นหนึ่งและทำงานนอกกรอบ
- **บทคัดย่อชุดเครื่องมือ**: `Toolkit.register_tool_function()` - โรงงาน + กลยุทธ์
- **การจัดการเวิร์กโฟลว์**: โหมดไปป์ไลน์จะรวมเอเจนต์หลายตัวเข้าด้วยกัน
- **การแบ่งชั้นหน่วยความจำ**: InMemory + Database + ReMe (ปรับปรุงหน่วยความจำระยะยาว)
- **โปรโตคอล A2A**: มาตรฐานการสื่อสารแบบตัวแทนต่อตัวแทน - การทำงานร่วมกันแบบกระจายอำนาจ

💡 **ข้อดีเฉพาะตัว**: การรองรับโปรโตคอล A2A ช่วยให้ตัวแทนสามารถทำงานร่วมกันข้ามระบบและเฟรมเวิร์กได้ ความสามารถในการปรับแต่งโมเดลอย่างละเอียด (Agentic RL) ในตัวก็มีเอกลักษณ์เช่นกัน

#### DeepAgents Python · เป็นทางการของ LangChain

ปรัชญาการออกแบบ: ไว้วางใจ LLM และสร้างข้อจำกัดในระดับเครื่องมือ Agent Harness ทำงานได้ทันทีที่แกะกล่อง

- **สร้าง\_deep\_โรงงานตัวแทน**: สร้างตัวแทนที่สมบูรณ์ด้วยโค้ดหนึ่งบรรทัด
- **การวางแผนในตัว**: เครื่องมือ `write_todos` ช่วยให้ Agent สามารถแยกย่อยงานได้อย่างอิสระ
- **ระบบไฟล์ในตัว**: อ่าน/เขียน/แก้ไข/ls/glob/grep
- **การจัดส่งตัวแทนย่อย**: เครื่องมือ `งาน` จะสร้างตัวแทนย่อยที่แยกออกมา
- **การสรุปอัตโนมัติ**: สรุปอัตโนมัติเมื่อการสนทนายาวเกินไป

💡 **ปรัชญาการออกแบบ**: "บังคับใช้ขอบเขตที่ระดับเครื่องมือ/แซนด์บ็อกซ์ ไม่ใช่โดยการคาดหวังให้โมเดลควบคุมตนเอง"

#### DeerFlow Python · ByteDance

ความแตกต่างหลัก: เฟรมเวิร์กส่วนใหญ่เป็น "เลเยอร์การอนุมาน" DeerFlow คือ "เลเยอร์การดำเนินการ"

- **หัวหน้างาน + ตัวแทนย่อย**: ตัวแทนหลักแยกย่อยงานและส่งตัวแทนย่อยเพื่อดำเนินการแบบขนาน
- **Docker Sandbox**: แต่ละงานทำงานในคอนเทนเนอร์ที่แยกจากกัน พร้อมระบบไฟล์จริงและทุบตี
- **ระบบทักษะ**: Markdown กำหนดทักษะและโหลดตามความต้องการ
- **หน่วยความจำถาวร**: หน่วยความจำข้ามเซสชัน การอัปเดตแบบอะซิงโครนัส
- **ไปป์ไลน์แบบมีสถานะ**: ขึ้นอยู่กับจุดตรวจ LangGraph งานที่ใช้เวลานานสามารถถูกขัดจังหวะและดำเนินการต่อได้

💡 **ข้อดีที่ไม่เหมือนใคร**: ให้ตัวแทน "คอมพิวเตอร์" อย่างแท้จริง - ไม่ใช่แค่สร้างข้อความ แต่ยังสร้าง PPT ที่ดาวน์โหลดได้ โค้ดที่รันได้ และหน้าเว็บที่ปรับใช้ได้

## IV. ตารางเลือกใช้รูปแบบอย่างรวดเร็ว

| ปัญหาที่คุณต้องการแก้ไข | โหมดแนะนำ | สอดคล้องกับโหมดคลาสสิก |
| --- | --- | --- |
| การใช้งานหลายครั้งของการดำเนินการเดียวกัน | **กลยุทธ์** | รูปแบบกลยุทธ์ |
| สร้างตัวแทนแบบรวมศูนย์ด้วยการกำหนดค่าที่แตกต่างกัน | **โรงงาน** | โหมดโรงงาน |
| การประมวลผลหลายชั้นก่อนและหลังการเรียกใช้เครื่องมือ | **สายโซ่แห่งความรับผิดชอบ** | รูปแบบห่วงโซ่ความรับผิดชอบ |
| ผู้ฟังหลายคนหลังจากการใช้เครื่องมือ | **ผู้สังเกตการณ์** | รูปแบบผู้สังเกตการณ์ |
| การแคช / ลองใช้เครื่องมืออีกครั้งโดยไม่ต้องเปลี่ยนรหัส | **มัณฑนากร** | โหมดมัณฑนากร |
| อินเทอร์เฟซแบบรวมสำหรับผู้ให้บริการ LLM ที่แตกต่างกัน | **อะแดปเตอร์** | โหมดอะแดปเตอร์ |
| กำหนดโครงกระดูกกระบวนการดำเนินการของตัวแทน | **วิธีการสร้างเทมเพลต** | รูปแบบวิธีการเทมเพลต |
| แยกการเรียกใช้โค้ดที่ไม่น่าเชื่อถือ | **แซนด์บ็อกซ์** | — |
| โมดูลความสามารถในการโหลดตามความต้องการ | **ทักษะ** | — |
| การกู้คืนการหยุดชะงักของงานที่ยาวนาน | **ด่านตรวจ** | — |
| พรอมต์ระบบองค์ประกอบแบบไดนามิก | **องค์ประกอบที่รวดเร็ว** | — |
| ควบคุมการเปลี่ยนสถานะตัวแทนได้อย่างแม่นยำ | **เครื่องสถานะ** | โหมดเครื่องสถานะ |

การอ่านเพิ่มเติม: [โอเพ่นคลอว์](https://github.com/openclaw/openclaw) · [เอเจนต์สโคป](https://github.com/agentscope-ai/agentscope) · [ตัวแทนระดับลึก](https://github.com/langchain-ai/deepagents) · [เดียร์โฟลว์](https://github.com/bytedance/deer-flow)
