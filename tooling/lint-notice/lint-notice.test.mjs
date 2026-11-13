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
  SECTION, splitFrontmatter, frontmatterScalar, parseBook, splitRow, normalizeCell,
  ambiguousMarkup, atxHeading, parseNoticeTable, checkNotice,
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

/** A NOTICE.md body with the given lines under the attribution heading's table header. */
const notice = (...lines) => ['# Notice', '', `## ${SECTION}`, '', NOTICE_HEAD, ...lines, ''].join('\n');

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
    book: 'knowledge-graphs-rag',
    title: 'Knowledge Graphs for RAG',
    instructor: 'Andreas Kollegger',
    partner: 'Neo4j',
    source_url: 'https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/',
  });
  const noInstructor = KG_BOOK.replace('instructor: Andreas Kollegger\n', '');
  assert.throws(() => parseBook(noInstructor, 'kg.mdx'), /kg\.mdx: frontmatter must set a non-empty 'instructor'/);
});

test('splitRow honours escaped pipes; normalizeCell keeps cells as written except a source_url autolink and dashes', () => {
  assert.deepEqual(splitRow('| `kg` | A \\| B | x |'), ['`kg`', 'A | B', 'x']);
  assert.equal(normalizeCell('<https://x/>', 'source_url'), 'https://x/');
  assert.equal(normalizeCell('<https://x/>', 'partner'), '<https://x/>');
  assert.equal(normalizeCell('[course](https://x/)', 'source_url'), '[course](https://x/)');
  assert.equal(normalizeCell('[Neo4j](https://neo4j.com/)', 'partner'), '[Neo4j](https://neo4j.com/)');
  assert.equal(normalizeCell('—', 'partner'), '');
  assert.equal(normalizeCell('Neo4j', 'partner'), 'Neo4j');
});

test('ambiguousMarkup flags fences, setext underlines and raw HTML, but not code spans or autolinks', () => {
  const plain = [
    'Plain text with a | pipe',
    KG_ROW,
    '|---|:---:|---|',
    'Email <brandon@example.com> or see <https://x/>',
    'Each row mirrors `src/content/books/<slug>.mdx`.',
    'Type `<!--` to start a comment', // a code span is literal: it hides nothing
    '* * *',
    'a < b and 3 > 2',
  ];
  for (const line of plain) assert.equal(ambiguousMarkup(line), null, line);
  const flagged = [
    ['```', /code fence/],
    ['   ~~~md', /code fence/],
    ['```not-a-close', /code fence/], // could close a fence early in a line reader
    ['```span``` at line start', /code fence/], // not a fence on GitHub: refused, not guessed
    ['---', /setext heading underline/],
    ['  ===  ', /setext heading underline/],
    ['<!-- hidden', /raw HTML \('<!--'\)/],
    ['| `kg` | KG | A | Neo4j <!-- | old --> | https://x/ |', /raw HTML \('<!--'\)/], // GitHub splits cells first
    ['<details>', /raw HTML \('<details>'\)/],
    ['Partner: <Neo4j>', /raw HTML \('<Neo4j>'\)/],
    ['text <span hidden>x</span>', /raw HTML \('<span'\)/],
  ];
  for (const [line, re] of flagged) assert.match(ambiguousMarkup(line) ?? 'null', re, line);
});

test('atxHeading reads levels, indents and closing hashes as GitHub does', () => {
  assert.deepEqual(atxHeading(`## ${SECTION}`), { level: 2, text: SECTION });
  assert.deepEqual(atxHeading(`   ## ${SECTION} ##`), { level: 2, text: SECTION });
  assert.deepEqual(atxHeading('##'), { level: 2, text: '' });
  assert.equal(atxHeading(`##${SECTION}`), null);
  assert.equal(atxHeading(`    ## ${SECTION}`), null); // four spaces: code
  assert.equal(atxHeading('####### seven'), null);
});

