import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicRoot = fileURLToPath(new URL("../../public/", import.meta.url));
// Dimensions of images embedded from other sites, measured once so the build stays offline.
const externalSizes = JSON.parse(readFileSync(new URL("../data/external-image-sizes.json", import.meta.url), "utf8"));

function walk(directory, output = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, output);
    else if (path.endsWith(".html")) output.push(path);
  }
  return output;
}

/**
 * Build-time pass over the generated HTML: images inside <main> served from
 * public/assets (or listed in external-image-sizes.json) get their intrinsic
 * width/height so the layout does not shift while loading, and every image
 * after the first one on a page is lazy loaded.
 */
export default function imageAttrs() {
  const sizes = new Map();

  async function sizeOf(src) {
    if (/^https?:\/\//.test(src)) return externalSizes[src.replace(/&amp;/g, "&")] ?? null;
    const clean = src.split(/[?#]/)[0];
    if (sizes.has(clean)) return sizes.get(clean);
    const file = publicRoot + clean.replace(/^\//, "");
    let size = null;
    if (existsSync(file)) {
      try {
        const { width, height } = await sharp(file).metadata();
        if (width && height) size = { width, height };
      } catch {
        size = null;
      }
    }
    sizes.set(clean, size);
    return size;
  }

  return {
    name: "image-attrs",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        let pages = 0;
        for (const file of walk(fileURLToPath(dir))) {
          const html = readFileSync(file, "utf8");
          const main = html.match(/<main[\s\S]*?<\/main>/)?.[0];
          if (!main) continue;

          let updated = main;
          let index = 0;
          for (const [tag] of main.matchAll(/<img\b[^>]*>/g)) {
            let next = tag;
            const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
            const hasSize = /\swidth="/.test(tag) && /\sheight="/.test(tag);
            if (src && (src.startsWith("/assets/") || /^https?:\/\//.test(src)) && !hasSize) {
              const size = await sizeOf(src);
              if (size) next = next.replace(/\s*\/?>$/, ` width="${size.width}" height="${size.height}"$&`);
            }
            if (index > 0 && !/\sloading="/.test(next)) {
              next = next.replace(/\s*\/?>$/, ' loading="lazy" decoding="async"$&');
            }
            index += 1;
            if (next !== tag) updated = updated.replace(tag, next);
          }

          if (updated !== main) {
            writeFileSync(file, html.replace(main, updated));
            pages += 1;
          }
        }
        logger.info(`added image dimensions / lazy loading in ${pages} pages`);
      },
    },
  };
}
