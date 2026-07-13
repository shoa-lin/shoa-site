---
translationKey: "ai-agent-engineering-patterns"
locale: "fr"
title: "Patrons d'architecture pour agents IA (II) : batir un systeme fiable"
description: "De Strategy, Factory et Chain of Responsibility a Sandbox, Checkpoint et State Machine : organiser un systeme d'agents IA pour le changement, le controle et la reprise."
publishedAt: "2026-04-09"
updatedAt: "2026-07-13"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-engineering-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

L'article précédent expliquait comment **fonctionne** l'agent : comment raisonner, appeler des outils, diviser et collaborer, et où placer les limites de mémoire et de sécurité. Mais lorsque vous commencez à le mettre en œuvre, la complexité passe de « que faire ensuite » à une autre question : **Comment organiser ces capacités dans un système qui peut être maintenu à long terme. **

Lorsqu’il s’agit de mise en œuvre, les questions sont souvent très spécifiques :

- Il existe trois outils de recherche : Tavily, Exa et Gemini. Comment l’agent peut-il ne pas se soucier de celui à utiliser ?
- Différents agents (finances, recherche, opérations) doivent être recherchés, mais les paramètres sont différents. Comment **unifier l'enregistrement des outils de gestion** ?
- L'agent doit effectuer la journalisation, la limitation du courant et la vérification des autorisations avant et après l'appel de l'outil. Pourquoi ne pas mélanger code métier et logique transversale ?
- Le contenu généré par l'agent doit être revu, formaté et traduit. Comment peut-il être intégré dans un pipeline de traitement ?

Il ne s’agit pas de « problèmes d’IA » abstraits, mais de nouvelles formes de problèmes classiques d’ingénierie logicielle dans les systèmes Agent. Cet article ne vous oblige pas à mémoriser 12 modèles ; l’objectif est d’abord de voir clairement quels changements et quels risques chaque modèle isole pour vous.

## Créez d'abord une carte d'ingénierie

Vous pouvez d’abord diviser les modèles suivants en trois catégories selon les problèmes qu’ils résolvent :

- **Remplacement et combinaison** : Stratégie, Usine et Adaptateur permettent de remplacer les modèles, les outils et les configurations d'agent au lieu d'être dispersés dans un grand nombre de jugements conditionnels.
- **Contrôle transversal** : la chaîne de responsabilité, l'observateur et le décorateur extraient les autorisations, les journaux, la limitation de courant, la mise en cache et l'audit du cœur de métier.
- **État et limites** : Sandbox, Checkpoint, Prompt Composition et State Machine gèrent les problèmes spécifiques à l'agent d'isolation, de récupération, de contexte et de cycle de vie.

Avec cette carte, lorsque l'on examine chaque modèle, l'accent n'est pas mis sur "comment ça s'appelle ?" mais "à quel type de changement ou de perte de contrôle mon système est-il confronté ?"

## 1. La nouvelle vie du modèle GoF classique dans Agent

### 01 Stratégie — L'âme de la sélection d'outils

**Définition classique** : définissez une famille d'algorithmes et encapsulez chacun d'entre eux afin qu'ils puissent être remplacés les uns par les autres.

**Scénario d'agent** : il existe plusieurs implémentations derrière la même opération de « recherche » : Tavily, Exa, Gemini. L’appelant ne doit pas savoir lequel utiliser.

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

💡 **C'est également la conception de base du service de recherche unifié**. Le mode stratégie rend l'expansion des liens de secours naturelle - pour ajouter une nouvelle source de recherche, implémentez simplement l'interface `SearchProvider` et ajoutez-la à la liste.

**Pratique du cadre** : **DeerFlow** L'agent principal sélectionne les sous-agents, ce qui est essentiellement une sélection de stratégie ; **AgentScope** `Toolkit.register_tool_function()` enregistre les outils - les outils sont des stratégies.

### 02 Factory — Création unifiée d'agent

**Définition classique** : encapsulez la logique de création de l'objet et l'appelant n'a pas besoin de connaître la classe spécifique.

**Scénario d'agent** : il existe plusieurs agents dans le système, chacun avec un modèle, une invite système et un ensemble d'outils différents. La logique de création ne doit pas être dispersée partout.

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

**Pratique du framework** : **DeepAgents** `create_deep_agent()` masque les détails de la compilation du graphique LangGraph ; **AgentScope** `ReActAgent()` masque la mémoire et l'initialisation du formateur ; La configuration d'exécution peut également déclarer une liste d'agents et créer des instances correspondantes en fonction des identifiants.

