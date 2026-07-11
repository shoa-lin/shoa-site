---
translationKey: "pi-minimal-agent"
locale: "en"
title: "Pi: Minimalist Agent inside OpenClaw"
description: "Learn how the minimally coded Agent remains small and scalable through the design of Pi."
publishedAt: "2026-01-31"
updatedAt: "2026-01-31"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://lucumr.pocoo.org/2026/1/31/pi/"
sourceAuthor: "Armin Ronacher"
contentType: "translation"
translationStatus: "draft"
---

<div class="blog-article-body">

*Written on January 31, 2026*

If you haven't been in isolation lately, you might have noticed that a project from my friend Peter is blowing up the internet this week. It has many names. The latest one is **OpenClaw**, but in the news you might call it **ClawdBot** or **MoltBot** depending on when you see it. It is an Agent that connects to the communication channel of your choice and simply runs code.

What you may not be familiar with is that OpenClaw uses a small coding agent called **Pi** internally. And the Pi is my almost exclusive coding agent at this stage. Over the past few weeks, I’ve become more and more of a promoter of this little Agent. After I gave a talk about this recently, I realized that I haven't actually written about Pi on this blog yet, so I thought I'd give some background on why I'm so fascinated by it, and how it relates to OpenClaw.

Pi was written by **Mario Zechner**, and unlike Peter - who went for a "sci-fi style with a crazy twist" - Mario is very down to earth. Although the approaches are different, OpenClaw and Pi follow the same philosophy: **LLM is very good at writing and running code, so embrace that**. In a way, I don't think it's a coincidence because Peter got both Mario and I hooked on the idea and Agent last year.

## What is Pi?

So Pi is a coding agent. And now there are a lot of coding agents. Really, I think you can pick one out of the box now and you'll get a taste of what Agent programming is. I've talked positively about AMP in the comments on this blog, and one of the reasons I resonate with AMP is that it really feels like a product built by people who are both obsessed with Agent programming and have tried various methods to verify what works, rather than just building a fancy UI around it.

Pi is interesting to me for two main reasons:

- **First of all, it has a minimal core. ** It has the shortest system prompt words of any Agent I know of, and it only has four tools: Read, Write, Edit, Bash.
- **Secondly, it compensates for the simplicity of its core by providing an extension system that also allows extensions to persist state into sessions, which is very powerful.

There's an added little bonus: the Pi itself is written like good software. It doesn't flicker, it doesn't consume a lot of memory, it doesn't crash randomly, it's very reliable and was written by someone who pays great attention to the content of the software.

Pi is also a collection of small components on which you can build your own Agent. This is how OpenClaw is built, this is how I built my little Telegram bot and how Mario built his mom. If you want to build your own Agent and connect to something, when you point Pi to itself and mom, it will conjure one up for you.

## Nothing in Pi

In order to understand what's in Pi, it's even more important to understand what it's not, why it's not, and, more importantly: why there won't be anything in the future.

The most glaring omission is **support for MCP**. There is no MCP support in it. While you could build an extension for this, you could also do what OpenClaw does to support MCP, which is use **mcporter**. mcporter exposes MCP calls via a CLI interface or TypeScript binding, maybe your Agent can do something with it. Or not, I don't know :)

But this isn't a lazy omission. This comes from Pi’s working philosophy. The whole idea of ​​Pi is that if you want the Agent to do something it doesn't already do, you don't download extensions or skills or anything like that. You ask the Agent to extend itself. It celebrates the idea of ​​writing and running code.

This is not to say that extensions cannot be downloaded. This is fully supported. But rather than necessarily encouraging you to download someone else's extension, you could have your Agent point to an already existing extension and, say, build it like you see there, but with these changes that you like.

## Agent built for building Agent's Agent

When you look at what Pi, and by extension OpenClaw, is doing, there's an example of software that's as malleable as clay. This sets certain requirements on its underlying architecture, and indeed in many ways sets certain constraints on the system that do need to go into the core design.

For example, Pi's underlying AI SDK is so well written that a session can actually contain many different messages from many different model providers. It recognizes that the portability of sessions between model providers is limited, so it does not overly rely on any specific feature set that cannot be transferred to another model provider.

Second, in addition to model messages, it maintains custom messages in the session file, which can be used by extensions to store state, or used by the system itself to maintain information - either not sent to the AI ​​at all, or only part of it.

Because this system exists, and extension state can also be persisted to disk, it has hot reload built in, so the Agent can write code, reload, test it, and loop until your extension actually works. It also comes with documentation and examples that the Agent itself can use to extend itself. Even better: sessions in Pi are trees. You can branch and navigate within a session, which opens up all kinds of interesting possibilities, such as being able to enable workflows and do side quests to fix broken Agent tools without wasting context in the main session. Once the tool is fixed, I can rewind the session to an earlier time and Pi will summarize what happened on the other branch.

