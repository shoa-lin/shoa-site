---
title: "Clawdbot 完整安装配置指南"
date: "2026-01-27"
source: "Clawdbot Official Documentation"
sourceUrl: "https://docs.clawd.bot"
author: "Shoa Lin"
tags: ["Clawdbot", "AI Agent", "DevOps", "Docker", "自动化工具"]
---

<style>
.blog-article-body {
    font-size: 1.05rem;
    line-height: 1.8;
}
.blog-article-body h2 {
    margin-top: 2.5rem;
    margin-bottom: 1.25rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
}
.blog-article-body h3 {
    margin-top: 2rem;
    margin-bottom: 1rem;
}
.blog-article-body h4 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
}
.blog-article-body p {
    margin-bottom: 1.25rem;
}
.blog-article-body ul, .blog-article-body ol {
    margin-bottom: 1.5rem;
}
.blog-article-body li {
    margin-bottom: 0.5rem;
}
.blog-article-body blockquote {
    border-left: 4px solid #667eea;
    padding-left: 1rem;
    margin: 1.5rem 0;
    color: #4b5563;
}
.blog-article-body code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
}
.blog-article-body pre {
    background-color: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5rem 0;
}
.blog-article-body pre code {
    background-color: transparent;
    padding: 0;
}
.blog-article-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.95rem;
}
.blog-article-body th,
.blog-article-body td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
}
.blog-article-body th {
    background-color: #f9fafb;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.85rem;
    color: #374151;
}
.blog-article-body tr:hover {
    background-color: #f9fafb;
}
@media (max-width: 768px) {
    .blog-article-body {
        font-size: 1rem;
    }
    .blog-article-body table {
        font-size: 0.85rem;
    }
    .blog-article-body th,
    .blog-article-body td {
        padding: 0.5rem 0.75rem;
    }
}
</style>

---

*发布于 2026年1月27日*

---

## 概述

> **更新日期**: 2026年1月27日
> **版本**: v2026.1.x
> **官方文档**: https://docs.clawd.bot
> **GitHub**: https://github.com/clawdbot/clawdbot

### Clawdbot 是什么？

**Clawdbot** 是一个开源的个人 AI 助手框架，由 Peter Steinberger (@steipete) 创建。它的核心特点：

- **本地运行**：完全运行在你自己的设备上（Mac/Linux/Windows/VPS）
- **多平台集成**：通过 WhatsApp、Telegram、Discord、Slack、Signal、iMessage 等消息平台交互
- **持久记忆**：自动管理长期记忆，跨会话保留上下文
- **24/7 运行**：可作为后台服务持续运行
- **完全可扩展**：通过 Skills 和 Plugins 系统扩展功能
- **隐私优先**：所有数据本地存储，不依赖外部云服务

### 核心架构

```text
消息平台 (WhatsApp/Telegram/Discord/...)
            ↓
    ┌───────────────────┐
    │     Gateway       │  ← 控制平面 (WebSocket)
    │  ws://127.0.0.1   │
    │     :18789        │
    └─────────┬─────────┘
              │
    ┌─────────┴─────────┐
    │                   │
  Agent              Tools
(AI 引擎)         (浏览器/文件/API)
    │                   │
    └─────────┬─────────┘
              │
        Workspace
      (记忆/会话/技能)
```

### 关键概念

- **Gateway**: 控制平面，管理所有通信、会话、工具调用
- **Agent**: AI 引擎，可以是 Claude、GPT 或其他 LLM
- **Workspace**: 工作区目录（默认 `~/clawd`），存储记忆、会话历史
- **Skills**: 扩展功能的指令集，告诉 AI 如何使用特定工具
- **Sessions**: 会话管理，每个对话有独立的上下文
- **Memory**: 记忆系统，自动持久化重要信息到 Markdown 文件

---

## 系统要求

### 硬件要求

**最低配置**：

- CPU: 1 核
- 内存: 2GB RAM（建议 4GB+）
- 硬盘: 5GB 可用空间

**推荐配置**：

- CPU: 2 核+
- 内存: 4GB+ RAM
- 硬盘: 10GB+ SSD

### 操作系统

