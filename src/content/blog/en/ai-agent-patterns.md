---
translationKey: "ai-agent-patterns"
locale: "en"
title: "AI Agent Design Patterns, Part I: Reliable Operation"
description: "A practical map for reasoning, tool use, collaboration, memory, and the safety controls that keep an AI agent reliable in production."
publishedAt: "2026-04-09"
updatedAt: "2026-07-13"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Many articles about AI agents collapse two questions into one: **how to make a model complete a task**, and **how to engineer a reliable system around it**. The result is a long list of terms but little clarity about which problem to solve first.

This article addresses the first question: how an agent reasons, acts, collaborates, and remains controllable in a real environment. Think of it as a map of the task, starting with a single agent's reasoning loop, then moving through multi-agent collaboration, memory and knowledge, and finally the safety and fault tolerance required in production.

You do not need to memorize pattern names. Each section asks a simpler question: **what uncertainty does this kind of task need to remove?** It may be the next action, the right owner, what to remember, or how to avoid irreversible consequences.

## Layer One: Core Single-Agent Patterns

### 01 ReAct — Reasoning and action intertwined

**Paper**: Yao et al., 2022 — _ReAct: Synergizing Reasoning and Acting in Language Models_

💡 Core idea

Don't think about it first and then do it, think about it while doing it. LLM alternately generates **Thought** and **Action** and continues reasoning after observing the results.

> Thought: The user wants to know the weather in Beijing today. I need to search.
> Action: search("Beijing weather April 9, 2026")
> Observation: Sunny, 18°C, north wind level 3
> Thought: I've got the weather data, so I can answer.
> Answer: It is sunny in Beijing today, with a temperature of 18°C ​​and a north wind of level 3.

**Why it works**:

- **Reasoning guides action**: Each action step has a Thought explaining "why you should do this" to reduce blind attempts.
- **Actions feed back reasoning**: Observation provides real-world information to make subsequent reasoning more accurate
- **Explainability**: The Thought link itself is a natural "decision log"

**Applicable scenarios**: Tasks that require multi-step reasoning + tool invocation (question and answer, analysis, debugging)

**Limitations**: Long chains are prone to "deviation", and subsequent Observations may deviate from the original target. Need to cooperate with Reflection or Planning mode to constrain the direction.

### 02 Plan-and-Execute — Think clearly before taking action

💡 Core idea

Generate a complete execution plan and then execute it step by step instead of watching it step by step. Different from ReAct's "thinking and doing", **planning** and **execution** are separated into two clear stages.

> [Planning Phase]
> User: Help me analyze the latest developments of competing product HireGo
>Plan:
> 1. Search HireGo official website to obtain product information
> 2. Search Google Play / App Store reviews
> 3. Search technology media for relevant reports in the last 30 days
> 4. Search for recruitment updates on LinkedIn (to determine the direction of team expansion)
> 5. Based on the above information, generate a competitive product intelligence briefing
>
> [Execution phase]
> Perform Step 1 → Observe → Perform Step 2 → Observe → ... → Final Report

**Key Design**:

- **The plan can be adjusted dynamically**: If new clues are found when performing step 2, you can go back and supplement the search in step 1
- **Complementary to ReAct**: Plan-and-Execute provides "global vision", ReAct provides "local flexibility"
- **Often mixed in actual projects**: first generate a coarse-grained plan, and execute it in ReAct mode in each step

**Applicable scenarios**: Multi-step tasks with clear processes (research reports, data processing pipelines, code refactoring)

**Limitations**: The initial plan may not be perfect; if the environment changes drastically, the static plan will become outdated.

### 03 Reflection — Looking back after finishing

💡 Core idea

Let the Agent **evaluate its own output** and correct itself when it finds deficiencies. This may be the most "human" mode - finish a problem, check it again and find that you made a mistake, and then correct it.

