/**
 * tex-to-mdx pipeline
 *
 * Three-phase conversion:
 *
 *   1. Pre-Pandoc transformations (extractMdxComponents):
 *      - Strip \label{}, convert \cite{} → <Citation>
 *      - For inline macros with short bodies (\term, margin macros),
 *        substitute MDX components with body content lightly converted
 *        from LaTeX to Markdown inline.
 *      - For block environments (tcolorbox, keyconcept, interviewcontext,
 *        problem, solution, redflag, vignette, decisiontree), replace
 *        \begin/\end with unique marker tokens AND leave the body in
 *        place so Pandoc converts it. Save the marker → MDX tag mapping.
 *      - For verbatim environments (pycode, minted), extract body whole
 *        into code fence MDX (Pandoc cannot help with verbatim content).
 *
 *   2. Pandoc mechanical conversion (runPandoc):
 *      Process the substituted text. Marker tokens and inline MDX
 *      components pass through; box bodies and Markdown standard
 *      constructs are converted normally.
 *
 *   3. Post-Pandoc cleanup (postPandocFixups + restoreBlockMarkers):
 *      Replace marker tokens with MDX opening/closing tags. Restore
 *      inline-component tokens. Strip residual <span> noise.
 *
 * Status: Phase 1a + 1b complete — 8 priority constructs supported.
 * Per-chapter polish pass in MDX catches anything imperfect.
 */
import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import * as yaml from 'yaml';

// ============================================================================
// Phase 1: pre-Pandoc frontmatter extraction
// ============================================================================

export function extractFrontmatter(tex, { book, source }) {
  const today = new Date().toISOString().slice(0, 10);
  const fm = {
    book,
    title: '',
    chapter: 0,
    description: '',
    learning_outcomes: [],
    sources: [],
    tools_compared: [],
    last_verified: today,
    volatility: 'architectural-pattern',
  };
  let stripped = tex;

  const moduleHeader = matchBalancedBraces(stripped, /\\moduleheader/, 3);
  if (moduleHeader) {
    const [, title, desc] = moduleHeader.groups;
    fm.title = lightLatexToMd(collapseLatexWhitespace(title));
    fm.description = lightLatexToMd(collapseLatexWhitespace(desc));
    const fileMatch = basename(source).match(/^(\d+)_/);
    if (fileMatch) fm.chapter = parseInt(fileMatch[1], 10);
    stripped = stripped.replace(moduleHeader.match, '');
  }

  const companyTags = matchBalancedBraces(stripped, /\\companytags/, 1);
  if (companyTags) {
    const tags = companyTags.groups[0]
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    fm.tools_compared = tags;
    stripped = stripped.replace(companyTags.match, '');
  }

  const losBlock = stripped.match(
    /\\begin\{learningoutcomes\}([\s\S]*?)\\end\{learningoutcomes\}/,
  );
  if (losBlock) {
    const inner = losBlock[1];
    const losRegex = /\\los\{([^}]+)\}\{([^}]+)\}\{((?:[^{}]|\{[^{}]*\})*)\}/g;
    let m;
    while ((m = losRegex.exec(inner)) !== null) {
      fm.learning_outcomes.push({
        id: m[1].trim(),
        verb: m[2].trim().toLowerCase(),
        text: lightLatexToMd(collapseLatexWhitespace(m[3])),
      });
    }
    stripped = stripped.replace(losBlock[0], '');
  }

  const sourceNote = matchBalancedBraces(stripped, /\\chaptersourcenote/, 2);
  if (sourceNote) {
    const cites = sourceNote.groups[1].match(/\\cite\{([^}]+)\}/g) || [];
    fm.sources = cites
      .flatMap((c) => c.match(/\{([^}]+)\}/)[1].split(','))
      .map((s) => s.trim());
    stripped = stripped.replace(sourceNote.match, '');
  }

  return { frontmatter: fm, stripped };
}

// ============================================================================
// Phase 2: pre-Pandoc MDX component extraction
// ============================================================================

