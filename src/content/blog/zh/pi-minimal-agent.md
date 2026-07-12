---
translationKey: "pi-minimal-agent"
locale: "zh"
title: "Pi：OpenClaw 内部的极简 Agent"
description: "结构化改写 Armin Ronacher 对 Pi 的介绍，梳理其极小核心、可扩展会话与“软件构建软件”的理念。"
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

*写于 2026 年 1 月 31 日*

OpenClaw 曾以 ClawdBot、MoltBot 等多个名字迅速走红。它的核心形态并不复杂：一个连接到通信渠道、能够运行代码的 Agent。

OpenClaw 底层使用了一个小型编码 Agent：**Pi**。Armin Ronacher 说，Pi 已经成为他几乎专用的编码 Agent；这篇文章解释了他为什么如此看重 Pi 刻意保持精简的设计。

Pi 由 **Mario Zechner** 创建。Mario 的务实风格与 Peter 那种“带一点疯狂的科幻感”很不一样，但 Pi 和 OpenClaw 共享同一个前提：LLM 很擅长编写和运行代码，系统应当主动利用这一点。

## 什么是 Pi？

编码 Agent 已经很多，但 Pi 有两个特别突出的特点。Armin 也提到 **AMP**：它同样像是由真正长期试验 Agent 编程的人构建的产品，而不只是给模型套上一层漂亮界面。

Pi 吸引 Armin 的主要原因有两个：

- **核心极小。** 它的 system prompt 非常短，核心只提供四个工具：Read、Write、Edit、Bash。
- **扩展系统很强。** 扩展不仅能增加行为，还可以把自己的状态持久化到会话中。

它还有一个很实际的优点：Pi 像经过认真打磨的软件一样稳定。它占用内存少，不会频繁闪烁，也很少随机出错。

Pi 同时也是一组用于构建其他 Agent 的小组件。OpenClaw 建立在这些组件之上；Armin 用它们做过 Telegram 机器人，Mario 则用它们构建了 `mom`。把 Pi 指向自身代码和 `mom` 这样的示例，它就能用这些组件组装一个连接到目标服务的新 Agent。

## Pi 中没有什么

理解 Pi，也要理解它刻意没有放进核心的东西。Pi **没有内建 MCP 支持**，但这不等于不能扩展：可以编写扩展，也可以像 OpenClaw 那样使用 **mcporter**，通过 CLI 或 TypeScript bindings 暴露 MCP 调用。

这个取舍来自 Pi 的工作哲学。当 Agent 缺少某项能力时，默认动作不是去扩展市场下载现成组件，而是让 Agent 通过编写和运行代码来扩展自己。

Pi 仍然支持下载扩展。区别更多在于使用方式：已有扩展可以作为参考，由 Agent 按本地需求重新混合，而不是被当作不可改变的依赖。

## 为 Agent 构建 Agent 的 Agent

如果软件需要不断改造自身，底层就必须提供几种关键能力。

第一，Pi 的 AI SDK 允许一个会话包含来自不同模型 provider 的消息。它承认会话无法在 provider 之间完全无损迁移，同时尽量避免不必要地绑定某个 provider 的专有能力。

第二，除了模型消息，会话文件还能保存 custom messages。扩展可以用它们持久化状态；系统也可以决定某些信息完全不发送给模型，或者只发送其中一部分。

第三，扩展状态可以落盘，扩展支持 hot reload，Agent 因而可以编写、重载、测试并继续迭代。第四，Pi 自带可供 Agent 阅读的文档和示例。第五，Pi 的 session 是一棵 tree：用户可以分支去完成支线任务，在不消耗主分支上下文的情况下修复工具，再回到较早节点，由 Pi 总结另一个分支发生了什么。

这些选择也影响工具设计。在许多模型 provider 中，MCP 工具和其他 LLM 工具需要在会话开始时进入 system context 或 tools 区域。之后完整替换定义，可能破坏缓存，也可能让模型对前后不同的调用方式产生冲突理解。

