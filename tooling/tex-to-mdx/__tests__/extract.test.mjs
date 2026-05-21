import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  extractMdxComponents,
  restoreMdxComponents,
  postPandocFixups,
} from '../pipeline.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFile(resolve(here, '../__fixtures__', name), 'utf-8');

function allBlockTags({ blockMap }) {
  return [...blockMap.values()].map(({ open, close }) => `${open} ${close}`).join('\n');
}

function allInlineMdx({ inlineMap }) {
  return [...inlineMap.values()].join('\n');
}

// ============================================================================
// tcolorbox extraction (now marker-based, body preserved in place)
// ============================================================================

test('tcolorbox: narrativebox variant maps to <NarrativeBox> with title (open/close pair)', async () => {
  const tex = await fixture('tcolorbox.tex');
  const result = extractMdxComponents(tex);
  // \begin/\end markers should be gone from the stripped text
  assert.doesNotMatch(result.stripped, /\\begin\{tcolorbox\}/);
  assert.doesNotMatch(result.stripped, /\\end\{tcolorbox\}/);
  // The block map should contain the NarrativeBox open tag with title
  const tags = allBlockTags(result);
  assert.match(tags, /<NarrativeBox title="Where We Are">/);
  assert.match(tags, /<\/NarrativeBox>/);
});

test('tcolorbox: conceptbox variant maps to <ConceptBox> without title attr', async () => {
  const tex = await fixture('tcolorbox.tex');
  const result = extractMdxComponents(tex);
  const tags = allBlockTags(result);
  assert.match(tags, /<ConceptBox>/);
});

test('tcolorbox: pipelinebox with brace-wrapped title preserves the title', async () => {
  const tex = await fixture('tcolorbox.tex');
  const result = extractMdxComponents(tex);
  const tags = allBlockTags(result);
  assert.match(tags, /<PipelineBox title="Pipeline: Knowledge Graph Applications">/);
});

test('tcolorbox: body content stays in the stripped stream (Pandoc will convert it)', async () => {
  const tex = await fixture('tcolorbox.tex');
  const result = extractMdxComponents(tex);
  // Body text is in the stripped stream between OPEN and CLOSE markers
  assert.match(result.stripped, /You have built basic RAG systems/);
});

// ============================================================================
// margin macros (6 variants)
// ============================================================================

test('margin macros: all 6 variants extracted with correct category', async () => {
  const tex = await fixture('margin_macros.tex');
  const result = extractMdxComponents(tex);
  for (const m of ['interviewmargin', 'warningmargin', 'patternmargin',
                   'formulamargin', 'practicemargin', 'crossrefmargin']) {
    assert.doesNotMatch(result.stripped, new RegExp(`\\\\${m}`));
  }
  const all = allInlineMdx(result);
  assert.match(all, /<Sidenote category="interview">/);
  assert.match(all, /<Sidenote category="warning">/);
  assert.match(all, /<Sidenote category="crossref">/);
  assert.match(all, /<Sidenote category="pattern">/);
  assert.match(all, /<Sidenote category="formula">/);
  assert.match(all, /<Sidenote category="practice">/);
});

test('margin macros: body has light LaTeX→Md conversion (emph→italic, en-dash, smart quotes)', async () => {
  const tex = await fixture('margin_macros.tex');
  const result = extractMdxComponents(tex);
  const all = allInlineMdx(result);
  // \emph{similar} → *similar*
  assert.match(all, /\*similar\*/);
  // smart quotes from `` ''
  assert.match(all, /"How do Knowledge Graphs/);
  // em-dash from ---
  assert.match(all, /—/);
});

// ============================================================================
// code blocks (pycode = Cypher, minted = explicit language)
// ============================================================================

test('pycode: extracted as cypher code fence (inline token)', async () => {
  const tex = await fixture('code_blocks.tex');
  const result = extractMdxComponents(tex);
  assert.doesNotMatch(result.stripped, /\\begin\{pycode\}/);
  const all = allInlineMdx(result);
  assert.match(all, /```cypher\n/);
  assert.match(all, /\(Person name: "Andreas"\)/);
});

test('minted: extracted as fenced code with language from arg', async () => {
  const tex = await fixture('code_blocks.tex');
  const result = extractMdxComponents(tex);
  assert.doesNotMatch(result.stripped, /\\begin\{minted\}/);
  const all = allInlineMdx(result);
  assert.match(all, /```python\n/);
  assert.match(all, /def hello\(name\):/);
});

test('minted: cypher language preserved', async () => {
  const tex = await fixture('code_blocks.tex');
  const result = extractMdxComponents(tex);
  const all = allInlineMdx(result);
  assert.match(all, /```cypher\nMATCH \(p:Person\)/);
});

// ============================================================================
// \cite{} pre-Pandoc conversion
// ============================================================================

test('cite: tilde-cite becomes <Citation> placeholder (single key, restorable)', () => {
  const tex = `Some text~\\cite{hogan2021knowledge} continues.`;
  const result = extractMdxComponents(tex);
  assert.doesNotMatch(result.stripped, /\\cite/);
  // The Citation MDX is stored in inlineMap; restored text contains it
  const restored = restoreMdxComponents(result.stripped, result);
  assert.match(restored, /<Citation src="hogan2021knowledge" \/>/);
});

test('cite: multi-key splits into multiple Citation components', () => {
  const tex = `Refs \\cite{a, b, c} discuss this.`;
  const result = extractMdxComponents(tex);
  const restored = restoreMdxComponents(result.stripped, result);
  assert.match(restored, /<Citation src="a" \/><Citation src="b" \/><Citation src="c" \/>/);
});

// ============================================================================
// roundtrip: marker restoration
// ============================================================================

test('roundtrip: block markers swap to MDX open/close around body', async () => {
  const tex = await fixture('tcolorbox.tex');
  const result = extractMdxComponents(tex);
  const restored = restoreMdxComponents(result.stripped, result);
  assert.doesNotMatch(restored, /MDXB-\d+-OPEN/);
  assert.doesNotMatch(restored, /MDXB-\d+-CLOSE/);
  assert.match(restored, /<NarrativeBox title="Where We Are">/);
  assert.match(restored, /<\/NarrativeBox>/);
});

test('roundtrip: inline tokens swap to their MDX components', async () => {
  const tex = await fixture('margin_macros.tex');
  const result = extractMdxComponents(tex);
  const restored = restoreMdxComponents(result.stripped, result);
  assert.doesNotMatch(restored, /MDXISTART/);
  assert.doesNotMatch(restored, /\\interviewmargin/);
  assert.match(restored, /<Sidenote category="interview">/);
});

// ============================================================================
// postPandocFixups
// ============================================================================

test('postPandocFixups: <span label> noise stripped', () => {
  const md = '<span id="ch:M1" label="ch:M1"></span>\nReal content.';
  const out = postPandocFixups(md);
  assert.equal(out.trim(), 'Real content.');
});

test('postPandocFixups: stray raw-latex passthroughs dropped', () => {
  const md = 'Text `\\unknowncmd`{=latex} continues.';
  const out = postPandocFixups(md);
  assert.equal(out, 'Text  continues.');
});
