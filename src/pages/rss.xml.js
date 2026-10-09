import { blogFeed } from "../lib/feed";

export function GET(context) {
  return blogFeed("zh", context.site);
}
