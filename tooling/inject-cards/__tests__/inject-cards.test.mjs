import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  lightCardMarkdown,
  replaceBalancedLatexMacro,
  findMatchingBrace,
  unescapeLatexCode,
} from '../lib.mjs';

// ============================================================================
// findMatchingBrace
// ============================================================================

test('findMatchingBrace: simple', () => {
  assert.equal(findMatchingBrace('{abc}', 0), 4);
});

test('findMatchingBrace: nested braces', () => {
  assert.equal(findMatchingBrace('{a{b}c}', 0), 6);
});

test('findMatchingBrace: escaped braces do not count', () => {
  assert.equal(findMatchingBrace('{a\\{b}', 0), 5);
  assert.equal(findMatchingBrace('{a\\}b}', 0), 5);
});

test('findMatchingBrace: returns -1 for unclosed', () => {
  assert.equal(findMatchingBrace('{abc', 0), -1);
});

test('findMatchingBrace: returns -1 if not opening at index', () => {
  assert.equal(findMatchingBrace('abc{}', 0), -1);
});

// ============================================================================
// replaceBalancedLatexMacro
// ============================================================================

test('replaceBalancedLatexMacro: replaces single macro', () => {
  const out = replaceBalancedLatexMacro('a \\foo{bar} c', 'foo', (b) => `[${b}]`);
  assert.equal(out, 'a [bar] c');
});

test('replaceBalancedLatexMacro: handles nested braces in body', () => {
  const out = replaceBalancedLatexMacro(
    '\\foo{x {y} z}',
    'foo',
    (b) => `(${b})`,
  );
  assert.equal(out, '(x {y} z)');
});

test('replaceBalancedLatexMacro: replaces multiple instances', () => {
  const out = replaceBalancedLatexMacro(
    '\\a{1} and \\a{2}',
    'a',
    (b) => `<${b}>`,
  );
  assert.equal(out, '<1> and <2>');
});

test('replaceBalancedLatexMacro: ignores macro without following brace', () => {
  // \foo here is bare, no braces — should remain
  const out = replaceBalancedLatexMacro('\\foo bar', 'foo', (b) => `(${b})`);
  assert.equal(out, '\\foo bar');
});

// ============================================================================
// unescapeLatexCode
// ============================================================================

test('unescapeLatexCode: unescapes underscores + braces + dollar/amp/pct', () => {
  assert.equal(
    unescapeLatexCode('foo\\_bar\\{baz\\}\\$\\&\\%'),
    'foo_bar{baz}$&%',
  );
});

test('unescapeLatexCode: textgreater/textless to angle brackets', () => {
  assert.equal(unescapeLatexCode('x \\textgreater{} y \\textless{} z'), 'x > y < z');
});

// ============================================================================
// lightCardMarkdown — text formatting macros
// ============================================================================

test('lightCardMarkdown: \\textbf → **bold**', () => {
  assert.equal(lightCardMarkdown('see \\textbf{this}'), 'see **this**');
});

test('lightCardMarkdown: \\textit and \\emph → *italic*', () => {
  assert.equal(lightCardMarkdown('\\textit{a} or \\emph{b}'), '*a* or *b*');
});

test('lightCardMarkdown: \\texttt → `inline code`', () => {
  assert.equal(lightCardMarkdown('\\texttt{foo}'), '`foo`');
});

test('lightCardMarkdown: \\texttt body unescapes underscores', () => {
  assert.equal(lightCardMarkdown('\\texttt{ACTED\\_IN}'), '`ACTED_IN`');
});

test('lightCardMarkdown: \\texttt body unescapes textgreater', () => {
  assert.equal(lightCardMarkdown('\\texttt{-\\textgreater{}}'), '`->`');
});

// ============================================================================
// lightCardMarkdown — code environments
// ============================================================================

test('lightCardMarkdown: minted block becomes fenced code', () => {
  const input = '\\begin{minted}{cypher}\nMATCH (p)\nRETURN p\n\\end{minted}';
  const expected = '```cypher\nMATCH (p)\nRETURN p\n```';
  assert.equal(lightCardMarkdown(input), expected);
});

test('lightCardMarkdown: minted with python language preserved', () => {
  const out = lightCardMarkdown('\\begin{minted}{python}\nx = 1\n\\end{minted}');
  assert.match(out, /^```python\n/);
});

// ============================================================================
// lightCardMarkdown — list environments
// ============================================================================

test('lightCardMarkdown: itemize/\\item → markdown bullets', () => {
  const input = '\\begin{itemize}\n\\item first\n\\item second\n\\end{itemize}';
  const out = lightCardMarkdown(input);
  assert.match(out, /- first/);
  assert.match(out, /- second/);
});

test('lightCardMarkdown: enumerate with options stripped', () => {
  const input = '\\begin{enumerate}[label=(\\arabic*)]\n\\item alpha\n\\end{enumerate}';
  const out = lightCardMarkdown(input);
  assert.doesNotMatch(out, /\\begin/);
  assert.doesNotMatch(out, /\\end/);
  assert.match(out, /- alpha/);
});

// ============================================================================
// lightCardMarkdown — inline symbols
// ============================================================================

test('lightCardMarkdown: \\textgreater{} → >', () => {
  assert.equal(lightCardMarkdown('A \\textgreater{} B'), 'A > B');
});

test('lightCardMarkdown: \\textless{} → <', () => {
  assert.equal(lightCardMarkdown('A \\textless{} B'), 'A < B');
});

test('lightCardMarkdown: \\leftrightarrow → <->', () => {
  assert.equal(lightCardMarkdown('A \\leftrightarrow B'), 'A <-> B');
});

test('lightCardMarkdown: \\approx → approx (text)', () => {
  assert.equal(lightCardMarkdown('threshold \\approx 0.85'), 'threshold approx 0.85');
});

test('lightCardMarkdown: escape sequences at top level (\\_, \\$, etc.)', () => {
  assert.equal(
    lightCardMarkdown('foo\\_bar and \\$10 and 5\\%'),
    'foo_bar and $10 and 5%',
  );
});

// ============================================================================
// lightCardMarkdown — integration: representative real-world card body
// ============================================================================

test('lightCardMarkdown: realistic card body with mixed constructs', () => {
  const input =
    'A \\textbf{Person} node stores \\texttt{name}, \\texttt{email}, ' +
    'and \\texttt{born} (year). Use \\textit{labels} to group entities.';
  const expected =
    'A **Person** node stores `name`, `email`, ' +
    'and `born` (year). Use *labels* to group entities.';
  assert.equal(lightCardMarkdown(input), expected);
});
