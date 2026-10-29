# DLAI Study Notes — by Brandon Behring

A corpus of personal study notes synthesized from DeepLearning.AI courses. DLAI courses are video + notebooks — this is the readable, searchable, math-rendered companion form that didn't otherwise exist.

**Read online**: https://study-notes.brandon-behring.dev/
**Portfolio**: https://brandon-behring.dev/

## What's in here

Each book in this corpus corresponds to one DeepLearning.AI course; [`NOTICE.md`](NOTICE.md) lists the current books with their courses, instructors, and partners. Per book you get:

- Paraphrased synthesis of the course content (no transcripts), with a course credit on every chapter
- Original margin notes, worked examples, decision aids, and self-check questions
- An original practice exam with an answer key, a glossary, and flashcards
- Full-text search via Pagefind; math via KaTeX

## What this is NOT

- Not a substitute for taking the course — enroll at https://www.deeplearning.ai/courses/
- Not transcripts, lecture slides, lab notebooks, or graded assignment solutions
- Not affiliated with or endorsed by DeepLearning.AI or any course instructor

## DLAI policy compliance

This corpus complies with [DeepLearning.AI's Community Code of Conduct](https://community.deeplearning.ai/t/respecting-intellectual-property-how-to-share-deeplearning-ai-course-materials-responsibly/681787):

- **Non-commercial** — CC-BY-NC-4.0 on prose, MIT on code. No paywall, no ads, no commercial reuse permitted.
- **Attributed** — every chapter credits its DeepLearning.AI course (linked) and names the instructor(s); `npm run lint:notice` fails the build if a book is missing from [`NOTICE.md`](NOTICE.md).
- **No answers** — no quiz answers, no graded-assignment solutions, no lab solutions, no verbatim transcripts. Every practice question is original.

Per DLAI moderator guidance ([source](https://community.deeplearning.ai/t/can-i-share-my-notes-with-the-public/196052)): "Sharing your personal notes publicly, assuming that they don't contain any answers to quizzes and assignments is perfectly fine."

## Takedown / corrections

Email <brandon.m.behring@gmail.com> — content removed within 48 hours of request from DeepLearning.AI, the instructor, or anyone else with a substantive concern.

For typos, errors, broken citations, or suggestions: open an **Issue** (templates in `.github/ISSUE_TEMPLATE/`). **Pull requests are disabled** — substantive technical changes belong upstream at [`book-scaffold-astro`](https://github.com/brandon-behring/book-scaffold-astro).

## Tech stack

- [Astro 6](https://astro.build/) + MDX content collections
- [`@brandon_m_behring/book-scaffold-astro`](https://github.com/brandon-behring/book-scaffold-astro) (course-notes style; pinned in `package.json`) — layout, typography, callouts, citations, study apparatus, responsive navigation
- KaTeX for math; Pagefind for search
- Cloudflare Workers static assets, deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`; `astro-build.yml` is the pull-request build check
- Playwright responsive + axe accessibility audit (`tests/`)

## Architecture

This is a **single Astro app, multi-book mono-repo**: every book shares one component set, one style, and one frontmatter schema — consistency by construction, and a polish pass applies to every book on rebuild.

```
dlai-study-notes/
├── src/
│   ├── content/
│   │   ├── books/<slug>.mdx            # book metadata: course, instructor, partner, source URL, exam domains
│   │   ├── chapters/<slug>/*.mdx       # chapter content
│   │   ├── questions/<slug>/*.mdx      # original practice questions (practice exam + answers)
│   │   └── glossary/<slug>/*.mdx       # glossary terms (glossary + flashcards)
│   ├── components/mdx/                 # MDX components used by the chapters
│   └── pages/
│       ├── index.astro                 # corpus landing
│       ├── about.astro                 # license, AI-assisted authoring, privacy, takedown
│       └── [book]/                     # per-book index, chapters, practice exam, answers, glossary, flashcards
├── tooling/
│   ├── build-figures/                  # TikZ → SVG (skips without LaTeX; serves the committed SVGs)
│   ├── lint-mcq/                       # MCQ quality gate
│   ├── lint-component-tokens/          # dark-mode colour-token gate
│   ├── lint-notice/                    # NOTICE.md attribution gate
│   └── og/                             # Open Graph card generator
├── figures/<book>/<name>.tex           # TikZ figure sources (rendered SVGs live in public/figures/)
├── tests/                              # Playwright responsive + accessibility audit
├── citations.bib                       # shared bibliography
└── NOTICE.md                           # per-book attribution
```

Authoring rules live in [`PEDAGOGY.md`](PEDAGOGY.md) (evidence-based template), [`MCQ-GUIDELINES.md`](MCQ-GUIDELINES.md), and [`COMPONENTS.md`](COMPONENTS.md); scaffold gaps found while building the corpus are logged in [`DOGFOOD.md`](DOGFOOD.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run validate` | Schema validation + `lint:components`, `lint:mcq`, `lint:notice` (also runs before every build) |
| `npm run build` | Bibliography, labels, figures, validate, then `astro build` + Pagefind index |
| `npm run test:tooling` | Unit tests for the repo's own tooling |
| `npm run test:responsive` | Build, then the Playwright responsive + accessibility audit |

## Author

Brandon Behring — applied mathematician who builds and learns. Foundations in probability, statistics, risk, and business problem-solving (CFA, FRM, SOA coursework). Currently building AI safety evaluation tools, LLM systems, and applied causal inference.

Portfolio: https://brandon-behring.dev