支持的平台：

- **macOS**: 11+ (Intel & Apple Silicon)
- **Linux**: Ubuntu 20.04+, Debian, CentOS 等
- **Windows**: 通过 WSL2 (强烈推荐 Ubuntu)
- **Docker**: 支持容器化部署

**注意**：Windows 原生支持不完善，强烈建议使用 WSL2。

### 软件依赖

必需：

- **Node.js**: ≥ 22.x（推荐使用 nvm 管理）
- **npm/pnpm**: 包管理器（推荐 pnpm）
- **Git**: 版本控制

可选：

- **Docker**: 用于沙箱执行（安全隔离）
- **Chrome/Chromium**: 浏览器自动化功能

---

## 安装方式

Clawdbot 提供多种安装方式，根据你的需求选择：

|方式          |适用场景      |难度    |
|------------|----------|------|
|**npm 全局安装**|快速开始，个人使用 |⭐ 简单  |
|**源码编译**    |开发贡献，自定义修改|⭐⭐ 中等 |
|**Docker**  |容器化部署，多实例 |⭐⭐ 中等 |
|**VPS 部署**  |远程 24/7 运行|⭐⭐⭐ 复杂|
|**Nix**     |声明式配置     |⭐⭐⭐ 高级|

---

## 安装步骤

### 方式一：npm 全局安装（推荐新手）

#### Step 1: 安装 Node.js

**使用 nvm（推荐）**：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# 重新加载 shell 配置
source ~/.bashrc  # 或 ~/.zshrc (macOS)

# 安装 Node.js 22
nvm install 22
nvm use 22

# 验证安装
node -v  # 应该显示 v22.x.x
```

**或使用系统包管理器**：

```bash
# macOS (Homebrew)
brew install node@22

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v
npm -v
```

#### Step 2: 安装 Clawdbot CLI

```bash
# 使用 npm
npm install -g clawdbot@latest

# 或使用 pnpm（更快）
npm install -g pnpm
pnpm add -g clawdbot@latest

# 验证安装
clawdbot -v  # 应该显示版本号，如 2026.1.23-1
```

#### Step 3: 运行引导向导

```bash
# 启动配置向导（会自动安装后台服务）
clawdbot onboard --install-daemon
```

向导会引导你完成以下配置：

1. **安装位置**: 选择 Local（本地）或 Remote（远程服务器）
1. **AI 模型认证**:
   - Anthropic API Key（推荐）
   - OpenAI API Key
   - OAuth (Claude Pro/Max 订阅)
1. **默认模型**: 选择 Claude Opus 4.5 或 Sonnet 4.5
1. **消息平台**: 选择要启用的平台（WhatsApp/Telegram/Discord 等）
1. **工作区**: 设置 workspace 目录（默认 `~/clawd`）
1. **后台服务**: 选择是否安装为系统服务（推荐选 Yes）

#### Step 4: 配置完成后验证

```bash
# 检查 Gateway 状态
clawdbot gateway status

# 查看完整状态
clawdbot status --all

# 运行系统诊断
clawdbot doctor
```

预期输出：

```text
✅ Gateway listening on ws://127.0.0.1:18789
✅ Control UI available at http://127.0.0.1:18789/
✅ Model: anthropic/claude-opus-4-5
✅ Workspace: ~/clawd
✅ Channels: whatsapp (linked), telegram (configured)
```

---

### 方式二：从源码编译

适合想要修改源码或贡献代码的用户。

#### Step 1: 克隆仓库

```bash
# 克隆项目
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot

# 安装依赖（推荐使用 pnpm）
pnpm install

# 构建 UI（首次运行会自动安装 UI 依赖）
pnpm ui:build

# 构建项目
pnpm build
```

#### Step 2: 运行引导向导

```bash
# 直接运行 TypeScript（开发模式）
pnpm clawdbot onboard --install-daemon

# 或运行构建后的版本
node dist/cli.js onboard --install-daemon
```

#### Step 3: 开发模式（可选）

```bash
# 启动开发模式（自动重载）
pnpm gateway:watch
```

---

### 方式三：Docker 部署

适合容器化环境和多实例部署。

#### Step 1: 准备 Docker 环境

```bash
# 安装 Docker（如果未安装）
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# macOS
brew install docker
```

#### Step 2: 使用 Docker 脚本

```bash
# 克隆仓库
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot

