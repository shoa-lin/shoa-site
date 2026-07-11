import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseFrontmatter } from "./lib/content-files.mjs";

const root = resolve(new URL("../", import.meta.url).pathname);
const manifest = JSON.parse(readFileSync(resolve(root, "blogs/manifest.json"), "utf8"));

const metadata = {
  "getting-started-with-loops": {
    description: "从手动回合到目标、时间与主动循环，理解四种 loop 的触发方式和停止条件。",
    sourceUrl: "https://claude.com/blog/getting-started-with-loops",
    sourceAuthor: "Delba de Oliveira, Michael Segner",
  },
  "loop-engineering": {
    description: "从目标、观察、反馈、停止条件和安全边界出发，设计可持续改进的 Agent 循环。",
    sourceUrl: "https://addyosmani.com/blog/loop-engineering/",
    sourceAuthor: "Addy Osmani",
  },
  "state-of-ai-agent-memory-2026": {
    description: "梳理 AI Agent 记忆的基准、架构选择、生产需求与仍未解决的问题。",
    sourceUrl: "https://mem0.ai/blog/state-of-ai-agent-memory-2026",
    sourceAuthor: "Mem0 Team",
  },
  "dynamic-workflows-in-claude-code": {
    description: "根据任务动态组合工具、上下文和验证步骤，而不是把所有工作塞进固定流程。",
    sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code",
    sourceAuthor: "Thariq Shihipar, Sid Bidasaria",
  },
  "harness-engineering": {
    description: "面向编码 Agent 用户，系统整理 guides、sensors、反馈回路和架构约束。",
    sourceUrl: "https://martinfowler.com/articles/harness-engineering.html",
    sourceAuthor: "Birgitta Böckeler",
  },
  "lessons-from-building-claude-code-skills": {
    description: "Claude Code 团队在设计、组织和维护 Skills 时形成的实践经验。",
    sourceUrl: "https://x.com/trq212/status/2033949937936085378",
    sourceAuthor: "Thariq Shihipar",
  },
  "prompt-caching-best-practices": {
    description: "围绕缓存边界、提示词稳定性和上下文组织，总结 Prompt Caching 的工程实践。",
    sourceUrl: "https://x.com/trq212/status/2024574133011673516",
    sourceAuthor: "Claude Code Team",
  },
  "pi-minimal-agent": {
    description: "通过 Pi 的设计理解极简编码 Agent 如何保持小核心和可扩展能力。",
    sourceUrl: "https://lucumr.pocoo.org/2026/1/31/pi/",
    sourceAuthor: "Armin Ronacher",
  },
  "clawdbot-installation-guide": {
    description: "整理 Clawdbot 的安装、配置、容器部署和常见问题排查步骤。",
    sourceUrl: "https://docs.clawd.bot",
    sourceAuthor: "Clawdbot Documentation",
  },
  "x-algorithm-research-report": {
    description: "根据公开仓库梳理 X 推荐系统的组件、数据流和工程实现。",
    sourceUrl: "https://github.com/xai-org/x-algorithm",
    sourceAuthor: "xAI",
  },
  "demystifying-evals-for-ai-agents": {
    description: "从评估对象、任务设计、评分方法和持续改进解释 Agent 评估体系。",
    sourceUrl: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
    sourceAuthor: "Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, Jiri De Jonghe",
  },
  "claude-agent-sdk-complete-guide": {
    description: "介绍 Claude Agent SDK 的核心概念、工具调用、权限和 Agent 构建方式。",
    sourceUrl: "https://nader.substack.com/p/the-complete-guide-to-building-agents",
    sourceAuthor: "Nader Dabit",
  },
  "claude-code-2.1.2-release": {
    description: "整理 Claude Code 2.1.0 至 2.1.2 的安全、技能和使用体验更新。",
    sourceUrl: "https://github.com/anthropics/claude-code/releases",
    sourceAuthor: "Anthropic",
  },
  "project-vend-phase-2": {
    description: "通过公开实验回顾 AI Agent 在现实经营任务中的进步、局限与安全问题。",
    sourceUrl: "https://www.anthropic.com/research/project-vend-2",
    sourceAuthor: "Anthropic",
  },
};

