---
translationKey: "claude-agent-sdk-complete-guide"
locale: "zh"
title: "使用 Claude Agent SDK 构建 Agent 的完整指南"
description: "介绍 Claude Agent SDK 的核心概念、工具调用、权限和 Agent 构建方式。"
publishedAt: "2025-01-09"
updatedAt: "2025-01-09"
category: "development"
sourceLocale: "en"
sourceUrl: "https://nader.substack.com/p/the-complete-guide-to-building-agents"
sourceAuthor: "Nader Dabit"
contentType: "adaptation"
translationStatus: "reviewed"
---

> 原文链接：[The Complete Guide to Building Agents with the Claude Agent SDK](https://nader.substack.com/p/the-complete-guide-to-building-agents)
>
> 翻译日期：2025年1月9日

---

如果你使用过 Claude Code，你就见识过 AI agent 真正能做什么：读取文件、运行命令、编辑代码、找出完成任务的步骤。

而且你知道它不只是帮你写代码，它会接管问题，像一个深思熟虑的工程师那样去解决问题。

Claude Agent SDK 就是同样的引擎，你可以把它指向任何你想解决的问题，轻松构建自己的 agent。

它是 Claude Code 背后的基础设施，以库的形式暴露出来。你得到了 agent 循环、内置工具、上下文管理——基本上所有你原本需要自己构建的东西。

本指南将从头开始构建一个代码审查 agent。完成后，你将拥有一个能够分析代码库、发现 bug 和安全问题、并返回结构化反馈的工具。

更重要的是，你会理解 SDK 的工作原理，这样你就能构建你真正需要的任何东西。

我们的代码审查 agent 将：

1. 分析代码库中的 bug 和安全问题
2. 自主读取文件和搜索代码
3. 提供结构化、可操作的反馈
4. 在工作时跟踪进度

- **Runtime（运行时）** - Claude Code CLI
- **SDK（软件开发工具包）** - @anthropic-ai/claude-agent-sdk
- **Language（编程语言）** - TypeScript
- **Model（模型）** - Claude Opus 4.5

---

## SDK vs 原始 API

如果你用原始 API 构建过 agent，你知道这个模式：调用模型、检查它是否想使用工具、执行工具、把结果喂回去、重复直到完成。在构建任何非琐碎的东西时，这会变得很繁琐。

SDK 处理这个循环：

```typescript
// 没有 SDK：你管理循环
let response = await client.messages.create({...});
while (response.stop_reason === "tool_use") {
  const result = yourToolExecutor(response.tool_use);
  response = await client.messages.create({ tool_result: result, ... });
}

// 使用 SDK：Claude 管理它
for await (const message of query({ prompt: "修复 auth.py 中的 bug" })) {
  console.log(message); // Claude 读取文件、发现 bug、编辑代码
}
```

你还能开箱即用地使用这些工具：

- **Read（读取）** - 读取工作目录中的任何文件
- **Write（写入）** - 创建新文件
- **Edit（编辑）** - 对现有文件进行精确编辑
- **Bash** - 运行终端命令
- **Glob** - 按模式查找文件
- **Grep** - 用正则表达式搜索文件内容
- **WebSearch** - 搜索网络
- **WebFetch** - 获取并解析网页

你不需要自己实现任何这些东西。

---

## 环境准备

### 前置要求

1. 安装 Node.js 18+
2. 一个 Anthropic API key（在这里获取）

### 步骤 1：安装 Claude Code CLI

Agent SDK 使用 Claude Code 作为运行时：

```bash
npm install -g @anthropic-ai/claude-code
```

安装后，在终端运行 `claude` 并按照提示进行身份验证。

### 步骤 2：创建项目

```bash
mkdir code-review-agent && cd code-review-agent
npm init -y
npm install @anthropic-ai/claude-agent-sdk
npm install -D typescript @types/node tsx
```

### 步骤 3：设置 API key

```bash
export ANTHROPIC_API_KEY=your-api-key
```

---

## 第一个 Agent

创建 `agent.ts`：

```typescript
// 导入 query 函数，这是 SDK 的核心入口
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  // 使用 query 函数创建一个 agent 查询
  // query 返回一个异步生成器，会流式返回消息
  for await (const message of query({
    prompt: "这个目录里有什么文件？", // 用户提示词
    options: {
      model: "opus", // 使用的模型
      allowedTools: ["Glob", "Read"], // 允许使用的工具列表
      maxTurns: 250 // 最大对话轮数
    }
  })) {
    // 处理 assistant 类型的消息（Claude 的响应）
    if (message.type === "assistant") {
      // 遍历消息内容中的所有块
      for (const block of message.message.content) {
        // 如果是文本块，输出到控制台
        if ("text" in block) {
          console.log(block.text);
        }
      }
    }

    // 处理结果类型的消息（最终结果）
    if (message.type === "result") {
      console.log("\n完成:", message.subtype);
    }
  }
}

main();
```

运行它：

```bash
npx tsx agent.ts
```

Claude 会使用 **Glob** 工具列出文件并告诉你它找到了什么。

---

## 理解消息类型

`query()` 函数返回一个异步生成器，在 Claude 工作时流式传输消息。以下是关键的消息类型：

```typescript
for await (const message of query({ prompt: "..." })) {
  switch (message.type) {
    case "system":
      // 会话初始化信息
      if (message.subtype === "init") {
        console.log("会话 ID:", message.session_id);
        console.log("可用工具:", message.tools);
      }
      break;

    case "assistant":
      // Claude 的响应和工具调用
      for (const block of message.message.content) {
        if ("text" in block) {
          console.log("Claude:", block.text);
        } else if ("name" in block) {
          console.log("工具调用:", block.name);
        }
      }
      break;

    case "result":
      // 最终结果
      console.log("状态:", message.subtype); // "success" 或错误类型
      console.log("费用:", message.total_cost_usd);
      break;
  }
}
```

---

## 构建代码审查 Agent

现在让我们构建一些有用的东西。创建 `review-agent.ts`：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// 代码审查主函数
async function reviewCode(directory: string) {
  console.log(`\n🔍 开始代码审查: ${directory}\n`);

  // 使用 query 创建 agent 任务
  for await (const message of query({
    // 定义审查任务的具体要求
    prompt: `审查 ${directory} 中的代码，查找：
1. Bug 和潜在的崩溃问题
2. 安全漏洞
3. 性能问题
4. 代码质量改进

请具体说明文件名和行号。`,
    options: {
      model: "opus", // 使用 Opus 模型获得最佳分析能力
      allowedTools: ["Read", "Glob", "Grep"], // 限制只能使用读取类工具
      permissionMode: "bypassPermissions", // 绕过权限检查（自动批准读操作）
      maxTurns: 250 // 最多 250 轮对话
    }
  })) {
    // 显示 Claude 的实时分析过程
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        // 输出文本内容
        if ("text" in block) {
          console.log(block.text);
        // 显示正在使用的工具
        } else if ("name" in block) {
          console.log(`\n📁 正在使用 ${block.name}...`);
        }
      }
    }

    // 显示完成状态
    if (message.type === "result") {
      if (message.subtype === "success") {
        console.log(`\n✅ 审查完成！费用: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.log(`\n❌ 审查失败: ${message.subtype}`);
      }
    }
  }
}

// 审查当前目录
reviewCode(".");
```

### 测试

创建一个包含一些故意问题的文件。创建 `example.ts`：

```typescript
// 处理用户列表的函数
function processUsers(users: any) {
  // Off-by-one 错误：应该是 < 而不是 <=
  for (let i = 0; i <= users.length; i++) {
    // 没有空值检查，可能抛出错误
    console.log(users[i].name.toUpperCase());
  }
}

// 连接数据库的函数
function connectToDb(password: string) {
  // 构建连接字符串
  const connectionString = `postgres://admin:${password}@localhost/db`;
  // 记录敏感数据（安全风险）
  console.log("正在连接:", connectionString);
}

// 获取数据的异步函数
async function fetchData(url) {
  // 缺少类型注解
  const response = await fetch(url);
  // 没有错误处理
  return response.json();
}
```

运行审查：

```bash
npx tsx review-agent.ts
```

Claude 会识别出 bug、安全问题，并建议修复方案。

---

## 结构化输出

对于编程用途，你会需要结构化数据。SDK 支持 JSON Schema 输出：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// 定义审查结果的 JSON Schema
const reviewSchema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] }, // 严重程度
          category: { type: "string", enum: ["bug", "security", "performance", "style"] }, // 问题类别
          file: { type: "string" }, // 文件路径
          line: { type: "number" }, // 行号
          description: { type: "string" }, // 问题描述
          suggestion: { type: "string" } // 修复建议
        },
        required: ["severity", "category", "file", "description"]
      }
    },
    summary: { type: "string" }, // 总结
    overallScore: { type: "number" } // 总体评分
  },
  required: ["issues", "summary", "overallScore"]
};

// 带结构化输出的代码审查函数
async function reviewCodeStructured(directory: string) {
  for await (const message of query({
    prompt: `审查 ${directory} 中的代码。识别所有问题。`,
    options: {
      model: "opus",
      allowedTools: ["Read", "Glob", "Grep"],
      permissionMode: "bypassPermissions",
      maxTurns: 250,
      outputFormat: {
        type: "json_schema", // 指定输出格式为 JSON Schema
        schema: reviewSchema
      }
    }
  })) {
    // 处理成功的结果
    if (message.type === "result" && message.subtype === "success") {
      const review = message.structured_output as {
        issues: Array<{
          severity: string;
          category: string;
          file: string;
          line?: number;
          description: string;
          suggestion?: string;
        }>;
        summary: string;
        overallScore: number;
      };

      // 打印格式化的结果
      console.log(`\n📊 代码审查结果\n`);
      console.log(`评分: ${review.overallScore}/100`);
      console.log(`总结: ${review.summary}\n`);

      // 按严重程度分类显示问题
      for (const issue of review.issues) {
        // 根据严重程度选择图标
        const icon = issue.severity === "critical" ? "🔴" :
                     issue.severity === "high" ? "🟠" :
                     issue.severity === "medium" ? "🟡" : "🟢";
        console.log(`${icon} [${issue.category.toUpperCase()}] ${issue.file}${issue.line ? `:${issue.line}` : ""}`);
        console.log(`   ${issue.description}`);
        if (issue.suggestion) {
          console.log(`   💡 ${issue.suggestion}`);
        }
        console.log();
      }
    }
  }
}

reviewCodeStructured(".");
```

---

## 权限管理

默认情况下，SDK 在执行工具之前会请求批准。你可以自定义这个行为：

### 权限模式

```typescript
options: {
  // 标准模式 - 提示批准
  permissionMode: "default",

  // 自动批准文件编辑
  permissionMode: "acceptEdits",

  // 无提示（谨慎使用）
  permissionMode: "bypassPermissions"
}
```

### 自定义权限处理器

为了细粒度控制，使用 `canUseTool`：

```typescript
options: {
  // 自定义工具权限检查函数
  canUseTool: async (toolName, input) => {
    // 允许所有读操作
    if (["Read", "Glob", "Grep"].includes(toolName)) {
      return { behavior: "allow", updatedInput: input };
    }

    // 阻止写入某些文件
    if (toolName === "Write" && input.file_path?.includes(".env")) {
      return { behavior: "deny", message: "无法修改 .env 文件" };
    }

    // 允许其他所有操作
    return { behavior: "allow", updatedInput: input };
  }
}
```

---

## Subagent（子代理）

对于复杂任务，你可以创建专门的 subagent：

```typescript
import { query, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

// 综合代码审查函数，使用多个 subagent
async function comprehensiveReview(directory: string) {
  for await (const message of query({
    prompt: `对 ${directory} 进行全面的代码审查。
使用 security-reviewer 检查安全问题，使用 test-analyzer 分析测试覆盖率。`,
    options: {
      model: "opus",
      allowedTools: ["Read", "Glob", "Grep", "Task"], // Task 工具启用 subagent
      permissionMode: "bypassPermissions",
      maxTurns: 250,
      // 定义可用的 subagent
      agents: {
        "security-reviewer": {
          description: "安全专家，用于漏洞检测",
          prompt: `你是一个安全专家。重点关注：
- SQL 注入、XSS、CSRF 漏洞
- 暴露的凭据和密钥
- 不安全的数据处理
- 认证/授权问题`,
          tools: ["Read", "Grep", "Glob"],
          model: "sonnet" // 使用 Sonnet 模型
        } as AgentDefinition,

        "test-analyzer": {
          description: "测试覆盖率和质量分析器",
          prompt: `你是一个测试专家。分析：
- 测试覆盖率缺口
- 缺少的边界情况
- 测试质量和可靠性
- 额外测试的建议`,
          tools: ["Read", "Grep", "Glob"],
          model: "haiku" // 使用更快的模型进行简单分析
        } as AgentDefinition
      }
    }
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if ("text" in block) {
          console.log(block.text);
        } else if ("name" in block && block.name === "Task") {
          // 显示任务委托信息
          console.log(`\n🤖 委托给: ${(block.input as any).subagent_type}`);
        }
      }
    }
  }
}

comprehensiveReview(".");
```

---

## 多轮对话

对于多轮对话，可以捕获和恢复会话：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function interactiveReview() {
  let sessionId: string | undefined;

  // 初始审查
  for await (const message of query({
    prompt: "审查这个代码库并找出前 3 个问题",
    options: {
      model: "opus",
      allowedTools: ["Read", "Glob", "Grep"],
      permissionMode: "bypassPermissions",
      maxTurns: 250
    }
  })) {
    // 保存会话 ID
    if (message.type === "system" && message.subtype === "init") {
      sessionId = message.session_id;
    }
    // ... 处理消息
  }

  // 使用同一会话进行后续问题
  if (sessionId) {
    for await (const message of query({
      prompt: "现在告诉我如何修复最关键的问题",
      options: {
        resume: sessionId, // 继续对话
        allowedTools: ["Read", "Glob", "Grep"],
        maxTurns: 250
      }
    })) {
      // Claude 记得之前的上下文
    }
  }
}
```

---

## Hooks（钩子）

Hooks 让你拦截和自定义 agent 行为：

```typescript
import { query, HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

// 审计日志 Hook：记录所有工具调用
const auditLogger: HookCallback = async (input, toolUseId, { signal }) => {
  if (input.hook_event_name === "PreToolUse") {
    const preInput = input as PreToolUseHookInput;
    console.log(`[审计] ${new Date().toISOString()} - ${preInput.tool_name}`);
  }
  return {}; // 允许操作
};

// 阻止危险命令的 Hook
const blockDangerousCommands: HookCallback = async (input, toolUseId, { signal }) => {
  if (input.hook_event_name === "PreToolUse") {
    const preInput = input as PreToolUseHookInput;
    if (preInput.tool_name === "Bash") {
      const command = (preInput.tool_input as any).command || "";
      // 检查危险命令
      if (command.includes("rm -rf") || command.includes("sudo")) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny", // 拒绝执行
            permissionDecisionReason: "危险命令已被阻止"
          }
        };
      }
    }
  }
  return {};
};

// 使用 hooks
for await (const message of query({
  prompt: "清理临时文件",
  options: {
    model: "opus",
    allowedTools: ["Bash", "Glob"],
    maxTurns: 250,
    // 配置 hooks
    hooks: {
      PreToolUse: [
        { hooks: [auditLogger] }, // 应用到所有工具
        { matcher: "Bash", hooks: [blockDangerousCommands] } // 只应用到 Bash 工具
      ]
    }
  }
})) {
  // ...
}
```

---

## MCP（模型上下文协议）

使用 MCP 通过自定义工具扩展 Claude：

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// 创建自定义 MCP server
const customServer = createSdkMcpServer({
  name: "code-metrics", // server 名称
  version: "1.0.0",
  tools: [
    // 定义一个自定义工具
    tool(
      "analyze_complexity", // 工具名称
      "计算文件的圈复杂度", // 工具描述
      {
        filePath: z.string().describe("要分析的文件路径") // 参数定义
      },
      async (args) => {
        // 你的复杂度分析逻辑
        const complexity = Math.floor(Math.random() * 20) + 1; // 占位符
        return {
          content: [{
            type: "text",
            text: `${args.filePath} 的圈复杂度: ${complexity}`
          }]
        };
      }
    )
  ]
});

// 为 MCP server 使用流式输入
async function* generateMessages() {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "分析 main.ts 的复杂度"
    }
  };
}

for await (const message of query({
  prompt: generateMessages(),
  options: {
    model: "opus",
    // 配置 MCP server
    mcpServers: {
      "code-metrics": customServer
    },
    allowedTools: ["Read", "mcp__code-metrics__analyze_complexity"],
    maxTurns: 250
  }
})) {
  // ...
}
```

---

## 成本追踪

追踪 API 成本用于计费：

```typescript
for await (const message of query({ prompt: "..." })) {
  if (message.type === "result" && message.subtype === "success") {
    console.log("总成本:", message.total_cost_usd);
    console.log("Token 使用:", message.usage);

    // 按模型细分（在使用 subagent 时有用）
    for (const [model, usage] of Object.entries(message.modelUsage)) {
      console.log(`${model}: $${usage.costUSD.toFixed(4)}`);
    }
  }
}
```

---

## 完整的生产级 Agent

这是一个将所有内容整合在一起的生产级 agent：

```typescript
import { query, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

// 定义审查结果接口
interface ReviewResult {
  issues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    category: "bug" | "security" | "performance" | "style";
    file: string;
    line?: number;
    description: string;
    suggestion?: string;
  }>;
  summary: string;
  overallScore: number;
}

// 定义审查结果的 JSON Schema
const reviewSchema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          category: { type: "string", enum: ["bug", "security", "performance", "style"] },
          file: { type: "string" },
          line: { type: "number" },
          description: { type: "string" },
          suggestion: { type: "string" }
        },
        required: ["severity", "category", "file", "description"]
      }
    },
    summary: { type: "string" },
    overallScore: { type: "number" }
  },
  required: ["issues", "summary", "overallScore"]
};

// 运行代码审查的主函数
async function runCodeReview(directory: string): Promise<ReviewResult | null> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🔍 代码审查 Agent`);
  console.log(`📁 目录: ${directory}`);
  console.log(`${"=".repeat(50)}\n`);

  let result: ReviewResult | null = null;

  for await (const message of query({
    prompt: `对 ${directory} 进行彻底的代码审查。

分析所有源文件，查找：
1. Bug 和潜在的运行时错误
2. 安全漏洞
3. 性能问题
4. 代码质量和可维护性

尽可能具体说明文件路径和行号。`,
    options: {
      model: "opus",
      allowedTools: ["Read", "Glob", "Grep", "Task"],
      permissionMode: "bypassPermissions",
      maxTurns: 250,
      outputFormat: {
        type: "json_schema",
        schema: reviewSchema
      },
      // 定义 subagent
      agents: {
        "security-scanner": {
          description: "深度安全分析，用于漏洞检测",
          prompt: `你是一个安全专家。扫描：
- 注入漏洞（SQL、XSS、命令注入）
- 认证和授权缺陷
- 敏感数据暴露
- 不安全的依赖项`,
          tools: ["Read", "Grep", "Glob"],
          model: "sonnet"
        } as AgentDefinition
      }
    }
  })) {
    // 进度更新
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if ("name" in block) {
          if (block.name === "Task") {
            console.log(`🤖 委托给: ${(block.input as any).subagent_type}`);
          } else {
            console.log(`📂 ${block.name}: ${getToolSummary(block)}`);
          }
        }
      }
    }

    // 最终结果
    if (message.type === "result") {
      if (message.subtype === "success" && message.structured_output) {
        result = message.structured_output as ReviewResult;
        console.log(`\n✅ 审查完成！费用: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.log(`\n❌ 审查失败: ${message.subtype}`);
      }
    }
  }

  return result;
}

// 获取工具摘要
function getToolSummary(block: any): string {
  const input = block.input || {};
  switch (block.name) {
    case "Read": return input.file_path || "文件";
    case "Glob": return input.pattern || "模式";
    case "Grep": return `"${input.pattern}" 在 ${input.path || "."}`;
    default: return "";
  }
}

// 打印结果
function printResults(result: ReviewResult) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 审查结果`);
  console.log(`${"=".repeat(50)}\n`);

  console.log(`评分: ${result.overallScore}/100`);
  console.log(`发现问题: ${result.issues.length}\n`);
  console.log(`总结: ${result.summary}\n`);

  // 按严重程度分组
  const byCategory = {
    critical: result.issues.filter(i => i.severity === "critical"),
    high: result.issues.filter(i => i.severity === "high"),
    medium: result.issues.filter(i => i.severity === "medium"),
    low: result.issues.filter(i => i.severity === "low")
  };

  // 打印每个严重程度的问题
  for (const [severity, issues] of Object.entries(byCategory)) {
    if (issues.length === 0) continue;

    const icon = severity === "critical" ? "🔴" :
                 severity === "high" ? "🟠" :
                 severity === "medium" ? "🟡" : "🟢";

    console.log(`\n${icon} ${severity.toUpperCase()} (${issues.length})`);
    console.log("-".repeat(30));

    for (const issue of issues) {
      const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
      console.log(`\n[${issue.category}] ${location}`);
      console.log(`  ${issue.description}`);
      if (issue.suggestion) {
        console.log(`  💡 ${issue.suggestion}`);
      }
    }
  }
}

// 运行审查
async function main() {
  const directory = process.argv[2] || ".";
  const result = await runCodeReview(directory);

  if (result) {
    printResults(result);
  }
}

main().catch(console.error);
```

运行它：

```bash
npx tsx review-agent.ts ./src
```

代码审查 agent 涵盖了核心内容：`query()`、`allowedTools`、结构化输出、subagent 和权限。

---

## 深入学习

如果你想更深入：

### 更多能力

- **File checkpointing（文件检查点）** - 跟踪和恢复文件更改
- **Skills（技能）** - 打包可重用的能力

### 生产部署

- **Hosting（托管）** - 在容器和 CI/CD 中部署
- **Secure deployment（安全部署）** - 沙箱和凭据管理

### 完整参考

- [TypeScript SDK 参考](https://docs.anthropic.com/en/docs/build-with-claude/claude-for-developers)
- [Python SDK 参考](https://docs.anthropic.com/en/docs/build-with-claude/claude-for-developers)

---

> 本指南涵盖 SDK 的 V1 版本。
>
> V2 目前正在开发中。一旦发布并稳定，我会更新本指南。
>
> 如果你有兴趣构建可验证的 agent，查看我们在 EigenCloud 的工作
