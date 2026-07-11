import type { Locale } from "../lib/i18n";

type LocalizedPublication = {
  slug: string;
  date: string;
  category: "development" | "architecture";
  copy: Record<Locale, { title: string; description: string }>;
};

export const latestPublications: LocalizedPublication[] = [
  {
    slug: "getting-started-with-loops",
    date: "2026-07-07",
    category: "development",
    copy: {
      zh: { title: "Claude Code Loops 入门", description: "从手动回合到目标、时间与主动循环。" },
      en: { title: "Getting started with Claude Code loops", description: "A guide to turn-based, goal-based, timed, and proactive loops." },
      ja: { title: "Claude Code Loops 入門", description: "手動の反復から、目標、時間、能動的なループへ。" },
      ko: { title: "Claude Code Loops 시작하기", description: "수동 반복에서 목표, 시간, 능동형 루프로 확장하는 방법입니다." },
      th: { title: "เริ่มต้นใช้ Claude Code Loops", description: "จากรอบการทำงานแบบสั่งทีละขั้น สู่ลูปตามเป้าหมาย เวลา และการทำงานเชิงรุก" },
      fr: { title: "Bien démarrer avec Claude Code Loops", description: "Des boucles manuelles aux boucles guidées par un objectif, le temps ou l'initiative." }
    }
  },
  {
    slug: "loop-engineering",
    date: "2026-06-09",
    category: "development",
    copy: {
      zh: { title: "Loop Engineering", description: "如何设计可观察、可停止、可改进的 Agent 循环。" },
      en: { title: "Loop Engineering", description: "Designing agent loops that are observable, stoppable, and open to improvement." },
      ja: { title: "Loop Engineering", description: "観測でき、停止でき、改善できるエージェントループの設計。" },
      ko: { title: "Loop Engineering", description: "관찰하고 중단하며 개선할 수 있는 에이전트 루프를 설계합니다." },
      th: { title: "Loop Engineering", description: "ออกแบบลูปของ Agent ให้สังเกตได้ หยุดได้ และปรับปรุงต่อได้" },
      fr: { title: "Loop Engineering", description: "Concevoir des boucles d'agents observables, interruptibles et améliorables." }
    }
  },
  {
    slug: "dynamic-workflows-in-claude-code",
    date: "2026-06-03",
    category: "development",
    copy: {
      zh: { title: "Claude Code 中的动态工作流", description: "为不同任务组合合适的工具、上下文和验证步骤。" },
      en: { title: "Dynamic workflows in Claude Code", description: "Combining the right tools, context, and checks for each task." },
      ja: { title: "Claude Codeの動的ワークフロー", description: "タスクごとに適切なツール、文脈、検証手順を組み合わせます。" },
      ko: { title: "Claude Code의 동적 워크플로", description: "작업마다 적절한 도구, 맥락, 검증 단계를 조합합니다." },
      th: { title: "เวิร์กโฟลว์แบบไดนามิกใน Claude Code", description: "เลือกเครื่องมือ บริบท และขั้นตอนตรวจสอบให้เหมาะกับแต่ละงาน" },
      fr: { title: "Workflows dynamiques dans Claude Code", description: "Associer les bons outils, le bon contexte et les bonnes vérifications à chaque tâche." }
    }
  }
];