> [First round output]
> "NVIDIA's 2026 Q1 revenue is US$28 billion, a year-on-year increase of 78%"
>
> [Self-reflection]
> Wait, let me verify: 28 billion vs 26 billion in Q1 last year...
> 280/260 - 1 = 7.7%, not 78%. 78% is year over year vs 2024 Q1.
> I should clearly label the comparison baseline.
>
> [Correction output]
> "NVIDIA's 2026 Q1 revenue was US$28 billion, a year-on-year increase of 7.7% (quarter-on-quarter) and a year-on-year increase of 78% (year-on-year)"

**Andrew Ng’s classic case**: Let LLM write the code → run the test → feed the error back to LLM → LLM correct the code → test again. This cycle can be repeated multiple times until passed.

**Implementation Points**:

- Feedback signals can be **external** (test results, user feedback, tool return values) or **internal** (LLM self-assessment)
- The frequency of reflection must be controlled: reflecting every time will waste time, only reflect at key nodes (after the code is written and the report is generated)
- A clear "completion standard" is required, otherwise the Agent will "reflect" in an infinite loop

**Applicable scenarios**: Code generation, writing, data analysis - any "quality is important" task

### 04 Tool Use — Let Agent grow arms and legs

💡 Core idea

LLM itself is just a text generator that allows it to operate on real-world tools through **Function Calling / Tool Use**. This is the **infrastructure** of all Agent systems - without Tool Use, there would be no Agent.

> User: "Create a scheduled reminder for me to remind me of a meeting at 9 am tomorrow morning"
>
> LLM internal decision-making:
> Need to call → cron_schedule(
> message: "Reminder: Meeting at 9 o'clock",
> time: "2026-04-10T09:00:00+08:00"
> )
>
> → Call successful → "Reminder has been set: 9:00 tomorrow — to remind you of the meeting"

**Classification of Tools**:

| Categories | Examples | Characteristics |
| --- | --- | --- |
| **Information retrieval** | web\_search, web\_fetch, read\_file | Read-only, no side effects |
| **Action Execution** | send\_message, write\_file, exec | There are side effects, please be careful |
| **Interactive Tools** | browser, message, canvas | Two-way communication |
| **Calculator** | calculator, code\_interpreter | Deterministic output |

**Engineering Practice**:

- **The quality of the tool description determines the quality of the call**: Whether LLM can correctly select the tool depends 90% on whether the tool description is well written.
- **Principle of Least Privilege**: Agent only needs the tools it needs for its current task, don’t give them all at once
- **Error handling is the core**: Tool call failure is the norm, and the Agent must be able to handle failures gracefully (retry, fallback, reporting)

### 05 Chain-of-Thought & Tree-of-Thought

**Chain-of-Thought**: Ask LLM to "write out the thinking process" instead of giving the answer directly.

> Bad practice: "The answer is 42" (black box)
> Good practice: "Let x be..., substitute into the formula to get..., so the answer is 42" (the process is visible)

This is not an independent Agent mode, but the underlying infrastructure of all modes - Thought in ReAct, Plan in Plan-and-Execute, and evaluation in Reflection all rely on CoT.

**Tree-of-Thought**: An upgraded version of CoT - not just one chain of thinking, but **explore multiple paths and choose the best**.

> Question: "How to reduce the search API latency from 2s to 200ms?"
>
> Path A: Change to faster API provider → Cost increase 3x → Not recommended
> Path B: Add cache layer → Unknown hit rate → Need to evaluate
> Path C: Concurrently request multiple APIs and get the fastest return → Increased complexity → Worth trying
>
> Evaluation: Path C may achieve the goal if the cost is controllable → Select path C

**Applicable scenarios**: Complex decisions that require exploring multiple solutions (architecture design, solution selection)

## Layer Two: Multi-Agent Collaboration Patterns

When a single Agent is not capable enough, multiple professional Agents need to collaborate. This enters the realm of orchestration.

### 06 Supervisor — Supervisor assigns tasks

A "supervisor agent" is responsible for understanding user intentions, breaking down tasks and distributing them to professional agents for execution.

