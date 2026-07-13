---
translationKey: "ai-agent-engineering-patterns"
locale: "ja"
title: "AIエージェントのエンジニアリング設計パターン（後編）：信頼性を実装する"
description: "Strategy、Factory、Chain of ResponsibilityからSandbox、Checkpoint、State Machineまで。変化、制御、復旧に耐えるAIエージェントシステムの組み立て方を解説します。"
publishedAt: "2026-04-09"
updatedAt: "2026-07-13"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-engineering-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

前回の記事では、エージェント **機能**の仕組み、つまり推論、ツールの呼び出し、分割と共同作業の方法、およびメモリと安全の境界線をどこに設定するかについて説明しました。しかし、実装を開始すると、複雑さは「次に何をするか」という問題から、次の質問へと移ります。**これらの機能を長期的に維持できるシステムにどのように編成するかということです。 **

実装に関して言えば、多くの場合、質問は非常に具体的です。

- 検索ツールは、Tavily、Exa、Gemini の 3 つです。エージェントがどちらを使用するかを気にしないわけがありません。
- さまざまなエージェント (財務、調査、運営) を検索する必要がありますが、パラメータは異なります。 **管理ツールの登録を一元化**するにはどうすればよいですか?
- エージェントは、ツールを呼び出す前後にログ記録、電流制限、権限チェックを行う必要があります。ビジネスコードと横断的なロジックを組み合わせてみてはいかがでしょうか?
- エージェントによって生成されたコンテンツは、レビュー、フォーマット、翻訳する必要があります。それを処理パイプラインに組み込むにはどうすればよいでしょうか?

これらは抽象的な「AI 問題」ではなく、エージェント システムにおける古典的なソフトウェア エンジニアリングの問題の新しい形式です。この記事では 12 のパターンを覚える必要はありません。目標は、まず各パターンで何が変更され、どのようなリスクが分離されるかを明確に理解することです。

## まずエンジニアリング マップを作成します

まず、解決する問題に応じて、次のパターンを 3 つのカテゴリに分類できます。

- **置換と組み合わせ**: ストラテジー、ファクトリー、およびアダプターにより、モデル、ツール、およびエージェント構成を、多数の条件付き判断に分散するのではなく、置き換えることができます。
- **横断的な制御**: 責任の連鎖、オブザーバー、デコレータは、コア ビジネスから権限、ログ、電流制限、キャッシュ、監査を抽出します。
- **状態と境界**: サンドボックス、チェックポイント、プロンプト構成、およびステート マシンは、分離、回復、コンテキスト、ライフ サイクルといったエージェント固有の問題を処理します。

この地図を踏まえて各パターンを見るときは、名称ではなく、どの変化や制御不能に対応するのかに注目してください。

## 1. Agent におけるクラシック GoF モデルの新しい命

### 01 戦略 — ツール選択の魂

**クラシックな定義**: アルゴリズムのファミリーを定義し、相互に置き換えられるようにそれぞれをカプセル化します。

**エージェント シナリオ**: 同じ「検索」操作の背後に複数の実装があります (Tavily、Exa、Gemini)。呼び出し側はどれを使用すればよいのか分からないはずです。

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

💡 **これは、統合検索サービスの中核的な設計でもあります**。ストラテジー モードでは、フォールバック リンクの拡張が自然になります。新しい検索ソースを追加するには、`SearchProvider` インターフェイスを実装してリストに追加するだけです。

**フレームワークの実践**: **DeerFlow** リード エージェントがサブエージェントを選択します。これは本質的に戦略の選択です。 **AgentScope** `Toolkit.register_tool_function()` はツールを登録します - ツールは戦略です。

### 02 Factory — エージェントの統合作成

**クラシック定義**: オブジェクトの作成ロジックをカプセル化します。呼び出し元は特定のクラスを知る必要はありません。

**エージェントのシナリオ**: システム内に複数のエージェントがあり、それぞれが異なるモデル、システム プロンプト、ツール セットを持っています。作成ロジックはあちこちに散在すべきではありません。

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

**フレームワークの実践**: **DeepAgents** `create_deep_agent()` は、LangGraph グラフのコンパイルの詳細を非表示にします。 **AgentScope** `ReActAgent()` はメモリとフォーマッタの初期化を隠します。ランタイム設定では、エージェント リストを宣言し、識別子に従って対応するインスタンスを作成することもできます。

### 03 責任の連鎖 — ツール呼び出しパイプライン

