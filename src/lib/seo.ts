import { localeMeta, type Locale } from "./i18n.ts";
import { alternateLinks, canonicalUrl } from "./routes.ts";

export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  alternates: Array<{ hreflang: string; href: string }>;
  openGraphLocale: string;
}

export function buildSeo(locale: Locale, path: string, title: string, description: string): SeoData {
  return {
    title,
    description,
    canonical: canonicalUrl(locale, path),
    alternates: alternateLinks(path),
    openGraphLocale: localeMeta[locale].htmlLang,
  };
}
