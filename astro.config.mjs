import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import imageAttrs from "./src/lib/image-attrs-integration.mjs";

export default defineConfig({
  output: "static",
  site: "https://www.bydziwen.top",
  integrations: [sitemap(), imageAttrs()],
  // Comic editions used to live at /comics/<id>/<locale>/; they now follow the site's /<locale>/comics/<id>/ scheme.
  redirects: Object.fromEntries(
    ["en", "ja", "ko", "th", "fr", "de", "vi"].map((locale) => [`/comics/gpt-6-astra/${locale}`, `/${locale}/comics/gpt-6-astra`]),
  ),
  // Keep small font files as real requests; inlining them as data: URIs bloats every page's CSS.
  vite: { build: { assetsInlineLimit: 0 } },
});
