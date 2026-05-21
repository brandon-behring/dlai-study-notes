# tex-to-mdx

Convert course-learning LaTeX (`.tex`) chapter sources to MDX for the DLAI study notes corpus.

**Mechanical-only conversion.** Output is *correctable* MDX, not publication-ready. The per-book audit/polish pass happens by hand in MDX.

## Status: Pilot-ready mechanical converter

The Pandoc-mechanical layer works end-to-end (sections, lists, tables, emphasis, citations, code via Pandoc). The 8 priority constructs are implemented in `pipeline.mjs` using a marker-token strategy: verbatim environments are extracted before Pandoc, block environments keep their bodies in place for Pandoc conversion, and inline macros become MDX components after Pandoc cleanup.

Converted MDX still includes a chapter-level polish marker because the converter intentionally produces correctable MDX, not publication-ready prose.

## Priority constructs (per Task 2 macro audit on pilot)

| Priority | Construct | Pilot count | Status |
|---|---|---|---|
| 1 | `\begin{pycode}` | 57 | implemented |
| 2 | `\term[ID]{name}{def}` | 52 | implemented |
| 3 | `\begin{tcolorbox}[narrative/concept]` | 36 | implemented |
| 4 | `\begin{solution}` | 19 | implemented |
| 5 | `\interviewmargin` etc. (6 macros) | ~60 | implemented |
| 6 | `\begin{minted}` | 16 | implemented |
| 7 | `\begin{keyconcept}` | 16 | implemented |
| 8 | `\begin{problem}` | 16 | implemented |

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

{/* TODO: per-chapter polish pass — see plan decision Q1 round 3 */}

[Pandoc-emitted markdown body with priority constructs converted to MDX components]
```

## Next steps after pilot validates the pattern

1. Move the converter into `book-scaffold-astro` as a scaffold tool (Phase 0.C.0 deferred work).
2. Convert the string-level transformations to proper remark plugins operating on the MDX AST (cleaner, more composable).
3. Add per-book language hints for `pycode` blocks (KG-RAG = cypher; future books may need python, javascript, etc.).
