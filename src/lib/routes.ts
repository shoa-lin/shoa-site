import { assertLocale, localeMeta, locales, type Locale } from "./i18n.ts";

const site = "https://www.bydziwen.top";

function splitSuffix(path: string): { pathname: string; suffix: string } {
  const index = path.search(/[?#]/);
  return index === -1
    ? { pathname: path, suffix: "" }
    : { pathname: path.slice(0, index), suffix: path.slice(index) };
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

export function localizedPath(locale: string, path: string): string {
  assertLocale(locale);
  const { pathname, suffix } = splitSuffix(path);
  const normalized = normalizePath(pathname);
  if (locale === "zh") return `${normalized}${suffix}`;
  if (normalized === "/") return `/${locale}/${suffix}`;
  return `/${locale}${normalized}${suffix}`;
}

export function alternateLinks(path: string): Array<{ hreflang: string; href: string }> {
  const links = locales.map((locale) => ({
    hreflang: localeMeta[locale].htmlLang,
    href: new URL(localizedPath(locale, path), site).href,
  }));

  links.push({ hreflang: "x-default", href: new URL(localizedPath("zh", path), site).href });
  return links;
}

export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && first !== "zh" && locales.includes(first as Locale) ? (first as Locale) : "zh";
}

export function canonicalUrl(locale: Locale, path: string): string {
  return new URL(localizedPath(locale, path), site).href;
}
