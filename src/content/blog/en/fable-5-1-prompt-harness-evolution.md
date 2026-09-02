---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "en"
title: "From Fable 5 to Fable 5.1: The System Prompt Is Becoming an Agent OS"
description: "A comparison of two Claude runtime prompt generations, covering structural changes in Memory, Past Chats, Skills, tool routing, safety governance, and the future of agent harnesses."
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## The conclusion first

Anthropic released Claude Fable 5.1 on September 1, 2026. Most discussion has focused on model capability, pricing, and benchmarks. I am more interested in something that looks less exciting but reveals much more about the product direction: **the System Prompt and Runtime Prompt used when Claude operates inside the real product.**

I compared the archived full runtime prompt for Fable 5 from June 9, 2026 with a Fable 5.1 runtime prompt snapshot obtained on September 2, 2026. The former is about 1,580 lines and 126,943 bytes; the latter is 2,195 lines and 275,723 bytes. The number of tool definitions also rises from 18 to 44.

That does not mean the prompt merely “doubled.” Much of the file size comes from tool schemas, examples, and descriptions of the dynamic runtime environment. **Length is not intelligence, and it is not product capability.** The structure is what matters:

> Fable 5 was already an agent with tools, Skills, MCP, and Artifacts attached. Fable 5.1 starts organizing memory, past conversations, capability discovery, output routing, permissions, and safety governance into a more complete agent runtime.

In other words, Claude’s surrounding harness is moving from “give the model some tools” toward “give the model an operating system.”

## First, define the comparison boundary

This article does not compare model weights, training data, or Anthropic’s server-side source code. It compares two observable **prompt and runtime configuration snapshots**.

Anthropic’s public System Prompt pages primarily show the core behavioral instructions used on claude.ai and the mobile apps. A full runtime snapshot also includes the tool definitions available in that session, Skills, filesystem rules, network permissions, user-context placeholders, and product-routing policy. I therefore refer to the complete package as a **Runtime Prompt Bundle**.

This comparison can say quite a lot about how the product organizes capabilities around the model. It cannot, by itself, tell us how much the base model’s reasoning improved. Model capability and harness capability must be evaluated separately.

## The main changes at a glance

| Dimension | Fable 5 | Fable 5.1 | Structural change |
| --- | --- | --- | --- |
| Memory | A short description of memory access | Full rules for file categories, extraction, reads and writes, versions, privacy, and application | From a feature description to a governed data plane |
| Past Chats | No independent past-conversation retrieval layer | `conversation_search`, `recent_chats`, and `read_conversation` | Compressed memory is separated from source evidence |
| Tool count | 18 tool definitions | 44 tool definitions | A general toolbox becomes a broader capability interface |
| Capability extension | Skills and MCP Apps | Skills, Plugin Catalog, and MCP Apps | Static configuration becomes discovery and installation |
| Output form | Text, files, Artifacts, maps, and related outputs | Adds charts, comparison cards, step cards, quizzes, translation, products, links, and other typed outputs | Output moves from strings toward routable UI types |
| Output routing | Scattered across individual tool instructions | Explicit priority among MCP, files, and the Visualizer | The harness starts acting as a capability router |
| Work visibility | No general progress-update rule | Brief updates during long tool runs, followed by a complete final result | The product explicitly governs long-task experience |
| Writing format | Strong suppression of lists, headings, and bold | Use the minimum formatting that the complexity actually needs | The prompt is recalibrated around new model defaults |
| Search behavior | Already verifies time-sensitive information | Fast-moving products, models, and tools must be searched even when the model “recognizes” them | Familiarity is no longer accepted as evidence of freshness |
| Safety and privacy | Already contains substantial refusal and wellbeing rules | Adds finer-grained child safety, copyright continuity, memory privacy, deletion semantics, and conversation-ending rules | Safety moves from output filtering toward lifecycle governance |

## Change one: Memory grows from two sentences into a filesystem

The Memory section in Fable 5 is extremely thin. It says Claude can receive memories derived from previous conversations and notes whether the user has enabled the feature. It describes the existence of Memory, but not how memories are created, updated, removed, or separated from one another.

Fable 5.1 instead models Memory as a persistent filesystem with at least five content classes:

- `/profile.md` for relatively stable identity and role information;
- `/topics/` for habits, preferences, and recurring discussion domains;
- `/areas/` for ongoing projects, responsibilities, and decisions;
- `/people/` for relationship context relevant to the current question;
- `/preferences.md` for how the user wants Claude to answer and collaborate.

The design goes far beyond filenames. The new rules define a background memory pass, provenance labels such as `[stated]`, read-before-write behavior, version conflicts, append versus replace, whole-file deletion, sensitive-data boundaries, and when an existing memory may or may not be brought into a response.