# 运行 Docker 设置脚本
./docker-setup.sh
```

这会自动：

1. 构建 Docker 镜像
1. 运行引导向导
1. 启动 Gateway 容器

#### Step 3: 访问 Control UI

打开浏览器访问 `http://127.0.0.1:18789`，输入配置时生成的 token。

---

### 方式四：VPS 远程部署

适合需要 24/7 运行的场景。

#### 推荐 VPS 提供商

|提供商             |最低配置           |价格      |备注   |
|----------------|---------------|--------|-----|
|**Hetzner**     |4GB RAM, 2 vCPU|€3.49/月 |性价比高 |
|**DigitalOcean**|2GB RAM        |$12/月   |界面友好 |
|**Railway**     |按需计费           |~$5-20/月|一键部署 |
|**Render**      |免费层可用          |免费起     |有免费额度|

#### VPS 部署步骤（以 Ubuntu 为例）

```bash
# 1. 连接到 VPS
ssh user@your-vps-ip

# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 Clawdbot
npm install -g clawdbot@latest

# 4. 增加交换空间（如果内存 < 2GB）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. 运行向导
clawdbot onboard --install-daemon

# 6. 配置为系统服务
sudo systemctl enable clawdbot-gateway
sudo systemctl start clawdbot-gateway

# 7. 查看日志
journalctl -u clawdbot-gateway -f
```

**安全注意事项**：

- 配置防火墙（只开放必要端口）
- 使用 SSH 密钥而非密码
- 定期更新系统和 Clawdbot
- 考虑使用 Tailscale 进行安全远程访问

---

### 方式五：Windows (WSL2) 安装

**强烈建议使用 WSL2**，原生 Windows 支持不完善。

#### Step 1: 安装 WSL2

```powershell
# 在 PowerShell (管理员) 中运行
wsl --install -d Ubuntu

# 重启电脑
```

#### Step 2: 在 WSL2 中安装

重启后，打开 "Ubuntu" 应用，按照 Linux 安装步骤：

```bash
# 更新包列表
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Clawdbot
npm install -g clawdbot@latest

# 运行向导
clawdbot onboard --install-daemon
```

---

## 配置指南

### 配置文件结构

Clawdbot 的所有配置存储在 `~/.clawdbot/` 目录：

```text
~/.clawdbot/
├── clawdbot.json           # 主配置文件
├── credentials/            # 认证凭证
│   ├── oauth.json         # OAuth tokens
│   └── whatsapp/
│       └── default/
│           └── creds.json # WhatsApp 会话
└── agents/
    └── main/              # 默认 agent
        ├── agent/
        │   ├── auth-profiles.json  # API keys
        │   └── sessions/           # 会话历史
        └── MEMORY.md               # 长期记忆
```

### 配置 API Keys

#### 获取 Anthropic API Key

1. 访问 https://console.anthropic.com/
1. 登录/注册账号
1. 创建 API Key
1. 复制密钥

#### 配置方式一：通过向导

```bash
clawdbot configure --section auth
```

#### 配置方式二：手动编辑

编辑 `~/.clawdbot/agents/main/agent/auth-profiles.json`:

```json
{
  "profiles": [
    {
      "id": "anthropic-default",
      "provider": "anthropic",
      "apiKey": "sk-ant-api03-xxxxx",
      "enabled": true
    }
  ]
}
```

### 工作区（Workspace）配置

默认工作区在 `~/clawd`，可以自定义：

```bash
# 通过环境变量
export CLAWDBOT_WORKSPACE=/path/to/custom/workspace

# 或编辑 clawdbot.json
{
  "agents": {
    "defaults": {
      "workspace": "/path/to/custom/workspace"
    }
  }
}
```

工作区结构：

```text
~/clawd/
├── MEMORY.md              # 长期记忆
├── memory/
│   ├── 2026-01-27.md     # 每日日志
│   └── 2026-01-26.md
├── skills/               # 自定义技能
└── .cache/              # 缓存数据
```

