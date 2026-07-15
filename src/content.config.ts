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

export const collections = { blog, favorites };