```text
Conversation completes
   ↓
Background extraction of durable facts
   ↓
Classification, deduplication, privacy filtering, version merge
   ↓
Persistent memory files
   ↓
Relevance-based retrieval for a future question
   ↓
Inject only the context that materially changes the answer
```

This is not simply “embed the chat history and run Top-K retrieval.” It is closer to a **context database** with schemas, provenance, lifecycle, and access policy.

My conclusion is that competition in agent memory will move from “can it remember?” to “what does it remember, why should we trust it, who can modify it, when does it expire, and how can it be withdrawn?” Vector retrieval is only one implementation detail inside that system.

## Change two: Past Chats and Memory become separate context planes

Fable 5.1 adds a dedicated set of past-conversation tools: `conversation_search`, `recent_chats`, and `read_conversation`. This is more than an extra Memory feature. It acknowledges an architectural distinction between two types of information:

- **Memory stores compressed durable claims** for efficient reuse.
- **Past Chats preserve the original conversational evidence** for reconstruction and verification.

The prompt explicitly tells Claude to distinguish what the user actually said or decided from what Claude merely suggested. If an old conversation contains only an assistant proposal, the next conversation must not promote it into a user decision. If the discussion was hypothetical, compression must not turn the hypothesis into fact.

This addresses a central problem in every long-term memory system: **compression improves usability but removes evidence.**

A more reliable architecture therefore does not force one universal memory store to do every job:

```text
Memory = reusable conclusions
Past Chats = traceable evidence
Current Session = the task state unfolding now
```

A mature agent must do more than remember. It must be able to explain where a memory came from and whether it was stated by the user, verified by a tool, or inferred by the model.

## Change three: Skills, Plugins, and MCP form a capability supply chain

Fable 5 already had Skills and MCP Apps. It knew to read the relevant `SKILL.md` before creating a document, spreadsheet, presentation, or code artifact, and it knew to prefer a connected MCP when accessing an external service.

Fable 5.1 retains that structure and adds Plugin and Skill catalogs, including search, recommendation, and installation paths. The new capability layer can be understood as follows:

- A **Skill** packages experience, rules, and method for a class of tasks.
- A **Plugin** combines tools, commands, and Skills into a distributable capability bundle.
- **MCP** connects external data, systems, and real-world authority.
- A **tool schema** exposes a concrete action to the model.
- A **router** decides which capability class should handle the current task.

The rise from 18 to 44 tool definitions is not merely “26 more functions.” The new tools cluster around several themes: memory CRUD, past-chat retrieval, Plugin and Skill discovery, research suggestions, and structured UI for charts, comparisons, steps, translation, quizzes, products, and links.

This looks increasingly like conventional software layering. A model does not need to retain every work method permanently, and it should not directly hold every external permission. Capabilities can instead be discovered, loaded, authorized, invoked, and removed.

## Change four: The prompt now counter-calibrates model behavior

Fable 5’s prompt worked hard to suppress headings, lists, and bold text because the model at the time tended to produce overly formatted, template-like answers. Fable 5.1 relaxes that rule: lists are appropriate when the content is multifaceted, and formatting should be limited to what improves clarity.

This is not merely a change in product taste. The model’s default behavior changed. Anthropic’s Fable 5.1 prompting guide says the new model is less likely than Fable 5 to use headings, lists, and bold. Keeping the old anti-formatting prompt can therefore produce dense walls of prose.

The same compensating relationship appears in two other places:

- Fable 5.1 gives fewer unsolicited progress updates during long tool chains, so the new prompt asks for a short update every few tool calls.
- At lower effort, Fable 5.1 is more likely to answer from existing knowledge instead of searching, so the new prompt strengthens verification rules for fast-moving products, models, and tools.

This is an important lesson for prompt engineering: **a system prompt is not a one-time product specification; it is a controller for model behavior.** When the model changes, the old prompt may still run, but it may overcompensate and make the new model worse.

A mature team should not use one “universal prompt” for every model. It should observe failure modes through evals and apply the smallest calibration needed for the current model.

## Change five: Safety moves from “what may be answered” to state and data governance

Fable 5 already contained extensive safety policy. The important change in Fable 5.1 is not simply a longer prohibition list. Safety rules now extend across the interaction lifecycle.

The new prompt addresses how later requests inherit state after a refusal; whether copyright boundaries persist when a request is narrowed or reworded; which information may never enter long-term memory; whether deleting one memory also requires deleting conclusions derived solely from it; when sensitive memories may be read; how to confirm a request to end a conversation; and whether a conversation may be terminated in the presence of abuse, self-harm risk, or potential violence.

These rules govern more than final text. They govern:

- whether data may be stored;
- which provenance label it receives;
- whether it may be reused later;
- whether the user can withdraw it;
- how side effects from tools are constrained;
- how conversation state changes the next decision.

Safety is therefore evolving from a classifier around an answer into a policy engine inside the agent runtime.

