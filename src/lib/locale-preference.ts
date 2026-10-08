import { locales, type Locale } from "./i18n.ts";

export const localePreferenceKey = "shoa-locale";

export function isPreferredLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export function resolvePreferredLocale(languages: readonly string[]): Locale | undefined {
  for (const language of languages) {
    const primaryLanguage = language.trim().toLowerCase().split("-")[0];
    if (isPreferredLocale(primaryLanguage)) return primaryLanguage;
  }

  return undefined;
}

// Search engine crawlers render "/" with an English (or empty) browser language. They must
// index the canonical Chinese homepage instead of following the visitor language redirect.
const searchCrawlerPattern = /googlebot|bingbot|yandexbot|duckduckbot|applebot|petalbot|slurp|crawler|spider/i;

export function isSearchCrawler(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && searchCrawlerPattern.test(userAgent));
}
