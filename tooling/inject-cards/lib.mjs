/**
 * inject-cards library — pure functions for LaTeX → Markdown conversion of
 * card front/back content from course_learning cards/*.yml.
 *
 * Extracted from cli.mjs to be testable in isolation. cli.mjs imports these
 * for actual chapter injection; __tests__/inject-cards.test.mjs imports them
 * for regression coverage.
 */

/**
 * Convert short LaTeX card content to Markdown. Designed for the
 * card.front / card.back fields in cards/*.yml — short, predictable,
 * inline-flavored LaTeX.
 *
 * Handled:
 *   \textbf{X}, \textit{X}, \emph{X}, \texttt{X}, \verb|X|
 *   \begin{minted}{lang} … \end{minted}    → ```lang fenced
 *   \begin{itemize|enumerate} \item X       → - X bullets
 *   \textgreater{} \textless{}              → > <
 *   \leftrightarrow                         → <->
 *   \approx                                 → approx
 *   Escaped chars: \_  \{  \}  \$  \&  \%   → unescaped
 *
 * Not handled: math (`$X$` passes through), cross-references, full
 * Pandoc-class constructs. Use the converter for chapter-level content;
 * this is the inject-cards counterpart for card-level content.
 */
export function lightCardMarkdown(text) {
  let out = text;
  out = out.replace(/\\begin\{minted\}\{([^}]+)\}/g, '```$1');
  out = out.replace(/\\end\{minted\}/g, '```');
  out = replaceBalancedLatexMacro(out, 'textbf', (body) => `**${body}**`);
  out = replaceBalancedLatexMacro(out, 'textit', (body) => `*${body}*`);
  out = replaceBalancedLatexMacro(out, 'emph', (body) => `*${body}*`);
  out = replaceBalancedLatexMacro(out, 'texttt', (body) => `\`${unescapeLatexCode(body)}\``);
  out = out.replace(/\\begin\{(?:itemize|enumerate)\}(?:\[[^\]]*\])?/g, '');
  out = out.replace(/\\end\{(?:itemize|enumerate)\}/g, '');
  out = out.replace(/^\s*\\item\s+/gm, '- ');
  out = out.replace(/\\textgreater\{\}/g, '>');
  out = out.replace(/\\textless\{\}/g, '<');
  out = out.replace(/\\leftrightarrow/g, '<->');
  out = out.replace(/\\approx/g, 'approx');
  out = out.replace(/\\_/g, '_').replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  out = out.replace(/\\\$/g, '$').replace(/\\&/g, '&').replace(/\\%/g, '%');
  return out;
}

/**
 * Match `\<macroName>{...}` with brace-balanced body. Replace via callback.
 * Used by lightCardMarkdown for the inline-text macros.
 */
export function replaceBalancedLatexMacro(text, macroName, replace) {
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

/**
 * Given text and the index of `{`, return the index of the matching `}`.
 * Counts brace depth; treats `\{` and `\}` as escaped (not depth-changing).
 */
export function findMatchingBrace(text, openIdx) {
  if (text[openIdx] !== '{') return -1;
  let depth = 1;
  let pos = openIdx + 1;
  while (pos < text.length) {
    const ch = text[pos];
    if (ch === '\\' && pos + 1 < text.length) {
      pos += 2;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return pos;
    }
    pos++;
  }
  return -1;
}

/**
 * Strip LaTeX escape sequences inside code spans. Used to clean up the body
 * captured from `\texttt{...}` etc. before emitting as Markdown backticks.
 */
export function unescapeLatexCode(s) {
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
