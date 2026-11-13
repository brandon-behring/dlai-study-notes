/**
 * lint-notice library — keep NOTICE.md's per-book attribution table in sync with
 * each published book's frontmatter (src/content/books/<slug>.mdx).
 *
 * Pure functions only (no I/O) so each is unit-testable; cli.mjs does the reads.
 */

/** Columns a NOTICE row mirrors, in table order after the slug cell. */
export const ROW_FIELDS = ['title', 'instructor', 'partner', 'source_url'];

/** The NOTICE.md `##` heading whose table holds the per-book rows. */
export const SECTION = 'Per-book attribution';

/** Frontmatter keys every book must declare for attribution. */
const REQUIRED_BOOK_FIELDS = ['book', 'title', 'instructor', 'source_url'];

/**
 * Split an MDX/Markdown source into its frontmatter text.
 * @param {string} src - full file contents
 * @param {string} file - path, for the error message
 * @returns {string} the text between the leading `---` fences
 * @throws {Error} when the file has no leading frontmatter block
 * @example
 *   splitFrontmatter('---\nbook: kg\n---\n# Body', 'kg.mdx') // → 'book: kg'
 */
export function splitFrontmatter(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) throw new Error(`${file}: expected a leading '---' frontmatter block, found none`);
  return m[1];
}

/**
 * Read one top-level scalar from YAML frontmatter.
 * Handles 'single-quoted' ('' escapes a quote), "double-quoted" (\" escapes a
 * quote) and plain values. Block scalars (`>`/`|`) are not attribution fields
 * and return undefined.
 * @param {string} fm - frontmatter text
 * @param {string} key - top-level key (exact match, not a prefix)
 * @returns {string | undefined} the unquoted value, or undefined when absent
 * @example
 *   frontmatterScalar("title: 'It''s RAG'\ndraft: false", 'title') // → "It's RAG"
 */
export function frontmatterScalar(fm, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = fm.match(new RegExp(`^${escaped}:[ \\t]*(.*?)[ \\t]*$`, 'm'));
  if (!m) return undefined;
  const raw = m[1];
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) return raw.slice(1, -1).replace(/''/g, "'");
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) return raw.slice(1, -1).replace(/\\"/g, '"');
  if (raw === '>' || raw === '|' || raw.startsWith('>-') || raw.startsWith('|-')) return undefined;
  return raw.replace(/\s+#.*$/, ''); // a plain scalar's ` # comment` is not part of the value
}

/**
 * Parse a book file into the attribution record NOTICE must mirror.
 * @param {string} src - book file contents
 * @param {string} file - path, for error messages
 * @returns {{book: string, title: string, instructor: string, partner: string,
 *            source_url: string, file: string}}
 * @throws {Error} when a required attribution field is missing or empty
 * @example
 *   parseBook("---\nbook: kg\ntitle: 'KG'\ninstructor: A\nsource_url: https://x/\n---", 'kg.mdx')
 *   // → { book: 'kg', title: 'KG', instructor: 'A', partner: '', source_url: 'https://x/', file: 'kg.mdx' }
 */
export function parseBook(src, file) {
  const fm = splitFrontmatter(src, file);
  const rec = { file };
  for (const key of REQUIRED_BOOK_FIELDS) {
    const value = frontmatterScalar(fm, key);
    if (!value) throw new Error(`${file}: frontmatter must set a non-empty '${key}' (attribution field), found ${value === undefined ? 'none' : 'an empty value'}`);
    rec[key] = value;
  }
  rec.partner = frontmatterScalar(fm, 'partner') ?? '';
  return rec;
}

/**
 * Split one markdown table row into trimmed cells, honouring `\|` escapes.
 * @param {string} line - a row such as "| a | b \\| c |"
 * @returns {string[]} cell texts without the outer pipes
 * @example
 *   splitRow('| `kg` | A \\| B | x |') // → ['`kg`', 'A | B', 'x']
 */
export function splitRow(line) {
  const cells = [];
  let cur = '';
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && body[i + 1] === '|') { cur += '|'; i++; continue; }
    if (body[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += body[i];
  }
  cells.push(cur.trim());
  return cells;
}

/**
 * Normalize a NOTICE cell for comparison. A cell compares as written, so a cell
 * that renders as something other than its text (a link, emphasis, an entity)
 * fails the comparison instead of passing on a part readers do not see. Two
 * exceptions: a `<scheme:…>` autolink in the source_url column compares as its
 * url, which is also the text it shows; and an em/en dash or hyphen placeholder
 * counts as empty (no partner).
 * @param {string} cell
 * @param {string} field - the column's name in ROW_FIELDS
 * @returns {string}
 * @example
 *   normalizeCell('<https://x/>', 'source_url')             // → 'https://x/'
 *   normalizeCell('[Neo4j](https://neo4j.com/)', 'partner') // → '[Neo4j](https://neo4j.com/)', unchanged
 */
export function normalizeCell(cell, field) {
  const value = field === 'source_url'
    ? cell.replace(/^<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*)>$/, '$1')
    : cell;
  return ['—', '–', '-'].includes(value) ? '' : value;
}

