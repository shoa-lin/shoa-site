---
translationKey: "ai-agent-engineering-patterns"
locale: "de"
title: "KI-Agent-Engineering-Designmuster (Teil 2): Zuverlässige Umsetzung"
description: "Von Strategy, Factory und Chain of Responsibility bis zu Sandbox, Checkpoints und State Machines: Organisationsstrukturen und technische Abwägungen zuverlässiger Agent-Systeme."
publishedAt: "2026-04-09"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-engineering-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Der vorherige Teil behandelte, **wie Agenten arbeiten**: wie sie schlussfolgern, Werkzeuge aufrufen, Aufgaben aufteilen und zusammenarbeiten sowie wo Gedächtnis und Sicherheitsgrenzen hingehören. Bei der Umsetzung verlagert sich die Komplexität von „Was ist der nächste Schritt?“ auf ein anderes Problem: **Wie organisiert man diese Fähigkeiten in einem langfrist wartbaren System?**

Wenn es wirklich umgesetzt wird, sind die Probleme oft sehr konkret:

-   Es gibt drei Suchwerkzeuge: Tavily, Exa und Gemini. Wie lässt man den Agenten **unabhängig davon, welches genau verwendet wird**?
-   Unterschiedliche Agenten (Finanzen, Forschung, Betrieb) benötigen alle Suche, aber mit unterschiedlichen Parametern. Wie **verwaltet man die Werkzeugregistrierung einheitlich**?
-   Vor und nach dem Aufruf von Werkzeugen muss der Agent Protokolle erstellen, die Zugriffskontrolle prüfen und die Nutzung begrenzen. Wie **vermischt man keine Geschäftslogik mit Querschnittslogik**?
-   Von Agenten generierte Inhalte müssen überprüft, formatiert und übersetzt werden. Wie **stellt man eine Bearbeitungspipeline zusammen**?

Dies sind keine abstrakten „KI-Probleme“, sondern klassische Software-Engineering-Probleme in neuer Form in Agentensystemen. Dieser Artikel verlangt nicht, dass du 12 Muster auswendig lernst; das Ziel ist zunächst zu erkennen, welche Veränderung jedes Muster isoliert und welches Risiko es einschränkt.

## Zuerst eine Engineering-Landkarte erstellen

Man kann die folgenden Muster zunächst nach den Problemen gruppieren, die sie lösen:

-   **Austausch und Kombination**: Strategy, Factory, Adapter ermöglichen, dass Modelle, Werkzeuge und Agentenkonfigurationen austauschbar sind, anstatt in vielen Bedingungsabfragen verstreut zu sein.
-   **Querschnittskontrolle**: Chain of Responsibility, Observer, Decorator extrahieren Berechtigungen, Protokolle, Ratenbegrenzung, Caching und Überprüfung aus dem Kern der Geschäftslogik.
-   **Zustand und Grenzen**: Sandbox, Checkpoint, Prompt Composition, State Machine behandeln Isolation, Wiederherstellung, Kontext und Lebenszyklus – diese besonderen Herausforderungen von Agenten.

Mit dieser Landkarte sollte man beim Betrachten jedes Musters nicht denken „wie heißt es?“, sondern „welche Art von Veränderung oder Kontrollverlust begegnet mein System hier?“

## 1. Neues Leben klassischer GoF-Muster in Agenten

### 01 Strategy — Die Seele der Werkzeugwahl

**Klassische Definition**: Definiert eine Familie von Algorithmen, kapselt jeden und macht sie austauschbar.

**Agent-Szenario**: Dieselbe „Such“-Operation kann auf verschiedene Weisen implementiert werden – Tavily, Exa, Gemini. Der Aufrufer sollte nicht wissen, welche konkret verwendet wird.

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

💡 **Das ist auch das Kernkonzept des einheitlichen Suchdienstes**. Das Strategy-Muster macht die Erweiterung von Fallback-Ketten natürlich – um eine neue Suchquelle hinzuzufügen, muss nur das `SearchProvider` Interface implementiert und zur Liste hinzugefügt werden.

**Framework-Praxis**: **DeerFlow** Lead Agent wählt Sub-Agents im Wesentlichen nach Strategien aus; **AgentScope** `Toolkit.register_tool_function()` registriert Werkzeuge – Werkzeuge sind Strategien.

