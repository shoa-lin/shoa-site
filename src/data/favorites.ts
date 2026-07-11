import type { Locale } from "../lib/i18n";

type Favorite = {
  sourceUrl: string;
  source: string;
  copy: Record<Locale, { title: string; summary: string }>;
};

export const favorites: Favorite[] = [
  {
    sourceUrl: "https://letters.thedankoe.com/p/how-to-fix-your-entire-life-in-1",
    source: "Dan Koe",
    copy: {
      zh: { title: "如何重新审视改变", summary: "一篇关于身份、目标与行为改变的长文，适合慢慢读并做笔记。" },
      en: { title: "Rethinking personal change", summary: "A long essay on identity, goals, and behavior change that rewards careful reading." },
      ja: { title: "変化を捉え直す", summary: "アイデンティティ、目標、行動変容を扱う、時間をかけて読みたい長文です。" },
      ko: { title: "변화를 다시 생각하기", summary: "정체성, 목표, 행동 변화를 다룬 긴 글로 천천히 읽고 기록하기 좋습니다." },
      th: { title: "ทบทวนความหมายของการเปลี่ยนแปลง", summary: "บทความยาวเรื่องอัตลักษณ์ เป้าหมาย และการเปลี่ยนพฤติกรรม เหมาะกับการอ่านอย่างตั้งใจ" },
      fr: { title: "Repenser le changement personnel", summary: "Un long essai sur l'identité, les objectifs et le changement de comportement, à lire attentivement." }
    }
  },
  {
    sourceUrl: "https://mp.weixin.qq.com/s/Ud0djNpSAqUoFUYpTzasmg",
    source: "微信公众号",
    copy: {
      zh: { title: "一次产品早期讨论的复盘", summary: "从公开会议记录中观察产品定位、技术边界与用户体验如何共同形成。" },
      en: { title: "Looking back at an early product discussion", summary: "A public meeting record showing how positioning, technical boundaries, and user experience take shape together." },
      ja: { title: "初期プロダクト議論を振り返る", summary: "公開された会議記録から、位置づけ、技術的境界、体験設計が形になる過程を読み取れます。" },
      ko: { title: "초기 제품 논의를 돌아보기", summary: "공개 회의 기록을 통해 제품 방향, 기술 경계, 사용자 경험이 함께 정리되는 과정을 볼 수 있습니다." },
      th: { title: "ย้อนดูการสนทนาในช่วงเริ่มต้นของผลิตภัณฑ์", summary: "บันทึกการประชุมสาธารณะที่แสดงให้เห็นว่าการวางตำแหน่ง ขอบเขตทางเทคนิค และประสบการณ์ผู้ใช้ก่อตัวร่วมกันอย่างไร" },
      fr: { title: "Relire une discussion produit des débuts", summary: "Un compte rendu public qui montre comment positionnement, limites techniques et expérience utilisateur se construisent ensemble." }
    }
  }
];