### 记忆系统配置

Clawdbot 的记忆系统是其核心特性之一。

#### 记忆文件说明

- **MEMORY.md**: 策划的长期记忆（偏好、决策、重要事实）
- **memory/YYYY-MM-DD.md**: 每日日志（自动加载今天和昨天的）

#### 自动记忆刷新配置

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 4000,
          "systemPrompt": "Session nearing compaction. Store durable memories now.",
          "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

**工作原理**：

- 当会话接近 context window 上限时
- 自动提示 AI 将重要信息写入记忆文件
- 下次会话自动加载相关记忆

#### 向量搜索配置（可选）

启用记忆的语义搜索：

```json
{
  "tools": {
    "memory": {
      "vectorSearch": {
        "enabled": true,
        "provider": "gemini"
      }
    }
  }
}
```

---

## 消息平台配置

### WhatsApp 配置

WhatsApp 使用 QR 码登录（基于 Baileys 库）。

#### 初始配置

```bash
# 登录 WhatsApp
clawdbot channels login
```

这会显示一个 QR 码：

```text
█▀▀▀▀▀█ ▄▄▄▄▄ █▀▀▀▀▀█
█ ███ █ █▄▄▄█ █ ███ █
█ ▀▀▀ █ ▀▄▄▄▀ █ ▀▀▀ █
▀▀▀▀▀▀▀ █ █ █ ▀▀▀▀▀▀▀

[用 WhatsApp 扫描此二维码]
```

#### 使用步骤

1. 打开 WhatsApp 应用
1. 进入 设置 → 已链接的设备
1. 扫描终端显示的 QR 码
1. 连接成功后，会话凭证存储在 `~/.clawdbot/credentials/whatsapp/`

#### 权限控制

配置 `clawdbot.json`:

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "allowFrom": ["+1234567890"],
      "groups": ["*"]
    }
  }
}
```

#### 多账号配置

```bash
# 添加第二个账号
clawdbot channels login --account work

# 查看所有账号
clawdbot channels status
```

---

### Telegram 配置

Telegram 需要创建 Bot。

#### Step 1: 创建 Telegram Bot

1. 在 Telegram 中打开 [@BotFather](https://t.me/BotFather)
1. 发送 `/newbot`
1. 按提示设置名称和用户名
1. 记录 Bot Token（格式：`1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`）

#### Step 2: 配置 Bot 权限

在 BotFather 中：

```text
/setprivacy → Disable
```

#### Step 3: 配置 Clawdbot

```bash
# 方式一：通过向导
clawdbot configure --section telegram

# 方式二：环境变量
export TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"

# 方式三：编辑配置文件
```

编辑 `clawdbot.json`:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
      "allowFrom": ["*"],
      "groups": {
        "*": {
          "requireMention": true
        }
      }
    }
  }
}
```

#### Step 4: 测试

1. 在 Telegram 中搜索你的 Bot
1. 点击 "Start"
1. 发送消息测试

---

### Discord 配置

#### Step 1: 创建 Discord Bot

1. 访问 https://discord.com/developers/applications
1. 点击 "New Application"
1. 设置应用名称
1. 进入 "Bot" 标签
1. 点击 "Add Bot"

#### Step 2: 配置 Bot 权限

在 "Bot" 设置中启用：

- ✅ **MESSAGE CONTENT INTENT** (必需)
- ✅ SERVER MEMBERS INTENT (可选)
- ✅ PRESENCE INTENT (可选)

#### Step 3: 获取 Bot Token

点击 "Reset Token"，复制 token。

#### Step 4: 配置 Clawdbot

```bash
clawdbot configure --section discord
```

