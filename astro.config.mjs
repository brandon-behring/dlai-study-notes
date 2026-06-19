// @ts-check
/**
 * astro.config.mjs — DLAI Study Notes corpus (tools-profile multi-book).
 *
 * Consumer of @brandon_m_behring/book-scaffold-astro v4.8.0+. Adds:
 *   - KaTeX integration (math rendering across all DLAI books)
 *   - Multi-book content routing (consumer-level extension; upstream to
 *     scaffold v3.2 after pilot validates the pattern)
 *
 * One Astro app serves the entire corpus at study-notes.brandon-behring.dev.
 * Books live at /<book-slug>/<chapter-slug>/.
 */
import { defineBookConfig, courseNotesStyle } from '@brandon_m_behring/book-scaffold-astro';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default await defineBookConfig({
  site: 'https://study-notes.brandon-behring.dev',
  // Chrome branding (Sidebar.astro reads bookConfig.title/subtitle; without these
  // it shows the scaffold default "Book / A scaffold-astro book"). This is a
  // multi-book corpus, so the persistent chrome shows the corpus name — the
  // per-book title still appears in each page's breadcrumb.
  title: 'DLAI Study Notes',
  subtitle: 'Interview-ready guides to applied AI',
  // v4: preset/profile replaced by explicit style composition (MIGRATION-v3-to-v4).
  styles: [courseNotesStyle],
  routes: {
    chapters: false,
    convergence: false,
    // v4.5 auto-injects a `/` landing; dlai owns src/pages/index.astro (corpus landing).
    landing: false,
    // Apparatus routes stay OFF globally — this corpus is multi-book, so it owns
    // per-book versions at src/pages/[book]/{practice-exam,glossary,flashcards,answers}.astro.
    practiceExam: false,
    glossary: false,
    flashcards: false,
    answers: false,
  },
  // The scaffold validator checks every question's `domain` against a single
  // global examDomains. This corpus declares domains PER BOOK (book frontmatter,
  // used by the per-book apparatus routes), so this global list is the UNION
  // across books — purely to satisfy the global validator. (Multi-book examDomains
  // is the #80 gap; see DOGFOOD.md.)
  examDomains: [
    // finetuning-rl-intro
    'post-training-foundations',
    'sft-vs-rl',
    'evaluation',
    'data-and-grading',
    'reasoning-and-safety',
    'production-pipelines',
    // evaluating-ai-agents
    'eval-foundations',
    'observability',
    'component-evals',
    'trajectory-evals',
    'llm-judge-monitoring',
    // knowledge-graphs-rag
    'kg-fundamentals',
    'cypher-querying',
    'text-for-rag',
    'kg-construction',
    'kg-relationships',
    'kg-expansion',
    'graph-rag-chat',
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false, output: 'htmlAndMathml' }]],
  },
  vite: {
    ssr: {
      noExternal: [
        '@fontsource-variable/roboto',
        '@fontsource-variable/source-code-pro',
      ],
    },
  },
});