**古典的な定義**: リクエストはハンドラーのチェーンに沿って渡され、各ハンドラーがそれを処理するか次のハンドラーに渡すかを決定します。

**エージェントのシナリオ**: エージェントがツールを呼び出すときは、権限→電流制限→ログ→実行→結果処理という複数の層のチェックを通過する必要があります。

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

💡 **プラグイン フックの設計哲学** は、暗黙の責任の連鎖を形成する可能性があります。つまり、プロンプト ワードを作成する前とツール呼び出しの後に横断的なロジックを挿入します。

### 04 オブザーバー — イベント駆動型の疎結合

**従来の定義**: オブジェクトの状態が変化すると、そのオブジェクトに依存するすべてのオブジェクトに自動的に通知されます。

**エージェント シナリオ**: ツールの呼び出しが完了した後、複数のシステムがそれを認識する必要があります。エラー キューを記録する必要があり、監視を報告する必要があり、学習エンジンが分析する必要があります。相互に結合しないでください。

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

💡 **学習モジュールはオブザーバー アーキテクチャを採用できます**: ツールが呼び出された後のオブザーバーはイベントをリッスンします。機能を追加するときは、新しいオブザーバーを登録するだけで済みます。

### 05 デコレータ — 非侵入的な機能拡張

**古典的な定義**: インターフェイスを変更せずに、追加の責任をオブジェクトに動的に追加します。

**エージェント シナリオ**: エージェント自体のコードを変更せずに、再試行、キャッシュ、ロギング、および電流制限をエージェントに追加します。

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

**責任の連鎖との違い**: 責任の連鎖は「パイプライン化」されており、リクエストは各プロセッサーを順番に通過します。デコレータは「ラップ」されています - デコレータの各層がコア機能をラップします。効果は似ていますが、デコレーターの方が軽いです。

### 06 アダプター — 異種ツール用の統合インターフェース

**古典的な定義**: クラスのインターフェイスを、クライアントが期待する別のインターフェイスに変換します。

**エージェント シナリオ**: 異なる LLM プロバイダー (OpenAI、Google、Wisdom) は異なる API 形式を持っており、エージェント コードはこれらの違いを気にする必要はありません。

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

**フレームワークの実践**: **DeepAgents** `init_chat_model("openai:gpt-4o")` 1 つの関数がすべてのプロバイダーに適応します。 **OpenClaw** `zai/glm-5`、`google/gemini-2.5-flash` の統合された `provider/model` 形式。

### 07 テンプレートメソッド — エージェント実行プロセスのスケルトン

**クラシック定義**: 基本クラスでアルゴリズムのスケルトンを定義し、特定の手順をサブクラスの実装に延期します。

**エージェントのシナリオ**: すべてのエージェントの実行プロセスは「タスクの受信 → 考える → ツールの呼び出し → 処理結果 → 返却」ですが、各ステップの具体的な実装は異なります。

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

**フレームワークの実践**: **AgentScope** `ReActAgent` は `think_and_act` をオーバーライドします。 **DeepAgents** `create_deep_agent()` はコンパイルされた LangGraph StateGraph を返します。

## 2. エージェント独自のエンジニアリング設計モード

上記は、Agent のクラシック GoF モードのマッピングです。次のパターンは、より「エージェントネイティブ」です。従来のソフトウェアでは一般的ではありませんが、エージェント開発ではほぼ必須です。

### 08 サンドボックス — 信頼できないコードを安全に実行する

エージェントによって生成されたコード/コマンドは **隔離された環境** で実行され、ホスト システムには影響しません。

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

⚠️ **これは GoF モードではありませんが、エージェント システムの要点です** - エージェントがサンドボックス化せずに任意のシェル コマンドを実行できるようにすることは、システム制御をブラック ボックスに引き渡すことと同じです。

**フレームワークの実践**: **DeerFlow** 各タスクは独立した Docker コンテナ内で実行されます。 **DeepAgents** はリモート サンドボックス (E2B) をサポートします。 **OpenClaw** 実行ツールには許可リスト メカニズムがあります。

### 09 スキル — オンデマンドでロードされる能力モジュール

エージェントの機能は固定されていませんが、モジュール式のスキルはオンデマンドでロードされます。さまざまなスキルブックを装備したゲームキャラクターと同じです。

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