或编辑配置：

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "botToken": "你的Discord_Bot_Token",
      "channels": {
        "open": true
      }
    }
  }
}
```

#### Step 5: 邀请 Bot 到服务器

生成邀请链接：

1. 在 Discord Developer Portal 的 "OAuth2" → "URL Generator"
1. 选择 Scopes: `bot`
1. 选择 Permissions: `Send Messages`, `Read Message History` 等
1. 复制生成的 URL，在浏览器中打开
1. 选择服务器并授权

---

### 其他平台

#### Slack

```bash
clawdbot configure --section slack
```

需要创建 Slack App 并获取 Bot Token。

#### Signal

需要 Signal CLI，参考：https://docs.clawd.bot/channels/signal

#### iMessage（仅 macOS）

自动支持，无需额外配置。

---

## 高级配置

### 安全沙箱配置

为了安全，非主会话（群组/频道）可以在 Docker 沙箱中运行。

#### 启用沙箱

编辑 `clawdbot.json`:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "image": "clawdbot/sandbox:latest"
      }
    }
  }
}
```

#### 工具权限控制

```json
{
  "tools": {
    "policy": {
      "bash": "ask",
      "browser": "deny",
      "write": "auto"
    }
  }
}
```

权限级别：

- `auto`: 自动执行
- `ask`: 执行前询问
- `deny`: 禁止执行

### 多 Agent 配置

可以为不同场景创建多个 Agent。

#### 创建新 Agent

```bash
clawdbot agents create work
```

#### 配置 Agent 路由

```json
{
  "agents": {
    "routing": {
      "whatsapp:+1234567890": "personal",
      "telegram:@workgroup": "work"
    }
  }
}
```

### Cron 任务配置

设置定时任务。

#### 添加 Cron 任务

```bash
# 每天早上 8 点发送摘要
clawdbot cron add \
  --schedule "0 8 * * *" \
  --message "Generate my daily briefing" \
  --target "+1234567890"
```

#### 查看 Cron 任务

```bash
clawdbot cron list
```

### Webhooks 配置

接收外部事件触发。

```json
{
  "webhooks": {
    "endpoints": [
      {
        "path": "/webhook/github",
        "secret": "your-secret",
        "action": "notify-telegram"
      }
    ]
  }
}
```

### Skills 管理

#### 查看已安装的 Skills

```bash
clawdbot skills list
```

#### 从 ClawdHub 安装 Skills

```bash
# 安装单个 skill
clawdhub install frontend-design

# 同步所有 skills
clawdhub sync --all
```

#### 创建自定义 Skill

在 `~/clawd/skills/` 创建 `my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: 我的自定义技能
---

当用户请求 [某功能] 时，执行以下步骤：
1. 使用 bash 工具运行命令
2. 返回结果
```

### 远程访问配置

#### 使用 Tailscale（推荐）

```bash
# 安装 Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# 启动 Tailscale
sudo tailscale up

# 暴露 Gateway
tailscale funnel 18789
```

现在可以通过 Tailscale 网络远程访问 Gateway。

---

## 常用命令

### Gateway 管理

```bash
# 启动 Gateway（前台）
clawdbot gateway --port 18789 --verbose

# 查看 Gateway 状态
clawdbot gateway status

# 重启 Gateway
clawdbot gateway restart

# 停止 Gateway
clawdbot gateway stop
```

### 消息发送

```bash
# 发送消息到 WhatsApp
clawdbot message send \
  --channel whatsapp \
  --to "+1234567890" \
  --message "Hello from Clawdbot!"

# 发送消息到 Telegram
clawdbot message send \
  --channel telegram \
  --to "@username" \
  --message "Test message"
```

### Agent 交互

```bash
# 直接与 Agent 对话（可选择发送到频道）
clawdbot agent \
  --message "帮我总结今天的新闻" \
  --thinking high

# 后台运行任务
clawdbot agent \
  --message "分析这个 CSV 文件" \
  --deliver telegram:@me
```

### 会话管理

```bash
# 查看活跃会话
clawdbot sessions list

# 查看会话历史
clawdbot sessions history <session-id>

# 清除会话
clawdbot sessions clear <session-id>
```

### 配置管理

```bash
# 打开配置向导
clawdbot configure

# 配置特定部分
clawdbot configure --section web
clawdbot configure --section telegram

# 重置配置
clawdbot reset --confirm
```

### 系统诊断

```bash
# 运行完整诊断
clawdbot doctor

# 自动修复问题
clawdbot doctor --fix

# 查看详细状态
clawdbot status --all
```

