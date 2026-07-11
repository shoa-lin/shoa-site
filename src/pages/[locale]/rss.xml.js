import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getDictionary, locales } from "../../lib/i18n";

export function getStaticPaths() {
  return locales.filter((locale) => locale !== "zh").map((locale) => ({ params: { locale }, props: { locale } }));
}

export async function GET(context) {
  const { locale } = context.props;
  const dictionary = getDictionary(locale);
  const entries = (await getCollection("blog", ({ data }) => data.locale === locale && data.translationStatus !== "draft"))
    .sort((left, right) => right.data.publishedAt.valueOf() - left.data.publishedAt.valueOf());
  return rss({
    title: `Shoa Lin ${dictionary.blog.title}`,
    description: dictionary.blog.description,
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/${locale}/blog/${entry.data.translationKey}`,
    })),
  });
}
