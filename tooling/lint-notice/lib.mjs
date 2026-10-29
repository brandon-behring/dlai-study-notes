/**
 * lint-notice library — keep NOTICE.md's per-book attribution table in sync with
 * each published book's frontmatter (src/content/books/<slug>.mdx).
 *
 * Pure functions only (no I/O) so each is unit-testable; cli.mjs does the reads.
 */

/** Columns a NOTICE row mirrors, in table order after the slug cell. */
export const ROW_FIELDS = ['title', 'instructor', 'partner', 'source_url'];

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
 *            source_url: string, draft: boolean, file: string}}
 * @throws {Error} when a required attribution field is missing or empty
 * @example
 *   parseBook("---\nbook: kg\ntitle: 'KG'\ninstructor: A\nsource_url: https://x/\n---", 'kg.mdx')
 *   // → { book: 'kg', title: 'KG', instructor: 'A', partner: '', source_url: 'https://x/', draft: false, file: 'kg.mdx' }
 */
export function parseBook(src, file) {
  const fm = splitFrontmatter(src, file);
  const rec = { file, draft: frontmatterScalar(fm, 'draft') === 'true' };
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
 * Normalize a NOTICE cell for comparison: unwrap `<url>` and `[text](url)`,
 * and treat an em/en dash or hyphen placeholder as empty (no partner).
 * @param {string} cell
 * @returns {string}
 * @example
 *   normalizeCell('<https://x/>') // → 'https://x/'
 */
export function normalizeCell(cell) {
  const link = cell.match(/^\[[^\]]*\]\(([^)]+)\)$/);
  const value = link ? link[1] : cell.replace(/^<(.+)>$/, '$1');
  return ['—', '–', '-'].includes(value) ? '' : value;
}

/**
 * Parse the per-book attribution rows out of NOTICE.md. A row is a markdown
 * table row whose first cell is a backticked slug; header, separator and
 * placeholder rows are skipped.
 * @param {string} notice - NOTICE.md contents
 * @returns {Map<string, {title: string, instructor: string, partner: string, source_url: string, line: number}>}
 * @throws {Error} on a row with the wrong column count, or a duplicate slug
 * @example
 *   parseNoticeTable('| `kg` | KG | A | Neo4j | https://x/ |').get('kg').partner // → 'Neo4j'
 */
export function parseNoticeTable(notice) {
  const rows = new Map();
  notice.split('\n').forEach((line, i) => {
    if (!line.trim().startsWith('|')) return;
    const cells = splitRow(line);
    const slug = cells[0].match(/^`([^`]+)`$/);
    if (!slug) return;
    const lineNo = i + 1;
    if (cells.length !== ROW_FIELDS.length + 1) {
      throw new Error(`NOTICE.md:${lineNo}: row for '${slug[1]}' has ${cells.length} cells, expected ${ROW_FIELDS.length + 1} (slug + ${ROW_FIELDS.join(', ')})`);
    }
    if (rows.has(slug[1])) throw new Error(`NOTICE.md:${lineNo}: duplicate row for '${slug[1]}' (first at line ${rows.get(slug[1]).line})`);
    const rec = { line: lineNo };
    ROW_FIELDS.forEach((field, j) => { rec[field] = normalizeCell(cells[j + 1]); });
    rows.set(slug[1], rec);
  });
  return rows;
}

/**
 * Compare books against NOTICE rows.
 *   - missing-row: a published (non-draft) book has no row;
 *   - field-mismatch: a row disagrees with its book's frontmatter;
 *   - orphan-row: a row names a slug with no book file.
 * A draft book may have a row (pre-registration) but does not need one.
 * @param {ReturnType<typeof parseBook>[]} books
 * @param {ReturnType<typeof parseNoticeTable>} rows
 * @returns {{kind: string, book: string, detail: string}[]} empty when in sync
 * @example
 *   checkNotice([{ book: 'kg', title: 'KG', instructor: 'A', partner: '', source_url: 'https://x/', draft: false, file: 'kg.mdx' }], new Map())
 *   // → [{ kind: 'missing-row', book: 'kg', detail: 'kg.mdx is published but NOTICE.md has no row for it' }]
 */
export function checkNotice(books, rows) {
  const violations = [];
  const slugs = new Set(books.map((b) => b.book));
  for (const b of books) {
    const row = rows.get(b.book);
    if (!row) {
      if (!b.draft) violations.push({ kind: 'missing-row', book: b.book, detail: `${b.file} is published but NOTICE.md has no row for it` });
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