### 日志查看

```bash
# 查看实时日志
clawdbot logs --follow

# 查看最近 100 行
clawdbot logs --tail 100

# 查看特定日期
clawdbot logs --date 2026-01-27
```

---

## 故障排除

### 常见问题

#### 问题 1: Gateway 无法启动

**症状**：运行 `clawdbot gateway` 后无响应或报错

**解决方案**：

```bash
# 1. 检查端口占用
lsof -i :18789

# 2. 检查配置文件
clawdbot doctor

# 3. 查看详细日志
clawdbot gateway --verbose

# 4. 重置配置
clawdbot reset --confirm
clawdbot onboard --install-daemon
```

#### 问题 2: WhatsApp 无法连接

**症状**：QR 码扫描后仍然无法连接

**解决方案**：

```bash
# 1. 清除现有会话
rm -rf ~/.clawdbot/credentials/whatsapp/

# 2. 重新登录
clawdbot channels login

# 3. 确保使用稳定的网络
# 4. 尝试使用不同的 WhatsApp 账号
```

#### 问题 3: Discord Bot 无响应

**症状**：Bot 在线但不响应消息

**解决方案**：

1. 确认 Bot 权限：
   - Discord Developer Portal → Bot → Privileged Gateway Intents
   - 启用 "MESSAGE CONTENT INTENT"

1. 检查配置：

```bash
clawdbot configure --section discord
```

1. 查看日志：

```bash
clawdbot logs --follow | grep discord
```

#### 问题 4: 内存不足（VPS）

**症状**：npm install 或运行时 out of memory

**解决方案**：

```bash
# 添加 2GB 交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 或限制 Node.js 内存
export NODE_OPTIONS="--max-old-space-size=1024"
```

#### 问题 5: Token 超限

**症状**：频繁提示 token 超出上下文窗口

**解决方案**：

1. 调整 compaction 设置：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "reserveTokensFloor": 30000
      }
    }
  }
}
```

1. 使用 `/compact` 或 `/new` 命令清理上下文
1. 切换到更大 context window 的模型（如 Claude Opus 4.5）

### 诊断命令

```bash
# 完整系统检查
clawdbot doctor

# 检查网络连接
clawdbot doctor --probe

# 检查频道状态
clawdbot channels status

# 检查权限配置
clawdbot doctor --security
```

### 日志分析

日志位置：

- Linux: `/tmp/clawdbot/clawdbot-gateway.log`
- macOS: `~/Library/Logs/clawdbot/`
- systemd: `journalctl -u clawdbot-gateway`

常用日志命令：

```bash
# 实时查看日志
tail -f /tmp/clawdbot/clawdbot-gateway.log

# 搜索错误
grep -i error /tmp/clawdbot/clawdbot-gateway.log

# 查看最近 1 小时
journalctl -u clawdbot-gateway --since "1 hour ago"
```

---

## 最佳实践

### 安全建议

1. **定期更新**

```bash
# 检查更新
clawdbot update --check

# 更新到最新版本
npm update -g clawdbot@latest
clawdbot doctor
```

1. **限制访问**

```json
{
  "channels": {
    "whatsapp": {
      "allowFrom": ["+1234567890"],
      "dmPolicy": "pairing"
    }
  }
}
```

1. **使用沙箱**

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main"
      }
    }
  }
}
```

1. **备份配置**

```bash
# 定期备份
cp -r ~/.clawdbot ~/backups/clawdbot-$(date +%Y%m%d)

# 或使用 Git
cd ~/.clawdbot
git init
git add .
git commit -m "Backup config"
```

### 性能优化

1. **使用更快的模型**
   - 日常任务：Claude Sonnet 4.5（速度快）
   - 复杂任务：Claude Opus 4.5（质量高）

1. **配置模型回退**

```json
{
  "models": {
    "defaults": {
      "fallback": ["sonnet", "opus"],
      "retries": 2
    }
  }
}
```

1. **限制会话历史**

```json
{
  "agents": {
    "defaults": {
      "maxHistoryMessages": 50
    }
  }
}
```

### 记忆管理最佳实践

