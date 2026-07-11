---
translationKey: "lessons-from-building-claude-code-skills"
locale: "zh"
title: "构建 Claude Code 的经验：我们如何使用 Skills"
description: "Claude Code 团队从设计、组织和维护数百个 Skills 中总结的实践经验。"
publishedAt: "2026-03-17"
updatedAt: "2026-03-17"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2033949937936085378"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

![《构建 Claude Code 的经验：我们如何使用 Skills》封面](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Skills 已成为 Claude Code 中使用最广泛的扩展点之一。它们灵活、容易制作，也便于分发。

这种灵活性也让人难以判断什么做法最好。哪些 Skills 值得做？写好 Skill 的秘诀是什么？什么时候应该分享给其他人？

在 Anthropic，我们广泛使用 Claude Code Skills，目前有数百个正在活跃使用。以下是我们用 Skills 加速开发过程中总结的经验。

---

## 什么是 Skills？

如果你刚接触 Skills，建议先[阅读文档](https://code.claude.com/docs/en/skills)，或学习最新的 [Agent Skills Skilljar 课程](https://anthropic.skilljar.com/introduction-to-agent-skills)。本文假设读者已经具备一些基础认识。

一个常见误解是 Skills“只是 markdown 文件”。它们真正有趣的地方恰恰在于不只是文本文件，而是可以包含脚本、assets、数据和其他资源的文件夹，Agent 能够发现、探索和操作其中的内容。

在 Claude Code 中，Skills 还有[丰富的配置选项](https://code.claude.com/docs/en/skills#frontmatter-reference)，包括动态 hooks。

一些最有意思的 Skills，正是创造性地使用了这些配置和文件夹结构。

---

## Skills 的类型

我们整理全部 Skills 后发现，它们大致聚集在几类反复出现的模式中。好的 Skills 往往能清晰归入一类；令人困惑的 Skills 常常横跨多类。这不是完整清单，但可以帮助你思考组织内部还缺少什么。

![常见 Skills 类型图表](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. 库与 API 参考

这类 Skills 解释如何正确使用某个库、CLI 或 SDK。对象可以是内部库，也可以是 Claude Code 偶尔处理不好的常用工具。它们通常包含参考代码片段，以及一份提醒 Claude 写脚本时避开的 Gotchas 清单。

**示例：**

- **billing-lib** - 内部计费库的边缘情况、footguns 和其他易错细节
- **internal-platform-cli** - 内部 CLI wrapper 的每个子命令，以及各自适用场景
- **frontend-design** - 让 Claude 更好地应用你的设计系统

---

### 2. 产品验证

这类 Skills 说明如何测试或验证代码是否正常工作，通常会配合 Playwright、tmux 等外部工具。

Verification Skills 对确保 Claude 产出正确非常有价值。让一名工程师花一周把它们做好，可能完全值得。

可以考虑让 Claude 录制测试视频，以便准确查看它验证了什么；也可以在每一步对状态执行程序化断言。这些能力通常由 Skill 内的脚本实现。

**示例：**

- **signup-flow-driver** - 在无头浏览器中运行注册 -> 邮箱验证 -> onboarding，并用 hooks 逐步断言状态
- **checkout-verifier** - 用 Stripe 测试卡驱动结账 UI，并验证 invoice 最终进入正确状态
- **tmux-cli-driver** - 验证需要 TTY 的交互式 CLI

---

### 3. 数据获取与分析

这类 Skills 连接数据和监控系统，可能包含使用凭据获取数据的库、指定 dashboard ID，以及常见工作流或查询方式的说明。

**示例：**

- **funnel-query** - 为了查看注册 -> 激活 -> 付费，需要连接哪些事件，以及哪张表包含规范的 `user_id`
- **cohort-compare** - 比较两个 cohort 的留存或转化，标记统计显著差异，并链接到 segment 定义
- **grafana** - 数据源 UID、集群名称和“问题 -> dashboard”查找表

---

### 4. 业务流程与团队自动化

这类 Skills 把重复流程变成一个命令。说明通常比较简单，但可能依赖其他 Skills 或 MCPs。把历史结果保存在日志中，可以帮助模型保持一致，并反思之前的执行。

**示例：**

- **standup-post** - 聚合工单系统、GitHub 活动和之前的 Slack 帖子，生成只展示变化的格式化 standup
- **create-<ticket-system>-ticket** - 强制执行有效枚举值、必填字段等 schema，再运行创建后的流程，例如通知 reviewer、在 Slack 中链接 ticket
- **weekly-recap** - 把已合并 PR、已关闭 tickets 和 deployments 整理成格式化回顾帖

---

### 5. 代码脚手架与模板

这类 Skills 为 codebase 中的特定功能生成框架样板。它们可以把自然语言指导与可组合脚本结合起来，尤其适合那些无法完全用代码表达的脚手架要求。

**示例：**

- **new-<framework>-workflow** - 按你的 annotations 创建新的 service、workflow 或 handler
- **new-migration** - 提供 migration 模板和常见 Gotchas
- **create-app** - 创建已经接好认证、日志和部署配置的内部应用

---

### 6. 代码质量与 Review

这类 Skills 在组织内部落实代码质量要求，并协助 code review。为了提高稳健性，可以加入确定性脚本或工具，也可以通过 hooks 或 GitHub Actions 自动运行。

**示例：**

- **adversarial-review** - 启动一个全新视角的 subagent 做批评，实施修复并持续迭代，直到剩余发现都只是 nitpicks
- **code-style** - 强制执行 Claude 默认不擅长的代码风格
- **testing-practices** - 说明如何写测试，以及应该测试什么

---

### 7. CI/CD 与部署

这类 Skills 帮助获取、推送和部署代码，也可能调用其他 Skills 收集数据。

**示例：**

- **babysit-pr** - 监控 PR -> 重试 flaky CI -> 解决合并冲突 -> 开启 auto-merge
- **deploy-<service>** - 构建 -> smoke test -> 逐步放量并比较错误率 -> 出现回归时自动回滚
- **cherry-pick-prod** - 创建隔离 worktree -> cherry-pick -> 解决冲突 -> 使用正确模板创建 PR

---

### 8. Runbooks

这类 Skills 接收 Slack thread、告警或错误特征等症状，完成多工具调查，并生成结构化报告。

**示例：**

- **<service>-debugging** - 为高流量服务建立“症状 -> 工具 -> 查询模式”映射
- **oncall-runner** - 获取告警 -> 检查常见问题 -> 格式化调查结果
- **log-correlator** - 根据 request ID，从所有可能处理过该请求的系统中拉取匹配日志

---

### 9. 基础设施操作

这类 Skills 执行例行维护和运维流程，其中一些涉及破坏性操作，需要明确 guardrails。它们让工程师在关键操作中更容易遵循最佳实践。

**示例：**

- **<resource>-orphans** - 查找孤立 pods 或 volumes -> 发布到 Slack -> 等待观察期 -> 请求用户确认 -> 级联清理
- **dependency-management** - 执行组织内部的依赖审批流程
- **cost-investigation** - 调查存储或 egress 费用为何激增，并提供相关 buckets 和查询模式

---

## 制作 Skills 的技巧

![制作 Skills 的技巧概览](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

决定要做什么 Skill 后，下一步该怎么写？以下是我们实践中效果最好的方法和技巧。

我们最近还发布了 [Skill Creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)，让在 Claude Code 中创建 Skills 更容易。

---

### 不要陈述显而易见的内容

Claude Code 已经很了解你的 codebase，Claude 也掌握大量编程知识和默认观点。如果一个 Skill 主要提供知识，应聚焦那些能把 Claude 推出惯常思路的信息。

[frontend design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) 是很好的例子。Anthropic 的一名工程师通过与客户反复迭代，改善 Claude 的设计品味，避免 Inter 字体、紫色渐变等熟悉套路。

---

### 构建 Gotchas 部分

![Gotchas 部分示例](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

任何 Skill 中信号密度最高的内容，往往是 Gotchas 部分。它应该来自 Claude 使用 Skill 时遇到的常见失败点，并随着新的 Gotchas 出现持续更新。

---

### 使用文件系统与渐进式披露

![用于渐进式披露的 Skill 文件夹结构](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

Skill 是文件夹，不只是一份 markdown 文件。可以把整个文件系统视为 context engineering 和渐进式披露的一种形式。告诉 Claude Skill 中有哪些文件，它会在合适的时机读取。

最简单的渐进式披露，是指向其他 markdown 文件。例如，把详细函数签名和使用示例放进 `references/api.md`。

如果最终产物是一份 markdown 文档，也可以在 `assets/` 中提供模板，供 Claude 复制使用。

References、scripts、examples 等文件夹，都能帮助 Claude 更有效地工作。

---

### 避免把 Claude 限死

Claude 通常会努力严格遵守指令。Skills 的复用范围很广，因此过度具体的说明会让它变得僵硬。给 Claude 足够信息，同时保留根据实际情况调整的空间。

![灵活指导与过度限制指令的对比示例](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### 想清楚 Setup

![Skill setup 配置示例](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

有些 Skills 在 setup 时需要用户提供上下文。例如，如果某个 Skill 要把 standup 发布到 Slack，Claude 可能需要先询问应该发布到哪个 Slack channel。

一种好的做法是把 setup 信息存到 Skill 目录内的 `config.json`。如果配置缺失，Agent 再向用户询问。

如果要展示结构化多选问题，可以明确要求 Claude 使用 AskUserQuestion 工具。

---

### Description 字段是给模型看的

Claude Code 启动 session 时，会构建一份所有可用 Skills 及其 description 的列表。Claude 扫描这份列表来判断：“这个请求是否有对应 Skill？”因此 description 不是摘要，而是说明模型应该在什么时候触发这个 Skill。

![面向模型触发条件编写的 Skill description 示例](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### Memory 与数据存储

![Skill 中存储 memory 和数据的示例](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

有些 Skills 可以通过存储数据形成 memory。实现可以很简单，例如 append-only 文本日志或 JSON 文件，也可以复杂到 SQLite 数据库。

例如，`standup-post` Skill 可以用 `standups.log` 保存写过的每一篇帖子。下次运行时，Claude 读取历史，就能判断从昨天到现在发生了哪些变化。

Skill 目录内的数据可能在升级 Skill 时被删除。持久数据应放在稳定位置；截至目前，`${CLAUDE_PLUGIN_DATA}` 为每个 plugin 提供一个稳定目录。

---

### 存储脚本并生成代码

代码是你能交给 Claude 的最强工具之一。脚本和库让 Claude 把回合用于组合能力、决定下一步，而不是重复重建样板代码。

例如，data science Skill 可以包含从事件源获取数据的函数。给 Claude 一组 helper functions，它就能组合出更复杂的分析：

![Skill 中的 helper functions 示例](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

Claude 随后可以即时生成脚本，组合这些函数来回答“周二发生了什么？”之类的问题。

![Claude 使用 helper functions 生成的脚本示例](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### On Demand Hooks

Skills 可以定义只在调用 Skill 时激活、并在当前 session 持续生效的 hooks。适合那些平时一直运行会造成干扰，但在特定场景非常有价值的强约束。

示例：

- **/careful** - 通过 Bash 上的 PreToolUse matcher 阻止 `rm -rf`、`DROP TABLE`、force-push 和 `kubectl delete`。只有触碰生产环境时才启用；永久开启会让人难以工作。
- **/freeze** - 阻止特定目录之外的任何 Edit/Write。调试时很有用：只想加日志，不想意外“修复”无关代码。

---

## 分发 Skills

Skills 最大的好处之一，是可以与团队其他成员共享。

常见的分发路径有两种：

- 把 Skills 提交到仓库的 `./.claude/skills` 下
- 制作 plugin，并建立 Claude Code plugin marketplace 供用户安装；参阅 [plugin marketplace 文档](https://code.claude.com/docs/en/plugin-marketplaces)

对只维护少量仓库的小团队，把 Skills 直接提交到各仓库通常很好用。不过，每个提交的 Skill 都会为模型增加一点 context。规模扩大后，内部 plugin marketplace 可以统一分发，同时让各团队自行决定安装哪些 Skills。

---

### 管理 Marketplace

团队如何决定哪些 Skills 进入 marketplace？成员又该如何提交？

Anthropic 没有一个中心团队包办全部决策，而是让实用 Skills 自然浮现。Owner 可以先把 Skill 上传到 GitHub 的 sandbox 目录，再通过 Slack 或其他论坛邀请大家试用。

Skill 获得足够 traction 后，由 owner 自行判断时机，并提交 PR 移入 marketplace。

糟糕或重复的 Skills 很容易出现，因此正式发布前需要某种策划和筛选机制。

---

### 组合 Skills

Skills 之间可能存在依赖。例如 file-upload Skill 负责上传文件，CSV-generation Skill 先生成 CSV，再调用上传 Skill。Marketplace 和 Skills 目前还没有原生依赖管理，但可以在 Skill 中按名称引用另一个 Skill；只要已安装，模型就会调用。

---

### 衡量 Skills

为了了解 Skill 表现，我们使用 PreToolUse hook 记录公司内部的 Skill 使用情况。[示例代码](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5)展示了具体做法。这样可以看出哪些 Skills 最受欢迎，哪些触发频率低于预期。

---

## 结论

Skills 是强大、灵活的 Agent 工具，但这个领域仍在早期，大家都在摸索最佳用法。

更适合把这些经验看成一组已经验证有效的技巧，而不是权威指南。理解 Skills 最好的方式，是开始制作、持续实验并观察什么有效。我们的大多数 Skills 最初只有几行和一个 Gotcha；Claude 每遇到新的边缘情况，人们就补充一条经验，它们也由此逐步成熟。

希望这些内容有帮助。欢迎继续交流问题。
