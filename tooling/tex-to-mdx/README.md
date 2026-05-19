# tex-to-mdx

Convert course-learning LaTeX (`.tex`) chapter sources to MDX for the DLAI study notes corpus.

**Mechanical-only conversion.** Output is *correctable* MDX, not publication-ready. The per-book audit/polish pass happens by hand in MDX.

## Status: SKELETON

The Pandoc-mechanical layer works end-to-end (sections, lists, tables, emphasis, citations, code via Pandoc). The 8 priority-construct transformations are stubbed with `TODO` markers in `pipeline.mjs#transformToMdx`. Expand them during the pilot polish pass as concrete chapter content surfaces the exact shape needed.

## Priority constructs (per Task 2 macro audit on pilot)

| Priority | Construct | Pilot count | Status |
|---|---|---|---|
| 1 | `\begin{pycode}` | 57 | stubbed |
| 2 | `\term[ID]{name}{def}` | 52 | stubbed |
| 3 | `\begin{tcolorbox}[narrative/concept]` | 36 | stubbed |
| 4 | `\begin{solution}` | 19 | stubbed |
| 5 | `\interviewmargin` etc. (6 macros) | ~60 | stubbed |
| 6 | `\begin{minted}` | 16 | stubbed |
| 7 | `\begin{keyconcept}` | 16 | stubbed |
| 8 | `\begin{problem}` | 16 | stubbed |

Frontmatter extraction is working: `\moduleheader{}`, `\learningoutcomes{}/\los{}`, `\companytags{}`, `\chaptersourcenote{}` are pulled into YAML frontmatter before Pandoc runs.

## Requirements

- Node.js ≥22.12.0
- `pandoc` on PATH (`brew install pandoc` / `apt-get install pandoc`)

## Install

From the corpus root (`~/Claude/dlai-study-notes`):
```bash
npm install
```

Workspace packages are linked automatically.

## Usage

### Single chapter

```bash
npm run convert:tex -- \
  ~/Claude/course_learning/dlai_knowledge_graphs_rag/notes/notebook/chapters/01_m1_knowledge_graph_fundamentals.tex \
  --book=knowledge-graphs-rag \
  --chapter=1 \
  --out=src/content/chapters/knowledge-graphs-rag/01-fundamentals.mdx
```

### Whole book

```bash
npm run convert:tex -- \
  ~/Claude/course_learning/dlai_knowledge_graphs_rag/notes/notebook/chapters/ \
  --book=knowledge-graphs-rag \
  --out-dir=src/content/chapters/knowledge-graphs-rag/
```

### Dry-run

```bash
npm run convert:tex -- <input.tex> --book=<slug> --dry-run
```

## Output shape

```mdx
---
book: knowledge-graphs-rag
title: Knowledge Graph Fundamentals
chapter: 1
description: Foundations of graph-based data modeling — nodes, relationships, properties, labels.
learning_outcomes:
  - id: KGR-1.1
    verb: define
    text: the core components of a Knowledge Graph...
  - id: KGR-1.2
    verb: explain
    text: why Knowledge Graphs enhance RAG systems...
sources: [hogan2021knowledge, noy2019industry]
tools_compared: [MLE-Google-L4, SWE-Neo4j, ...]
---

{/* TODO: per-chapter polish pass in MDX — see plan decision Q1 round 3 */}

[Pandoc-emitted markdown body, with priority constructs still in raw form for the polish pass to convert to MDX components]
```

## Next steps after pilot validates the pattern

1. Move the converter into `book-scaffold-astro` as a scaffold tool (Phase 0.C.0 deferred work).
2. Convert the string-level transformations to proper remark plugins operating on the MDX AST (cleaner, more composable).
3. Add per-book language hints for `pycode` blocks (KG-RAG = cypher; future books may need python, javascript, etc.).
