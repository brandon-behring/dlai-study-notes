#!/usr/bin/env node
/**
 * mdx-card-extractor CLI
 *
 * Walks all MDX chapters in src/content/chapters/, finds <AnkiCard>
 * components, groups them by parent chapter's `book` frontmatter, and
 * emits one .apkg per book.
 *
 * Usage:
 *   extract-cards                  # extract all books
 *   extract-cards --book=<slug>    # extract just one book
 *   extract-cards --dry-run        # report cards found without emitting .apkg
 *
 * Output: dist/anki/<book-slug>.apkg
 *
 * Status: Pilot-ready. AST walk + grouping works; .apkg emission uses
 * anki-apkg-export and also writes a JSON debug artifact next to the deck.
 */
import { resolve, join } from 'node:path';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import * as yaml from 'yaml';

const HELP = `Usage: extract-cards [options]

Options:
  --book=<slug>       Extract just one book (default: all books in corpus)
  --content-dir=<d>   Override default src/content/chapters/
  --out-dir=<d>       Override default dist/anki/
  --dry-run           Report cards without emitting .apkg
  --help, -h          This message

Walks the corpus's MDX chapters, collects <AnkiCard> components, and
emits one .apkg per book.
`;

function parseArgs(argv) {
  const args = {
    book: null,
    contentDir: 'src/content/chapters',
    outDir: 'dist/anki',
    dryRun: false,
  };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') { process.stdout.write(HELP); process.exit(0); }
    if (a === '--dry-run') { args.dryRun = true; continue; }
    const m = a.match(/^--(book|content-dir|out-dir)=(.+)$/);
    if (m) {
      const k = m[1] === 'content-dir' ? 'contentDir' : m[1] === 'out-dir' ? 'outDir' : m[1];
      args[k] = m[2];
      continue;
    }
    process.stderr.write(`Unknown flag: ${a}\n\n${HELP}`);
    process.exit(2);
  }
  return args;
}

/**
 * Extract AnkiCard JSX elements from an MDX file.
 * Returns array of { type, front, back, los, ... } card data + parent book.
 */
async function extractCardsFromFile(filePath) {
  const source = await readFile(filePath, 'utf-8');

  // Parse YAML frontmatter to get the book discriminator
  let book = null;
  const fmMatch = source.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    try {
      const fm = yaml.parse(fmMatch[1]);
      book = fm.book;
    } catch (err) {
      process.stderr.write(`Warning: failed to parse frontmatter in ${filePath}: ${err.message}\n`);
    }
  }

  if (!book) {
    process.stderr.write(`Skipping ${filePath} — no book frontmatter found\n`);
    return [];
  }

  // Parse MDX and walk for <AnkiCard> nodes. remark-math must come
  // BEFORE remark-mdx so that `$X$` math expressions (which may contain
  // `{...}` braces) are recognized as math nodes before MDX treats the
  // braces as JSX expressions.
  const tree = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkMath)
    .use(remarkMdx)
    .parse(source);

  const cards = [];
  visit(tree, (node) => {
    if (
      (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
      node.name === 'AnkiCard'
    ) {
      const props = {};
      for (const attr of node.attributes || []) {
        if (attr.type === 'mdxJsxAttribute') {
          props[attr.name] =
            typeof attr.value === 'string'
              ? attr.value
              : attr.value?.value ?? null;
        }
      }
      cards.push({
        book,
        source: filePath,
        ...props,
      });
    }
  });
  return cards;
}

/**
 * Walk a directory tree for MDX files.
 */
async function findMdxFiles(rootDir) {
  const results = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && /\.mdx?$/.test(e.name)) {
        results.push(full);
      }
    }
  }
  await walk(rootDir);
  return results;
}

/**
 * Emit a .apkg file for a single book.
 *
 * Uses `anki-apkg-export` (JSZip + sql.js based) to write the standard
 * Anki package format. Card IDs from the source YAML are used as stable
 * Anki note GUIDs where present, and also preserved as tags/debug JSON.
 *
 * Card types map to a single shared Note type ("DLAIStudyNotesCard")
 * with front/back fields + tags identifying the card category. v2 can
 * split into per-type Note types if styling needs diverge.
 */
