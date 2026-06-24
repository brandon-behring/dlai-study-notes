/**
 * Curated pages for the responsive audit (Workstream 2 / N0, hardened post-review).
 *
 * Coverage is chosen so the harness is a trustworthy POST-FIX oracle, not just a
 * RED-baseline detector. Per book we include rich content (overflow) AND the
 * prev/next EDGES (first chapter → no prev; last chapter → next must stay in-book,
 * the cross-book boundary where the scaffold's global getNeighbors bleeds today).
 */
export type PageKind = 'home' | 'chapter' | 'apparatus';

/** Edge position within its book (drives the prev/next absence assertion). */
export type Edge = 'first' | 'last' | null;

export interface AuditedPage {
  url: string;
  kind: PageKind;
  slug: string;
  /** Book slug (first path segment) for chapter/apparatus pages; '' for home. */
  book: string;
  edge: Edge;
  note: string;
}

/** The three books + their chapter counts — used to assert the sidebar/drawer is
 *  book-SCOPED (not the old all-18-interleaved list) and points only at its book. */
export const BOOKS: Record<string, { chapters: number }> = {
  'finetuning-rl-intro': { chapters: 6 },
  'evaluating-ai-agents': { chapters: 5 },
  'knowledge-graphs-rag': { chapters: 7 },
};
export const BOOK_SLUGS = Object.keys(BOOKS);

/** Apparatus route slugs (excluded from the chapter-count / chapter-link checks). */
export const APPARATUS_SLUGS = ['practice-exam', 'glossary', 'flashcards', 'answers'];

function slugify(url: string): string {
  return url.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home';
}

const RAW: Omit<AuditedPage, 'slug' | 'book'>[] = [
  { url: '/', kind: 'home', edge: null, note: 'corpus landing — must link to all 3 books' },

  // knowledge-graphs-rag (largest book; cypher/table/inline-code heavy)
  {
    url: '/knowledge-graphs-rag/04-constructing-knowledge-graphs/',
    kind: 'chapter', edge: null,
    note: 'python+cypher, 2 tables, ~85 inline-code spans',
  },
  {
    url: '/knowledge-graphs-rag/02-querying-knowledge-graphs/',
    kind: 'chapter', edge: null,
    note: '6 cypher blocks, 2 tables, ~156 inline-code spans (worst inline density)',
  },
  {
    url: '/knowledge-graphs-rag/07-chatting-with-the-graph/',
    kind: 'chapter', edge: 'last',
    note: 'LAST chapter of the largest book — the cross-book boundary where prev/next bleeds today',
  },

  // finetuning-rl-intro
  {
    url: '/finetuning-rl-intro/01-post-training-overview/',
    kind: 'chapter', edge: 'first',
    note: 'FIRST chapter — prev must be absent',
  },
  {
    url: '/finetuning-rl-intro/04-data-driven/',
    kind: 'chapter', edge: null,
    note: 'python, 3 tables, KaTeX, 3 WorkedExample',
  },

  // evaluating-ai-agents
  {
    url: '/evaluating-ai-agents/01-evaluation-foundations/',
    kind: 'chapter', edge: 'first',
    note: 'FIRST chapter of book 2 — prev absent',
  },
  {
    url: '/evaluating-ai-agents/03-component-evaluations/',
    kind: 'chapter', edge: null,
    note: 'python block, table, WorkedExample/CompletionProblem',
  },

  // apparatus (two books so apparatus-in-nav links resolve for >1 book)
  {
    url: '/knowledge-graphs-rag/practice-exam/',
    kind: 'apparatus', edge: null,
    note: 'ExamRunner island (client:idle), long question bank',
  },
  {
    url: '/finetuning-rl-intro/glossary/',
    kind: 'apparatus', edge: null,
    note: 'long term list, second book apparatus',
  },
];

export const PAGES: AuditedPage[] = RAW.map((p) => ({
  ...p,
  slug: slugify(p.url),
  book: p.kind === 'home' ? '' : p.url.replace(/^\//, '').split('/')[0],
}));