💡 **重要な洞察**: スキルは単なる「ツールのコレクション」ではありません。スキルには、エージェントに \*いつ使用するか、どのように使用するかを指示する **使用ガイドライン** (指示) も含まれています。したがって、「SKILL.md」にはAPIアドレスだけでなく、利用ポリシーも記述する必要があります。

**フレームワークの実践**: **DeerFlow** スキルは Markdown ファイルです。 **OpenClaw** スキル = SKILL.md + オプションのスクリプト/フック。

### 10 チェックポイント — 長いタスクの永続化と回復

長時間実行されているタスクは中断される可能性があり (タイムアウト、クラッシュ、API 電流制限)、ブレークポイントからの回復をサポートするために主要なノードで状態を保存する必要があります。

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

**エージェントが特に必要な理由**: 従来のプログラムのリトライは「再度実行する」ことです。エージェントは最初から再試行できません。LLM はすでに 30 秒かけて計画を検討し、最初の 5 つのステップが実行されています。再実行は大きな無駄です。

### 11 プロンプトの構成 — 階層構造のシステム プロンプト

エージェントのシステム プロンプトはハードコーディングされたテキストではなく、**多層の動的な組み合わせ**の産物です。

> 最終的なシステム プロンプト =
> 基本行動規範
> + 役割定義
> + ユーザー設定
> + 現在のタスクのコンテキスト
> + 装備スキルの使い方ガイド
> + 保留中の学習リマインダー
> + ツール説明リスト

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

**フレームワークの実践**: 多くのランタイムは、プロンプトワード構築フェーズ中にコンテンツを動的に挿入します。 **AgentScope** `sys_prompt + formatter` の 2 つの層。 **DeerFlow** スキル + タスク + ツール定義の動的な組み合わせ。

### 12 ステート マシン — エージェントのライフサイクルの正確な制御

エージェントの実行プロセスは有限状態マシンとしてモデル化されており、各状態には明確な遷移ルールがあります。

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

**ステート マシンが必要な理由**: ステート マシンがないと、エージェントの状態遷移はさまざまな if-else (実行が失敗し、再試行回数が 3 回未満の場合は再試行、それ以外の場合はダウングレード、ダウングレードが失敗した場合はタイムアウト) に分散されます。この種のロジックはすぐにスパゲッティになります。

**フレームワークの実践**: **DeepAgents** 最下層は LangGraph StateGraph です。 **DeerFlow** 状態チャート + スーパーバイザ モード。 **OpenClaw** Cron ジョブのステータス管理 (OK → エラー → 再試行 → タイムアウト)。

## III. 四つの主要フレームワークの比較

|寸法 |オープンクロウ |エージェントスコープ |ディープエージェント |ディアフロー |
| --- | --- | --- | --- | --- |
| **ポジショニング** |パーソナル AI アシスタント プラットフォーム |ユニバーサル エージェント フレームワーク |エージェント ハーネス (SDK) |スーパーエージェントハーネス |
| **言語** |タイプスクリプト |パイソン |パイソン | Python (バックエンド) |
| **最下層** |自己調査 (Pi エージェント) |自己研究 |ランググラフ + ラングチェーン |ランググラフ + ラングチェーン |
| **コアモード** |プラグイン + フック + スキル | ReAct エージェント + ワークフロー |ステートグラフ + ツール |スーパーバイザー + サンドボックス |
| **サンドボックス** |実行許可リスト |内蔵なし | E2B リモート サンドボックス | Dockerコンテナ |
| **マルチエージェント** |スーパーバイザー |ワークフロー + メッセージハブ |サブエージェント（タスクツール） |スーパーバイザー（リード→サブ） |
| **メモリ** |ファイルシステム |インメモリ + データベース |自動要約 |永続的 + TIAMAT |
| **MCP** |マックポーター |内蔵 | langchain-mcp-adapters |なし |
| **該当するシナリオ** |日常アシスタント、自動化 |研究・試作検証 |コーディング エージェント、SDK |長いタスク、コンテンツ制作 |

#### OpenClaw TypeScript · プラグイン + フック

従来の Python SDK ではなく、ランタイム プラットフォームです。コアデザインパターン: プラグイン拡張機能、責任のフックチェーン、チャネルアダプター、スキルシステム。

- **プラグイン モード**: サードパーティの拡張機能はプラグインを通じてフックとツールを登録し、コアと疎結合されます。
- **フック モード**: `before_prompt_build`、`after_tool_call`、`agent_end` が暗黙的な責任の連鎖を形成します。
- **チャンネル概要**: Telegram、Discord、Feishu などのチャンネルの統合インターフェイス - アダプター モード
- **スキル システム**: マークダウン主導のスキル読み込み - コードしきい値ゼロ