### 02 Factory — Einheitliche Erstellung von Agents

**Klassische Definition**: Kapselt die Logik zur Erstellung von Objekten, so dass der Aufrufer die konkrete Klasse nicht kennen muss.

**Agent-Szenario**: Es gibt mehrere Agents im System, jeder mit unterschiedlichem Modell, Systemprompt und Werkzeugset. Die Erstellungslogik sollte nicht verstreut sein.

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

**Framework-Praxis**: **DeepAgents** `create_deep_agent()` verbirgt die Kompilierungsdetails des LangGraph-Graphs; **AgentScope** `ReActAgent()` versteckt die Initialisierung von Memory und Formatter; zur Laufzeit kann die Agent-Liste deklariert und entsprechende Instanzen anhand ihrer Kennung erstellt werden.

### 03 Chain of Responsibility — Werkzeug-Aufruf-Pipeline

**Klassische Definition**: Eine Anfrage wird entlang einer Kette von Bearbeitern weitergegeben, jeder Bearbeiter entscheidet, ob er die Anfrage verarbeitet oder an den nächsten weitergibt.

**Agent-Szenario**: Wenn ein Agent ein Werkzeug aufruft, muss es mehrere Prüfungen durchlaufen – Berechtigungen → Ratenbegrenzung → Protokollierung → Ausführung → Ergebnissverarbeitung.

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

💡 **Die Designphilosophie von Plugin-Hooks** kann eine implizite Verantwortungskette bilden: Querlogik wird jeweils vor der Erstellung des Prompt und nach dem Werkzeugaufruf eingefügt.

### 04 Observer — Ereignisgesteuerte lose Kopplung

**Klassische Definition**: Wenn sich der Zustand eines Objekts ändert, benachrichtigt es automatisch alle Objekte, die von ihm abhängig sind.

**Agent-Szenario**: Nachdem ein Tool aufgerufen wurde, müssen mehrere Systeme informiert werden — Fehlerqueues müssen protokolliert, Überwachungen gemeldet und Lern-Engines analysiert werden. Sie sollten nicht miteinander gekoppelt sein.

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

💡 **Das Lernmodul kann eine Beobachter-Architektur verwenden**: Beobachter lauschen Ereignissen nach dem Toolaufruf, beim Hinzufügen neuer Funktionen muss nur ein neuer Beobachter registriert werden.

### 05 Decorator — Funktionserweiterung ohne Eingriff

**Klassische Definition**: Dynamisches Hinzufügen zusätzlicher Verantwortlichkeiten zu einem Objekt, ohne dessen Schnittstelle zu verändern.

**Agent-Szenario**: Dem Agenten Retry, Caching, Logging oder Rate-Limiting hinzufügen — ohne den Agenten-Code selbst zu ändern.

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

**Unterschied zur Chain of Responsibility**: Die Chain of Responsibility ist „Pipeline-artig“ — Anfragen durchlaufen nacheinander jeden Bearbeiter. Der Decorator ist „Wrapper-artig“ — jede Dekoratorebene umhüllt die Kernfunktion. Der Effekt ist ähnlich, aber Decorators sind leichter.

### 06 Adapter — Einheitliche Schnittstelle für heterogene Tools

**Klassische Definition**: Wandelt die Schnittstelle einer Klasse in eine andere Schnittstelle um, die der Client erwartet.

**Agent-Szenario**: Verschiedene LLM-Anbieter (OpenAI, Google, Zhichu) haben unterschiedliche API-Formate. Der Agent-Code sollte sich nicht um diese Unterschiede kümmern.

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

**Praxis im Framework**: **DeepAgents** `init_chat_model("openai:gpt-4o")` — eine Funktion passt alle Anbieter an; **OpenClaw** `zai/glm-5`, `google/gemini-2.5-flash` ein einheitliches `provider/model`-Format.

### 07 Template Method — Skelett des Agent-Ausführungsprozesses

**Klassische Definition**: Definiert in der Basisklasse das Grundgerüst eines Algorithmus und verschiebt bestimmte Schritte zur Implementierung in die Unterklasse.