/**
 * Walk the LaTeX source, applying transformations. Returns:
 *   - stripped: text with markers/inline-MDX substituted, ready for Pandoc
 *   - inlineMap: token → MDX string for inline replacements
 *   - blockMap:  token → { open, close } for block environment markers
 *
 * For block envs, the body STAYS IN PLACE (just \begin/\end replaced with
 * markers); Pandoc converts the body to Markdown; post-Pandoc replaces
 * markers with MDX tags around the now-Markdown body.
 */
export function extractMdxComponents(tex) {
  const inlineMap = new Map();
  const blockMap = new Map();
  let counter = 0;
  const nextInline = () => `MDXISTART${counter++}MDXIEND`;
  const nextBlock = () => `MDXBSTART${counter++}MDXBEND`;
  let work = tex;

  // Strip \label{...} noise
  work = work.replace(/\\label\{[^}]+\}/g, '');

  // ---- Pre-convert \cite{...} → placeholder token so Pandoc doesn't
  // HTML-escape the <Citation /> output. Pandoc otherwise either drops
  // \cite{} (no bibliography flag) OR escapes `<` to `&lt;` when it
  // encounters raw HTML inside what it parsed as LaTeX text. ----
  work = work.replace(/~?\\cite\{([^}]+)\}/g, (_, keys) => {
    const token = nextInline();
    const mdx = keys
      .split(',')
      .map((k) => `<Citation src="${k.trim()}" />`)
      .join('');
    inlineMap.set(token, mdx);
    return token;
  });

  // ---- pycode (verbatim Cypher) → extracted code fence ----
  work = extractEnv(work, /\\begin\{pycode\}/, /\\end\{pycode\}/, (body) => {
    const token = nextInline();
    inlineMap.set(token, `\n\n\`\`\`cypher\n${cleanCodeBody(body)}\n\`\`\`\n\n`);
    return token;
  });

  // ---- minted (verbatim, language in {arg}) → extracted code fence ----
  work = extractEnvWithArg(
    work,
    /\\begin\{minted\}/,
    /\\end\{minted\}/,
    (lang, body) => {
      const token = nextInline();
      inlineMap.set(token, `\n\n\`\`\`${lang || 'text'}\n${cleanCodeBody(body)}\n\`\`\`\n\n`);
      return token;
    },
  );

  // ---- Block environments: mark begin/end, leave body for Pandoc ----
  work = markBlockEnvWithOpts(
    work,
    'tcolorbox',
    blockMap,
    nextBlock,
    (opts) => {
      const { variant, title } = parseTcolorboxOpts(opts);
      const tagMap = {
        narrativebox: 'NarrativeBox',
        conceptbox: 'ConceptBox',
        pipelinebox: 'PipelineBox',
      };
      const tag = tagMap[variant] || 'NarrativeBox';
      const titleAttr = title ? ` title="${escapeAttr(lightLatexToMd(title))}"` : '';
      return { open: `<${tag}${titleAttr}>`, close: `</${tag}>` };
    },
  );

  work = markBlockEnvWithTwoOpts(work, 'keyconcept', blockMap, nextBlock,
    (opt1, opt2) => ({
      open: `<KeyConcept title="${escapeAttr(lightLatexToMd(opt1))}" los="${escapeAttr(opt2)}">`,
      close: `</KeyConcept>`,
    }),
  );

  work = markBlockEnvWithTwoOpts(work, 'interviewcontext', blockMap, nextBlock,
    (opt1, opt2) => ({
      open: `<InterviewContext title="${escapeAttr(lightLatexToMd(opt1))}" los="${escapeAttr(opt2)}">`,
      close: `</InterviewContext>`,
    }),
  );

  work = markBlockEnvWithTwoOpts(work, 'problem', blockMap, nextBlock,
    (opt1, opt2) => ({
      open: `<Problem title="${escapeAttr(lightLatexToMd(opt1))}" los="${escapeAttr(opt2)}">`,
      close: `</Problem>`,
    }),
  );

  work = markBlockEnvNoOpts(work, 'solution', blockMap, nextBlock,
    () => ({ open: `<Solution>`, close: `</Solution>` }),
  );

  for (const [envName, tagName] of [
    ['redflag', 'RedFlag'],
    ['vignette', 'Vignette'],
    ['decisiontree', 'DecisionTree'],
  ]) {
    work = markBlockEnvMaybeOpts(work, envName, blockMap, nextBlock, (opts) => ({
      open: opts ? `<${tagName} title="${escapeAttr(lightLatexToMd(opts))}">` : `<${tagName}>`,
      close: `</${tagName}>`,
    }));
  }

  // ---- Inline macros (short bodies, no Pandoc help needed) ----
  work = extractTerms(work, inlineMap, nextInline);
  work = extractMarginMacros(work, inlineMap, nextInline);

  return { stripped: work, inlineMap, blockMap };
}

