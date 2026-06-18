/**
 * src/content.config.ts — Multi-book content collection schema (course-notes).
 *
 * Clean-slate rebuild (v4.25 pedagogy rebuild): the chapter schema is the
 * scaffold's course-notes profile schema extended with a `book` discriminator.
 * Each chapter belongs to a specific book within the corpus; routing uses this
 * discriminator to split paths into `/<book>/<chapter>` URLs.
 *
 * This is a CONSUMER-LEVEL extension per the scaffold's closed-surface design
 * (consumer extends the package's plain-Zod schema via `.extend()`). We keep the
 * hand-rolled multi-book pattern (recipe 21, "blessed interim until #80"); we do
 * NOT use `defineBookSchemas` — it would impose one profile schema on all books
 * and drop the `book` discriminator.
 *
 * Schemas imported from the package MAIN entry are plain Zod (safe here — not the
 * astro:content-bound `/schemas` subpath):
 *   - courseNotesChapterSchema  → chapter frontmatter (LOS, tags, volatility, provenance, ...)
 *   - refinedQuestionSchema     → practice-exam / flashcards question bank (#112–#117)
 *   - glossarySchema            → key-terms glossary (#115)
 */
import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  courseNotesChapterSchema,
  refinedQuestionSchema,
  glossarySchema,
} from '@brandon_m_behring/book-scaffold-astro';

// ===== Book-level metadata =====
//
// One frontmatter file per book at src/content/books/<slug>.mdx — holds
// course attribution, source URL, instructor, course_existence_verified
// (annual sweep), volatility, etc. Renders as the per-book TOC page.
// Consumer-owned and orthogonal to the chapter profile.

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
    description: z.string(),
    chapter_count: z.number().int().positive(),
    anki_deck_url: z.string().url().optional(),   // AnkiWeb-hosted full deck (Q11)
    // Per-book exam-domain taxonomy. The scaffold's examDomains is single-global
    // (defineBookConfig); we make it per-book here so each guide's practice-exam /
    // answers routes validate question `domain` against the right registry.
    examDomains: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// ===== Chapter-level metadata =====
//
// Each chapter MDX lives at src/content/chapters/<book-slug>/<chapter-slug>.mdx
// with `book: <book-slug>` in frontmatter to discriminate. The `book` field
// drives the URL pattern `/<book>/<chapter>` via [book]/[...chapter].astro.
//
// Schema = scaffold course-notes profile + `book` discriminator. course-notes
// already provides learning_outcomes, tags, last_verified, volatility, sources,
// and provenance — so no legacy tools-profile shape (tools_compared, required
// volatility) is carried forward.

const chaptersCollection = defineCollection({
  loader: glob({ base: './src/content/chapters', pattern: '**/*.{md,mdx}' }),
  schema: courseNotesChapterSchema.extend({
    book: z.string().min(1),                      // multi-book discriminator
  }),
});

// ===== Study-guide apparatus collections (v4.17–v4.22) =====
//
// Registered here because this consumer hand-rolls its collections (does not call
// defineBookSchemas), so the package's presence-gated auto-registration does not
// apply. Content is namespaced per book under src/content/questions/<book>/** and
// src/content/glossary/<book>/** (the apparatus routes are enabled per-book in
// astro.config.mjs during Phase 1). Empty collections are valid — the routes stay
// off until a book authors content.

const questionsCollection = defineCollection({
  loader: glob({ base: './src/content/questions', pattern: '**/*.{md,mdx}' }),
  schema: refinedQuestionSchema,
});

const glossaryCollection = defineCollection({
  loader: glob({ base: './src/content/glossary', pattern: '**/*.{md,mdx}' }),
  schema: glossarySchema,
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
  questions: questionsCollection,
  glossary: glossaryCollection,
  sources: sourcesCollection,
};