/** A CommonMark autolink at the start of the text: `<scheme:…>` or `<name@host>`. It shows its own text. */
const AUTOLINK = /^<(?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*|[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/;

/** Blockquote and list markers at the start of a line (`> `, `- `, `1. `), with the spaces before them. */
const CONTAINER = /^(?:[ \t]*(?:>|[-+*](?=[ \t]|$)|\d{1,9}[.)](?=[ \t]|$)))+/;

/** Where the backtick run of length `len` that closes a code span ends, searching from `from`; -1 if none. */
function closingRun(line, from, len) {
  for (let k = from; k < line.length;) {
    if (line[k] !== '`') { k++; continue; }
    let m = k;
    while (line[m] === '`') m++;
    if (m - k === len) return m;
    k = m;
  }
  return -1;
}

/**
 * Drop what CommonMark reads as literal text before it looks for HTML: inline
 * code spans and backslash-escaped punctuation. A backtick run with no closing
 * run of the same length is kept, as literal backticks.
 * @param {string} line
 * @returns {string}
 * @example
 *   inlineText('a `<b>` \\<c> d') // → 'a  c> d'
 */
export function inlineText(line) {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '\\' && /[!-\/:-@\[-`{-~]/.test(line[i + 1] ?? '')) {
      i += 2;
      continue;
    }
    if (line[i] === '`') {
      let j = i;
      while (line[j] === '`') j++;
      const close = closingRun(line, j, j - i);
      if (close === -1) out += line.slice(i, j);
      i = close === -1 ? j : close;
      continue;
    }
    out += line[i++];
  }
  return out;
}

/**
 * Find markup in one line of NOTICE.md that a line-by-line reader cannot judge
 * the way GitHub renders it, because it can hide rows or end the attribution
 * section above rows the reader would still count: a code fence, a setext
 * underline, a link or footnote definition (each also inside a list or quote),
 * a heading inside a list or quote, and raw HTML (a comment, or a tag such as
 * `<details>`). NOTICE.md needs none of them, so parseNoticeTable refuses them
 * anywhere in the file rather than guess. Code spans, escaped characters and
 * autolinks are not raw HTML. A `---` line is refused even as a rule, since
 * text directly above makes it a heading underline; a backtick line that is
 * not a valid fence is refused too.
 * @param {string} line
 * @returns {string | null} a description of the markup, or null for a plain line
 * @example
 *   ambiguousMarkup('Email <a@b.co> about `<slug>`') // → null
 *   ambiguousMarkup('| `kg` | A <!-- | --> |')       // → "raw HTML ('<!--')"
 */
export function ambiguousMarkup(line) {
  const nested = CONTAINER.test(line);
  const body = line.replace(CONTAINER, '').replace(/^[ \t]+/, '');
  if (/^(`{3,}|~{3,})/.test(body)) return 'a code fence';
  if (/^(=+|-+)[ \t]*$/.test(body)) return "a setext heading underline or a '---' rule";
  if (/^\[[^\]]*\]:/.test(body)) return 'a link reference or footnote definition';
  if (nested && /^#{1,6}(?:[ \t]|$)/.test(body)) return 'a heading inside a list or quote';
  const text = inlineText(line);
  for (const m of text.matchAll(/<[A-Za-z\/!?]/g)) {
    const rest = text.slice(m.index);
    if (!AUTOLINK.test(rest)) return `raw HTML ('${rest.match(/^<[^\s>]*>?/)[0]}')`;
  }
  return null;
}

/**
 * Read an ATX heading as GitHub does: up to three spaces of indent, one to six
 * `#`, then a space, a tab or the end of the line; closing `#`s are dropped.
 * @param {string} line
 * @returns {{level: number, text: string} | null}
 * @example
 *   atxHeading('## Per-book attribution ##') // → { level: 2, text: 'Per-book attribution' }
 *   atxHeading('#hashtag')                   // → null
 */
export function atxHeading(line) {
  const m = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/);
  if (!m) return null;
  return { level: m[1].length, text: (m[2] ?? '').replace(/(?:^|[ \t]+)#+$/, '').trim() };
}

/** A line GitHub can read as a table row: a pipe after at most three spaces (four, or a tab, make code). */
const TABLE_LINE = /^ {0,3}\|/;

/** Whether `line` is a GFM delimiter row of `n` cells, such as `|---|:--:|`. */
function isDelimiterRow(line, n) {
  if (line === undefined || !TABLE_LINE.test(line)) return false;
  const cells = splitRow(line);
  return cells.length === n && cells.every((c) => /^:?-+:?$/.test(c));
}

/**
 * Parse the per-book attribution rows out of NOTICE.md, reading only what GitHub
 * shows as a row of that section's tables:
 *   - the section runs from the `## Per-book attribution` heading to the next
 *     level-1 or level-2 heading;
 *   - each table in it opens with a header row of five cells and a delimiter
 *     row of as many, since GitHub shows no table without the delimiter row and
 *     drops the cells past the header's count;
 *   - every line there that holds a '|' outside code is a row of such a table
 *     and starts with '|', so no pipe-less table can sit in front of it;
 *   - a row is a table line whose first cell is a backticked slug; header,
 *     delimiter and placeholder rows are skipped.
 * Markup that could hide a row or end the section unseen (see ambiguousMarkup)
 * is an error anywhere in the file.
 * @param {string} notice - NOTICE.md contents
 * @returns {Map<string, {title: string, instructor: string, partner: string, source_url: string, line: number}>}
 * @throws {Error} on such markup, a missing section heading, a table without its
 *   header and delimiter rows, a pipe line that is not such a table's row, a row
 *   with the wrong cell count, or a duplicate slug
 * @example
 *   parseNoticeTable('## Per-book attribution\n| s | t | i | p | u |\n|---|---|---|---|---|\n| `kg` | KG | A | Neo4j | https://x/ |').get('kg').partner // → 'Neo4j'
 */
export function parseNoticeTable(notice) {
  const lines = notice.split(/\r?\n/);
  const width = ROW_FIELDS.length + 1;
  const rows = new Map();
  let inSection = false;
  let sawSection = false;
  let inTable = false; // the previous line belongs to a table whose header and delimiter were checked
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const markup = ambiguousMarkup(line);
    if (markup) {
      throw new Error(`NOTICE.md:${lineNo}: contains ${markup}, which can hide a row or end the section where lint:notice cannot see it; use plain headings, text and table rows`);
    }
    const heading = atxHeading(line);
    if (heading) {
      if (heading.level <= 2) inSection = heading.level === 2 && heading.text === SECTION;
      sawSection ||= inSection;
      inTable = false;
      return;
    }
    if (!inSection) {
      inTable = false;
      return;
    }
    if (!TABLE_LINE.test(line)) {
      if (inlineText(line).includes('|')) {
        throw new Error(`NOTICE.md:${lineNo}: a line with a '|' in the '${SECTION}' section must be a table row that starts with '|', indented at most three spaces; lint:notice reads no other table form`);
      }
      inTable = false;
      return;
    }
    const cells = splitRow(line);
    if (!inTable && (cells.length !== width || !isDelimiterRow(lines[i + 1], width))) {
      throw new Error(`NOTICE.md:${lineNo}: a table in the '${SECTION}' section must open with a header row of ${width} cells and a delimiter row ('|---|…') of as many, each starting with '|'; GitHub shows no table without the delimiter row, and drops the cells past the header's count`);
    }
    inTable = true;
    const slug = cells[0].match(/^`([^`]+)`$/);
    if (!slug) return;
    if (cells.length !== width) {
      throw new Error(`NOTICE.md:${lineNo}: row for '${slug[1]}' has ${cells.length} cells, expected ${width} (slug + ${ROW_FIELDS.join(', ')})`);
    }
    if (rows.has(slug[1])) throw new Error(`NOTICE.md:${lineNo}: duplicate row for '${slug[1]}' (first at line ${rows.get(slug[1]).line})`);
    const rec = { line: lineNo };
    ROW_FIELDS.forEach((field, j) => { rec[field] = normalizeCell(cells[j + 1], field); });
    rows.set(slug[1], rec);
  });
  if (!sawSection) throw new Error(`NOTICE.md: no '## ${SECTION}' heading, so no attribution rows were read`);
  return rows;
}

/**
 * Compare books against NOTICE rows.
 *   - missing-row: a book has no row. Draft books need one too: the chapter
 *     route publishes a draft book's non-draft chapters, course credit and all;
 *   - field-mismatch: a row disagrees with its book's frontmatter;
 *   - orphan-row: a row names a slug with no book file.
 * @param {ReturnType<typeof parseBook>[]} books
 * @param {ReturnType<typeof parseNoticeTable>} rows
 * @returns {{kind: string, book: string, detail: string}[]} empty when in sync
 * @example
 *   checkNotice([{ book: 'kg', title: 'KG', instructor: 'A', partner: '', source_url: 'https://x/', file: 'kg.mdx' }], new Map())
 *   // → [{ kind: 'missing-row', book: 'kg', detail: 'NOTICE.md has no row for kg.mdx' }]
 */
export function checkNotice(books, rows) {
  const violations = [];
  const slugs = new Set(books.map((b) => b.book));
  for (const b of books) {
    const row = rows.get(b.book);
    if (!row) {
      violations.push({ kind: 'missing-row', book: b.book, detail: `NOTICE.md has no row for ${b.file}` });
      continue;
    }
    for (const field of ROW_FIELDS) {
      if (row[field] !== b[field]) {
        violations.push({ kind: 'field-mismatch', book: b.book, detail: `NOTICE.md:${row.line} ${field} is "${row[field]}" but ${b.file} has "${b[field]}"` });
      }
    }
  }
  for (const [slug, row] of rows) {
    if (!slugs.has(slug)) violations.push({ kind: 'orphan-row', book: slug, detail: `NOTICE.md:${row.line} names '${slug}', which has no file in src/content/books/` });
  }
  return violations;
}
