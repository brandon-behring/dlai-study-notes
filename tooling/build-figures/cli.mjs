#!/usr/bin/env node
/**
 * build-figures — compile TikZ standalone .tex sources to .svg
 *
 * Walks figures/<book>/*.tex (skipping figures/_shared/*), runs:
 *   pdflatex -interaction=batchmode <name>.tex   → <name>.pdf
 *   pdftocairo -svg <name>.pdf                   → <name>.svg
 * and deposits the result at public/figures/<book>/<name>.svg.
 *
 * Cache-aware: if the .svg output is newer than the .tex input AND newer
 * than the shared preamble, skips. (--force overrides.)
 *
 * Parallel-safe: each invocation runs in a per-figure scratch dir so
 * pdflatex's aux files don't collide.
 *
 * Usage:
 *   build-figures                            # build all books
 *   build-figures --book=knowledge-graphs-rag # build one book
 *   build-figures --force                    # rebuild all, ignoring cache
 *   build-figures --clean                    # clear public/figures/<book>
 *
 * Tools required on PATH: `pdflatex`, `pdftocairo` (from poppler-utils).
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { resolve, dirname, basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIGURES_SRC = resolve(PROJECT_ROOT, 'figures');
const FIGURES_OUT = resolve(PROJECT_ROOT, 'public/figures');
const SHARED_PREAMBLE = resolve(FIGURES_SRC, '_shared/preamble.tex');

function parseArgs(argv) {
  const args = { book: null, force: false, clean: false };
  for (const a of argv.slice(2)) {
    if (a === '--force') args.force = true;
    else if (a === '--clean') args.clean = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else {
      const m = a.match(/^--book=(.+)$/);
      if (m) args.book = m[1];
      else { process.stderr.write(`Unknown flag: ${a}\n`); process.exit(2); }
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(`Usage: build-figures [--book=<slug>] [--force] [--clean]

Compile TikZ standalone .tex sources under figures/<book>/ to SVG at
public/figures/<book>/<name>.svg.

  --book=<slug>   Restrict to one book directory.
  --force         Rebuild regardless of cache (mtime check).
  --clean         Clear public/figures/<book>/ before building.

Requires: pdflatex, pdftocairo (poppler-utils).
`);
}

/**
 * Find all .tex sources under figures/<book>/, skipping the _shared dir.
 * Returns [{ book, name, srcPath }].
 */
async function discoverFigures(bookFilter) {
  const entries = await fs.readdir(FIGURES_SRC, { withFileTypes: true });
  const figures = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === '_shared') continue;
    if (bookFilter && entry.name !== bookFilter) continue;
    const bookDir = join(FIGURES_SRC, entry.name);
    const files = (await fs.readdir(bookDir)).filter((f) => f.endsWith('.tex'));
    for (const f of files) {
      figures.push({
        book: entry.name,
        name: basename(f, '.tex'),
        srcPath: join(bookDir, f),
      });
    }
  }
  return figures;
}

/**
 * Decide whether a figure needs to be rebuilt. Returns true iff:
 *   - --force is set, OR
 *   - The SVG output doesn't exist, OR
 *   - The .tex source mtime is newer than the SVG, OR
 *   - The shared preamble mtime is newer than the SVG.
 */
async function isStale({ srcPath, outPath }, force) {
  if (force) return true;
  let outStat;
  try { outStat = await fs.stat(outPath); }
  catch { return true; }   // no output yet
  const srcStat = await fs.stat(srcPath);
  if (srcStat.mtimeMs > outStat.mtimeMs) return true;
  try {
    const preStat = await fs.stat(SHARED_PREAMBLE);
    if (preStat.mtimeMs > outStat.mtimeMs) return true;
  } catch { /* no shared preamble, that's fine */ }
  return false;
}

/**
 * Compile one figure: pdflatex → pdftocairo. Uses a per-figure scratch
 * directory under $TMPDIR to keep pdflatex aux files from colliding when
 * multiple figures are built in parallel.
 */