// ============================================================================
// Block env markers: replace \begin{env}[opts]...\end{env} with marker pairs
// ============================================================================

function markBlockEnvWithOpts(text, envName, blockMap, next, buildTags) {
  const beginRe = new RegExp(`\\\\begin\\{${envName}\\}`);
  const endRe = new RegExp(`\\\\end\\{${envName}\\}`);
  let out = text;
  while (true) {
    const m = out.match(beginRe);
    if (!m) break;
    let pos = m.index + m[0].length;
    if (out[pos] !== '[') break;
    const optsEnd = findMatchingBracket(out, pos);
    if (optsEnd === -1) break;
    const opts = out.slice(pos + 1, optsEnd);
    const bodyStart = optsEnd + 1;
    const endMatch = out.slice(bodyStart).match(endRe);
    if (!endMatch) break;
    const endStart = bodyStart + endMatch.index;
    const endEnd = endStart + endMatch[0].length;
    const token = next();
    const tags = buildTags(opts);
    blockMap.set(token, tags);
    // Replace \begin{env}[opts] with `\n\nMDXBSTARTN MDXBENDOPEN\n\n` and
    // \end{env} with `\n\nMDXBSTARTN MDXBENDCLOSE\n\n` — distinguish open
    // and close by suffix.
    out = out.slice(0, m.index) +
      `\n\n${token}OPEN\n\n` +
      out.slice(bodyStart, endStart) +
      `\n\n${token}CLOSE\n\n` +
      out.slice(endEnd);
  }
  return out;
}

function markBlockEnvWithTwoOpts(text, envName, blockMap, next, buildTags) {
  const beginRe = new RegExp(`\\\\begin\\{${envName}\\}`);
  const endRe = new RegExp(`\\\\end\\{${envName}\\}`);
  let out = text;
  while (true) {
    const m = out.match(beginRe);
    if (!m) break;
    let pos = m.index + m[0].length;
    if (out[pos] !== '[') break;
    const opt1End = findMatchingBracket(out, pos);
    if (opt1End === -1) break;
    const opt1 = out.slice(pos + 1, opt1End);
    pos = opt1End + 1;
    let opt2 = '';
    if (out[pos] === '[') {
      const opt2End = findMatchingBracket(out, pos);
      if (opt2End === -1) break;
      opt2 = out.slice(pos + 1, opt2End);
      pos = opt2End + 1;
    }
    const bodyStart = pos;
    const endMatch = out.slice(bodyStart).match(endRe);
    if (!endMatch) break;
    const endStart = bodyStart + endMatch.index;
    const endEnd = endStart + endMatch[0].length;
    const token = next();
    blockMap.set(token, buildTags(opt1, opt2));
    out = out.slice(0, m.index) +
      `\n\n${token}OPEN\n\n` +
      out.slice(bodyStart, endStart) +
      `\n\n${token}CLOSE\n\n` +
      out.slice(endEnd);
  }
  return out;
}

function markBlockEnvNoOpts(text, envName, blockMap, next, buildTags) {
  const beginRe = new RegExp(`\\\\begin\\{${envName}\\}`);
  const endRe = new RegExp(`\\\\end\\{${envName}\\}`);
  let out = text;
  while (true) {
    const m = out.match(beginRe);
    if (!m) break;
    const startIdx = m.index;
    const bodyStart = startIdx + m[0].length;
    const endMatch = out.slice(bodyStart).match(endRe);
    if (!endMatch) break;
    const endStart = bodyStart + endMatch.index;
    const endEnd = endStart + endMatch[0].length;
    const token = next();
    blockMap.set(token, buildTags());
    out = out.slice(0, startIdx) +
      `\n\n${token}OPEN\n\n` +
      out.slice(bodyStart, endStart) +
      `\n\n${token}CLOSE\n\n` +
      out.slice(endEnd);
  }
  return out;
}