test('parseNoticeTable keeps slug rows only and fails loudly on malformed or duplicate rows', () => {
  const rows = parseNoticeTable(`intro\n\n## ${SECTION}\n\n${NOTICE_HEAD}\n| _(placeholder)_ | | | | |\n${KG_ROW}\n`);
  assert.deepEqual([...rows.keys()], ['knowledge-graphs-rag']);
  assert.equal(rows.get('knowledge-graphs-rag').instructor, 'Andreas Kollegger');
  assert.equal(rows.get('knowledge-graphs-rag').line, 8);
  assert.throws(() => parseNoticeTable(notice('| `kg` | KG | A |')), /row for 'kg' has 3 cells, expected 5/);
  assert.throws(() => parseNoticeTable(notice(KG_ROW, KG_ROW)), /duplicate row for 'knowledge-graphs-rag'/);
});

test('parseNoticeTable refuses markup that can hide a row or end the section, anywhere in the file', () => {
  const refused = [
    [notice('<!--', KG_ROW, '-->'), 7],
    [notice(`<!-- ${KG_ROW} -->`), 7],
    [notice('```', KG_ROW, '```'), 7],
    [notice('~~~md', KG_ROW, '~~~'), 7],
    // An unclosed HTML block above the heading folds the whole section away.
    [`<details>\n\n${notice(KG_ROW)}</details>\n`, 1],
    // A setext heading ends the section on GitHub, so the row under it is not attribution.
    [`${notice(KG_ROW)}\nOther section\n-------------\n\n${NOTICE_HEAD}\n| \`gone\` | G | X | — | https://g/ |\n`, 10],
  ];
  for (const [text, line] of refused) {
    assert.throws(() => parseNoticeTable(text), new RegExp(`^Error: NOTICE\\.md:${line}: contains (a code fence|raw HTML|a setext)`), text);
  }
});

test('parseNoticeTable reads the tables of the attribution section only, its subsections included', () => {
  const other = '| `other` | O | B | — | https://o/ |';
  const sub = [`   ## ${SECTION} ##`, '', NOTICE_HEAD, KG_ROW, '', '### Draft books', '', NOTICE_HEAD, other, ''].join('\n');
  assert.deepEqual([...parseNoticeTable(sub).keys()], ['knowledge-graphs-rag', 'other']);

  // A backticked table in another section is not attribution: neither read nor a parse error.
  const elsewhere = `${notice(KG_ROW)}\n## Other repos\n\n| \`mbadry1/notes\` | summaries |\n`;
  assert.deepEqual([...parseNoticeTable(elsewhere).keys()], ['knowledge-graphs-rag']);

  // After a blank line, a four-space indent makes a code block, not a row.
  assert.equal(parseNoticeTable(notice('', `    ${KG_ROW}`)).size, 0);

  assert.throws(() => parseNoticeTable(`# Notice\n\n${NOTICE_HEAD}\n${KG_ROW}\n`), /no '## Per-book attribution' heading/);
  assert.throws(() => parseNoticeTable(`##${SECTION}\n\n${NOTICE_HEAD}\n${KG_ROW}\n`), /no '## Per-book attribution' heading/);
});

test('parseNoticeTable needs each table to open with a five-cell header and a matching delimiter row', () => {
  // Under a four-cell header GitHub drops each row's fifth cell, the source URL.
  const four = '| Book slug | Course title | Instructor(s) | Partner |\n|---|---|---|---|';
  assert.throws(() => parseNoticeTable(`## ${SECTION}\n\n${four}\n${KG_ROW}\n`), /NOTICE\.md:3: a table .* header row of 5 cells/);
  // Without a delimiter row GitHub shows the rows as a paragraph, not a table.
  assert.throws(() => parseNoticeTable(`## ${SECTION}\n\n${KG_ROW}\n`), /NOTICE\.md:3: a table/);
  // A delimiter row with fewer cells than the header makes no table either.
  const header = NOTICE_HEAD.split('\n')[0];
  assert.throws(() => parseNoticeTable(`## ${SECTION}\n\n${header}\n|---|---|\n${KG_ROW}\n`), /NOTICE\.md:3: a table/);
});