## What did not fundamentally change

It is useful to avoid calling every detail revolutionary. Fable 5 already included persistent Artifact storage, MCP connectors, Skills, file creation, computer use, web search, image search, and typed map output. It was not a text-only chatbot, and Fable 5.1 did not invent the agent from scratch.

The real upgrade is that Fable 5.1 gives those existing components clearer context categories, evidence recovery, capability catalogs, output routing, process feedback, and governance rules.

The transition is therefore from “many components exist” to “the components now have operating-system-like responsibility boundaries.”

## My summary: four planes are taking shape

Abstracting the changes, I think Claude’s runtime can now be described as four planes:

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

Fable 5 was primarily expanding capability. Fable 5.1 starts investing much more seriously in context and state governance.

I now prefer this formula for understanding an agent product:

> **Agent product capability = Model × Context × Capability × State Governance**

This is multiplication, not addition. A strong model with wrong context still fails. A tool-rich product with uncontrolled permissions cannot enter an enterprise. Rich memory without provenance and deletion accumulates contamination. A complete workflow without verifiable feedback merely lets the agent make mistakes more automatically.

## Where this is heading

### 1. The monolithic system prompt will split into modular policy

We can still inspect a Runtime Prompt Bundle of more than two thousand lines today, but many of those rules should not remain natural-language text permanently injected into a model. They will gradually move into versioned policy, Skills, routers, permission settings, and task-scoped instructions.

Prompts will not disappear. They will retreat from “the text that carries every rule” to “an interface that helps the model understand the current goal and boundary.”

### 2. Context engineering will become state engineering

The earlier question was how to fit more context into the window. The more important questions will be who owns a state, which version is current, which facts have expired, how a rollback works, and how an external action can be proven.

Memory, Past Chats, Session, Tool Trace, and external-system state will be modeled separately. Agent context will increasingly resemble databases and event streams rather than an ever-growing prompt.

### 3. More constraints will move from prompts into protocols

Fable 5.1 also introduces turn-scoped system messages, thinking-block binding, content provenance, and per-message effort. These features point in the same direction: important constraints are beginning to be represented directly by APIs and runtimes rather than depending on the model to “remember the rule.”

Anything that can be guaranteed by a type system, permission system, version number, or protocol should eventually stop existing only as prompt text.

### 4. Agent output will become typed results rather than text

Many of the additions among the 44 tools are not tools for taking action. They are output components for charts, cards, steps, quizzes, translation, and product lists. The model’s final product is moving from a Markdown string toward a Typed Result that an application can consume directly.

Future frontends will not only render an answer. They will select an interactive UI based on the result type and convert the next user interaction back into state for the following turn.

### 5. Models and harnesses will be trained and iterated together

The most consequential long-term trend is that model and harness are no longer independent products. Post-training will increasingly adapt models to particular tool protocols, progress reporting, editing patterns, memory structures, and permission boundaries. The harness will then be recalibrated through prompts, routers, and evals in response to the new model’s failure modes.

The reversal of formatting guidance from Fable 5 to Fable 5.1 is a small but clear example: when the model’s default behavior changes, the surrounding controls must change with it.

The final competition will not be only about who owns the strongest base model. It will be about who owns the richest real environment, the highest-quality task trajectories, the most reliable feedback signals, and a closed loop that feeds those signals back into both model and harness development.

## What this means for agent builders

First, do not mistake a system prompt for product architecture. A prompt can describe a boundary, but reliable boundaries still require permissions, schemas, versions, idempotency, audit, and evals.

Second, do not reduce Memory to a vector database. Long-term memory is a data-governance problem first and a retrieval problem second.

Third, do not evaluate only the final answer. For a tool-using agent, the more important questions are whether the trajectory was correct, side effects were controlled, failures were recoverable, and evidence remained traceable.

Fourth, do not assume an old harness automatically improves when the model changes. Every model upgrade should rerun real-task evals and check for drift in search, parallel tool use, file editing, formatting, stopping conditions, and progress reporting.

## Closing

The most revealing part of Fable 5.1’s prompt changes is not how many rules were added. It is that Anthropic is answering, more systematically, the questions every agent product eventually faces: where context comes from, how capabilities are loaded, how state persists, how side effects are governed, how results are presented, and how errors are corrected.

My final judgment is:

> The next generation of agent competition will not be about who has the longer prompt. It will be about who can place a model inside an environment that is more real, more stateful, more verifiable, and able to keep learning.

As those environment capabilities become stable, the system prompt may become shorter again. The most reliable rules eventually evolve from “tell the model how it should act” into “the system only permits the correct way to act.”

## References

- [Anthropic: System prompts overview](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic: Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic: Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic: Claude Fable 5.1 model overview](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic: Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Community archive of the full Fable 5 Runtime Prompt](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
