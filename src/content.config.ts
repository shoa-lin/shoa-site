import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const locale = z.enum(["zh", "en", "ja", "ko", "th", "fr", "de", "vi"]);
const category = z.enum(["architecture", "development", "evaluation", "application", "algorithm", "general"]);

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    translationKey: z.string().min(1),
    locale: locale,
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    category: category,
    sourceLocale: locale,
    sourceUrl: z.url(),
    sourceAuthor: z.string().min(1),
    contentType: z.enum(["original", "translation", "adaptation"]),
    translationStatus: z.enum(["draft", "reviewed", "published"]),
  }),
});

const favorites = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/favorites" }),
  schema: z.object({
    translationKey: z.string().min(1),
    locale: locale,
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    sourceLocale: locale,
    sourceUrl: z.url(),
    sourceAuthor: z.string().min(1),
    tags: z.array(z.string().min(1)),
    visibility: z.literal("public"),
    publicationStatus: z.enum(["draft", "reviewed", "published"]),
  }),
});

const food = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/food" }),
  schema: z.object({
    translationKey: z.string().min(1),
    locale: locale,
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    visitedAt: z.coerce.date().optional(),
    city: z.string().min(1).optional(),
    area: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    // Search string for map links, e.g. "<name> <address>". Falls back to title + address when omitted.
    mapQuery: z.string().min(1).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    aliases: z.array(z.string().min(1)).default([]),
    cuisine: z.array(z.string().min(1)).default([]),
    signatureDishes: z.array(z.string().min(1)).default([]),
    priceLevel: z.enum(["¥", "¥¥", "¥¥¥"]).optional(),
    // 1-5 stars, decimals allowed (e.g. 4.5).
    rating: z.number().min(1).max(5).optional(),
    // Average spend per person in CNY.
    pricePerPerson: z.number().positive().optional(),
    coverImage: z.string().min(1),
    images: z.array(z.string().min(1)).min(1),
    recommendAgain: z.boolean().optional(),
    sourceLocale: locale,
    contentType: z.enum(["original", "translation"]),
    publicationStatus: z.enum(["draft", "reviewed", "published"]),
  }),
});

// A comic is a folder src/comics/<id>/ with comic.json plus one complete HTML file per edition
// (<locale>.html). Validate and prepare it with scripts/comics.mjs; see src/comics/README.md.
const comics = defineCollection({
  loader: glob({ pattern: "*/comic.json", base: "./src/comics", generateId: ({ entry }) => entry.split("/")[0] ?? entry }),
  schema: z.object({
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    sourceLocale: locale,
    draft: z.boolean().optional(),
    // Palette of the site header and footer; detected from the comic's page background when omitted.
    shellTheme: z.enum(["light", "dark", "auto"]).optional(),
    editions: z.partialRecord(locale, z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    })),
  }).refine((data) => Boolean(data.editions[data.sourceLocale]), { message: "sourceLocale must have an edition" }),
});

export const collections = { blog, favorites, food, comics };
