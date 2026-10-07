import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import imageAttrs from "./src/lib/image-attrs-integration.mjs";

export default defineConfig({
  output: "static",
  site: "https://www.bydziwen.top",
  integrations: [sitemap(), imageAttrs()],
  // Keep small font files as real requests; inlining them as data: URIs bloats every page's CSS.
  vite: { build: { assetsInlineLimit: 0 } },
});