💡 **独自の利点**: スキルは純粋なマークダウンで定義され、コーディングのしきい値はゼロです。スキルは誰でも作成でき、Python は必要ありません。

#### AgentScope Python · Alibaba Damo Academy

学術的厳密性 + 工学的実践ルート。組み込みの ReAct モード、ツールキットの抽象化、ワークフロー オーケストレーション、メモリ レイヤ化、および A2A プロトコルのサポート。

- **ReAct ビルトイン**: `ReActAgent` は第一級市民であり、すぐに機能します
- **ツールキットの要約**: `Toolkit.register_tool_function()` - ファクトリ + ストラテジー
- **ワークフロー オーケストレーション**: パイプライン モードは複数のエージェントを結合します
- **メモリ階層化**: InMemory + Database + ReMe (強化された長期記憶)
- **A2A プロトコル**: エージェント間の通信標準 - 分散型コラボレーション

💡 **独自の利点**: A2A プロトコルのサポートにより、エージェントはシステムやフレームワーク間で相互運用できます。組み込みのモデル微調整 (Agentic RL) 機能もユニークです。

#### DeepAgents Python・LangChain 公式

設計哲学: LLM を信頼し、ツール レベルで制約を作成します。 Agent Harness は箱から出してすぐに機能します。

- **create\_deep\_agent Factory**: 1 行のコードで完全なエージェントを作成します
- **組み込みのプランニング**: 「write_todos」ツールにより、エージェントはタスクを個別に分解できます
- **組み込みファイルシステム**: 読み取り/書き込み/編集/ls/glob/grep
- **サブエージェントのディスパッチ**: 「タスク」ツールは分離されたサブエージェントを作成します
- **自動要約**: 会話が長すぎる場合の自動要約

💡 **設計理念**: 「モデルが自己規制することを期待するのではなく、ツール/サンドボックス レベルで境界を強制します。」

#### DeerFlow Python · ByteDance

主な違い: ほとんどのフレームワークは「推論層」ですが、DeerFlow は「実行層」です。

- **スーパーバイザー + サブエージェント**: リード エージェントがタスクを分解し、並列実行のためにサブエージェントを派遣します。
- **Docker サンドボックス**: 各タスクは、実際のファイル システムと bash を使用して、分離されたコンテナーで実行されます。
- **スキル システム**: マークダウンでスキルを定義し、オンデマンドでロードします。
- **永続メモリ**: セッション間メモリ、非同期更新
- **ステートフル パイプライン**: LangGraph チェックポイントに基づいて、長時間のタスクを中断および再開できます。

💡 **独自の利点**: エージェントに実際に「コンピューター」を提供します。テキストを生成するだけでなく、ダウンロード可能な PPT、実行可能なコード、展開可能な Web ページも生成します。

## IV. パターン選定早見表

|解決したい問題 |推奨モード |クラシックモードに対応｜
| --- | --- | --- |
|同じ操作の複数の実装 | **戦略** |戦略パターン |
|異なる構成のエージェントを統合して作成 | **工場** |ファクトリーモード |
|ツール呼び出し前後の多層処理 | **責任の連鎖** |責任連鎖モデル |
|ツール実行後の複数のリスナー | **観察者** |オブザーバーパターン |
|コードを変更せずにツールをキャッシュ/再試行する | **デコレーター** |デコレータモード |
|さまざまな LLM プロバイダーの統合インターフェース | **アダプター** |アダプターモード |
|エージェント実行プロセスのスケルトンを定義する | **テンプレートメソッド** |テンプレートメソッドパターン |
|信頼できないコードの実行を隔離する | **サンドボックス** | — |
|オンデマンドで機能モジュールをロード | **スキル** | — |
|長時間のタスク中断の回復 | **チェックポイント** | — |
|ダイナミック合成システムプロンプト | **迅速な構成** | — |
|エージェントの状態遷移を正確に制御 | **ステート マシン** |ステートマシンモード |

詳しい読み方: [オープンクロー](https://github.com/openclaw/openclaw) · [エージェントスコープ](https://github.com/agentscope-ai/agentscope) · [DeepAgents](https://github.com/langchain-ai/deepagents) · [ディアフロー](https://github.com/bytedance/deer-flow)