function markBlockEnvMaybeOpts(text, envName, blockMap, next, buildTags) {
  const beginRe = new RegExp(`\\\\begin\\{${envName}\\}`);
  const endRe = new RegExp(`\\\\end\\{${envName}\\}`);
  let out = text;
  while (true) {
    const m = out.match(beginRe);
    if (!m) break;
    let pos = m.index + m[0].length;
    let opts = '';
    if (out[pos] === '[') {
      const optsEnd = findMatchingBracket(out, pos);
      if (optsEnd === -1) break;
      opts = out.slice(pos + 1, optsEnd);
      pos = optsEnd + 1;
    }
    const bodyStart = pos;
    const endMatch = out.slice(bodyStart).match(endRe);
    if (!endMatch) break;
    const endStart = bodyStart + endMatch.index;
    const endEnd = endStart + endMatch[0].length;
    const token = next();
    blockMap.set(token, buildTags(opts));
    out = out.slice(0, m.index) +
      `\n\n${token}OPEN\n\n` +
      out.slice(bodyStart, endStart) +
      `\n\n${token}CLOSE\n\n` +
      out.slice(endEnd);
  }
  return out;
}

function parseTcolorboxOpts(opts) {
  const variant = (opts.match(/^[^,\s]+/) || [''])[0].trim();
  let title = '';
  const titleMatch = opts.match(/title\s*=\s*(\{([^}]*)\}|([^,]+))/);
  if (titleMatch) {
    title = (titleMatch[2] || titleMatch[3] || '').trim();
  }
  return { variant, title };
}

// ============================================================================
// Inline macros: extract whole, convert body via lightLatexToMd
// ============================================================================

function extractEnv(text, beginRe, endRe, replace) {
  let out = text;
  while (true) {
    const m = out.match(beginRe);
    if (!m) break;
    const startIdx = m.index;
    const bodyStart = startIdx + m[0].length;
    const endMatch = out.slice(bodyStart).match(endRe);
    if (!endMatch) break;
    const bodyEnd = bodyStart + endMatch.index;
    const totalEnd = bodyEnd + endMatch[0].length;
    const body = out.slice(bodyStart, bodyEnd);
    out = out.slice(0, startIdx) + replace(body) + out.slice(totalEnd);
  }
  return out;
}

function extractEnvWithArg(text, beginRe, endRe, replace) {
  let out = text;
  while (true) {
    const m = out.match(beginRe);
    if (!m) break;
    let pos = m.index + m[0].length;
    if (out[pos] !== '{') break;
    const argEnd = findMatchingBrace(out, pos);
    if (argEnd === -1) break;
    const arg = out.slice(pos + 1, argEnd);
    const bodyStart = argEnd + 1;
    const endMatch = out.slice(bodyStart).match(endRe);
    if (!endMatch) break;
    const bodyEnd = bodyStart + endMatch.index;
    const totalEnd = bodyEnd + endMatch[0].length;
    const body = out.slice(bodyStart, bodyEnd);
    out = out.slice(0, m.index) + replace(arg, body) + out.slice(totalEnd);
  }
  return out;
}

