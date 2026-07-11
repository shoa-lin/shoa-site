import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const entries = (await getCollection("blog", ({ data }) => data.locale === "zh" && data.translationStatus !== "draft"))
    .sort((left, right) => right.data.publishedAt.valueOf() - left.data.publishedAt.valueOf());
  return rss({
    title: "Shoa Lin 文章",
    description: "关于 AI Agent、知识系统、开发工具和工程实践的长期记录。",
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/blog/${entry.data.translationKey}`,
    })),
  });
}