## 不占模型上下文的能力

Pi 扩展可以注册供 LLM 调用的工具，Armin 偶尔也会使用这种方式。例如，他让 Agent 自己构建了一个本地 issue tracker；因为 Agent 需要直接管理待办事项，他为此暴露了一个额外工具，而不是 CLI。这是他目前唯一加载进模型上下文的额外工具。

更多能力并不需要以 tool schema 的形式占用模型上下文。它们通常是 skill 或改善人机协作体验的 TUI 扩展。Pi 扩展可以直接在终端渲染 spinner、进度条、文件选择器、数据表和预览窗格。Mario 甚至演示过在 TUI 中运行 Doom；虽然不实用，却足以证明界面的灵活性。

下面这些扩展是能力示例，而不是固定套餐。更符合 Pi 理念的做法，是让 Agent 参考其中一个，再按自己的需求改造。

### `/answer`

Armin 不使用 Plan Mode。他更喜欢 Agent 用自然 prose 展开有来有回的讨论，在解释之间穿插图示，而不是把问题塞进僵硬的结构化对话框。

但内联问题多了以后不容易逐一回答，所以 `/answer` 会读取 Agent 的上一条回复，提取其中所有问题，再整理成一个集中的输入框。

![/answer 扩展显示问题对话框](https://lucumr.pocoo.org/static/pi-answer.png)

### `/todos`

Armin 虽然批评 Beads 的实现方式，但认可 Agent 待办列表的价值。`/todos` 会打开 `.pi/todos` 目录中的 Markdown 文件；用户和 Agent 都能编辑，会话也能认领任务并把它标记为进行中。

### `/review`

当越来越多代码由 Agent 编写时，在交给人之前先让 Agent review 更合理。因为 Pi session 是 tree，Armin 可以分支到新的 review 上下文，获取 findings，再把修复带回主会话。

![/review 扩展显示审查预设选项](https://lucumr.pocoo.org/static/pi-review.png)

这个界面参考了 Codex，可以选择 commit、diff、未提交改动或远程 PR 作为 review 对象。review prompt 会强调 Armin 真正在意的 feedback，例如明确指出新增加的依赖。

### `/control`

这是一个用于实验、但没有进入 Armin 日常工作流的扩展。它让一个 Pi Agent 向另一个发送 prompt，从而形成不依赖复杂编排层的小型多 Agent 系统。

### `/files`

这个扩展列出会话中修改或引用过的文件。用户可以在 Finder 中显示它们、在 VS Code 中比较差异、使用 Quick Look 预览，或在 prompt 中引用。`shift+ctrl+r` 会快速预览最近提到的文件，Agent 生成 PDF 时尤其方便。

其他开发者也构建了扩展，包括 Nico 的 subagent extension，以及让 Pi 在可观察 TUI 浮层中自主运行交互式 CLI 的 `interactive-shell`。

## 软件构建软件

关键在于，这些扩展并不是 Armin 手写的。他描述需求，Pi 负责实现。Pi 核心没有 MCP，也没有预装 community skills，但 Agent 能为使用者创建并维护定制能力。例如，他把浏览器自动化 CLI 或 MCP 替换成了直接使用 CDP 的 skill。

他的 Agent 拥有不少 skill，但这些 skill 可以随时丢弃。有些用来读取其他工程师分享的 Pi session，辅助 code review；有些约束 commit message、提交行为或 changelog 更新。他也在尝试把原来的 slash commands 迁移成 skill，并把鼓励使用 `uv` 的 skill 与拦截 `pip`、`python` 调用并重定向到 `uv` 的扩展结合起来。

这正是 Pi 这类极简 Agent 的吸引力：让“软件构建更多软件”成为日常工作方式。OpenClaw 又把它推得更远，移除本地 UI，把 Agent 直接连接到聊天。Armin 并不是说所有细节已经确定，而是认为这个方向越来越像软件未来的一部分。

</div>