### 03 Chaîne de responsabilité — Pipeline d'appel d'outils

**Définition classique** : une demande est transmise le long d'une chaîne de gestionnaires, chaque gestionnaire décidant de la traiter ou de la transmettre au suivant.

**Scénario d'agent** : lorsqu'un agent appelle un outil, il doit passer par plusieurs couches de vérifications : autorisations → limitation de courant → journal → exécution → traitement des résultats.

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

💡 **La philosophie de conception du plug-in Hook** peut former une chaîne de responsabilité implicite : insérer une logique transversale avant de créer des mots d'invite et après les appels d'outils.

### 04 Observateur — accouplement libre déclenché par un événement

**Définition classique** : Lorsque l'état d'un objet change, tous les objets qui en dépendent sont automatiquement notifiés.

**Scénario d'agent** : une fois l'appel de l'outil terminé, plusieurs systèmes doivent le savoir : la file d'attente des erreurs doit être enregistrée, la surveillance doit être signalée et le moteur d'apprentissage doit analyser. Ils ne doivent pas être couplés les uns aux autres.

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

💡 **Le module d'apprentissage peut adopter l'architecture de l'observateur** : l'observateur après l'outil est appelé écoute des événements. Lors de l'ajout de fonctionnalités, il vous suffit d'enregistrer un nouvel observateur.

### 05 Décorateur — Améliorations non intrusives des fonctionnalités

**Définition classique** : ajoutez dynamiquement des responsabilités supplémentaires à un objet sans modifier son interface.

**Scénario d'agent** : ajoutez des tentatives, une mise en cache, une journalisation et une limitation de courant à l'agent, sans modifier le code de l'agent lui-même.

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

**Différence par rapport à la chaîne de responsabilité** : la chaîne de responsabilité est « pipeline » : la demande passe tour à tour par chaque processeur. Les décorateurs sont « enveloppés » : chaque couche de décorateurs s’enroule autour des fonctionnalités de base. L'effet est similaire, mais le décorateur est plus léger.

### 06 Adaptateur — Interface unifiée pour outils hétérogènes

**Définition classique** : Convertit l'interface d'une classe en une autre interface attendue par le client.

**Scénario d'agent** : différents fournisseurs LLM (OpenAI, Google, Wisdom) ont des formats d'API différents, et le code de l'agent ne devrait pas se soucier de ces différences.

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

**Pratique du framework** : **DeepAgents** `init_chat_model("openai:gpt-4o")` Une fonction s'adapte à tous les fournisseurs ; **OpenClaw** `zai/glm-5`, format `google/gemini-2.5-flash` unifié `fournisseur/modèle`.

### 07 Méthode modèle — Le squelette du processus d'exécution de l'agent

**Définition classique** : Définissez le squelette de l'algorithme dans la classe de base et reportez certaines étapes à l'implémentation de la sous-classe.

**Scénario d'agent** : le processus d'exécution de tous les agents est « recevoir des tâches → réfléchir → appeler des outils → traiter les résultats → retourner », mais la mise en œuvre spécifique de chaque étape est différente.

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

**Pratique du framework** : **AgentScope** `ReActAgent` remplace `think_and_act` ; **DeepAgents** `create_deep_agent()` renvoie le LangGraph StateGraph compilé.

## 2. Mode de conception technique unique de l'agent

Ce qui précède est le mappage du mode GoF classique dans Agent. Les modèles suivants sont davantage "Agent-native" - ​​​​peu courants dans les logiciels traditionnels, mais presque essentiels dans le développement d'agents.

### 08 Sandbox — Exécutez en toute sécurité du code non fiable

Le code/commandes générés par l'agent sont exécutés dans un **environnement isolé** et n'affectent pas le système hôte.

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

⚠️ **Ce n'est pas un mode GoF, mais c'est l'essentiel du système Agent** - permettre à l'Agent d'exécuter des commandes shell arbitraires sans sandboxing équivaut à confier le contrôle du système à une boîte noire.

**Framework Practice** : **DeerFlow** Chaque tâche s'exécute dans un conteneur Docker indépendant ; **DeepAgents** prend en charge le bac à sable distant (E2B) ; L'outil d'exécution **OpenClaw** dispose d'un mécanisme de liste verte.

### 09 Compétence — Module de capacité chargé à la demande

Les capacités de l'agent ne sont pas fixes, mais des compétences modulaires chargées à la demande. Tout comme les personnages du jeu équipés de différents livres de compétences.

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

