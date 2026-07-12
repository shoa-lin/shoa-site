---
translationKey: "pi-minimal-agent"
locale: "en"
title: "Pi: The Minimal Agent Within OpenClaw"
description: "A structured adaptation of Armin Ronacher's introduction to Pi and its small core, extensible sessions, and software-building-software philosophy."
publishedAt: "2026-01-31"
updatedAt: "2026-01-31"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://lucumr.pocoo.org/2026/1/31/pi/"
sourceAuthor: "Armin Ronacher"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

*Written on January 31, 2026*

OpenClaw went viral under several names, including ClawdBot and MoltBot. At heart, it is an agent connected to a communication channel that can run code.

Under the hood, OpenClaw uses a small coding agent called **Pi**. Armin Ronacher describes Pi as the coding agent he now uses almost exclusively, and explains why its deliberately small design is so compelling.

Pi was created by **Mario Zechner**. Mario's grounded approach differs from Peter's "sci-fi with a touch of madness," but Pi and OpenClaw share the same premise: LLMs are very good at writing and running code, so the system should embrace that capability.

## What is Pi?

Pi is one of many coding agents, but two characteristics make it stand out. Armin also points to **AMP** as another product shaped by people who have seriously tested agentic programming, rather than simply wrapping it in a polished interface.

Pi is interesting for two main reasons:

- **It has a tiny core.** Its system prompt is unusually short, and the core exposes only four tools: Read, Write, Edit, and Bash.
- **It has a powerful extension system.** Extensions can add behavior and persist their own state into sessions.

There is also a practical benefit: Pi is carefully engineered and feels like well-crafted software. It is stable, light on memory, and does not distract with flicker or random failures.

Pi is also a set of small components for building other agents. OpenClaw is built on those components; Armin used them for a Telegram bot, and Mario used them for `mom`. Point Pi at its own code and an example such as `mom`, and it can help assemble another agent around the desired integration.

## What's not in Pi

Understanding Pi also means understanding what is intentionally absent. The core has **no built-in MCP support**. That does not make MCP impossible: an extension can add it, or an agent can use **mcporter**, which exposes MCP calls through a CLI or TypeScript bindings.

The omission reflects Pi's philosophy. When the agent lacks a capability, the default move is not to search a marketplace for a prebuilt extension. It is to ask the agent to extend itself by writing and running code.

Downloading extensions is still supported. The distinction is cultural: an existing extension can be treated as a reference that the agent remixes for local needs instead of as an immutable dependency.

## Agents built for agents building agents

Software that is meant to reshape itself needs a few capabilities in its foundation.

First, Pi's AI SDK allows a session to contain messages from different model providers. It acknowledges that sessions are not perfectly portable, while avoiding unnecessary dependence on provider-specific features.

Second, session files can contain custom messages alongside model messages. Extensions can use them to persist state, and the system can decide that some of this information is never sent to the model or only partly included.

Third, extension state can be saved to disk and extensions support hot reload. An agent can write an extension, reload it, test it, and continue iterating. Fourth, Pi ships with documentation and examples the agent can read while extending itself. Fifth, sessions are trees: users can branch into a side task, fix a broken tool without spending the main branch's context, then return while Pi summarizes what happened on the other branch.

These choices matter for tools. On many model providers, MCP tools and other LLM tools are loaded into the system context or tool section at session start. Fully replacing their definitions later can destroy the cache or leave the model with conflicting memories of how earlier calls worked.

## Tools outside the model context

A Pi extension can register a callable LLM tool, and Armin occasionally uses that option. His locally built issue tracker is one example: because the agent needs to manage to-dos directly, he exposes one additional tool rather than a CLI. It is currently the only extra tool he loads into the model context.

Most added capabilities do not need to occupy the model context as tool schemas. They are skills or TUI extensions that improve the human workflow. Pi extensions can render spinners, progress bars, file pickers, tables, and preview panes directly in the terminal. Mario even demonstrated Doom running in the TUI; impractical, but a useful proof of how flexible the interface is.

The following extensions are examples, not a fixed package. The intended workflow is to point the agent at one and ask it to remix the behavior.

### `/answer`

Armin does not use Plan Mode. He prefers a productive back-and-forth in the agent's natural prose, with explanations and diagrams interspersed, rather than a rigid structured-question dialog.

Inline questions can become hard to answer cleanly, so `/answer` reads the agent's last response, extracts its questions, and reformats them into a focused input box.

![/answer extension showing a question dialog](https://lucumr.pocoo.org/static/pi-answer.png)

### `/todos`

Although Armin criticizes the implementation of Beads, he finds agent to-do lists useful. `/todos` opens items stored under `.pi/todos` as Markdown files. Both the user and agent can edit them, and a session can claim a task to mark it in progress.

### `/review`

As agents write more code, unfinished work should receive agent review before it is handed to a person. Because Pi sessions are trees, Armin can branch into a fresh review context, collect findings, and bring the fixes back to the main session.

![/review extension showing review preset options](https://lucumr.pocoo.org/static/pi-review.png)

The interface is modeled after Codex and supports review targets such as commits, diffs, uncommitted changes, and remote pull requests. The review prompt emphasizes the feedback Armin cares about, including explicit call-outs for newly added dependencies.

### `/control`

This is an experimental extension rather than part of Armin's daily workflow. It lets one Pi agent send prompts to another, creating a small multi-agent setup without a complex orchestration layer.

### `/files`

This extension lists files changed or referenced in the session. They can be revealed in Finder, diffed in VS Code, opened with Quick Look, or referenced in a prompt. `shift+ctrl+r` opens the most recently mentioned file in Quick Look, which is convenient when an agent produces a PDF.

Other developers have built extensions too, including Nico's subagent extension and `interactive-shell`, which lets Pi run interactive CLIs autonomously inside an observable TUI overlay.

## Software building software

The central point is that Armin did not hand-write these extensions. He described what he wanted, and Pi built them. Pi's core has no MCP and no bundled community skills, but the agent can create and maintain capabilities tailored to its owner. One example is replacing browser-automation CLIs or MCP integrations with a skill that talks directly to CDP.

His agent has many skills, but they are disposable. Some read Pi sessions shared by other engineers for code review; others shape commit messages, commit behavior, or changelog updates. He is also moving some former slash commands into skills, and combines a skill that encourages `uv` with an extension that redirects `pip` and `python` calls to `uv`.

That is the appeal of a minimal agent such as Pi: it makes software-building-software feel like the normal mode of work. OpenClaw takes the idea further by removing the local UI and connecting the agent to chat. Armin's conclusion is not that every detail is settled, but that this direction increasingly looks like part of software's future.

</div>
