---
translationKey: "clawdbot-installation-guide"
locale: "en"
title: "Clawdbot complete installation and configuration guide"
description: "Organizes the installation, configuration, container deployment, and common troubleshooting steps for OpenClaw (formerly Clawdbot)."
publishedAt: "2026-01-27"
updatedAt: "2026-01-27"
category: "application"
sourceLocale: "zh"
sourceUrl: "https://docs.openclaw.ai/"
sourceAuthor: "OpenClaw Documentation"
contentType: "translation"
translationStatus: "draft"
---

---

*Published on January 27, 2026*

---

## Overview

> **Updated**: January 27, 2026
> **Version**: v2026.1.x
> **Official Documentation**: https://docs.clawd.bot
> **GitHub**: https://github.com/clawdbot/clawdbot

### What is Clawdbot?

**Clawdbot** is an open source personal AI assistant framework created by Peter Steinberger (@steipete). Its core features:

- **Run locally**: completely run on your own device (Mac/Linux/Windows/VPS)
- **Multi-platform integration**: Interact through messaging platforms such as WhatsApp, Telegram, Discord, Slack, Signal, iMessage and more
- **Persistent Memory**: Automatically manages long-term memory, retaining context across sessions
- **24/7 operation**: can run continuously as a background service
- **Fully Extensible**: Expand functionality via Skills and Plugins system
- **Privacy First**: All data is stored locally and does not rely on external cloud services

### core architecture

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

### Key concepts

