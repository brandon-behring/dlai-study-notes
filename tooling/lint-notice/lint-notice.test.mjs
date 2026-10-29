/**
 * Tests for lint-notice: unit tests for the pure parsers/checker, plus CLI runs
 * against fixture corpora (in sync → exit 0; a removed row → exit 1 naming the book).
 * Run: npm run test:tooling
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  splitFrontmatter, frontmatterScalar, parseBook, splitRow, normalizeCell,
  parseNoticeTable, checkNotice,
} from './lib.mjs';

const CLI = join(dirname(fileURLToPath(import.meta.url)), 'cli.mjs');

const KG_BOOK = [
  '---',
  'book: knowledge-graphs-rag',
  "title: 'Knowledge Graphs for RAG'",
  'instructor: Andreas Kollegger',
  'partner: Neo4j',
  'source_url: https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/',
  'description: >',
  '  Folded text that is not an attribution field.',
  'draft: false',
  '---',
  '',
  '# Knowledge Graphs for RAG',
].join('\n');

const KG_ROW = '| `knowledge-graphs-rag` | Knowledge Graphs for RAG | Andreas Kollegger | Neo4j | https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/ |';
const NOTICE_HEAD = '| Book slug | Course title | Instructor(s) | Partner | Source URL |\n|---|---|---|---|---|';

test('splitFrontmatter returns the fenced block and fails loudly without one', () => {
  assert.equal(splitFrontmatter('---\nbook: kg\n---\n# Body', 'kg.mdx'), 'book: kg');
  assert.throws(() => splitFrontmatter('# no frontmatter', 'x.mdx'), /x\.mdx: expected a leading '---'/);
});

test('frontmatterScalar unquotes values, matches exact keys only, and skips block scalars', () => {
  const fm = [
    "title: 'It''s RAG'",
    'quoted: "say \\"hi\\""',
    'plain: John Gilhuly & Aman Khan # a comment',
    'title_extra: nope',
    'description: >',
    '  nested: not top-level',
  ].join('\n');
  assert.equal(frontmatterScalar(fm, 'title'), "It's RAG");
  assert.equal(frontmatterScalar(fm, 'quoted'), 'say "hi"');
  assert.equal(frontmatterScalar(fm, 'plain'), 'John Gilhuly & Aman Khan');
  assert.equal(frontmatterScalar(fm, 'description'), undefined);
  assert.equal(frontmatterScalar(fm, 'nested'), undefined);
  assert.equal(frontmatterScalar(fm, 'absent'), undefined);
});

test('parseBook reads attribution fields and rejects a book missing one', () => {
  assert.deepEqual(parseBook(KG_BOOK, 'kg.mdx'), {
    file: 'kg.mdx',
    draft: false,
    book: 'knowledge-graphs-rag',
    title: 'Knowledge Graphs for RAG',
    instructor: 'Andreas Kollegger',
    partner: 'Neo4j',
    source_url: 'https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/',
  });
  const noInstructor = KG_BOOK.replace('instructor: Andreas Kollegger\n', '');
  assert.throws(() => parseBook(noInstructor, 'kg.mdx'), /kg\.mdx: frontmatter must set a non-empty 'instructor'/);
  assert.equal(parseBook(KG_BOOK.replace('draft: false', 'draft: true'), 'kg.mdx').draft, true);
});

test('splitRow honours escaped pipes; normalizeCell unwraps links and dash placeholders', () => {
  assert.deepEqual(splitRow('| `kg` | A \\| B | x |'), ['`kg`', 'A | B', 'x']);
  assert.equal(normalizeCell('<https://x/>'), 'https://x/');
  assert.equal(normalizeCell('[course](https://x/)'), 'https://x/');
  assert.equal(normalizeCell('—'), '');
  assert.equal(normalizeCell('Neo4j'), 'Neo4j');
});

test('parseNoticeTable keeps slug rows only and fails loudly on malformed or duplicate rows', () => {
  const rows = parseNoticeTable(`intro\n\n${NOTICE_HEAD}\n| _(placeholder)_ | | | | |\n${KG_ROW}\n`);
  assert.deepEqual([...rows.keys()], ['knowledge-graphs-rag']);
  assert.equal(rows.get('knowledge-graphs-rag').instructor, 'Andreas Kollegger');
  assert.equal(rows.get('knowledge-graphs-rag').line, 6);
  assert.throws(() => parseNoticeTable('| `kg` | KG | A |'), /row for 'kg' has 3 cells, expected 5/);
  assert.throws(() => parseNoticeTable(`${KG_ROW}\n${KG_ROW}`), /duplicate row for 'knowledge-graphs-rag'/);
});

test('checkNotice reports missing, mismatched and orphan rows; drafts need no row', () => {
  const book = parseBook(KG_BOOK, 'kg.mdx');
  assert.deepEqual(checkNotice([book], parseNoticeTable(KG_ROW)), []);

  const missing = checkNotice([book], new Map());
  assert.deepEqual(missing.map((v) => v.kind), ['missing-row']);

  assert.deepEqual(checkNotice([{ ...book, draft: true }], new Map()), []);

  const mismatch = checkNotice([book], parseNoticeTable(KG_ROW.replace('Neo4j', 'Neo5j')));
  assert.deepEqual(mismatch.map((v) => v.kind), ['field-mismatch']);
  assert.match(mismatch[0].detail, /partner is "Neo5j" but kg\.mdx has "Neo4j"/);

  const orphan = checkNotice([book], parseNoticeTable(`${KG_ROW}\n| \`gone\` | G | X | — | https://g/ |`));
  assert.deepEqual(orphan.map((v) => [v.kind, v.book]), [['orphan-row', 'gone']]);
});

/** Build a throwaway corpus root with one book and the given NOTICE text. */
function fixture(t, notice) {
  const root = mkdtempSync(join(tmpdir(), 'lint-notice-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src/content/books'), { recursive: true });
  writeFileSync(join(root, 'src/content/books/knowledge-graphs-rag.mdx'), KG_BOOK);
  writeFileSync(join(root, 'NOTICE.md'), notice);
  return root;
}

test('CLI exits 0 when NOTICE matches the books', (t) => {
  const root = fixture(t, `# Notice\n\n${NOTICE_HEAD}\n${KG_ROW}\n`);
  const r = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /✓ 1 published book\(s\) attributed/);
});

test('CLI exits 1 and names the book when its NOTICE row is removed', (t) => {
  const root = fixture(t, `# Notice\n\n${NOTICE_HEAD}\n`);
  const r = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\[missing-row\] knowledge-graphs-rag/);
});

test('CLI exits 1 with a parse error when a book lacks an attribution field', (t) => {
  const root = fixture(t, `${NOTICE_HEAD}\n${KG_ROW}\n`);
  writeFileSync(join(root, 'src/content/books/knowledge-graphs-rag.mdx'), KG_BOOK.replace('source_url: https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/\n', ''));
  const r = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\[parse-error\] src\/content\/books\/knowledge-graphs-rag\.mdx: frontmatter must set a non-empty 'source_url'/);
});
