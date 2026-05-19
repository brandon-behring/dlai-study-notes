# DLAI Study Notes — by Brandon Behring

A corpus of personal study notes synthesized from DeepLearning.AI short courses. DLAI courses are video + handouts only — this is the readable, searchable, math-rendered companion form that didn't otherwise exist.

**Read online**: https://study-notes.brandon-behring.dev/
**Portfolio**: https://brandon-behring.dev/

## What's in here

Each book in this corpus corresponds to one DLAI short course. Per book you get:

- Paraphrased synthesis of the course content (no transcripts)
- Original margin notes (interview signals, patterns, formulas, warnings, practice prompts)
- Original worked problems (not graded-assignment reproductions)
- Anki flashcards (inline in the book; downloadable as `.apkg`)
- Searchable via Pagefind; math via KaTeX; offline PDF via Paged.js

## What this is NOT

- Not a substitute for taking the course — enroll at https://www.deeplearning.ai/short-courses/
- Not transcripts, lecture slides, lab notebooks, or graded assignment solutions
- Not affiliated with or endorsed by DeepLearning.AI or any course instructor

## DLAI policy compliance

This corpus complies with [DeepLearning.AI's Community Code of Conduct](https://community.deeplearning.ai/t/respecting-intellectual-property-how-to-share-deeplearning-ai-course-materials-responsibly/681787):

- **Non-commercial** — CC-BY-NC-4.0 on prose, MIT on code. No paywall, no ads, no commercial reuse permitted.
- **Attributed** — every chapter cites DeepLearning.AI as source and names the instructor(s).
- **No answers** — no quiz answers, no graded-assignment solutions, no lab solutions, no verbatim transcripts.

Per DLAI moderator guidance ([source](https://community.deeplearning.ai/t/can-i-share-my-notes-with-the-public/196052)): "Sharing your personal notes publicly, assuming that they don't contain any answers to quizzes and assignments is perfectly fine."

## Takedown / corrections

Email <brandon.m.behring@gmail.com> — content removed within 48 hours of request from DeepLearning.AI, the instructor, or anyone else with a substantive concern.

For typos, errors, broken citations, or suggestions: open an **Issue**. For general questions or sharing related work: use **Discussions**. **Pull requests are disabled** — substantive technical changes belong upstream at [`book-scaffold-astro`](https://github.com/brandon-behring/book-scaffold-astro).

## Tech stack

- [Astro 6](https://astro.build/) + MDX
- [`@brandon_m_behring/book-scaffold-astro`](https://github.com/brandon-behring/book-scaffold-astro) v3.x — typography, callouts, citations, Pagefind, Paged.js
- KaTeX for math
- Cloudflare Pages for hosting

## Architecture

This is a **single Astro app, multi-book mono-repo**. All ~10-20 Gold-tier DLAI books share one components set, one styles set, one frontmatter schema — consistency by construction. Polish passes inherit to all books on rebuild.

```
dlai-study-notes/
├── src/
│   ├── content/
│   │   ├── books/<slug>.mdx       # book-level metadata (instructor, source URL, etc.)
│   │   └── chapters/<slug>/*.mdx  # per-book chapter content
│   └── pages/
│       ├── index.astro            # corpus landing
│       ├── [book]/index.astro     # per-book TOC
│       └── [book]/[...chapter].astro  # chapter renderer
├── tooling/
│   ├── tex-to-mdx/                # .tex → MDX converter (Node/TS)
│   └── mdx-card-extractor/        # MDX → .apkg extractor
├── figures/<book>/<name>.tex      # TikZ figures (compiled to SVG)
└── citations.bib                  # shared bibliography
```

Other DLAI-derived corpora (e.g., future math books, software books) live in separate repos with their own configurations — consistency within corpus, isolation across corpora.

## Author

Brandon Behring — applied mathematician who builds and learns. Foundations in probability, statistics, risk, and business problem-solving (CFA, FRM, SOA coursework). Currently building AI safety evaluation tools, LLM systems, and applied causal inference.

Portfolio: https://brandon-behring.dev
