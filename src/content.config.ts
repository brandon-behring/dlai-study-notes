/**
 * src/content.config.ts — Multi-book content collection schema.
 *
 * Extends the scaffold's tools-profile chapter schema with a `book`
 * discriminator field. Each chapter belongs to a specific book within
 * the corpus; routing uses this discriminator to split paths into
 * `/<book>/<chapter>` URLs.
 *
 * This is a CONSUMER-LEVEL extension per the scaffold's D5/Q5 design
 * (closed surface, consumer extends via Zod). Upstream to scaffold v3.2
 * as `defineBookSchemas({ profile, multiBook: true })` after the pilot
 * validates the pattern.
 */
import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// ===== Book-level metadata =====
//
// One frontmatter file per book at src/content/books/<slug>.mdx — holds
// course attribution, source URL, instructor, course_existence_verified
// (annual sweep), volatility, etc. Renders as the per-book TOC page.

const booksCollection = defineCollection({
  loader: glob({ base: './src/content/books', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    book: z.string().min(1),                      // slug, e.g. "knowledge-graphs-rag"
    title: z.string().min(1),                     // e.g. "Knowledge Graphs for RAG"
    instructor: z.string().min(1),
    partner: z.string().optional(),               // e.g. "Neo4j"
    source_url: z.string().url(),                 // DLAI course page
    course_existence_verified: z.date(),          // annual sweep timestamp
    volatility: z.enum(['stable-principle', 'architectural-pattern', 'feature-surface']),
    tools_compared: z.array(z.string()).default([]),
    description: z.string(),
    chapter_count: z.number().int().positive(),
    anki_deck_url: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

// ===== Chapter-level metadata =====
//
// Each chapter MDX lives at src/content/chapters/<book-slug>/<chapter-slug>.mdx
// with `book: <book-slug>` in frontmatter to discriminate. The `book` field
// drives the URL pattern `/<book>/<chapter>` via [book]/[...chapter].astro.

const chaptersCollection = defineCollection({
  loader: glob({ base: './src/content/chapters', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    book: z.string().min(1),                      // discriminator
    title: z.string().min(1),
    chapter: z.number().int().min(0).max(99),     // ordering within book
    part: z.number().int().min(0).max(10).default(1),
    description: z.string().optional(),
    learning_outcomes: z.array(z.object({
      id: z.string(),                             // e.g. "KGR-1.1"
      verb: z.string(),                           // e.g. "Define"
      text: z.string(),
    })).default([]),
    sources: z.array(z.string()).default([]),     // bibkey slugs
    tools_compared: z.array(z.string()).default([]),   // \companytags{} from .tex
    // Freshness signaling per scaffold tools-profile contract
    last_verified: z.date(),
    volatility: z.enum(['stable-principle', 'architectural-pattern', 'feature-surface'])
      .default('architectural-pattern'),
    draft: z.boolean().default(false),
  }),
});

// ===== Shared bibliography =====
//
// Citations live in citations.bib; book-scaffold build-bib emits
// src/data/references.json which is referenced by <Citation> components.

const sourcesCollection = defineCollection({
  loader: glob({ base: './src/content/sources', pattern: '**/*.{md,mdx,json}' }),
  schema: z.object({
    url: z.string().url(),
    title: z.string().min(1),
    author: z.string().optional(),
    date: z.string().optional(),
  }),
});

export const collections = {
  books: booksCollection,
  chapters: chaptersCollection,
  sources: sourcesCollection,
};
