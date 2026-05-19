#!/usr/bin/env node
/**
 * inject-cards — populate chapter MDX with <AnkiCard> components from
 * existing course_learning cards/*.yml.
 *
 * Per Q-R4.4 hybrid placement decision: auto-extract YAML cards (~204
 * non-term cards in pilot), inject at chapter-end with
 * <!-- CARD-PLACEMENT-TODO --> markers, polish pass relocates to ideal
 * positions. Preserves card IDs so user's existing Anki study progress
 * carries forward.
 *
 * Term cards are skipped — they're already emitted inline by tex-to-mdx
 * from \term[ID]{name}{def} macros.
 *
 * Usage:
 *   inject-cards --book=knowledge-graphs-rag \
 *                --cards-dir=/path/to/course_learning/dlai_knowledge_graphs_rag/notes/notebook/cards \
 *                --content-dir=src/content/chapters
 *
 * Idempotent: regenerates the chapter-end "## Review (auto-injected)"
 * section each run. Polish-pass changes outside that section are preserved.
 */
import { resolve, join } from 'node:path';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import * as yaml from 'yaml';

const HELP = `Usage: inject-cards --book=<slug> --cards-dir=<path> [--content-dir=<path>]

Required:
  --book=<slug>          Book slug (matches MDX frontmatter book: field)
  --cards-dir=<path>     Path to source cards/ dir with *.yml files

Optional:
  --content-dir=<path>   MDX chapters root (default: src/content/chapters)
  --skip-types=<csv>     Card types to skip (default: term)
  --dry-run              Print plan, don't modify MDX
  --help, -h             This message
`;

function parseArgs(argv) {
  const args = {
    book: null,
    cardsDir: null,
    contentDir: 'src/content/chapters',
    skipTypes: 'term',
    dryRun: false,
  };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') { process.stdout.write(HELP); process.exit(0); }
    if (a === '--dry-run') { args.dryRun = true; continue; }
    const m = a.match(/^--(book|cards-dir|content-dir|skip-types)=(.+)$/);
    if (m) {
      const k = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[k] = m[2];
      continue;
    }
    process.stderr.write(`Unknown flag: ${a}\n\n${HELP}`);
    process.exit(2);
  }
  if (!args.book || !args.cardsDir) {
    process.stderr.write(`Missing required args.\n\n${HELP}`);
    process.exit(2);
  }
  return args;
}

/**
 * Group cards by chapter number from the source field.
 *   source: vol0/01_m1_knowledge_graph_fundamentals.tex → chapter 1
 */
function groupCardsByChapter(allCards) {
  const byChapter = new Map();
  for (const card of allCards) {
    const m = (card.source || '').match(/(\d+)_/);
    if (!m) continue;
    const chapter = parseInt(m[1], 10);
    if (!byChapter.has(chapter)) byChapter.set(chapter, []);
    byChapter.get(chapter).push(card);
  }
  return byChapter;
}

/**
 * Render one card as an <AnkiCard> MDX component. Preserves card ID,
 * type, los, front/back content.
 */
function renderCard(card) {
  const front = (card.front || '').trim();
  const back = (card.back || '').trim();
  const type = card.type || 'unknown';
  const los = card.los_id || '';
  const id = card.id || '';

  // JSON-stringify ensures embedded quotes/newlines survive in MDX attrs
  const frontExpr = `{${JSON.stringify(front)}}`;
  const backExpr = `{${JSON.stringify(back)}}`;

  return `<AnkiCard type="${type}" id="${id}" los="${los}" front=${frontExpr} back=${backExpr} />`;
}

/**
 * Build the auto-injected Review section markdown.
 */
