#!/usr/bin/env node
/**
 * lint-mcq — enforce the mechanical MCQ rules from MCQ-GUIDELINES.md so they
 * can't regress:
 *   1. Answer-position balance — per book, the correct option must not cluster on
 *      one position (no position holds more than ceil(N/2), once a book has ≥4 MCQs).
 *   2. Rationales reference distractors by CONTENT, not letter — "(b)"/"option c"
 *      references break on any reorder/shuffle.
 *   3. ≥3 options.
 *   4. No absolute-language tells in option text ("always"/"never"/"cannot" /
 *      "all|none of the above") — a test-savvy reader eliminates them without
 *      domain knowledge (cross-model review flagged this as the top missing check).
 * Chained into `npm run validate` → prebuild → fails the build on violation.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const QDIR = 'src/content/questions';

function walk(dir, acc = []) {
  for (const n of readdirSync(join(ROOT, dir))) {
    const r = join(dir, n);
    if (statSync(join(ROOT, r)).isDirectory()) walk(r, acc);
    else if (n.endsWith('.mdx') || n.endsWith('.md')) acc.push(r);
  }
  return acc;
}

/** Split frontmatter / body. */
function split(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: src };
}

/** Ordered option ids + text + index of the correct one, from `options:`. */
function parseOptions(fm) {
  const block = (fm.match(/^options:\s*\n((?:[ \t].*\n?)*)/m) || [])[1] || '';
  const ids = [], texts = [];
  let correctIdx = -1, cur = -1;
  for (const line of block.split('\n')) {
    const idm = line.match(/^\s*-\s*id:\s*['"]?([\w-]+)/);
    if (idm) { ids.push(idm[1]); texts.push(''); cur++; }
    const tm = line.match(/^\s*text:\s*(.+?)\s*$/);
    if (tm && cur >= 0) texts[cur] = tm[1].replace(/^['"]|['"]$/g, '');
    if (/correct:\s*true/.test(line) && cur >= 0) correctIdx = cur;
  }
  return { ids, texts, correctIdx };
}

/** Absolute-language tells that let a reader eliminate an option without
 *  domain knowledge. Hard-flagged (these almost never belong in a precise ML
 *  option); softer words like "only"/"all" are a review rule, not a lint. */
const ABSOLUTE_RE = /\b(always|never|cannot)\b|\b(can|won)['’]t\b|\b(all|none)\s+of\s+the\s+above\b/i;

const violations = [];
const byBook = {}; // book -> [{ file, pos }]

for (const file of walk(QDIR)) {
  const { fm, body } = split(readFileSync(join(ROOT, file), 'utf8'));
  if (!/^type:\s*mcq\b/m.test(fm)) continue;
  const book = relative(QDIR, file).split(/[\\/]/)[0];
  const { ids, texts, correctIdx } = parseOptions(fm);

  if (ids.length < 3) violations.push({ kind: 'too-few-options', file, detail: `${ids.length} options (need ≥3)` });
  if (correctIdx >= 0) (byBook[book] ??= []).push({ file, pos: correctIdx });

  // absolute-language tells in option text
  const tells = texts.filter((t) => ABSOLUTE_RE.test(t)).map((t) => `"${t.slice(0, 40)}…"`);
  if (tells.length) violations.push({ kind: 'absolute-tell', file, detail: tells.join('; ') });

  // length tell: the keyed-correct option must not be markedly longer than every
  // distractor — a reader picks "the long, fully-qualified one" without domain knowledge
  // (cross-model review's #1 MCQ tell). Cap the correct-vs-longest-distractor gap.
  if (correctIdx >= 0 && texts.length >= 2) {
    const correctLen = texts[correctIdx].length;
    const maxDistractor = Math.max(...texts.filter((_, i) => i !== correctIdx).map((t) => t.length));
    const GAP = 25;
    if (correctLen - maxDistractor > GAP) {
      violations.push({ kind: 'length-tell', file, detail: `correct option ${correctLen} chars vs longest distractor ${maxDistractor} (+${correctLen - maxDistractor}, cap +${GAP})` });
    }
  }

  // letter-referenced distractors in the rationale/body
  const refs = [...new Set([
    ...(body.match(/\((?:[a-dA-D])\)/g) || []),
    ...(body.match(/\boption\s+[a-dA-D]\b/gi) || []),
  ])];
  if (refs.length) violations.push({ kind: 'letter-ref', file, detail: refs.join(', ') });
}

// position balance per book
for (const [book, arr] of Object.entries(byBook)) {
  if (arr.length < 4) continue;
  const counts = {};
  for (const { pos } of arr) counts[pos] = (counts[pos] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  const cap = Math.ceil(arr.length / 2);
  if (max > cap) {
    const dist = Object.entries(counts).sort().map(([p, c]) => `pos${p}=${c}`).join(' ');
    violations.push({ kind: 'position-clustering', file: `book: ${book}`, detail: `${max}/${arr.length} correct on one position (max ${cap}); ${dist}` });
  }
}

if (violations.length) {
  console.error('\n✗ lint:mcq violations (see MCQ-GUIDELINES.md):\n');
  for (const v of violations) console.error(`  [${v.kind}] ${v.file}: ${v.detail}`);
  console.error('');
  process.exit(1);
}
const total = Object.values(byBook).reduce((n, a) => n + a.length, 0);
console.log(`lint:mcq: ✓ ${total} MCQ(s) — balanced answer positions, content-referenced rationales.`);