💡 **Key Insight** : la compétence n'est pas seulement une "collection d'outils" : elle contient également des **directives d'utilisation** (instructions) qui indiquent à l'agent \*quand l'utiliser et comment l'utiliser\*. Par conséquent, `SKILL.md` doit non seulement écrire l'adresse de l'API, mais également la politique d'utilisation.

**Framework Practice** : **DeerFlow** Skill est un fichier Markdown ; **OpenClaw** Compétence = SKILL.md + script/hook facultatif.

### 10 Checkpoint — persistance et récupération des tâches longues

Les tâches de longue durée peuvent être interrompues (délai d'expiration, crash, limite actuelle de l'API) et doivent enregistrer l'état au niveau des nœuds clés pour prendre en charge la récupération à partir des points d'arrêt.

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

**Pourquoi l'agent est particulièrement nécessaire** : La nouvelle tentative des programmes traditionnels consiste à "l'exécuter à nouveau". L'agent ne peut pas réessayer à partir de zéro - LLM a déjà passé 30 secondes à réfléchir au plan et les 5 premières étapes ont été exécutées. La réexécution est un énorme gaspillage.

### 11 Composition de l'invite — Invite du système de construction en couches

L'invite système de l'agent n'est pas un morceau de texte codé en dur, mais le produit d'une **combinaison dynamique multicouche**.

> Invite système finale =
> Code de conduite de base
> + définition du rôle
> + Préférences utilisateur
> + Contexte actuel de la tâche
> + Guide d'utilisation des compétences équipées
> + Rappels d'études en attente
> + liste de description des outils

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

**Pratique du framework** : de nombreux environnements d'exécution injecteront dynamiquement du contenu pendant la phase de construction du mot d'invite ; **AgentScope** `sys_prompt + formateur` deux couches ; **DeerFlow** Combinaison dynamique de compétence + tâche + définition d'outil.

### 12 State Machine — Contrôle précis du cycle de vie de l'agent

Le processus d'exécution de l'agent est modélisé comme une machine à états finis et chaque état a des règles de transition claires.

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

**Pourquoi une machine à états est nécessaire** : Sans machine à états, les transitions d'état de l'agent sont dispersées dans divers if-else - "Si l'exécution échoue et le nombre de tentatives < 3, réessayez, sinon rétrogradez, expirez si la rétrogradation échoue" - ce type de logique devient rapidement un spaghetti.

**Pratique du framework** : **DeepAgents** La couche inférieure est LangGraph StateGraph ; Graphique d'état **DeerFlow** + mode superviseur ; **OpenClaw** Gestion du statut des tâches Cron (ok → erreur → réessayer → timeout).

## III. Comparaison de quatre frameworks

| Dimensions | OpenClaw | AgentScope | Agents profonds | Flux de cerfs |
| --- | --- | --- | --- | --- |
| **Positionnement** | Plateforme d'assistant personnel d'IA | Cadre d'agent universel | Harnais d'agent (SDK) | Harnais de super agent |
| **Langue** | Tapuscrit | Python | Python | Python (back-end) |
| **Couche inférieure** | Auto-recherche (Pi Agent) | Auto-recherche | LangGraph + LangChain | LangGraph + LangChain |
| **Mode principal** | Plugin + Crochet + Compétence | Agent ReAct + flux de travail | StateGraph + Outil | Superviseur + Bac à sable |
| **Bac à sable** | liste autorisée des administrateurs | Pas de | Bac à sable distant E2B | Conteneur Docker |
| **Multi-Agent** | Superviseur | Flux de travail + MessageHub | Sous-agent (outil de tâches) | Superviseur (Lead → sous) |
| **Mémoire** | Système de fichiers | InMemory + Base de données | Résumé automatiquement | Persistant + TIAMAT |
| **MCP** | mcporter | intégré | adaptateurs langchain-mcp | aucun |
| **Scénarios applicables** | Assistant quotidien, automatisation | Recherche, vérification de prototypes | Agent de codage, SDK | Tâches longues, production de contenu |

#### OpenClaw TypeScript · Plugin + crochet

Il ne s'agit pas d'un SDK Python traditionnel, mais d'une plateforme d'exécution. Modèles de conception de base : extension de plugin, chaîne de responsabilité Hook, adaptateur de canal, système de compétences.

- **Mode plugin** : les extensions tierces enregistrent les hooks et les outils via des plugins et sont faiblement couplées au noyau
- **Mode Hook** : `before_prompt_build`, `after_tool_call`, `agent_end` forment une chaîne de responsabilité implicite
- **Channel abstract** : interface unifiée pour les chaînes telles que Telegram, Discord, Feishu, etc. - Mode adaptateur
- **Système de compétences** : chargement des compétences basé sur Markdown - seuil de zéro code