1. **定期审查 MEMORY.md**
   - 每周检查一次 `~/clawd/MEMORY.md`
   - 删除过时信息
   - 整理重要决策

1. **使用明确的记忆提示**
   - 告诉 AI："记住我偏好使用 TypeScript"
   - 而不是隐式依赖 AI 记住

1. **利用日志功能**
   - `memory/YYYY-MM-DD.md` 自动记录每日上下文
   - 可以手动编辑补充信息

### 多场景使用建议

#### 个人助手场景

```bash
# 配置每日简报
clawdbot cron add \
  --schedule "0 8 * * *" \
  --message "Generate my daily briefing: weather, calendar, news" \
  --target "telegram:@me"

# 配置晚间总结
clawdbot cron add \
  --schedule "0 20 * * *" \
  --message "Summarize today's activities and plan for tomorrow" \
  --target "whatsapp:+1234567890"
```

#### 开发团队协作

```json
{
  "agents": {
    "routing": {
      "discord:dev-channel": "dev-agent",
      "slack:general": "general-agent"
    }
  },
  "agents": {
    "dev-agent": {
      "workspace": "~/clawd-dev",
      "skills": ["github", "docker", "testing"]
    }
  }
}
```

#### 内容创作

安装相关 Skills：

```bash
clawdhub install frontend-design
clawdhub install image-gen
clawdhub install content-writer
```

### 监控和维护

1. **设置健康检查**

```bash
# 添加心跳检查
clawdbot cron add \
  --schedule "0 * * * *" \
  --message "/status" \
  --target "telegram:@admin"
```

1. **监控资源使用**

```bash
# 查看内存使用
ps aux | grep clawdbot

# 查看磁盘使用
du -sh ~/.clawdbot/
du -sh ~/clawd/
```

1. **定期清理**

```bash
# 清理旧会话
clawdbot sessions prune --days 30

# 清理缓存
rm -rf ~/clawd/.cache/*
```

---

## 附录

### 配置文件完整示例

```json
{
  "gateway": {
    "port": 18789,
    "bind": "127.0.0.1",
    "auth": {
      "token": "your-gateway-token"
    }
  },
  "agents": {
    "defaults": {
      "workspace": "/home/user/clawd",
      "model": "anthropic/claude-opus-4-5",
      "compaction": {
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 4000
        }
      },
      "sandbox": {
        "mode": "non-main"
      }
    }
  },
  "channels": {
    "whatsapp": {
      "enabled": true,
      "allowFrom": ["+1234567890"],
      "groups": ["*"]
    },
    "telegram": {
      "enabled": true,
      "botToken": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
      "allowFrom": ["*"]
    },
    "discord": {
      "enabled": true,
      "botToken": "your-discord-token",
      "channels": {
        "open": true
      }
    }
  },
  "tools": {
    "web": {
      "search": {
        "apiKey": "your-brave-search-key"
      }
    },
    "policy": {
      "bash": "ask",
      "browser": "auto",
      "write": "auto"
    }
  }
}
```

### 常用资源链接

- **官方文档**: https://docs.clawd.bot
- **GitHub 仓库**: https://github.com/clawdbot/clawdbot
- **Discord 社区**: https://discord.com/invite/clawd
- **Skills 注册表**: https://clawdhub.com
- **技术博客**: https://clawd.bot/blog

### 社区资源

- **Awesome Clawdbot Skills**: https://github.com/VoltAgent/awesome-clawdbot-skills
- **中文社区**: （待建立）
- **YouTube 教程**: 搜索 "Clawdbot tutorial"

---

## 更新日志

### 最近更新（v2026.1.x）

- ✅ 新增插件系统
- ✅ 改进记忆管理
- ✅ 优化 Token 使用
- ✅ 支持更多消息平台
- ✅ 增强安全沙箱

### 路线图

- 🔜 原生 Windows 支持改进
- 🔜 移动端伴侣应用
- 🔜 更多预置 Skills
- 🔜 Web UI 增强

---

**Happy Automating! 🦞**

有问题？访问 [官方文档](https://docs.clawd.bot) 或加入 [Discord 社区](https://discord.com/invite/clawd)