> User: "Help me make a weekly report on the AI industry"
>
> Supervisor Agent:
> → Information Collection Agent: "Collect major news in the AI industry this week"
> → Financial Agent: "Collect the stock price trends of AI-related companies this week"
> → Research Agent: "Collect important papers this week"
> ← Summarize the output of all Agents → Integrate into weekly reports → Send to users

💡 **A common practice** is for a supervisor agent to coordinate specialized agents such as information gathering, finance, and research.

**Advantages**: Clear responsibilities, each Agent focuses on its own area
**Disadvantages**: Supervisor is a single point bottleneck; if the task decomposition is wrong, the entire pipeline will go off track.

### 07 Hierarchical — Hierarchical management

An upgraded version of Supervisor - **Multi-level chain of command**.

```text
协调 Agent
├── 产品负责人 Agent — 负责产品相关任务
│   ├── 竞品分析 Agent — 数据搜集
│   └── 用户研究 Agent — 数据搜集
├── 技术负责人 Agent — 负责技术任务
│   ├── 前端开发 Agent
│   └── 后端开发 Agent
└── 运营负责人 Agent — 负责运营任务
    ├── 数据分析 Agent
    └── 内容创作 Agent
```

**Difference from Supervisor**: Supervisor is "flat" - one boss directly manages everyone. Hierarchical is "tree-shaped" - with an intermediate management layer that can handle larger tasks.

### 08 Swarm — Decentralized Bee Swarm

There is no central control, and collaboration between agents is completed through **Handoff**.

> User: "I want to book a flight ticket from Beijing to Shanghai"
>
> Routing Agent:
> Analyze Intent → Identified as "Flight Booking"
> → Hand card to Ticket Agent
>
> Ticket Agent:
> Search for flights → Found that you need to log in
> → Give the hand card to the authentication agent
>
> Authentication Agent:
> Guide users to log in → Login successful
> → Hand Card Return Ticket Agent
>
> Ticket Agent:
> Continue booking process → Complete

**Handoff**: After Agent A completes its part, it passes the context to Agent B to continue. There is no global manager, and each Agent is only responsible for its own responsibilities.

**Advantages**: Flexible, scalable, no single point bottleneck
**Disadvantages**: The process is difficult to track; if the handoff logic is not designed properly, tasks will "ping-pong" between Agents.

**Typical implementation**: The OpenAI Swarm framework is designed based on this pattern.

### 09 Blackboard — Shared Blackboard

Multiple Agents work around a shared blackboard, each writing information on it and reading other people's information.

```text
[共享黑板]
┌─────────────────────────────────┐
│ 用户需求: "做一个天气预报 App"    │
│                                 │
│ [搜索 Agent 写入]               │
│ 天气API: OpenWeatherMap 免费    │
│ 地理API: Nominatim              │
│                                 │
│ [设计 Agent 写入]               │
│ 技术栈: React + Node.js        │
│ 架构: 三层（UI/API/数据）        │
│                                 │
│ [代码 Agent 读取黑板后开始编码]  │
│ ...                            │
└─────────────────────────────────┘
```

**Difference from Supervisor**: Supervisor is "command-driven" - the supervisor tells who does what. Blackboard is "data-driven" - whoever sees information they can process proactively processes it.

### 10 Pipeline / DAG — Pipeline

The task is broken down into fixed stages, each stage is processed by an Agent, and the data flows through it in sequence.

> Input → [Collect Agent] → [Analyze Agent] → [Write Agent] → [Audit Agent] → Output
> Raw data Structured analysis Report generation Quality check

- Each stage can be processed in parallel (if there are no dependencies between stages)
- Pass data between stages through clear interfaces
- Easy to monitor and debug (the input and output of each stage are determined)

**Limitations**: Poor flexibility - the process is fixed and cannot be dynamically adjusted based on intermediate results.

## Layer Three: Memory and Knowledge Patterns

The Agent has no "real memory" and every conversation starts fresh. The memory mode solves the problem of information retention across sessions.