💡 **Avantages uniques** : la compétence est définie en pur Markdown, avec un seuil de codage nul. Tout le monde peut écrire une compétence, aucun Python n'est requis.

#### AgentScope Python · Académie Alibaba Damo

Rigueur académique + parcours pratique d'ingénierie. Mode ReAct intégré, abstraction de la boîte à outils, orchestration du flux de travail, superposition de mémoire et prise en charge du protocole A2A.

- **ReAct intégré** : `ReActAgent` est un citoyen de première classe et fonctionne immédiatement
- **Résumé du Toolkit** : `Toolkit.register_tool_function()` - Usine + Stratégie
- **Workflow Orchestration** : le mode Pipeline combine plusieurs agents
- **Superposition de mémoire** : InMemory + Database + ReMe (mémoire à long terme améliorée)
- **Protocole A2A** : norme de communication agent à agent - collaboration décentralisée

💡 **Avantages uniques** : la prise en charge du protocole A2A permet aux agents d'interagir entre les systèmes et les frameworks. La capacité intégrée de réglage fin du modèle (Agentic RL) est également unique.

#### DeepAgents Python · LangChain Officiel

Philosophie de conception : Faites confiance à LLM et imposez des contraintes au niveau des outils. Agent Harness fonctionne dès la sortie de la boîte.

- **create\_deep\_agent factory** : Créez un agent complet avec une seule ligne de code
- **Planification intégrée** : l'outil `write_todos` permet à l'agent de décomposer les tâches de manière indépendante
- **Système de fichiers intégré** : lecture/écriture/édition/ls/glob/grep
- **Répartition des sous-agents** : l'outil `tâche` crée des sous-agents isolés
- **Résumé automatique** : Résumé automatique lorsque la conversation est trop longue

💡 **Philosophie de conception** : "Imposer des limites au niveau de l'outil/du bac à sable, sans attendre du modèle qu'il s'auto-surveille."

#### DeerFlow Python · ByteDance

Différence fondamentale : la plupart des frameworks sont la "couche d'inférence", DeerFlow est la "couche d'exécution".

- **Superviseur + Sous-Agent** : L'agent principal décompose les tâches et répartit les sous-agents pour une exécution parallèle
- **Docker Sandbox** : chaque tâche s'exécute dans un conteneur isolé, avec un vrai système de fichiers et bash
- **Skill System** : Markdown définit les compétences et les charge à la demande
- **Mémoire persistante** : mémoire inter-sessions, mise à jour asynchrone
- **Stateful Pipeline** : basé sur les points de contrôle LangGraph, les tâches longues peuvent être interrompues et reprises

💡 **Avantages uniques** : donnez réellement à l'agent "un ordinateur" - ne vous contentez pas de générer du texte, mais générez également des PPT téléchargeables, du code exécutable et des pages Web déployables.

## IV. Aide-mémoire pour choisir un patron

| Le problème que vous souhaitez résoudre | Mode recommandé | Correspondant au mode classique |
| --- | --- | --- |
| Implémentations multiples de la même opération | **Stratégie** | Modèle de stratégie |
| Créez de manière unifiée des agents avec différentes configurations | **Usine** | Mode usine |
| Traitement multicouche avant et après l'appel de l'outil | **Chaîne de responsabilité** | Modèle de chaîne de responsabilité |
| Plusieurs écouteurs après l'exécution de l'outil | **Observateur** | Modèle d'observateur |
| Mettre en cache/réessayer l'outil sans changer le code | **Décorateur** | Mode décorateur |
| Interface unifiée pour différents fournisseurs LLM | **Adaptateur** | Mode adaptateur |
| Définir le squelette du processus d'exécution de l'agent | **Méthode modèle** | Modèle de méthode de modèle |
| Isoler l'exécution de code non fiable | **Bac à sable** | — |
| Modules de capacité de charge sur demande | **Compétence** | — |
| Récupération après interruption de tâche longue | **Point de contrôle** | — |
| Invite système de composition dynamique | **Composition rapide** | — |
| Contrôler avec précision les transitions d'état de l'agent | **Machine d'état** | Mode machine à états |

Lectures complémentaires : [OpenClaw](https://github.com/openclaw/openclaw) · [AgentScope](https://github.com/agentscope-ai/agentscope) · [DeepAgents](https://github.com/langchain-ai/deepagents) · [DeerFlow](https://github.com/bytedance/deer-flow)
