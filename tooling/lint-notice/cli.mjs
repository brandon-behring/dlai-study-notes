#!/usr/bin/env node
/**
 * lint-notice — fail the build when NOTICE.md's per-book attribution table
 * drifts from the books' frontmatter (src/content/books/*.mdx):
 *   1. every published (non-draft) book has a row;
 *   2. each row's title / instructor / partner / source URL match the frontmatter;
 *   3. no row names a book that does not exist.
 * DLAI's IP policy asks that the course and its instructors be credited; this
 * makes an unattributed book unshippable instead of a review-time catch.
 * Chained into `npm run validate` → prebuild → fails the build on violation.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook, parseNoticeTable, checkNotice } from './lib.mjs';

const ROOT = process.cwd();
const BOOKS_DIR = 'src/content/books';
const NOTICE = 'NOTICE.md';

function fail(lines) {
  console.error(`\n✗ lint:notice (see ${NOTICE} "Per-book attribution"):\n`);
  for (const l of lines) console.error(`  ${l}`);
  console.error('');
  process.exit(1);
}

let violations;
let books;
try {
  const files = readdirSync(join(ROOT, BOOKS_DIR)).filter((n) => /\.mdx?$/.test(n)).sort();
  if (!files.length) fail([`no book files in ${BOOKS_DIR}/ — expected at least one`]);
  books = files.map((n) => parseBook(readFileSync(join(ROOT, BOOKS_DIR, n), 'utf8'), `${BOOKS_DIR}/${n}`));
  violations = checkNotice(books, parseNoticeTable(readFileSync(join(ROOT, NOTICE), 'utf8')));
} catch (err) {
  fail([`[parse-error] ${err.message}`]);
}

if (violations.length) fail(violations.map((v) => `[${v.kind}] ${v.book}: ${v.detail}`));
const published = books.filter((b) => !b.draft).length;
console.log(`lint:notice: ✓ ${published} published book(s) attributed in ${NOTICE}.`);
