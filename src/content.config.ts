import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One Markdown file per topic: src/content/topics/<subject>/<slug>.md
const topics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    short: z.string(),
    subject: z.string(),
    group: z.string(),
    order: z.number(),
    summary: z.string(),
    minutes: z.number().optional(),
  }),
});

export const collections = { topics };
