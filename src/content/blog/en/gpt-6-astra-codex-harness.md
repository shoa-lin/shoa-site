---
translationKey: "gpt-6-astra-codex-harness"
locale: "en"
title: "From Turn Loop to Control Plane: How GPT-6 Astra Rewrites the Codex Harness"
description: "Async tool calling, mid-turn steering, dynamic reasoning, and the Agents API are pushing agent development away from hand-built runtimes and toward a re-layering of capabilities and responsibilities."
publishedAt: "2026-09-15"
updatedAt: "2026-09-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://developers.openai.com/api/docs/guides/latest-model"
sourceAuthor: "OpenAI Developers and community sources"
contentType: "adaptation"
translationStatus: "reviewed"
---

## The Short Version

What GPT-6 Astra changes is not just model strength. It changes the agent's model of time, its model of control, and the boundary of its runtime.

Async tool calling lets the model keep working on independent tasks while a slow tool runs; mid-turn steering lets users change their requirements before the model has finished; `configuration_update` lets an application adjust the reasoning effort of later responses without rewriting the request-level reasoning parameters, while keeping the prompt cache prefix intact.

The bigger shift comes from the Agents API, which entered public beta on September 10, 2026. It exposes an OpenAI-managed Codex Harness through the API: the application supplies the model instructions, business tools, and execution environment, and OpenAI manages sessions, orchestration, context compaction, recovery, and the event stream.

This amounts to a migration of responsibility in agent development:

> The platform absorbs the generic runtime, the model absorbs part of the interaction protocol, and application teams put their effort back into business capabilities, permission boundaries, execution environments, and result verification.

## Why I Used to Build These Things Myself

In the early days of building agents, async tool calling and "changing direction while the work is in flight" were rarely two API parameters. They were a set of state-machine problems.

You had to persist unfinished tasks, distinguish model turns from background jobs, and handle process restarts, timeouts, cancellation, duplicate callbacks, and out-of-order results. You had to splice a user's new instruction into a running flow, then decide whether the old output was now void and whether actions already taken could be rolled back. Changing reasoning effort, in turn, affected request structure, cache hits, and context replay.

None of this engineering produced business value, yet it decided whether the agent could run reliably. Teams often spent enormous amounts of time maintaining a "compensation layer" built around the model's limitations.

Astra starts turning part of that work into protocol semantics.

## Astra Stops the Model From Blocking on Slow Tools

Async tool calling in the Responses API requires setting `async: true` in the function or custom tool definition. After the model issues the call, it can keep doing work that does not depend on the result, and the application returns the result later using the original `call_id` once the task finishes.

What gets reduced here is waiting on the model side, not work on the application side. OpenAI does not run background tasks on the application's behalf, and it does not provide a business queue. Production systems still have to decide who owns a task, how it is authorized, how it is retried, how long results are kept, and how failures are surfaced.

If several tasks are running at once, the application can also define an ordinary `wait_for_tasks` tool so the model waits only when it genuinely needs to compare results. That wait tool belongs to the application's own protocol.

So the value of async is not in marking every tool async. It is in starting the genuinely independent work early while keeping explicit dependency barriers in place.

## Mid-Turn Steering Turns the User Into a Live Control Signal

Astra's mid-turn steering is available through the Responses API's WebSocket mode. The application sends `response.steer`, the API queues the new user requirement into the current response, and it automatically generates a follow-up continuation.

It does not rewrite output that has already been sent, and it does not undo tools that have already started. `accepted` means only that the input has been queued; whether the model has acted on it still has to be confirmed by reading further events.

Steering is therefore "appending a constraint," not "rewinding time." The harness still has to maintain:

- the relationship between the current response and its successor response;
- the ordering of multiple steering calls;
- permission boundaries around side effects that have already happened;
- conflict handling between tool results and the new direction;
- recovery strategies for dropped connections and duplicate delivery.

This is more reliable than the old hand-written "abort the request and rebuild the context," because the protocol now expresses the continuation lifecycle; but it does not define business-level undo semantics for the application.

## configuration_update Turns Reasoning Effort Into Session State

An application can insert this into the history:

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

The request-level `reasoning.effort` keeps its original value; the update only affects subsequent responses. That lets you run ordinary tasks at lower reasoning effort and raise it for failure analysis or risk assessment, while keeping the original prompt prefix, which helps cache reuse.