async function emitApkg(book, cards, outDir, dryRun) {
  if (dryRun) {
    process.stdout.write(`\n--- ${book} (${cards.length} cards) ---\n`);
    for (const c of cards) {
      process.stdout.write(`  [${c.type || 'unknown'}] ${c.front?.slice(0, 80) || '(no front)'}\n`);
    }
    return;
  }

  await mkdir(outDir, { recursive: true });

  // Also write the cards JSON for debugging / future re-emission
  const jsonPath = join(outDir, `${book}.cards.json`);
  await writeFile(jsonPath, JSON.stringify(cards, null, 2), 'utf-8');

  // Build .apkg via anki-apkg-export. The module exports as CJS-default
  // wrapping ESM-default; unwrap once to get the constructor.
  const ankiModule = await import('anki-apkg-export');
  const AnkiExport = ankiModule.default?.default || ankiModule.Exporter || ankiModule.default;
  const deckName = `DLAI Study Notes :: ${book}`;
  const apkg = new AnkiExport(deckName, {
    questionFormat: '{{Front}}',
    answerFormat: '{{FrontSide}}<hr id="answer">{{Back}}',
    css: `
      .card { font-family: Georgia, serif; font-size: 18px; line-height: 1.5; color: #1a202c; }
      .ankicard-type { display: inline-block; font-size: 0.7em; text-transform: uppercase;
                       letter-spacing: 0.05em; padding: 0.15em 0.5em; margin-top: 0.5em;
                       background: #edf2f7; border-radius: 2px; color: #4a5568; }
      hr#answer { margin: 1em 0; border: none; border-top: 1px solid #cbd5e0; }
      code { font-family: monospace; background: #f7fafc; padding: 0.1em 0.3em; border-radius: 3px; }
    `,
  });

  for (const c of cards) {
    const front = c.front || '';
    const back = c.back || '';
    const type = c.type || 'unknown';
    const tags = [
      `type:${type}`,
      c.los ? `los:${c.los}` : null,
      c.id ? `cardid:${c.id}` : null,
    ].filter(Boolean);
    apkg.addCard(front, back, { tags });
    if (c.id) {
      const generatedGuid = apkg._getNoteGuid(apkg.topDeckId, front, back);
      apkg._update(
        'update notes set guid=:stableGuid where guid=:generatedGuid',
        { ':stableGuid': c.id, ':generatedGuid': generatedGuid },
      );
    }
  }

  const buf = await apkg.save();
  const apkgPath = join(outDir, `${book}.apkg`);
  await writeFile(apkgPath, buf);
  process.stderr.write(`  → ${apkgPath} (${cards.length} cards, ${(buf.length / 1024).toFixed(1)} KB)\n`);
  process.stderr.write(`  → ${jsonPath} (debug source)\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  const contentRoot = resolve(args.contentDir);
  const outRoot = resolve(args.outDir);

  const mdxFiles = await findMdxFiles(contentRoot);
  process.stderr.write(`Found ${mdxFiles.length} MDX files under ${contentRoot}\n`);

  // Collect all cards across all files
  const allCards = [];
  for (const f of mdxFiles) {
    const fileCards = await extractCardsFromFile(f);
    allCards.push(...fileCards);
  }
  process.stderr.write(`Found ${allCards.length} <AnkiCard> components total\n`);

  // Group by book
  const byBook = {};
  for (const c of allCards) {
    (byBook[c.book] ||= []).push(c);
  }

  // Filter to one book if requested
  const books = args.book ? [args.book] : Object.keys(byBook);

  for (const book of books) {
    const cards = byBook[book] || [];
    if (cards.length === 0) {
      process.stderr.write(`No cards found for book "${book}"\n`);
      continue;
    }
    await emitApkg(book, cards, outRoot, args.dryRun);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  if (process.env.DEBUG) process.stderr.write(err.stack + '\n');
  process.exit(1);
});