test('checkNotice reports missing, mismatched and orphan rows; draft books need a row too', () => {
  const book = parseBook(KG_BOOK, 'kg.mdx');
  assert.deepEqual(checkNotice([book], parseNoticeTable(notice(KG_ROW))), []);

  const missing = checkNotice([book], new Map());
  assert.deepEqual(missing.map((v) => v.kind), ['missing-row']);

  // A draft book's non-draft chapters still publish with the course credit.
  const draftSrc = KG_BOOK.replace('draft: false', 'draft: true');
  assert.match(draftSrc, /^draft: true$/m);
  const draft = parseBook(draftSrc, 'kg.mdx');
  assert.deepEqual(checkNotice([draft], new Map()).map((v) => v.kind), ['missing-row']);

  const mismatch = checkNotice([book], parseNoticeTable(notice(KG_ROW.replace('Neo4j', 'Neo5j'))));
  assert.deepEqual(mismatch.map((v) => v.kind), ['field-mismatch']);
  assert.match(mismatch[0].detail, /partner is "Neo5j" but kg\.mdx has "Neo4j"/);

  // Cells compare as written. A link fails even when its text matches, since its
  // target goes unchecked, and a link whose target matches fails too.
  for (const cell of ['[Neo4j](https://neo4j.com/)', '[Wrong company](Neo4j)']) {
    const row = KG_ROW.replace('| Neo4j |', `| ${cell} |`);
    assert.notEqual(row, KG_ROW);
    assert.deepEqual(checkNotice([book], parseNoticeTable(notice(row))).map((v) => v.kind), ['field-mismatch'], cell);
  }
  // A partner in angle brackets is an HTML tag, which GitHub renders as nothing.
  assert.throws(() => parseNoticeTable(notice(KG_ROW.replace('| Neo4j |', '| <Neo4j> |'))), /raw HTML \('<Neo4j>'\)/);
  // A source URL may be an autolink: it shows the URL itself.
  const autolinked = KG_ROW.replace(/\| (https:[^ ]+) \|$/, '| <$1> |');
  assert.notEqual(autolinked, KG_ROW);
  assert.deepEqual(checkNotice([book], parseNoticeTable(notice(autolinked))), []);

  const orphan = checkNotice([book], parseNoticeTable(notice(KG_ROW, '| `gone` | G | X | — | https://g/ |')));
  assert.deepEqual(orphan.map((v) => [v.kind, v.book]), [['orphan-row', 'gone']]);
});

/** Build a throwaway corpus root with one book and the given NOTICE text. */
function fixture(t, noticeText) {
  const root = mkdtempSync(join(tmpdir(), 'lint-notice-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src/content/books'), { recursive: true });
  writeFileSync(join(root, 'src/content/books/knowledge-graphs-rag.mdx'), KG_BOOK);
  writeFileSync(join(root, 'NOTICE.md'), noticeText);
  return root;
}

test('CLI exits 0 when NOTICE matches the books', (t) => {
  const root = fixture(t, notice(KG_ROW));
  const r = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /✓ 1 book\(s\) attributed/);
});

test('CLI exits 1 and names the book when its NOTICE row is removed', (t) => {
  const root = fixture(t, notice());
  const r = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\[missing-row\] knowledge-graphs-rag/);
});

test('CLI exits 1 with a parse error when NOTICE lacks the attribution heading', (t) => {
  const root = fixture(t, `# Notice\n\n${NOTICE_HEAD}\n${KG_ROW}\n`);
  const r = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\[parse-error\] NOTICE\.md: no '## Per-book attribution' heading/);
});

test('CLI exits 1 with a parse error when a book lacks an attribution field', (t) => {
  const root = fixture(t, notice(KG_ROW));
  writeFileSync(join(root, 'src/content/books/knowledge-graphs-rag.mdx'), KG_BOOK.replace('source_url: https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/\n', ''));
  const r = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\[parse-error\] src\/content\/books\/knowledge-graphs-rag\.mdx: frontmatter must set a non-empty 'source_url'/);
});
