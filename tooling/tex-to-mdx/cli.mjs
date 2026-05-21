#!/usr/bin/env node
/**
 * tex-to-mdx CLI
 *
 * Usage:
 *   tex-to-mdx <input.tex> --book=<slug> --chapter=<N> --out=<output.mdx>
 *   tex-to-mdx <input-dir>/ --book=<slug> --out-dir=<output-dir>/
 *
 * Examples:
 *   # Single chapter:
 *   tex-to-mdx ~/Claude/course_learning/dlai_knowledge_graphs_rag/notes/notebook/chapters/01_m1_knowledge_graph_fundamentals.tex \
 *     --book=knowledge-graphs-rag --chapter=1 --out=src/content/chapters/knowledge-graphs-rag/01-fundamentals.mdx
 *
 *   # Whole book:
 *   tex-to-mdx ~/Claude/course_learning/dlai_knowledge_graphs_rag/notes/notebook/chapters/ \
 *     --book=knowledge-graphs-rag --out-dir=src/content/chapters/knowledge-graphs-rag/
 *
 * The output is INTENTIONALLY not publication-ready. The converter does
 * mechanical translation only — the polish-pass-in-MDX is where the per-book
 * audit happens. Expect to spend ~90 min/chapter on the polish pass.
 */
import { resolve, basename, join, dirname } from 'node:path';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { convertTexToMdx } from './pipeline.mjs';

const HELP = `Usage: tex-to-mdx <input> [options]

Arguments:
  <input>           Path to a .tex file OR directory of .tex files.

Required options:
  --book=<slug>     Book slug to assign in frontmatter (e.g. "knowledge-graphs-rag").

Output options (mutually exclusive):
  --out=<file>      Output MDX file (only valid when input is a single .tex).
  --out-dir=<dir>   Output directory (required when input is a directory).

Other options:
  --dry-run         Print converted MDX to stdout instead of writing files.
  --help, -h        This message.

Notes:
  - Requires \`pandoc\` on PATH for the mechanical translation layer.
  - The converter does mechanical conversion only; output is correctable
    MDX that needs a per-chapter polish pass in MDX (target ~90 min/chapter).
  - Chapter slugs are derived from filenames: \`01_m1_knowledge_graph_fundamentals.tex\`
    becomes \`01-knowledge-graph-fundamentals.mdx\` (the \`m1\` module prefix is stripped).
`;

function parseArgs(argv) {
  const args = { input: null, book: null, out: null, outDir: null, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') {
      process.stdout.write(HELP);
      process.exit(0);
    }
    if (a === '--dry-run') { args.dryRun = true; continue; }
    const m = a.match(/^--(book|out|out-dir)=(.+)$/);
    if (m) {
      const k = m[1] === 'out-dir' ? 'outDir' : m[1];
      args[k] = m[2];
      continue;
    }
    if (a.startsWith('--')) {
      process.stderr.write(`Unknown flag: ${a}\n\n${HELP}`);
      process.exit(2);
    }
    if (!args.input) args.input = a;
  }
  if (!args.input || !args.book) {
    process.stderr.write(`Missing required arguments.\n\n${HELP}`);
    process.exit(2);
  }
  return args;
}

function slugifyChapterFilename(texPath) {
  // Filename conventions across the DLAI corpus:
  //   01_m1_knowledge_graph_fundamentals.tex → 01-knowledge-graph-fundamentals.mdx
  //   01_01_openai_function_calling.tex      → 01-openai-function-calling.mdx
  //   ch01_evaluation_foundations.tex        → 01-evaluation-foundations.mdx
  //   ch01.tex                               → 01.mdx
  const base = basename(texPath, '.tex');
  return base
    .replace(/^ch(\d+)_?/, '$1-')           // strip ch-prefix
    .replace(/^(\d+)_(?:m\d+|\d{1,2})_/, '$1-')  // strip module/lesson prefix
    .replace(/-$/, '')                     // strip trailing hyphen from bare ch01
    .replace(/_/g, '-')
    .toLowerCase() + '.mdx';
}

async function processOne(inputPath, outputPath, book, dryRun) {
  const tex = await readFile(inputPath, 'utf-8');
  const mdx = await convertTexToMdx(tex, { book, source: inputPath });

  if (dryRun) {
    process.stdout.write(`--- ${inputPath} →\n`);
    process.stdout.write(mdx + '\n');
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, mdx, 'utf-8');
  process.stderr.write(`  → ${outputPath}\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  const inputResolved = resolve(args.input);

  let stat;
  try {
    const fs = await import('node:fs/promises');
    stat = await fs.stat(inputResolved);
  } catch (err) {
    process.stderr.write(`Input not found: ${inputResolved}\n`);
    process.exit(1);
  }

  if (stat.isDirectory()) {
    if (!args.outDir) {
      process.stderr.write(`--out-dir is required for directory input.\n`);
      process.exit(2);
    }
    const files = (await readdir(inputResolved))
      .filter((f) => f.endsWith('.tex'))
      .filter((f) => f !== '00_how_to_use.tex')   // skip generic intro
      .sort();

    process.stderr.write(`Converting ${files.length} chapters from ${inputResolved}\n`);
    for (const f of files) {
      const inputPath = join(inputResolved, f);
      const outputPath = join(resolve(args.outDir), slugifyChapterFilename(f));
      await processOne(inputPath, outputPath, args.book, args.dryRun);
    }
  } else {
    const outputPath = args.out
      ? resolve(args.out)
      : join(process.cwd(), slugifyChapterFilename(inputResolved));
    await processOne(inputResolved, outputPath, args.book, args.dryRun);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  if (process.env.DEBUG) process.stderr.write(err.stack + '\n');
  process.exit(1);
});