async function compileFigure({ book, name, srcPath }, outPath) {
  const scratch = await fs.mkdtemp(join(tmpdir(), `build-figures-${book}-${name}-`));
  try {
    // Copy source into scratch so pdflatex's relative paths resolve. The
    // figure's \input{../_shared/preamble.tex} is resolved relative to
    // the source location, which is preserved by passing pdflatex the
    // original srcPath via -output-directory.
    await run('pdflatex', [
      '-interaction=batchmode',
      `-output-directory=${scratch}`,
      `-jobname=${name}`,
      srcPath,
    ], { cwd: dirname(srcPath) });

    const pdfPath = join(scratch, `${name}.pdf`);
    // pdftocairo -svg expects a single output file path
    await fs.mkdir(dirname(outPath), { recursive: true });
    await run('pdftocairo', ['-svg', pdfPath, outPath], { cwd: scratch });
    await themeSvg(outPath, name);
    process.stderr.write(`  ✓ ${book}/${name}.svg\n`);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

/**
 * Post-process a pdftocairo SVG so it themes + can be safely inlined (the #84
 * behavior, done here since the consumer build-figures predates it):
 *   1. Neutral remap — pure black (text/lines) → var(--diagram-ink), pure white
 *      (bg) → var(--diagram-paper). Saturated palette colors are left as
 *      authored. <Figure> inlines the SVG so these var()s resolve from the
 *      page's [data-theme] tokens → the figure flips in dark mode.
 *   2. ID namespacing — pdftocairo emits per-file ids (glyph-0-0, clip paths).
 *      Two inlined figures on one page would collide (a `<use href="#glyph-0-0">`
 *      resolves to the first). Prefix every id + reference with the figure name.
 */
async function themeSvg(outPath, name) {
  let svg = await fs.readFile(outPath, 'utf8');
  // 1. neutral → theme tokens (both rgb(...) and #hex spellings)
  svg = svg
    .replace(/(fill|stroke)="rgb\(0%,\s*0%,\s*0%\)"/g, '$1="var(--diagram-ink, #1a1a19)"')
    .replace(/(fill|stroke)="rgb\(100%,\s*100%,\s*100%\)"/g, '$1="var(--diagram-paper, #fdfcf9)"')
    .replace(/(fill|stroke)="#000000"/gi, '$1="var(--diagram-ink, #1a1a19)"')
    .replace(/(fill|stroke)="#ffffff"/gi, '$1="var(--diagram-paper, #fdfcf9)"');
  // 2. namespace ids + their references (id=, href="#", url(#))
  const p = `${name}-`;
  svg = svg
    .replace(/\bid="([^"]+)"/g, `id="${p}$1"`)
    .replace(/(\bxlink:href|\bhref)="#([^"]+)"/g, `$1="#${p}$2"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`);
  await fs.writeFile(outPath, svg);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdout.on('data', () => {});  // discard
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 400)}`));
      else resolve();
    });
  });
}

/**
 * Probe whether a binary is reachable on PATH. Resolves true if the command
 * spawns at all (any exit code), false if it can't be launched (ENOENT). Used
 * to detect the LaTeX toolchain so the build can fall back to committed SVGs in
 * a node-only deploy container (Cloudflare Workers Builds) instead of failing.
 */
function commandExists(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false)); // ENOENT — not on PATH
    child.on('close', () => resolve(true)); // launched → exists
  });
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.clean) {
    const cleanDir = args.book
      ? join(FIGURES_OUT, args.book)
      : FIGURES_OUT;
    try { await fs.rm(cleanDir, { recursive: true, force: true }); }
    catch { /* nothing to clean */ }
    process.stderr.write(`Cleaned ${relative(PROJECT_ROOT, cleanDir)}\n`);
  }

  const figures = await discoverFigures(args.book);
  if (figures.length === 0) {
    process.stderr.write(`No figures found${args.book ? ` for book ${args.book}` : ''}.\n`);
    return;
  }

  // Which figures actually need (re)compiling?
  const work = [];
  for (const fig of figures) {
    const outPath = join(FIGURES_OUT, fig.book, `${fig.name}.svg`);
    if (await isStale({ ...fig, outPath }, args.force)) work.push({ ...fig, outPath });
  }

  // Deploy-safe skip: the Cloudflare Workers Builds container is node-only (no
  // apt/LaTeX). If anything would need compiling but the toolchain is absent,
  // warn and fall back to the committed public/figures/ SVGs rather than fail
  // the whole site build. Local dev (with texlive) still rebuilds normally.
  if (work.length > 0) {
    const [hasLatex, hasPdftocairo] = await Promise.all([
      commandExists('pdflatex'),
      commandExists('pdftocairo'),
    ]);
    if (!hasLatex || !hasPdftocairo) {
      process.stderr.write(
        `build-figures: LaTeX toolchain unavailable (pdflatex=${hasLatex}, ` +
          `pdftocairo=${hasPdftocairo}) — skipping ${work.length} figure(s); ` +
          `serving committed public/figures/ SVGs. Install texlive + ` +
          `poppler-utils to regenerate locally.\n`,
      );
      return;
    }
  }

  process.stderr.write(`Building ${work.length} figure(s)…\n`);
  let built = 0;
  for (const fig of work) {
    await compileFigure(fig, fig.outPath);
    built++;
  }
  process.stderr.write(`Done: ${built} built, ${figures.length - built} cached.\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  if (process.env.DEBUG) process.stderr.write(err.stack + '\n');
  process.exit(1);
});