function extractTerms(text, inlineMap, next) {
  let out = text;
  const termRe = /\\term\[([^\]]+)\]/;
  while (true) {
    const m = out.match(termRe);
    if (!m) break;
    const startIdx = m.index;
    const id = m[1];
    let pos = m.index + m[0].length;
    if (out[pos] !== '{') break;
    const nameEnd = findMatchingBrace(out, pos);
    if (nameEnd === -1) break;
    const name = lightLatexToMd(out.slice(pos + 1, nameEnd).trim());
    pos = nameEnd + 1;
    while (pos < out.length && /\s/.test(out[pos])) pos++;
    if (out[pos] !== '{') break;
    const defEnd = findMatchingBrace(out, pos);
    if (defEnd === -1) break;
    const defRaw = collapseLatexWhitespace(out.slice(pos + 1, defEnd));
    const def = lightLatexToMd(defRaw);
    const cardBack = mdxToCardText(resolveInlineTokensForCard(def, inlineMap));
    const totalEnd = defEnd + 1;
    const token = next();
    inlineMap.set(
      token,
      `\n\n<Term name="${escapeAttr(name)}" los="${escapeAttr(id)}">\n  ${def}\n</Term>\n<AnkiCard type="term" front=${jsonAttr(name)} back=${jsonAttr(cardBack)} los="${escapeAttr(id)}" />\n\n`,
    );
    out = out.slice(0, startIdx) + token + out.slice(totalEnd);
  }
  return out;
}

const MARGIN_MACROS = {
  interviewmargin: 'interview',
  warningmargin: 'warning',
  patternmargin: 'pattern',
  formulamargin: 'formula',
  practicemargin: 'practice',
  crossrefmargin: 'crossref',
};

function extractMarginMacros(text, inlineMap, next) {
  let out = text;
  for (const [macroName, category] of Object.entries(MARGIN_MACROS)) {
    const macroRe = new RegExp(`\\\\${macroName}\\{`);
    while (true) {
      const m = out.match(macroRe);
      if (!m) break;
      const startIdx = m.index;
      const braceIdx = startIdx + m[0].length - 1;
      const endIdx = findMatchingBrace(out, braceIdx);
      if (endIdx === -1) break;
      const bodyRaw = collapseLatexWhitespace(out.slice(braceIdx + 1, endIdx));
      const body = lightLatexToMd(bodyRaw);
      const token = next();
      inlineMap.set(
        token,
        `\n\n<Sidenote category="${category}">${body}</Sidenote>\n\n`,
      );
      out = out.slice(0, startIdx) + token + out.slice(endIdx + 1);
    }
  }
  return out;
}

// ============================================================================
// lightLatexToMd: convert a SHORT LaTeX snippet to Markdown inline
//
// Used only for inline-macro bodies (margin macros, term name/def). For
// block environments, Pandoc handles conversion in place.
// ============================================================================

function lightLatexToMd(s) {
  let out = s;
  // \cite is handled at the global pre-Pandoc level via placeholder tokens;
  // if it appears here (term/margin body), strip the wrapper but keep the
  // raw bibkey list as plain text — the chapter polish pass will turn it
  // into a Citation if needed.
  out = out.replace(/~?\\cite\{([^}]+)\}/g, '[$1]');
  // Cross-references — no MDX equivalent yet, strip wholly
  out = out.replace(/\\(ref|cref|Cref|autoref|pageref)\{[^}]+\}/g, '');
  out = replaceBalancedLatexMacro(out, 'textbf', (body) => `**${body}**`);
  out = replaceBalancedLatexMacro(out, 'textit', (body) => `*${body}*`);
  out = replaceBalancedLatexMacro(out, 'emph', (body) => `*${body}*`);
  out = replaceBalancedLatexMacro(out, 'texttt', (body) => `\`${unescapeLatexCode(body)}\``);
  // \verb|content| → `content`
  out = out.replace(/\\verb([|!#@])([^|!#@]+)\1/g, (_, _delim, body) => `\`${body}\``);
  // Common LaTeX symbol commands
  out = out.replace(/\\S(?![a-zA-Z])/g, '§');
  out = out.replace(/\\P(?![a-zA-Z])/g, '¶');
  out = out.replace(/\\\$/g, '$').replace(/\\&/g, '&').replace(/\\%/g, '%');
  out = out.replace(/\\_/g, '_').replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  // \ (backslash-space) and \, (thin space) → space
  out = out.replace(/\\ /g, ' ').replace(/\\,/g, ' ');
  // Smart quotes
  out = out.replace(/``/g, '"').replace(/''/g, '"');
  // Em-dash, en-dash
  out = out.replace(/---/g, '—').replace(/--/g, '–');
  // Non-breaking space tie
  out = out.replace(/~/g, ' ');
  // Fallback: any remaining `\command{content}` — strip the wrapper, keep
  // the content. Best-effort lossy fallback so unknown commands don't
  // leak braces into MDX text (where `{` opens a JSX expression).
  out = out.replace(/\\[a-zA-Z]+\*?\{([^{}]*)\}/g, '$1');
  // Remaining single \command tokens (no args) — drop
  out = out.replace(/\\[a-zA-Z]+\*?/g, '');
  return out.trim();
}

function replaceBalancedLatexMacro(text, macroName, replace) {
  let out = text;
  const needle = `\\${macroName}`;
  let searchFrom = 0;
  while (searchFrom < out.length) {
    const macroIdx = out.indexOf(needle, searchFrom);
    if (macroIdx === -1) break;
    let braceIdx = macroIdx + needle.length;
    while (braceIdx < out.length && /\s/.test(out[braceIdx])) braceIdx++;
    if (out[braceIdx] !== '{') {
      searchFrom = macroIdx + needle.length;
      continue;
    }
    const closeIdx = findMatchingBrace(out, braceIdx);
    if (closeIdx === -1) break;
    const body = out.slice(braceIdx + 1, closeIdx);
    const replacement = replace(body);
    out = out.slice(0, macroIdx) + replacement + out.slice(closeIdx + 1);
    searchFrom = macroIdx + replacement.length;
  }
  return out;
}

function unescapeLatexCode(s) {
  return s
    .replace(/\\_/g, '_')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\\$/g, '$')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\textgreater\{\}/g, '>')
    .replace(/\\textless\{\}/g, '<');
}

