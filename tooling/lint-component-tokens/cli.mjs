#!/usr/bin/env node
/**
 * lint-component-tokens — enforce the consumer-component correctness standard
 * (see COMPONENTS.md). Fails the build on the exact footgun that made 5 callouts
 * + the old Sidenote unreadable in dark mode:
 *
 *     background: var(--color-callout-concept, #f0fff4);
 *                     ^ undefined token        ^ hardcoded LIGHT color
 *
 * When the custom property is never defined, the hardcoded color wins in EVERY
 * theme — so a "fallback" light hex silently pins the element light and dark-mode
 * text becomes unreadable. This lint flags any `var(--X, <color-literal>)` in a
 * consumer component's <style> where `--X` is not defined anywhere reachable
 * (scaffold tokens.css, consumer-overrides.css, or the component's own <style>).
 *
 * Chained into `npm run validate` → runs in prebuild → fails the build.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TOKENS_CSS = 'node_modules/@brandon_m_behring/book-scaffold-astro/styles/tokens.css';
const OVERRIDES_CSS = 'src/styles/consumer-overrides.css';
const COMPONENTS_DIR = 'src/components';

const DEFINE_RE = /--([\w-]+)\s*:/g; // a custom-property *definition*
// a `var(--name, fallback)` usage capturing name + the fallback up to the first ')'
const VAR_RE = /var\(\s*--([\w-]+)\s*,([^)]*)\)/g;
// fallback that is a raw color literal (the footgun) — hex / rgb / hsl / common names
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(|\b(?:white|black|red|blue|green|gray|grey|silver|navy|teal|gold|crimson)\b/i;

/** Collect every `--prop` defined in a CSS string. */
function definedProps(css, into) {
  for (const m of css.matchAll(DEFINE_RE)) into.add(m[1]);
  return into;
}

function readIf(path) {
  try { return readFileSync(join(ROOT, path), 'utf8'); }
  catch { return ''; }
}

/** Recursively list *.astro under a dir. */
function astroFiles(dir, acc = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) astroFiles(rel, acc);
    else if (name.endsWith('.astro')) acc.push(rel);
  }
  return acc;
}

/** Extract the contents of every <style>…</style> block. */
function styleBlocks(src) {
  return [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
}

// Globally-reachable defined tokens: scaffold design tokens + consumer overrides.
const globalDefined = new Set();
definedProps(readIf(TOKENS_CSS), globalDefined);
definedProps(readIf(OVERRIDES_CSS), globalDefined);

if (globalDefined.size === 0) {
  console.error('lint-component-tokens: could not read scaffold tokens.css / consumer-overrides.css — refusing to pass silently.');
  process.exit(1);
}

const violations = [];
for (const file of astroFiles(COMPONENTS_DIR)) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  for (const css of styleBlocks(src)) {
    // tokens this component defines locally (e.g. Aside's --aside-accent)
    const localDefined = definedProps(css, new Set());
    for (const m of css.matchAll(VAR_RE)) {
      const [, name, fallback] = m;
      if (fallback.includes('var(')) continue;          // chained-token fallback → fine
      if (!COLOR_RE.test(fallback)) continue;            // non-color fallback → fine
      if (globalDefined.has(name) || localDefined.has(name)) continue; // defined → themes
      violations.push({ file, token: `--${name}`, fallback: fallback.trim() });
    }
  }
}

if (violations.length) {
  console.error('\n✗ lint-component-tokens: undefined custom property with a hardcoded color fallback');
  console.error('  (this pins the color in every theme → unreadable in dark mode; see COMPONENTS.md rule 1)\n');
  for (const v of violations) {
    console.error(`  ${relative(ROOT, v.file)}: var(${v.token}, ${v.fallback}) — ${v.token} is not defined anywhere.`);
  }
  console.error('\n  Fix: map to a scaffold dark-aware token (--color-*/--callout-*/--warm-*/--diagram-*),');
  console.error('  or define the token in src/styles/consumer-overrides.css.\n');
  process.exit(1);
}

console.log(`lint-component-tokens: ✓ ${astroFiles(COMPONENTS_DIR).length} component(s) clean (no undefined-token color fallbacks).`);