For now this mechanism only supports GPT-6 Astra's standard single-agent mode and only changes reasoning effort; adjacent updates, automatic compaction, and automatic truncation all come with explicit limits.

Three layers need to be kept apart here: the API already supports the protocol; Codex internals may already have some of the data structures; whether the current Codex client actually uses it correctly when ordinary settings change has to be verified per version. The public [Codex Issue #42996](https://github.com/openai/codex/issues/42996) still reports cache-hit problems after switching reasoning effort, so the API documentation cannot be taken as evidence that the client has finished the integration.

## From the Responses API to the Codex Harness to the Agents API

OpenAI now describes three runtime boundaries quite clearly:

| Approach | Who manages the runtime | Best suited for |
| --- | --- | --- |
| Responses API | The application itself | Full control over the agent loop |
| Codex SDK / App Server | Reusing the local Codex runtime | Integrating Codex into your own tools and products |
| Agents API | OpenAI-hosted Codex Harness | Letting the platform manage sessions, orchestration, compaction, and recovery |

The point of the Agents API is that it turns the generic harness every team used to reimplement into a platform capability. The managed capabilities listed in the official docs include sandboxes, Skills, MCP, steering, context management, sub-agents, and session recovery.

Application teams still have to provide tools and choose the execution environment, but they no longer have to implement the entire generic agent loop from scratch.

This is not "hand everything to the platform." The platform owns the generic runtime machinery; the application owns the business truth. For example:

- which tenant is allowed to read this data;
- whether a tool call may produce external side effects;
- whether a retry would charge twice or deploy twice;
- what evidence is sufficient to say the task is done;
- which results must pass human approval.

## Harness Complexity Does Not Disappear; It Gets Re-layered

The old engineering complexity can be split into three kinds:

1. **Model-compensation complexity**: waiting, rebuilding context, simulating interruptions, hand-writing async protocols. Astra is absorbing part of this.
2. **Generic-runtime complexity**: sessions, event streams, compaction, recovery, sub-agents, and sandboxes. The Codex Harness and the Agents API are absorbing part of this.
3. **Business-correctness complexity**: permissions, data consistency, approvals, idempotency, acceptance, and auditing. This still belongs to the application.

So the real change is not "no more engineering." It is that the center of gravity of the engineering has moved:

```text
Before: build your own Agent Runtime
Now:    connect capabilities, declare boundaries, verify results
```

## What This Means for Codex

If the Codex Harness keeps evolving, its core will shift from a turn loop to a control plane:

```text
Event stream
  ├─ model responses
  ├─ tool start and completion
  ├─ user steering
  ├─ reasoning configuration updates
  └─ continuation

Control plane
  ├─ current conversation head
  ├─ pending task registry
  ├─ permissions and approvals
  ├─ cache invariants
  ├─ recovery and idempotency
  └─ result verification
```

Community discussion around LangChain, Hermes, ZeroClaw, and other gateways also shows that once a protocol appears, the ecosystem still needs time to adapt. The common problem is not "can we emit the async field?" but whether stream conversion, message replay, out-of-order completion, reconnection, and duplicate delivery preserve the original semantics.

## The Final Verdict

Together, Astra and the Agents API point to a new division of labor for agents:

> The model handles thinking more flexibly, the protocol expresses in-flight control, the harness handles generic orchestration, and the application handles the real constraints of the business world.

This will sharply lower the startup cost of a new agent. The async loops, state recovery, and mid-course intervention that used to take weeks to build may become a matter of configuring a runtime and plugging in tools.

But it also raises the bar for how well application teams can "define the problem." The more generic machinery the platform takes over, the more the genuinely differentiated part concentrates in tool design, the permission model, environment boundaries, verifiers, and feedback loops.

The central question of agent development is moving from "how do we get the model running?" to "how do we make it reliably usable in the real world?"

## References

- [OpenAI: Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI: Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI: Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
- [OpenAI: Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [OpenAI: Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI: Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI: Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Chasing Next: Async Tool Calling in the Responses API](https://chasingnext.com/updates/async-tool-calling-in-the-responses-api)
- [The Syntax Diaries: OpenAI Async Tool Calling Without Lost Results](https://thesyntaxdiaries.com/openai-async-tool-calling)
- [LangChain Issue #40204](https://github.com/langchain-ai/langchain/issues/40204)