function cleanCodeBody(s) {
  let out = s.trim();
  out = replaceBalancedLatexMacro(out, 'textbf', (body) => unescapeLatexCode(body));
  out = replaceBalancedLatexMacro(out, 'textit', (body) => unescapeLatexCode(body));
  out = replaceBalancedLatexMacro(out, 'emph', (body) => unescapeLatexCode(body));
  out = replaceBalancedLatexMacro(out, 'texttt', (body) => unescapeLatexCode(body));
  return unescapeLatexCode(out);
}

function mdxToCardText(s) {
  return s
    .replace(/<Citation\s+src="([^"]+)"\s*\/>/g, '[$1]')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function resolveInlineTokensForCard(s, inlineMap) {
  let out = s;
  for (const [token, mdx] of inlineMap) {
    out = out.split(token).join(mdx);
  }
  return out;
}

// ============================================================================
// Phase 3: Pandoc mechanical conversion
// ============================================================================

async function runPandoc(tex) {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('pandoc', [
      '-f', 'latex',
      '-t', 'markdown_strict+pipe_tables+raw_attribute+fenced_code_blocks',
      '--wrap=preserve',
    ]);
    let stdout = '';
    let stderr = '';
    pandoc.stdout.on('data', (d) => { stdout += d; });
    pandoc.stderr.on('data', (d) => { stderr += d; });
    pandoc.on('error', reject);
    pandoc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pandoc exited ${code}: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
    pandoc.stdin.write(tex);
    pandoc.stdin.end();
  });
}

// ============================================================================
// Phase 4: post-Pandoc cleanup + restoration
// ============================================================================

/** Replace block markers and inline tokens in Pandoc output with MDX. */
export function restoreMdxComponents(md, { inlineMap, blockMap }) {
  let out = md;
  // Block markers: each token has TOKEN_OPEN and TOKEN_CLOSE variants
  for (const [token, { open, close }] of blockMap) {
    out = out.split(`${token}OPEN`).join(open);
    out = out.split(`${token}CLOSE`).join(close);
  }
  // Inline tokens are full replacements. Run until stable because a term or
  // margin macro can contain a citation token that was extracted earlier.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [token, mdx] of inlineMap) {
      if (!out.includes(token)) continue;
      out = out.split(token).join(mdx);
      changed = true;
    }
  }
  return out;
}