- **Gateway**: control plane, manages all communications, sessions, and tool calls
- **Agent**: AI engine, which can be Claude, GPT or other LLM
- **Workspace**: workspace directory (default \`~/clawd\`), stores memory and session history
- **Skills**: A set of instructions that extend functionality and tell the AI how to use specific tools
- **Sessions**: Session management, each conversation has an independent context
- **Memory**: Memory system, automatically persists important information to Markdown files

---

## System requirements

### Hardware requirements

**Minimum Configuration**:

- CPU: 1 core
- Memory: 2GB RAM (4GB+ recommended)
- Hard drive: 5GB free space

**Recommended configuration**:

- CPU: 2 core+
- Memory: 4GB+ RAM
- Hard drive: 10GB+ SSD

### operating system

Supported platforms:

- **macOS**: 11+ (Intel & Apple Silicon)
- **Linux**: Ubuntu 20.04+, Debian, CentOS, etc.
- **Windows**: via WSL2 (Ubuntu highly recommended)
- **Docker**: supports containerized deployment

**Note**: Windows native support is incomplete and WSL2 is strongly recommended.

### Software dependencies

Required:

- **Node.js**: ≥ 22.x (recommended to use nvm management)
- **npm/pnpm**: Package manager (recommend pnpm)
- **Git**: version control

Optional:

- **Docker**: for sandbox execution (security isolation)
- **Chrome/Chromium**: Browser automation features

---

## Installation method

Clawdbot provides a variety of installation methods, choose according to your needs:

|Method |Applicable scenarios |Difficulty |
|------------|----------|------|
|**npm global installation**|Quick start, personal use |⭐ Simple |
|**Source code compilation** |Development contribution, custom modifications|⭐⭐ Medium |
|**Docker** |Containerized deployment, multiple instances |⭐⭐ Medium |
|**VPS Deployment** |Remote 24/7 operation|⭐⭐⭐ Complex|
|**Nix** |Declarative Configuration |⭐⭐⭐ Advanced|

---

## Detailed installation steps

### Method 1: npm global installation (recommended for novices)

#### Step 1: Install Node.js

**Use nvm (recommended)**:

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

**Or use your system package manager**:

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

#### Step 2: Install Clawdbot CLI

```bash
# 使用 npm
npm install -g clawdbot@latest

# 或使用 pnpm（更快）
npm install -g pnpm
pnpm add -g clawdbot@latest

# 验证安装
clawdbot -v  # 应该显示版本号，如 2026.1.23-1
```

#### Step 3: Run the boot wizard

```bash
# 启动配置向导（会自动安装后台服务）
clawdbot onboard --install-daemon
```

The wizard will guide you through the following configuration:

1. **Installation location**: Select Local or Remote
2. **AI model certification**:
   - Anthropic API Key (recommended)
   - OpenAI API Key
   - OAuth (Claude Pro/Max subscription)
3. **Default Model**: Select Claude Opus 4.5 or Sonnet 4.5
4. **Messaging Platform**: Select the platform to enable (WhatsApp/Telegram/Discord, etc.)
5. **Workspace**: Set the workspace directory (default \`~/clawd\`)
6. **Background Service**: Choose whether to install it as a system service (Yes is recommended)

#### Step 4: Verify after configuration is completed

```bash
# 检查 Gateway 状态
clawdbot gateway status

# 查看完整状态
clawdbot status --all

# 运行系统诊断
clawdbot doctor
```

Expected output:

```text
✅ Gateway listening on ws://127.0.0.1:18789
✅ Control UI available at http://127.0.0.1:18789/
✅ Model: anthropic/claude-opus-4-5
✅ Workspace: ~/clawd
✅ Channels: whatsapp (linked), telegram (configured)
```

---

### Method 2: Compile from source code

Suitable for users who want to modify the source code or contribute code.

#### Step 1: Clone the repository

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

#### Step 2: Run the boot wizard

```bash
# 直接运行 TypeScript（开发模式）
pnpm clawdbot onboard --install-daemon

# 或运行构建后的版本
node dist/cli.js onboard --install-daemon
```

#### Step 3: Development mode (optional)

```bash
# 启动开发模式（自动重载）
pnpm gateway:watch
```

---

### Method three: Docker deployment

Suitable for containerized environments and multi-instance deployments.

#### Step 1: Prepare Docker environment

```bash
# 安装 Docker（如果未安装）
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker \$USER

# macOS
brew install docker
```

#### Step 2: Use Docker script

```bash
# 克隆仓库
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot

# 运行 Docker 设置脚本
./docker-setup.sh
```

This will automatically:

1. Build Docker image
2. Run the boot wizard
3. Start the Gateway container

#### Step 3: Access Control UI

Open the browser and access \`http://127.0.0.1:18789\`, and enter the token generated during configuration.

---

### Method 4: VPS remote deployment

Suitable for scenarios requiring 24/7 operation.

#### Recommended VPS providers

|Provider |Minimum Configuration |Price |Remarks |
|----------------|---------------|--------|-----|
|**Hetzner** |4GB RAM, 2 vCPU|€3.49/month |Good value for money |
|**DigitalOcean**|2GB RAM |\$12/month |Friendly interface |
|**Railway** |On-demand billing |~\$5-20/month|One-click deployment |
|**Render** |Free tier available |Starts free |Free quota available|

#### VPS deployment steps (taking Ubuntu as an example)

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

**Safety Precautions**:

- Configure firewall (open only necessary ports)
- Use SSH keys instead of passwords
- Regularly update the system and Clawdbot
- Consider using Tailscale for secure remote access

---

### Method five: Windows (WSL2) installation

**WSL2 is strongly recommended**, native Windows support is incomplete.

#### Step 1: Install WSL2

```powershell
# 在 PowerShell (管理员) 中运行
wsl --install -d Ubuntu

# 重启电脑
```

#### Step 2: Install in WSL2

After restarting, open the "Ubuntu" application and follow the Linux installation steps:

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

## Configuration Guide

### Configuration file structure

All configurations for Clawdbot are stored in the \`~/.clawdbot/\` directory:

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

### Configure API Keys

#### Get Anthropic API Key

1. Visit https://console.anthropic.com/
2. Login/Register account
3. Create API Key
4. Copy the key

#### Configuration method one: through the wizard

```bash
clawdbot configure --section auth
```

#### Configuration method two: manual editing

Edit \`~/.clawdbot/agents/main/agent/auth-profiles.json\`:

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

### Workspace configuration

The default workspace is \`~/clawd\`, which can be customized:

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

Workspace structure:

```text
~/clawd/
├── MEMORY.md              # 长期记忆
├── memory/
│   ├── 2026-01-27.md     # 每日日志
│   └── 2026-01-26.md
├── skills/               # 自定义技能
└── .cache/              # 缓存数据
```

### Memory system configuration

Clawdbot's memory system is one of its core features.

#### Memory file description

- **MEMORY.md**: Curated long-term memory (preferences, decisions, important facts)
- **memory/YYYY-MM-DD.md**: Daily log (automatically loads today's and yesterday's)

#### Automatic memory refresh configuration

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

**How it works**:

- When the session approaches the upper limit of the context window
- Automatically prompt AI to write important information into memory files
- Automatically load related memories for the next session

#### Vector search configuration (optional)

Memory-enabled semantic search:

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

## Messaging platform configuration

### WhatsApp configuration

WhatsApp uses QR code login (based on Baileys library).

#### Initial configuration

```bash
# 登录 WhatsApp
clawdbot channels login
```

This will display a QR code:

```text
█▀▀▀▀▀█ ▄▄▄▄▄ █▀▀▀▀▀█
█ ███ █ █▄▄▄█ █ ███ █
█ ▀▀▀ █ ▀▄▄▄▀ █ ▀▀▀ █
▀▀▀▀▀▀▀ █ █ █ ▀▀▀▀▀▀▀

[用 WhatsApp 扫描此二维码]
```

#### Usage steps

1. Open the WhatsApp app
2. Go to Settings → Linked Devices
3. Scan the QR code displayed on the terminal
4. After the connection is successful, the session credentials are stored in \`~/.clawdbot/credentials/whatsapp/\`

#### Permission control

Configuration \`clawdbot.json\`:

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

#### Multiple account configuration

```bash
# 添加第二个账号
clawdbot channels login --account work

# 查看所有账号
clawdbot channels status
```

---

### Telegram configuration

Telegram requires creating a Bot.

#### Step 1: Create Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send \`/newbot\`
3. Follow the prompts to set the name and username
4. Record Bot Token (Format: \`1234567890:ABCdefGHIjklMNOpqrsTUVwxyz\`)

#### Step 2: Configure Bot permissions

In BotFather:

```text
/setprivacy → Disable  # 允许在群组中接收所有消息
```

#### Step 3: Configure Clawdbot

```bash
# 方式一：通过向导
clawdbot configure --section telegram

# 方式二：环境变量
export TELEGRAM_BOT_TOKEN=$YOUR_TELEGRAM_BOT_TOKEN

# 方式三：编辑配置文件
```

Edit \`clawdbot.json\`:

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

#### Step 4: Test

1. Search for your Bot in Telegram
2. Click "Start"
3. Send message test

---

### Discord configuration

#### Step 1: Create Discord Bot

1. Visit https://discord.com/developers/applications
2. Click "New Application"
3. Set application name
4. Go to the "Bot" tab
5. Click "Add Bot"

#### Step 2: Configure Bot permissions

Enabled in "Bot" settings:

- ✅ **MESSAGE CONTENT INTENT** (required)
- ✅ SERVER MEMBERS INTENT (optional)
- ✅ PRESENCE INTENT (optional)

#### Step 3: Get Bot Token

Click "Reset Token" to copy the token.

#### Step 4: Configure Clawdbot

```bash
clawdbot configure --section discord
```

Or edit the configuration:

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

#### Step 5: Invite Bot to the server

Generate invitation link:

1. Go to "OAuth2" → "URL Generator" in Discord Developer Portal
2. Select Scopes: \`bot\`
3. Select Permissions: \`Send Messages\`, \`Read Message History\`, etc.
4. Copy the generated URL and open it in the browser
5. Select server and authorize

---

### Other platforms

#### Slack

```bash
clawdbot configure --section slack
```

You need to create a Slack App and obtain a Bot Token.

#### Signal

Requires Signal CLI, reference: https://docs.clawd.bot/channels/signal

#### iMessage (macOS only)

Automatically supported, no additional configuration required.

---

## Advanced configuration

### Security sandbox configuration

For security, non-master sessions (groups/channels) can run in a Docker sandbox.

#### Enable sandbox

Edit \`clawdbot.json\`:

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

#### Tool permission control

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

Permission level:

- \`auto\`: automatic execution
- \`ask\`: ask before execution
- \`deny\`: disable execution

### Multi-Agent configuration

Multiple Agents can be created for different scenarios.

#### Create new agent

```bash
clawdbot agents create work
```

#### Configure Agent routing

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

### Cron task configuration

Set up scheduled tasks.

#### Add Cron task

```bash
# 每天早上 8 点发送摘要
clawdbot cron add \\
  --schedule "0 8 * * *" \\
  --message "Generate my daily briefing" \\
  --target "+1234567890"
```

#### View Cron tasks

```bash
clawdbot cron list
```

### Webhooks configuration

Receive external event triggers.

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

### Skills Management

#### View installed Skills

```bash
clawdbot skills list
```

#### Install Skills from ClawdHub

```bash
# 安装单个 skill
clawdhub install frontend-design

# 同步所有 skills
clawdhub sync --all
```

#### Create a custom skill

Create \`my-skill/SKILL.md\` in \`~/clawd/skills/\`:

```markdown
---
name: my-skill
description: 我的自定义技能
---

当用户请求 [某功能] 时，执行以下步骤：
1. 使用 bash 工具运行命令
2. 返回结果
```

### Remote access configuration

#### Use Tailscale (recommended)

```bash
# 安装 Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# 启动 Tailscale
sudo tailscale up

# 暴露 Gateway
tailscale funnel 18789
```

Gateway can now be accessed remotely over the Tailscale network.

---

## Common commands

### Gateway Management

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

### message sending

```bash
# 发送消息到 WhatsApp
clawdbot message send \\
  --channel whatsapp \\
  --to "+1234567890" \\
  --message "Hello from Clawdbot!"

# 发送消息到 Telegram
clawdbot message send \\
  --channel telegram \\
  --to "@username" \\
  --message "Test message"
```

### Agent interaction

```bash
# 直接与 Agent 对话（可选择发送到频道）
clawdbot agent \\
  --message "帮我总结今天的新闻" \\
  --thinking high

# 后台运行任务
clawdbot agent \\
  --message "分析这个 CSV 文件" \\
  --deliver telegram:@me
```

### Session management

```bash
# 查看活跃会话
clawdbot sessions list

# 查看会话历史
clawdbot sessions history <session-id>

# 清除会话
clawdbot sessions clear <session-id>
```

### Configuration management

```bash
# 打开配置向导
clawdbot configure

# 配置特定部分
clawdbot configure --section web
clawdbot configure --section telegram

# 重置配置
clawdbot reset --confirm
```

### System diagnostics

```bash
# 运行完整诊断
clawdbot doctor

# 自动修复问题
clawdbot doctor --fix

# 查看详细状态
clawdbot status --all
```

### Log view

```bash
# 查看实时日志
clawdbot logs --follow

# 查看最近 100 行
clawdbot logs --tail 100

# 查看特定日期
clawdbot logs --date 2026-01-27
```

---

## troubleshooting

### FAQ

#### Issue 1: Gateway fails to start

**Symptoms**: No response or error after running \`clawdbot gateway\`

**Solution**:

```bash
# 1. 检查端口占用
lsof -i :18789
# 如果被占用，杀死进程或更换端口

# 2. 检查配置文件
clawdbot doctor

# 3. 查看详细日志
clawdbot gateway --verbose

# 4. 重置配置
clawdbot reset --confirm
clawdbot onboard --install-daemon
```

#### Problem 2: WhatsApp cannot connect

**Symptom**: Still unable to connect after scanning QR code

**Solution**:

```bash
# 1. 清除现有会话
rm -rf ~/.clawdbot/credentials/whatsapp/

# 2. 重新登录
clawdbot channels login

# 3. 确保使用稳定的网络
# 4. 尝试使用不同的 WhatsApp 账号
```

#### Issue 3: Discord Bot unresponsive

**Symptoms**: Bot is online but not responding to messages

**Solution**:

1. Confirm Bot permissions:
   - Discord Developer Portal → Bot → Privileged Gateway Intents
   - Enable "MESSAGE CONTENT INTENT"
2. Check the configuration:

```bash
clawdbot configure --section discord
```

3. View the log:

```bash
clawdbot logs --follow | grep discord
```

#### Issue 4: Insufficient memory (VPS)

**Symptoms**: npm install or runtime out of memory

**Solution**:

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

#### Question 5: Token exceeds limit

**Symptoms**: Frequent prompts that the token exceeds the context window

**Solution**:

1. Adjust compaction settings:

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

2. Use the \`/compact\` or \`/new\` command to clean up the context
3. Switch to a model with a larger context window (such as Claude Opus 4.5)

### diagnostic commands

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

### Log analysis

Log location:

- Linux: \`/tmp/clawdbot/clawdbot-gateway.log\`
- macOS: \`~/Library/Logs/clawdbot/\`
- systemd: \`journalctl -u clawdbot-gateway\`

Commonly used logging commands:

```bash
# 实时查看日志
tail -f /tmp/clawdbot/clawdbot-gateway.log

# 搜索错误
grep -i error /tmp/clawdbot/clawdbot-gateway.log

# 查看最近 1 小时
journalctl -u clawdbot-gateway --since "1 hour ago"
```

---

## best practices

### Security advice

1. **Regular Updates**

```bash
# 检查更新
clawdbot update --check

# 更新到最新版本
npm update -g clawdbot@latest
clawdbot doctor
```

2. **Restricted Access**

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

3. **Use Sandbox**

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

4. **Backup Configuration**

```bash
# 定期备份
cp -r ~/.clawdbot ~/backups/clawdbot-\$(date +%Y%m%d)

# 或使用 Git
cd ~/.clawdbot
git init
git add .
git commit -m "Backup config"
```

### Performance optimization

1. **Use a faster model**
   - Daily tasks: Claude Sonnet 4.5 (fast)
   - Complex tasks: Claude Opus 4.5 (high quality)
2. **Configuration model rollback**

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

3. **Limit Session History**

```json
{
  "agents": {
    "defaults": {
      "maxHistoryMessages": 50
    }
  }
}
```

### Memory Management Best Practices

1. **Regular review of MEMORY.md**
   - Check \`~/clawd/MEMORY.md\` once a week
   - Remove outdated information
   - Organize important decisions
2. **Use explicit memory cues**
   - Tell the AI: "Remember my preference to use TypeScript"
   - instead of implicitly relying on AI to remember
3. **Use the log function**
   - \`memory/YYYY-MM-DD.md\` automatically records daily context
   - Supplementary information can be edited manually

### Suggestions for use in multiple scenarios

#### personal assistant scenario

```bash
# 配置每日简报
clawdbot cron add \\
  --schedule "0 8 * * *" \\
  --message "Generate my daily briefing: weather, calendar, news" \\
  --target "telegram:@me"

# 配置晚间总结
clawdbot cron add \\
  --schedule "0 20 * * *" \\
  --message "Summarize today's activities and plan for tomorrow" \\
  --target "whatsapp:+1234567890"
```

#### Development team collaboration

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

#### content creation

Install related Skills:

```bash
clawdhub install frontend-design
clawdhub install image-gen
clawdhub install content-writer
```

### Monitor and maintain

1. **Set up health checks**

```bash
# 添加心跳检查
clawdbot cron add \\
  --schedule "0 * * * *" \\
  --message "/status" \\
  --target "telegram:@admin"
```

2. **Monitor resource usage**

```bash
# 查看内存使用
ps aux | grep clawdbot

# 查看磁盘使用
du -sh ~/.clawdbot/
du -sh ~/clawd/
```

3. **Regular cleaning**

```bash
# 清理旧会话
clawdbot sessions prune --days 30

# 清理缓存
rm -rf ~/clawd/.cache/*
```

---

## appendix

### Complete example of configuration file

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
      "workspace": "~/clawd",
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

### Common resource links

- **Official Documentation**: https://docs.clawd.bot
- **GitHub repository**: https://github.com/clawdbot/clawdbot
- **Discord Community**: https://discord.com/invite/clawd
- **Skills Registry**: https://clawdhub.com
- **Technical Blog**: https://clawd.bot/blog

### community resources

- **Awesome Clawdbot Skills**: https://github.com/VoltAgent/awesome-clawdbot-skills
- **Chinese Community**: (to be established)
- **YouTube Tutorial**: Search "Clawdbot tutorial"

---

## Change log

### Latest update (v2026.1.x)

- ✅ New plug-in system
- ✅ Improved memory management
- ✅ Optimize Token usage
- ✅ Support more messaging platforms
- ✅ Enhanced security sandbox

### roadmap

- 🔜 Native Windows support improvements
- 🔜 Mobile companion app
- 🔜 More preset Skills
- 🔜Web UI enhancement

---

**Happy Automating! 🦞**

Have a question? Visit [Official documentation](https://docs.clawd.bot) or join [Discord Community](https://discord.com/invite/clawd)