**Agent-Szenario**: Alle Agenten folgen dem Ablauf „Aufgabe empfangen → Nachdenken → Tool aufrufen → Ergebnis verarbeiten → Rückgabe“, aber die konkrete Umsetzung jedes Schrittes ist unterschiedlich.

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

**Praxis im Framework**: **AgentScope** `ReActAgent` überschreibt `think_and_act`; **DeepAgents** `create_deep_agent()` gibt den kompilierten LangGraph StateGraph zurück.

## Zwei, Agent-spezifische Entwurfsmuster

Das Obige ist eine Abbildung des klassischen GoF-Musters in Agents. Die folgenden Muster sind eher "agenten-nativ" – ungewöhnlich in traditioneller Software, aber nahezu essenziell in der Agentenentwicklung.

### 08 Sandbox — Sichere Ausführung von misstrautem Code

Code/Befehle, die von Agenten generiert werden, werden in der **isolierten Umgebung** ausgeführt und beeinflussen das Host-System nicht.

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

⚠️ **Dies ist kein GoF-Muster, aber es ist das Grundprinzip des Agent-Systems** – dem Agenten beliebige Shell-Befehle ohne Sandboxing zu erlauben, ist gleichbedeutend damit, die Systemkontrolle an eine Black Box zu übergeben.

**Framework Practice** :* *DelFlow** Jede Aufgabe läuft in einem eigenständigen Docker-Container; **DeepАгентs** unterstützt Remote Sandboxes (E2B); **OpenClaw** Executive Tool hat einen Zulassungslisten-Mechanismus.

### 09 Skill — On-Demand-Kapazitätsmodule

Die Fähigkeiten der Agenten sind nicht festgelegt, sondern eher **modulare, on-demand-Fähigkeiten**. Es ist wie ein Spielcharakter, der verschiedene Fertigkeitsbücher ausrüstet.

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

💡 **Key Insight**:Skill Es handelt sich nicht nur um eine "Sammlung von Werkzeugen" – es enthält auch **Benutzeranleitungen** (Anleitungen), die dem Agenten sagen, wann und wie er sie benutzen soll. `SKILL.md` Daher sollten Sie nicht nur die API-Adresse schreiben, sondern auch die Nutzungsrichtlinie klar angeben.

**Framework Practice**:* *Del Flow** Skill ist eine Mark-Datei; **OpenClaw** Skill = SKILL.md + optionales Skript/Hook.

### 10 Checkpoint — Ausdauer und Erholung langer Aufgaben

Langlaufende Aufgaben können unterbrochen werden (Timeout, Absturz, API-Rate-Begrenzung), was den Zustand an kritischen Knoten speichern muss und die Wiederherstellung von Breakpoints unterstützt.

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

**Warum Agenten besonders benötigt werden**: Traditionelle Programmversuche heißen "Rerun". Agenten-Wiederholungen können nicht von Grund auf neu beginnen – LLMs haben bereits 30 Sekunden damit verbracht, Pläne zu brainstormen, die ersten fünf Schritte sind ausgeführt, und das Wiederholen ist eine riesige Verschwendung.

### 11 Prompt-Komposition — Mehrschichtiger Aufbau des System-Prompts

Das System-Prompt eines Agents ist kein festgeschriebener Text, sondern das **Produkt einer mehrschichtigen dynamischen Kombination**.

> Endgültiges System-Prompt =
>     Grundlegende Verhaltensregeln
>   + Rollenbeschreibung
>   + Benutzerpräferenzen
>   + Aktueller Aufgaben-Kontext
>   + Gebrauchsanleitung für das bereits ausgestattete Skill
>   + Lernhinweise, die bearbeitet werden müssen
>   + Liste der Werkzeugbeschreibungen

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

**Praxis im Framework**: Viele Laufzeitumgebungen injizieren Inhalte während der Prompt-Erstellungsphase dynamisch; **AgentScope** `sys_prompt + formatter` zwei Ebenen; **DeerFlow** Skill + Aufgabe + Werkzeugdefinition dynamisch kombiniert.

### 12 Zustandsmaschine — Präzise Kontrolle des Agenten-Lebenszyklus