export function postPandocFixups(md) {
  let out = md;
  // Drop label-only spans emitted from pandoc (any residual)
  out = out.replace(/<span\s+id="[^"]+"\s+label="[^"]+"\s*>\s*<\/span>\s*/g, '');
  // Strip backtick-wrapped raw-latex passthroughs for stray unsupported commands
  out = out.replace(/`\\([a-zA-Z]+)`\{=latex\}/g, '');
  // Pandoc emits `<!-- -->`{=html} as a paragraph separator inside lists —
  // MDX can't parse the `{=html}` raw-attribute marker. Drop entirely.
  out = out.replace(/`<!-- -->`\{=html\}/g, '');
  out = out.replace(/<!-- -->\s*/g, '');
  // Any remaining `{=html}` or `{=latex}` raw-attribute markers — strip
  out = out.replace(/\{=html\}/g, '');
  out = out.replace(/\{=latex\}/g, '');
  return out;
}

// ============================================================================
// Helpers
// ============================================================================

function matchBalancedBraces(text, macroRegex, nArgs) {
  const macroMatch = text.match(macroRegex);
  if (!macroMatch) return null;
  let pos = macroMatch.index + macroMatch[0].length;
  const groups = [];
  for (let i = 0; i < nArgs; i++) {
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    if (text[pos] !== '{') return null;
    const closeIdx = findMatchingBrace(text, pos);
    if (closeIdx === -1) return null;
    groups.push(text.slice(pos + 1, closeIdx));
    pos = closeIdx + 1;
  }
  return { match: text.slice(macroMatch.index, pos), groups };
}

function findMatchingBrace(text, openIdx) {
  if (text[openIdx] !== '{') return -1;
  let depth = 1;
  let pos = openIdx + 1;
  let inComment = false;
  while (pos < text.length) {
    const ch = text[pos];
    if (ch === '\n') inComment = false;
    else if (ch === '%' && text[pos - 1] !== '\\') inComment = true;
    else if (!inComment) {
      if (ch === '\\' && pos + 1 < text.length) { pos += 2; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return pos;
      }
    }
    pos++;
  }
  return -1;
}

function findMatchingBracket(text, openIdx) {
  if (text[openIdx] !== '[') return -1;
  let depth = 1;
  let pos = openIdx + 1;
  while (pos < text.length) {
    const ch = text[pos];
    if (ch === '\\' && pos + 1 < text.length) { pos += 2; continue; }
    if (ch === '{') {
      const close = findMatchingBrace(text, pos);
      if (close === -1) return -1;
      pos = close + 1;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return pos;
    }
    pos++;
  }
  return -1;
}

function collapseLatexWhitespace(s) {
  // Strip LaTeX comments: `%` to end of line, but NOT escaped `\%`.
  // Sentinel-swap trick avoids regex lookbehind portability issues.
  let out = s.replace(/\\%/g, 'ESCPCT');
  out = out.replace(/%.*$/gm, '');
  out = out.replace(/ESCPCT/g, '\\%');
  return out.replace(/\s+/g, ' ').trim();
}

function escapeAttr(s) {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function jsonAttr(s) {
  return `{${JSON.stringify(s)}}`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Convert a single LaTeX chapter to MDX with frontmatter.
 *
 * @param {string} tex - raw LaTeX source
 * @param {object} opts
 * @param {string} opts.book - book slug to assign in frontmatter
 * @param {string} opts.source - input file path (for chapter number)
 * @returns {Promise<string>} MDX content with YAML frontmatter
 */
export async function convertTexToMdx(tex, opts) {
  const { frontmatter, stripped: afterFm } = extractFrontmatter(tex, opts);
  const { stripped: afterMdx, inlineMap, blockMap } = extractMdxComponents(afterFm);
  const md = await runPandoc(afterMdx);
  const restored = restoreMdxComponents(md, { inlineMap, blockMap });
  const cleaned = postPandocFixups(restored);

  const fmYaml = yaml.stringify(frontmatter);
  return [
    '---',
    fmYaml.trim(),
    '---',
    '',
    '{/* TODO: per-chapter polish pass — see plan decision Q1 round 3 */}',
    '',
    cleaned.trim(),
    '',
  ].join('\n');
}
