---
translationKey: "ai-agent-retry-state"
locale: "en"
title: "When AI Starts Acting, Retry No Longer Means “Answer Again”"
description: "From chatbot regeneration to Codex’s Fork mechanism, a look at why retrying an agent involves conversation, execution, external, and audit state."
publishedAt: "2026-07-15"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-retry-state/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## The conclusion first

**When AI only generates text, Retry means sampling another answer. When AI starts acting on the real world, Retry may mean executing the task again.**

That distinction helps explain why agent products such as Codex do not emphasize the traditional Regenerate button:

- A chatbot retry usually replaces a piece of text.
- One agent run may already have changed files, executed commands, or called external tools.
- By the second run, the world is no longer in its original state.
- A safer interaction is therefore to provide feedback, rerun a failed step, or Fork from an explicit state.

One qualification matters: no official source says that Codex “removed Retry because state became too complex.” This article is an architectural interpretation based on the publicly documented Thread, Turn, Item, and Fork model.

![Retry changes from generating another answer to creating a branch that preserves history](/assets/blog/ai-agent-retry-state/retry-becomes-fork-en.png)

In earlier chatbots, I became used to a small feature: **Retry**, often labeled **Regenerate**.

You asked a question, the AI returned an answer, and if the answer was unsatisfying, you clicked once to get another version. You did not need to rewrite the question.

The interaction felt so natural that Codex raised a question for me: **why is the familiar Regenerate button no longer prominent?**

Was it simply omitted? Or does an agent product require a different interaction model?

My current answer is:

> When AI only generates text, Retry means sampling another answer. When AI starts acting on the real world, Retry may mean executing the task again.

The difference looks like one button, but it separates two fundamentally different systems.

## Why Retry was simple in the chatbot era

A traditional chatbot interaction looks roughly like this:

```text
用户问题 → 模型生成 → 回答 A
                   └→ Retry → 回答 B
```

If the first answer is poor, the system can keep the same conversation context and ask the model to generate another response. Discarding the first answer usually has no serious consequence.

In most cases, the chatbot has changed only the text on the screen:

- It has not modified a local file.
- It has not run a command.
- It has not changed a Git branch.
- It has not written data to an external system.
- It has not sent an email that cannot be recalled.

The experience resembles asking someone to answer the same question in a different way. If the first sheet is not good enough, you crumple it up and start again.

Chatbot Retry can therefore be understood as: **keep the input, discard the output, and generate another candidate.**

## Codex returns more than an answer

An agent such as Codex may have done substantial work before it writes its final response.

In the Codex App Server model, a Thread contains Turns, and a Turn contains Items. Those Items are not limited to user and assistant messages. They can also include command runs, file changes, and tool calls.

The final paragraph shown in the interface may only be a summary of the work:

```text
用户任务
   │
   ▼
理解仓库与上下文
   │
   ▼
读取文件 → 运行命令 → 调用工具 → 修改代码 → 执行测试
   │
   ▼
最终回复：“已经修改了这些内容……”
```

If the user dislikes that final response, what exactly should Retry repeat?

Should it rewrite only the summary? Reason again? Run every command again? Or first undo the changes that have already happened and then restart?

At this point, Retry is no longer a simple operation.

## On the second run, the world is already different

Suppose I tell Codex:

> Fix this bug, run the tests, and open a Pull Request.

During the first run, Codex may already have:

1. Read the code and located the problem.
2. Modified three files.
3. Run the test suite.
4. Created a branch.
5. Committed and pushed the changes.
6. Opened a Pull Request.

What should happen if I now press Retry?

- Regenerating only the text may produce a report that no longer matches the actions taken.
- Reasoning again starts from a repository that has already been modified.
- Replaying the tools may create duplicate commits, conflicting branches, or a second PR.
- Rolling back first may be impossible for some external actions.

A file can be restored, but an email may already have been sent. A local branch can be deleted, while an approval, message, or transaction in an external system may not be reversible without a trace.

The real issue is therefore not merely that “intermediate information is complicated.” It is that:

> An agent run creates a real chain of cause and effect. The second run no longer begins in the world that existed before the first.

![Text can be rewritten, but the agent has already changed the state of the world](/assets/blog/ai-agent-retry-state/text-vs-world-state-en.png)

