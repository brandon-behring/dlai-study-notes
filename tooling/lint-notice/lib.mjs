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
 * Normalize a NOTICE cell for comparison. A `[text](url)` link compares as its
 * url in the source_url column and as its visible text in every other column,
 * so a linked partner or title is checked by what readers see. `<url>` is
 * unwrapped, and an em/en dash or hyphen placeholder counts as empty (no partner).
 * @param {string} cell
 * @param {string} field - the column's name in ROW_FIELDS
 * @returns {string}
 * @example
 *   normalizeCell('[Neo4j](https://neo4j.com/)', 'partner') // → 'Neo4j'
 *   normalizeCell('[course](https://x/)', 'source_url')     // → 'https://x/'
 */
export function normalizeCell(cell, field) {
  const link = cell.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
  const value = link
    ? (field === 'source_url' ? link[2] : link[1])
    : cell.replace(/^<(.+)>$/, '$1');
  return ['—', '–', '-'].includes(value) ? '' : value;
}

/**
 * Remove HTML comments from one line of markdown. A comment may span lines:
 * pass the previous line's `inComment` and carry the returned one forward.
 * @param {string} line
 * @param {boolean} inComment - whether an earlier line left a comment open
 * @returns {{text: string, inComment: boolean}} the visible text, and whether a comment is still open
 * @example
 *   visibleText('a <!-- b --> c <!-- d', false) // → { text: 'a  c ', inComment: true }
 */
export function visibleText(line, inComment) {
  let text = '';
  let rest = line;
  let open = inComment;
  while (rest) {
    if (open) {
      const end = rest.indexOf('-->');
      if (end === -1) return { text, inComment: true };
      open = false;
      rest = rest.slice(end + 3);
    } else {
      const start = rest.indexOf('<!--');
      if (start === -1) return { text: text + rest, inComment: false };
      text += rest.slice(0, start);
      open = true;
      rest = rest.slice(start + 4);
    }
  }
  return { text, inComment: open };
}

/**
 * Parse the per-book attribution rows out of NOTICE.md. Only rows under the
 * `## Per-book attribution` heading count, and only rows a reader can see:
 * a row inside an HTML comment or a fenced code block is skipped, so hiding a
 * book's row makes the check fail instead of pass. A row is a table row whose
 * first cell is a backticked slug; header, separator and placeholder rows are
 * skipped.
 * @param {string} notice - NOTICE.md contents
 * @returns {Map<string, {title: string, instructor: string, partner: string, source_url: string, line: number}>}
 * @throws {Error} when the section heading is missing, on a row with the wrong column count, or a duplicate slug
 * @example
 *   parseNoticeTable('## Per-book attribution\n| `kg` | KG | A | Neo4j | https://x/ |').get('kg').partner // → 'Neo4j'
 */
export function parseNoticeTable(notice) {
  const rows = new Map();
  let inComment = false;
  let fence = null; // the opening fence while inside a fenced code block
  let inSection = false;
  let sawSection = false;
  notice.split('\n').forEach((raw, i) => {
    if (fence) {
      if (raw.trim().startsWith(fence)) fence = null;
      return;
    }
    const seen = visibleText(raw, inComment);
    inComment = seen.inComment;
    const line = seen.text.trim();
    const opening = line.match(/^(`{3,}|~{3,})/);
    if (opening) {
      fence = opening[1];
      return;
    }
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*$/);
    if (heading) {
      if (heading[1].length <= 2) inSection = heading[1].length === 2 && heading[2] === SECTION;
      sawSection ||= inSection;
      return;
    }
    if (!inSection || !line.startsWith('|')) return;
    const cells = splitRow(line);
    const slug = cells[0].match(/^`([^`]+)`$/);
    if (!slug) return;
    const lineNo = i + 1;
    if (cells.length !== ROW_FIELDS.length + 1) {
      throw new Error(`NOTICE.md:${lineNo}: row for '${slug[1]}' has ${cells.length} cells, expected ${ROW_FIELDS.length + 1} (slug + ${ROW_FIELDS.join(', ')})`);
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
