// RSS feeds for the blog, one per locale (src/pages/rss.xml.js, src/pages/[locale]/rss.xml.js).
// Items carry the full article as HTML with absolute links, so readers show it without a visit.
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { foloClaims } from "../data/folo";
import { profile } from "../data/profile";
import { getDictionary, localeMeta, type Locale } from "./i18n";
import { localizedPath } from "./routes";

export const feedPath = (locale: Locale): string => localizedPath(locale, "/rss.xml");
export const FEED_ITEMS = 20;

const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Site-relative src/href/poster/srcset values become absolute, since feed readers have no base URL. */
export function absoluteUrls(html: string, site: URL): string {
  const absolute = (path: string) => (/^\/(?!\/)/.test(path) ? new URL(path, site).href : path);
  return html
    .replace(/\b(src|href|poster)="([^"]*)"/g, (_match, attribute: string, value: string) => `${attribute}="${absolute(value)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (_match, value: string) => `srcset="${value.split(",").map((part) => {
      const [url = "", ...rest] = part.trim().split(/\s+/);
      return [absolute(url), ...rest].join(" ");
    }).join(", ")}"`);
}

function foloChallenge(locale: Locale): string {
  const claim = foloClaims[locale];
  if (!claim) return "";
  if (!/^\d+$/.test(claim.feedId) || !/^\d+$/.test(claim.userId)) throw new Error(`foloClaims.${locale} must hold numeric feedId and userId`);
  return `<follow_challenge><feedId>${claim.feedId}</feedId><userId>${claim.userId}</userId></follow_challenge>`;
}

export async function blogFeed(locale: Locale, site: URL): Promise<Response> {
  const dictionary = getDictionary(locale);
  const entries = (await getCollection("blog", ({ data }) => data.locale === locale && data.translationStatus !== "draft"))
    .sort((left, right) => right.data.publishedAt.valueOf() - left.data.publishedAt.valueOf())
    // Full text makes each item large; readers only need the latest ones, older posts stay on the site.
    .slice(0, FEED_ITEMS);
  const selfUrl = new URL(feedPath(locale), site).href;
  const title = locale === "zh" ? "Shoa Lin 文章" : `Shoa Lin ${dictionary.blog.title}`;

  return rss({
    title,
    description: dictionary.blog.description,
    site,
    xmlns: { atom: "http://www.w3.org/2005/Atom", dc: "http://purl.org/dc/elements/1.1/" },
    customData: [
      `<language>${localeMeta[locale].htmlLang}</language>`,
      `<atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>`,
      `<image><url>${new URL("/apple-touch-icon.png", site).href}</url><title>${escapeXml(title)}</title><link>${new URL(localizedPath(locale, "/"), site).href}</link></image>`,
      foloChallenge(locale),
    ].join(""),
    items: entries.map((entry) => {
      // A site-relative link lets @astrojs/rss add the trailing slash, which keeps every <guid>
      // identical to earlier builds, so subscribers never see old articles again as new ones.
      const path = localizedPath(locale, `/blog/${entry.data.translationKey}`);
      const link = new URL(`${path}/`, site).href;
      const body = absoluteUrls(entry.rendered?.html ?? "", site);
      return {
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.publishedAt,
        link: path,
        categories: [dictionary.blog.categories[entry.data.category]],
        customData: `<dc:creator>${escapeXml(profile.name)}</dc:creator>`,
        content: `${body}<p><a href="${link}">${escapeXml(dictionary.feed.readOnSite)}</a></p>`,
      };
    }),
  });
}