### 11 Short-term memory—Current conversation context

**Essence**: It is the context window of LLM.

> Current conversation:
> User: "Help me analyze NVIDIA"
> Agent: [Calling the search tool to obtain data]
> User: "What about AMD?" ← Agent knows via short-term memory that "analysis" refers to financial analysis

**Engineering Challenge**:

- **Limited context window**: Long conversations will "forget" the previous content (GPT-4 128K, Gemini 1M, GLM 128K)
- **Noise Accumulation**: The longer the conversation, the more irrelevant information, which affects the quality of reasoning
- **Cost**: Number of Tokens = money, long context = high cost

**Engineering Practice**: Conversation compression (regular summarization), sliding window (only the most recent N rounds are retained), retrieval enhancement (retrieval of relevant fragments on demand)

### 12 Long-term memory – knowledge retention across sessions

Let the Agent retain information between sessions - remembering who you are, what you've done, and your preferences.

| Method | Principle | Advantages | Disadvantages |
| --- | --- | --- | --- |
| **File Memory** | Read and write MEMORY.md / .learnings/ | Simple, transparent, auditable | Coarse-grained, manual maintenance |
| **Vector memory** | Information is stored in the vector database after embedding | Semantic retrieval, automatic association | Additional infrastructure is required |
| **Structured Memory** | Knowledge graph, relational database | Accurate query, strong reasoning ability | High construction cost |

💡 **A common document memory practice**: Use long-term memory documents to save stable facts, save original context as records filed by date, and then use learning logs to accumulate errors and improvements.

### 13 RAG — Retrieval enhancement generation

Instead of letting LLM "remember" all knowledge, it retrieves relevant information from an external knowledge base when needed and injects it into the prompt words.

> User: "What did we discuss on 2026-04-02?"
>
> → Vector database search: query="2026-04-02 Discussion"
> → Retrieved: relevant fragments of memory/2026-04-02.md
> → Inject into prompt: "Answer user questions based on the following context: [retrieval results]"
> → LLM generates answers

💡 **RAG is a "search engine" in memory mode** - it does not solve "how to save", but "how to quickly find the required information".

## Layer Four: Production Engineering Patterns

Between academic prototypes and usable production systems lies engineering practice.

### 14 Guardrails — Safety Guardrails

Set **boundary constraints** to the Agent's behavior to prevent it from doing things it shouldn't do.

```text
[输入护栏]                          [输出护栏]
用户输入 → ┌──────────┐ → LLM → ┌──────────┐ → 最终输出
          │ 过滤敏感词  │         │ 验证事实   │
          │ 检测注入    │         │ 检查格式   │
          │ 限制话题    │         │ 过滤有害内容│
          └──────────┘         └──────────┘
```

| Layers | Examples |
| --- | --- |
| **Input verification** | Detect prompt injection, filter sensitive instructions |
| **Tool Permissions** | exec command whitelist, file writing operation requires confirmation |
| **Output Audit** | Fact checking, format validation, sensitive information filtering |
| **Behavioral Constraints** | Restrict the Agent to only access specific data sources and cannot send external messages |

### 15 Human-in-the-Loop — People in the Loop

Agent is not completely autonomous and **key decisions require human confirmation**.

> Agent: "I am going to delete the /tmp/old-data/ directory, with a total of 342 files. Confirm the deletion?"
> Human: [Confirm] / [Deny] / [Modify: Only delete .log files]

| Type of decision | Degree of automation | Reason |
| --- | --- | --- |
| Read files and search | Fully automatic | No side effects |
| Write file to specified location | Semi-automatic | May overwrite existing content |
| Send message to others | Requires confirmation | Has external influence |
| Delete data | Confirmation required | Irreversible operation |
| Execute shell commands | Classified by risk | May affect system security |

**Engineering implementation**: The approval gate is a typical implementation of Human-in-the-Loop.

### 16 Fallback & Retry — Fault tolerance and downgrade