## Agent Retry involves at least four kinds of state

From a systems perspective, one agent task can affect four distinct forms of state.

### 1. Conversation state

This includes the user’s request, previous messages, confirmed constraints, reasoning context, and tool results.

A retry must decide which parts of that history remain valid and which should be discarded.

### 2. Execution state

This includes local files, the Git working tree, running processes, test artifacts, temporary files, and installed dependencies.

The first run may already have changed all of them.

### 3. External state

This includes GitHub Pull Requests, database records, outgoing messages, cloud jobs, submitted forms, and third-party systems.

This is the most dangerous category because many external actions cannot be fully rolled back.

### 4. Permission and audit state

This records which actions the user approved, which tools were called, when each event occurred, and how responsibility should be traced.

If Retry silently replays a sequence of actions, is the second execution covered by the original approval, or does it need new authorization? How should the relationship between the two runs appear in an audit log?

Once these four forms of state overlap, Retry is no longer a button. It becomes a mechanism for rollback, duplicate prevention, and branching.

## What could Retry actually mean?

In an agent product, “try again” can describe at least four different operations:

```text
再写一次    → 保留已完成的工作，只重写最终回答
重新规划    → 保留当前环境，但换一条推理和执行路线
重新执行    → 再运行一次失败的命令或工具
回到分叉点  → 保留原始历史，从某个状态创建一条新分支
```

The risks of those operations are completely different, yet a single Retry button hides the distinction.

Agent products may still need retrying, but they need to divide it into actions with clearer semantics:

- Regenerate only the answer.
- Continue revising from the current state.
- Rerun the failed step.
- Create a new branch from this point.
- Restore a checkpoint and rerun from there.

Retry becomes reliable only when both the user and the system know exactly what is being repeated.

## Codex offers Fork instead of one generic Retry

The official documentation does establish that Codex models work as Threads, Turns, and Items, and that it provides a `fork` mechanism. In the Codex CLI, `/fork` copies the current task into a new task. The App Server similarly exposes `thread/fork` to create a new Thread while preserving the original history.

Fork and Retry look similar, but they make different claims:

- Retry says: “The previous attempt does not count. Do it again.”
- Fork says: “The previous attempt happened. Now explore another path from here.”

The first interpretation is usually sufficient when AI only produces text.

For an agent that modifies files, runs commands, and calls external tools, the second interpretation is more honest and easier to trace.

Fork acknowledges that history exists. A new attempt receives its own branch and identity instead of quietly overwriting the old process.

## Feedback is often more useful than Retry

When an agent result disappoints us, we often do not want the entire task repeated. We want to explain what was wrong.

For example:

- Keep the research, but make the conclusion more direct.
- Do not change the API; revise only the internal implementation.
- Keep the test results, but investigate the root cause again.
- Do not roll back the current code; explore a different UI direction.
- Stop executing and show me the existing changes first.

This kind of feedback preserves useful work and tells the agent precisely where the previous run missed the target.

Traditional Retry relies on randomness and hopes the next answer will be better. Good agent collaboration looks more like working with a colleague: identify the deviation, retain what is correct, and converge from the current state.

## A small button marks a product boundary

The reduced emphasis on traditional Retry in Codex does not necessarily mean that a capability was removed.

It marks a product boundary: AI is moving from an **answering machine** to an **action system**.

When AI generates only text, history can often be replaced. Once AI starts acting, history becomes part of system state.

The important questions are no longer limited to “Can it answer again?” They become:

- Can we see exactly what the previous run did?
- Can we preserve the correct work and revise only the wrong part?
- Can we branch from a clearly identified state?
- Can we prevent tools and external actions from running twice?
- Can every attempt retain a traceable causal relationship?

> The fading Retry button is not just the disappearance of a familiar interaction. It reminds us that once AI can change the real world, “try again” must answer a more serious question: from which state, and which action, should be repeated?

## References

- [Codex CLI command reference: `/fork` and task branching](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Codex App Server: Thread, Turn, Item, and `thread/fork`](https://learn.chatgpt.com/docs/app-server)
- [OpenAI Conversation state: conversation history and state chains](https://developers.openai.com/api/docs/guides/conversation-state)
- [OpenAI Function calling: the multi-step tool execution flow](https://developers.openai.com/api/docs/guides/function-calling)