Der Ausführungsprozess eines Agents wird als **endliche Zustandsmaschine** modelliert, wobei jeder Zustand klare Übergangsregeln hat.

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

**Warum eine Zustandsmaschine benötigt wird**: Ohne Zustandsmaschine sind die Zustandsübergänge eines Agents in verstreuten if-else-Blöcken enthalten — „Wenn die Ausführung fehlschlägt und die Anzahl der Wiederholungen < 3, dann erneut versuchen, sonst herabstufen, und schlägt die Herabstufung auch fehl, dann Timeout“ — diese Logik wird sehr schnell zu Spaghetti-Code.

**Praxis im Framework**: **DeepAgents** basiert auf LangGraph StateGraph; **DeerFlow** Zustandsdiagramm + Supervisor-Modus; **OpenClaw** Cron-Job-Zustandsverwaltung (ok → error → retry → timeout).

## Drei- und Vier-Framework-Vergleichsanalyse

| Dimension | OpenClaw | AgentScope | DeepAgents | DeerFlow |
| --- | --- | --- | --- | --- |
| **Positionierung** | Persönliche KI-Assistenten-Plattform | Universelles Agenten-Framework | Agent Harness (SDK) | Super Agent Harness |
| **Sprache** | TypeScript | Python | Python | Python (Backend) |
| **Unterbau** | Eigenentwicklung (Pi Agent) | Eigenentwicklung | LangGraph + LangChain | LangGraph + LangChain |
| **Kernmodus** | Plugin + Hook + Skill | ReAct-Agent + Workflow | StateGraph + Tool | Supervisor + Sandbox |
| **Sandbox** | Ausführungs-Whitelist | Keine eingebauten | E2B Remote-Sandbox | Docker-Container |
| **Mehragenten** | Supervisor | Workflow + MessageHub | SubAgent (Aufgaben-Tool) | Supervisor (Lead→Unter) |
| **Speicher** | Dateisystem | InMemory + Datenbank | Automatische Zusammenfassung | Persistent + TIAMAT |
| **MCP** | mcporter | Integriert | langchain-mcp-Adapter | Keine |
| **Anwendungsbereiche** | Alltagsassistent, Automatisierung | Forschung, Prototypentest | Codieragent, SDK | Lange Aufgaben, Inhaltserstellung |

#### OpenClaw TypeScript · Plugin + Hook

Es ist kein traditionelles Python-SDK, sondern eine Laufzeit-Plattform. Kern-Designmuster: Plugin-Erweiterung, Hook-Verkettung, Channel-Adapter, Skill System.

-   **Plugin-Muster**: Drittanbieter-Erweiterungen registrieren Hooks und Werkzeuge über Plugin und sind locker mit dem Kern gekoppelt.
-   **Hook-Modus**：`before_prompt_build`, `after_tool_call`, `agent_end` bilden eine implizite Verantwortlichkeitskette
-   **Channel-Abstraktion**：Einheitliche Schnittstelle für Telegram, Discord, Feishu usw. —— Adapter-Muster
-   **Skill-System**：Markdown-gesteuertes Skill-Loading —— Null-Code-Schwelle

💡 **Einzigartige Vorteile**：Skill wird vollständig in Markdown definiert, Null-Code-Schwelle. Jeder kann einen Skill schreiben, ohne Python zu benötigen.

#### AgentScope Python · Alibaba DAMO Academy

Wissenschaftlich fundiert + praxisorientierter Engineering-Ansatz. ReAct-Modus eingebaut, Toolkit-Abstraktion, Workflow-Orchestrierung, Memory-Schichtung, A2A-Protokollunterstützung.

-   **ReAct eingebaut**：`ReActAgent` ist ein erstklassiger Citizen, sofort einsatzbereit
-   **Toolkit-Abstraktion**：`Toolkit.register_tool_function()` —— Factory + Strategy
-   **Workflow-Orchestrierung**：Pipeline-Modus kombiniert mehrere Agents
-   **Memory-Schichtung**：InMemory + Database + ReMe (verstärktes Langzeitgedächtnis)
-   **A2A-Protokoll**：Agent-to-Agent-Kommunikationsstandard —— dezentralisierte Zusammenarbeit