Every step of the Agent may fail, and the system must be able to handle failures gracefully.

```text
搜索请求 → web_search(Gemini)
              ↓ 429 限流
           unified-search(Tavily)
              ↓ 无结果
           unified-search(Exa)
              ↓ 全部失败
           返回提示: "搜索服务暂时不可用，请稍后重试"
```

💡 **A robust search layer** can automatically switch to backup sources when the primary search source has no results and provide users with meaningful downgraded results.

**Fault Tolerant Design Principles**:

1. **Fail Fast**: Don’t wait too long for an operation that is destined to fail.
2. **Meaningful downgrade**: The fallback solution cannot be "cannot do anything", but must provide some functions.
3. **There is an upper limit for retries**: Infinite retries = infinite loop, the maximum number of retries must be set
4. **Record the reason for failure**: Write the failure into a structured error queue for subsequent analysis and improvement.

### 17 Self-Improvement — Self-evolution

Agents can learn from their own mistakes and continuously improve.

```text
执行任务 → 出错 → 记录错误 → 分析模式 → 提炼规则 → 下次避免
                                                    ↑
                                              注入到行为中
```

**A typical implementation**:

- Automatically detect errors after tool invocation and write to structured error queue
- Inject pending learning reminders before building prompt words
- Archive errors through regular review, detect recurring patterns, and promote rules to stable configurations

💡 **Key Insight**: The core of self-evolution is not "learning" per se - LLM inherently learns from context. The core is to make learning continuous, systematic and automated instead of relying on manual reminders.

## Pattern Map

```text
[生产级工程层]
├ Guardrails
├ Human-in-Loop
├ Fallback
└ Self-Improvement

[多 Agent 编排层]
├ Supervisor
├ Hierarchical
├ Swarm
├ Blackboard
└ Pipeline

[记忆与知识层]
├ 短期记忆
├ 长期记忆
└ RAG

[单 Agent 核心层]
├ ReAct
├ Plan-Execute
├ Reflection
└ Tool Use · CoT / ToT
```

A complete Agent system usually uses: **ReAct** (calling tools while thinking), **Tool Use**, **Supervisor** (coordinating professional Agents), **File Memory**, **Guardrails**, **Human-in-the-Loop**, **Fallback** and **Self-Improvement**. Together, these patterns form a functioning, governable system.

## Choosing a Pattern

| Task characteristics | Recommended mode | Reasons |
| --- | --- | --- |
| Simple Q&A | **ReAct + Tool Use** | Can be solved in one or two steps, no complicated planning required |
| Multi-step research | **Plan-and-Execute + ReAct** | Requires global vision, but flexibility at each step |
| Code generation | **Tool Use + Reflection** | Need to actually run the code and correct it |
| Multi-field collaboration | **Supervisor / Hierarchical** | Requires professional division of labor |
| High concurrency processing | **Swarm / Pipeline** | No central coordination required, can be parallelized |
| Knowledge intensive | **RAG + Long Term Memory** | Need to retrieve from large amounts of knowledge |
| Security sensitive | **Guardrails + Human-in-Loop** | Constraints and confirmations required |
| Long-term operation | **Self-Improvement + Fallback** | Need to learn from mistakes and need fault tolerance |

## Summary: Choose the Task Pattern Before the Code Structure

At this point, you should be able to determine how an Agent should work: whether it needs to be thought about while doing it, or whether it needs to be planned and then executed; whether it needs to be coordinated by a supervisor, or whether it needs to be handed over autonomously by a professional Agent; what needs to be memorized, and what key actions need to be stopped for confirmation.

These choices determine the behavioral boundaries of the system. The next step is to organize these capabilities into replaceable, observable, and recoverable code structures.

## Next: AI Agent Engineering Design Patterns

The next article will no longer discuss what Agent should do, but will discuss engineering implementation: how to replace tool providers, how to condense cross-cutting logic, how to recover long tasks, and how to use classic software design patterns to make the Agent system more stable and easier to evolve.