This is all important because for example if you think about how MCP works, on most model providers MCP's tools (like any tool for LLM) need to be loaded into the system context or its tools section at the start of a session. This makes it very difficult or even impossible to fully reload what a tool can do without completely destroying the cache or confusing the AI ​​that previous calls worked differently.

## Out-of-context tools

There is an extension in Pi that can register a tool for LLM to call, which I occasionally find useful. For example, while I'm critical of the way Beads is implemented, I do think it's useful to give an Agent access to a to-do list. I do use an Agent-specific issue tracker that works locally, and I let my Agents build it themselves. Since I also wanted the Agent to manage to-do items as well, in this particular case I decided to give it a tool instead of a CLI. This feels appropriate for the scope of the problem, and it's currently the only additional tool I have loaded into the context.

But mostly everything I add to the Agent is either a skill or a TUI extension that makes working with the Agent more enjoyable for me. In addition to slash commands, Pi extensions can render custom TUI components directly in the terminal: spinners, progress bars, interactive file pickers, data tables, preview panes. TUI is flexible enough that Mario proved you could run Doom in it. Not practical, but if you can run Doom you can certainly build a useful dashboard or debugging interface.

I want to highlight some of my extensions to give you an idea of ​​what's possible. While you can use them unmodified, the whole idea is really that you have your Agent point at one of them and mix it to your liking.

### `/answer`

I don't use planning mode. I encourage the Agent to ask questions and have a productive back and forth. But I don't like the structured question dialog that happens if you give the Agent a question tool. I prefer Agent's nature prose with interspersed explanations and diagrams.

Problem: Answering questions inline can get confusing. So `/answer` reads the Agent's last reply, extracts all the questions, and reformats them into a nice input box.

![/answer expands the question dialog box](https://lucumr.pocoo.org/static/pi-answer.png)

### `/todos`

Although I criticize the implementation of Beads, it is really useful to give the Agent a to-do list. The `/todos` command brings out all items stored in `.pi/todos` as markdown files. Both the Agent and I can operate on them, and sessions can claim tasks to mark them as in progress.

### `/review`

As more and more code is written by Agents, it makes no sense to throw unfinished work to humans before Agents review it first. Because Pi sessions are trees, I can branch to a new review context, get findings, and then bring fixes back to the main session.

![/review Extended display of review preset options](https://lucumr.pocoo.org/static/pi-review.png)

The UI is modeled after Codex, which provides easy review of commits, diffs, uncommitted changes, or remote PRs. The prompt word focuses on things I care about, so I get the calls I want (eg: I ask it to call newly added dependencies).

### `/control`

An extension that I try but don't actively use. It lets one Pi Agent send a prompt word to another. This is a simple multi-agent system without complex orchestration, useful for experimentation.

### `/files`

Lists all files that were changed or referenced in the session. You can display them in Finder, compare differences in VS Code, quickly view them, or reference them in your prompt words. `shift+ctrl+r` Quickly view recently mentioned files, which is convenient when the Agent generates PDFs.

Others have also built extensions: Nico's sub-agent extension and interactive shell, allowing the Pi to autonomously run an interactive CLI within an observable TUI overlay.

## Software building software

These are just ideas of what you can do with Agent. The main point is that I didn't write any of this, it was created by Agent based on my specifications. I told Pi to make an extension and it did it. No MCP, no community skills, nothing. Don’t get me wrong, I use a lot of skills. But they are handmade by my clanker, not downloaded from anywhere. For example, I completely replaced all my browser automation CLI or MCP with skills that only use CDP. Not because the alternative doesn't work or is bad, but because it's just simple and natural. Agent maintains its own functionality.

My Agent has quite a few skills, the key is if I don't need them, I throw away the skills. For example, I gave it a skill to read Pi sessions shared by other engineers, which helps with code reviews. Or I have a skill that helps the Agent craft the commit message and commit behavior I want, and how to update the change log. These were originally slash commands, but I'm currently migrating them to skills to see if this works as well. I also have a skill that I hope will help the Pi use `uv` instead of `pip`, but I also added a custom extension to intercept calls to `pip` and `python`, redirecting them to `uv`.

Part of the appeal for me of using a minimalist Agent like the Pi is that it lets you live in the idea of ​​using software that builds more software. When this goes to the extreme, is when you remove the UI and output and connect it to your chat. That's what OpenClaw does, and given its tremendous growth, I really feel more and more that this is going to be our future in some way.

</div>