function buildReviewSection(cards) {
  const byType = {};
  for (const c of cards) {
    (byType[c.type] ||= []).push(c);
  }

  const lines = [];
  lines.push('');
  lines.push('## Review');
  lines.push('');
  lines.push('{/* CARD-PLACEMENT-TODO: polish pass should move these cards inline */}');
  lines.push('{/* near the concepts they test, per Q-R4.4 hybrid placement.       */}');
  lines.push('');
  for (const type of ['checkpoint', 'keyconcept', 'problem', 'redflag',
                       'vignette', 'interview', 'decisiontree']) {
    const typeCards = byType[type];
    if (!typeCards || typeCards.length === 0) continue;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    lines.push(`### ${label} cards (${typeCards.length})`);
    lines.push('');
    for (const card of typeCards) {
      lines.push(renderCard(card));
      lines.push('');
    }
  }
  return lines.join('\n');
}

/**
 * Inject or replace the auto-injected Review section in a single MDX file.
 * Idempotent: looks for the marker comment and replaces the section if
 * present; otherwise appends.
 */
async function injectIntoChapter(mdxPath, cards, dryRun) {
  const source = await readFile(mdxPath, 'utf-8');
  const newSection = buildReviewSection(cards);

  const markerStart = '{/* CARD-PLACEMENT-AUTOSTART */}';
  const markerEnd = '{/* CARD-PLACEMENT-AUTOEND */}';
  const wrappedSection = `${markerStart}\n${newSection}\n${markerEnd}\n`;

  let next;
  if (source.includes(markerStart) && source.includes(markerEnd)) {
    // Replace existing auto section
    const before = source.slice(0, source.indexOf(markerStart));
    const after = source.slice(source.indexOf(markerEnd) + markerEnd.length);
    next = before + wrappedSection + after;
  } else {
    next = source.trimEnd() + '\n\n' + wrappedSection;
  }

  if (dryRun) {
    process.stdout.write(`--- ${mdxPath} would gain ${cards.length} cards ---\n`);
    return;
  }
  await writeFile(mdxPath, next, 'utf-8');
  process.stderr.write(`  ✓ ${mdxPath} (+${cards.length} cards)\n`);
}

/**
 * Find the MDX file for a given chapter number within a book.
 *   chapter 1 → 01-*.mdx
 */
async function findChapterMdx(contentRoot, book, chapter) {
  const bookDir = join(contentRoot, book);
  const prefix = String(chapter).padStart(2, '0') + '-';
  const files = await readdir(bookDir);
  const match = files.find((f) => f.startsWith(prefix) && f.endsWith('.mdx'));
  return match ? join(bookDir, match) : null;
}

async function main() {
  const args = parseArgs(process.argv);
  const skipTypes = new Set(args.skipTypes.split(',').map((s) => s.trim()));

  // Load all .yml files in cards-dir (except all_cards.yml which is a union)
  const ymlFiles = (await readdir(args.cardsDir))
    .filter((f) => f.endsWith('.yml') && f !== 'all_cards.yml')
    .sort();

  process.stderr.write(`Loading ${ymlFiles.length} card files from ${args.cardsDir}\n`);

  const allCards = [];
  for (const f of ymlFiles) {
    const content = await readFile(join(args.cardsDir, f), 'utf-8');
    const parsed = yaml.parse(content);
    if (!parsed || !Array.isArray(parsed.cards)) continue;
    for (const card of parsed.cards) {
      if (skipTypes.has(card.type)) continue;
      allCards.push(card);
    }
  }
  process.stderr.write(`Loaded ${allCards.length} cards after skipping types: [${[...skipTypes].join(', ')}]\n`);

  const byChapter = groupCardsByChapter(allCards);
  const contentRoot = resolve(args.contentDir);

  for (const [chapter, cards] of [...byChapter].sort(([a], [b]) => a - b)) {
    const mdxPath = await findChapterMdx(contentRoot, args.book, chapter);
    if (!mdxPath) {
      process.stderr.write(`No MDX for ${args.book} chapter ${chapter}; skipping\n`);
      continue;
    }
    await injectIntoChapter(mdxPath, cards, args.dryRun);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  if (process.env.DEBUG) process.stderr.write(err.stack + '\n');
  process.exit(1);
});
