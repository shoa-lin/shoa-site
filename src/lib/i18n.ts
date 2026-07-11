import zh from "../i18n/zh.json" with { type: "json" };
import en from "../i18n/en.json" with { type: "json" };
import ja from "../i18n/ja.json" with { type: "json" };
import ko from "../i18n/ko.json" with { type: "json" };
import th from "../i18n/th.json" with { type: "json" };
import fr from "../i18n/fr.json" with { type: "json" };

export const locales = ["zh", "en", "ja", "ko", "th", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export const localeMeta: Record<Locale, { label: string; htmlLang: string; prefix: string }> = {
  zh: { label: "简体中文", htmlLang: "zh-CN", prefix: "" },
  en: { label: "English", htmlLang: "en", prefix: "en" },
  ja: { label: "日本語", htmlLang: "ja", prefix: "ja" },
  ko: { label: "한국어", htmlLang: "ko", prefix: "ko" },
  th: { label: "ไทย", htmlLang: "th", prefix: "th" },
  fr: { label: "Français", htmlLang: "fr", prefix: "fr" },
};

export type Dictionary = typeof zh;

const dictionaries: Record<Locale, Dictionary> = {
  zh,
  en: en as Dictionary,
  ja: ja as Dictionary,
  ko: ko as Dictionary,
  th: th as Dictionary,
  fr: fr as Dictionary,
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function assertLocale(value: string): asserts value is Locale {
  if (!isLocale(value)) throw new Error(`Unsupported locale: ${value}`);
}

export function getDictionary(locale: string): Dictionary {
  assertLocale(locale);
  return dictionaries[locale];
}
