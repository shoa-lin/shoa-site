import { blogFeed } from "../../lib/feed";
import { locales } from "../../lib/i18n";

export function getStaticPaths() {
  return locales.filter((locale) => locale !== "zh").map((locale) => ({ params: { locale }, props: { locale } }));
}

export function GET(context) {
  return blogFeed(context.props.locale, context.site);
}