💡 **Einzigartige Vorteile**：A2A-Protokollunterstützung ermöglicht Agenten Interoperabilität über Systeme und Frameworks hinweg. Eingebaute Modell-Feinabstimmung (Agentic RL) ist ebenfalls einzigartig.

#### DeepAgents Python · Offizielles LangChain

Design-Philosophie: Vertrauen in LLM, Einschränkungen auf Werkzeugebene. Out-of-the-box Agent Harness.

-   **create_deep_agent Factory**：Erstellung eines kompletten Agent mit einer Codezeile
-   **Eingebautes Planning**：`write_todos`-Werkzeug ermöglicht Agent, Aufgaben eigenständig zu unterteilen
-   **Eingebautes Dateisystem**：read/write/edit/ls/glob/grep
-   **Sub-Agent-Verteilung**：`task` Werkzeug erstellt isolierte Sub-Agents
-   **Auto-Zusammenfassung**：Automatische Zusammenfassung bei zu langen Dialogen

💡 **Design-Philosophie**：_"Grenzen auf der Werkzeug-/Sandbox-Ebene durchsetzen, nicht indem man vom Modell Selbstkontrolle erwartet."_ (Beschränkungen auf der Werkzeug-/Sandbox-Ebene umsetzen, nicht darauf hoffen, dass das Modell sich selbst reguliert.)

#### DeerFlow Python · ByteDance

Kernunterschied: Die meisten Frameworks arbeiten auf der "Inference-Ebene", DeerFlow auf der "Execution-Ebene".

-   **Supervisor + Sub-Agent**：Der Lead-Agent zerlegt Aufgaben und verteilt Sub-Agents zur parallelen Ausführung
-   **Docker Sandbox**：Jede Aufgabe läuft in einem isolierten Container mit echtem Dateisystem und Bash
-   **Skill System**：Markdown definiert Skills, laden bei Bedarf
-   **Persistent Memory**：Sitzungsübergreifendes Gedächtnis, asynchrone Aktualisierung
-   **Stateful-Pipeline**：Basierend auf LangGraph-Checkpointing, lange Aufgaben können unterbrochen und wieder aufgenommen werden

💡 **Einzigartiger Vorteil**：Gibt dem Agent wirklich "einen Computer" – nicht nur Text generieren, sondern herunterladbare PPTs, ausführbaren Code und deploybare Webseiten erstellen.

## IV. Schnellübersicht der Modellwahl

| Die zu lösenden Probleme | Empfohlene Muster | Entsprechendes klassisches Muster |
| --- | --- | --- |
| Dasselbe Verhalten hat mehrere Implementierungen | **Strategie** | Strategiemuster |
| Einheitliche Erstellung von Agents mit unterschiedlichen Konfigurationen | **Fabrik** | Fabrikmuster |
| Mehrstufige Verarbeitung vor und nach dem Werkzeugaufruf | **Verantwortungskette** | Verantwortungskettenmuster |
| Mehrere Zuhörer nach der Werkzeugausführung | **Beobachter** | Beobachtermuster |
| Cache/Retry für ein Werkzeug hinzufügen, ohne den Code zu ändern | **Dekorierer** | Dekorierermuster |
| Einheitliche Schnittstelle für verschiedene LLM-Anbieter | **Adapter** | Adaptermuster |
| Definition des Ausführungsgerüsts eines Agents | **Vorlagenmethode** | Vorlagenmethodenmuster |
| Ausführung von nicht vertrauenswürdigem Code isolieren | **Sandbox** | — |
| Fähigkeitsmodule bei Bedarf laden | **Skill** | — |
| Wiederaufnahme unterbrochener langer Aufgaben | **Prüfpunkt** | — |
| Dynamische Kombination von System-Prompts | **Prompt-Komposition** | — |
| Präzise Steuerung des Agenten-Zustandswechsels | **Zustandsmaschine** | Zustandsmaschinenmuster |

Weiterführende Literatur: [OpenClaw](https://github.com/openclaw/openclaw) · [AgentScope](https://github.com/agentscope-ai/agentscope) · [DeepAgents](https://github.com/langchain-ai/deepagents) · [DeerFlow](https://github.com/bytedance/deer-flow)