function normalizeBody(content) {
  let body = content.replace(/^\uFEFF/, "");
  if (body.startsWith("---\n")) body = parseFrontmatter(body).body;
  body = body.replace(/<style>[\s\S]*?<\/style>/gi, "").trim();
  body = body.replaceAll("\\`\\`\\`", "```");
  body = body.replace(/^#\s+[^\n]+\n+/, "");
  body = body.replaceAll("/home/user/clawd", "~/clawd");
  body = body.replaceAll('export TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"', "export TELEGRAM_BOT_TOKEN=$YOUR_TELEGRAM_BOT_TOKEN");
  body = body.replaceAll("blogs/images/harness-engineering/", "/assets/blog/harness-engineering/");
  return body.trim();
}

function frontmatter(data) {
  return `---\n${Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n`;
}

for (const item of manifest) {
  const details = metadata[item.id];
  if (!details) throw new Error(`Missing migration metadata for ${item.id}`);
  const source = readFileSync(resolve(root, item.filename), "utf8");
  const target = resolve(root, `src/content/blog/zh/${item.id}.md`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${frontmatter({
    translationKey: item.id,
    locale: "zh",
    title: item.title,
    description: details.description,
    publishedAt: item.date,
    updatedAt: item.date,
    category: item.category,
    sourceLocale: "en",
    sourceUrl: details.sourceUrl,
    sourceAuthor: details.sourceAuthor,
    contentType: "adaptation",
    translationStatus: "reviewed",
  })}\n${normalizeBody(source)}\n`);
}

const favoriteEntries = [
  {
    slug: "fix-your-life-in-one-day",
    data: {
      translationKey: "fix-your-life-in-one-day",
      locale: "zh",
      title: "如何重新审视改变",
      description: "关于身份、目标与行为改变的一篇长文，适合慢慢读并做笔记。",
      publishedAt: "2025-12-23",
      updatedAt: "2025-12-23",
      sourceLocale: "en",
      sourceUrl: "https://letters.thedankoe.com/p/how-to-fix-your-entire-life-in-1",
      sourceAuthor: "Dan Koe",
      tags: ["个人成长", "行为改变"],
      visibility: "public",
      publicationStatus: "reviewed",
    },
    body: "这篇文章把改变拆成身份、目标和日常行为三个层面。值得关注的不是短期自律技巧，而是一个人的目标如何影响注意力、选择和长期生活方式。\n\n我收藏它，是因为文章提供了一套适合反复检查的思考框架。阅读时更适合结合自己的具体问题做笔记，而不是把它当作一份需要照做的清单。",
  },
  {
    slug: "manus-meeting",
    data: {
      translationKey: "manus-meeting",
      locale: "zh",
      title: "一次产品早期讨论的复盘",
      description: "从公开会议记录中观察产品定位、技术边界与用户体验如何共同形成。",
      publishedAt: "2025-12-27",
      updatedAt: "2025-12-27",
      sourceLocale: "zh",
      sourceUrl: "https://mp.weixin.qq.com/s/Ud0djNpSAqUoFUYpTzasmg",
      sourceAuthor: "潜云思绪",
      tags: ["AI Agent", "产品设计"],
      visibility: "public",
      publicationStatus: "reviewed",
    },
    body: "这份公开会议记录保留了产品早期讨论中的分歧和推理过程。它呈现了通用能力与垂直优化、云端运行环境、过程可见性和用户信任之间的关系。\n\n我收藏它，是因为完整讨论比事后总结更能说明一个产品方向如何形成，也能帮助读者区分当时的假设与后来得到验证的判断。",
  },
];

for (const entry of favoriteEntries) {
  const target = resolve(root, `src/content/favorites/zh/${entry.slug}.md`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${frontmatter(entry.data)}\n${entry.body}\n`);
}

console.log(`Migrated ${manifest.length} Chinese articles and ${favoriteEntries.length} favorites.`);
