# Dogfooding log — book-scaffold-astro

Friction found building this corpus on `@brandon_m_behring/book-scaffold-astro`.
File issues against `brandon-behring/book-scaffold-astro` with label
`consumer:dlai-study-notes` (+ `tracked`); PR the high-value ones. Pin the version
(`npm view @brandon_m_behring/book-scaffold-astro version` → 4.25.0).

Convention per recipe 12: Problem / Evidence / Suggested fix / Acceptance criteria.

---

## Theme: multi-book apparatus (#80) — the big one

The study apparatus (practice-exam, glossary, flashcards, answers) is **single-book
global**: routes are hardcoded (`/practice-exam`, …) and gated only on/off; there's
no per-book parameterization. A multi-book consumer must disable the globals and
reimplement per-book routes. The *pure helpers and islands ARE exported* (good), so
reimplementation is mechanical — but it's boilerplate every multi-book consumer
repeats.

### 1. Apparatus routes can't be per-book
- **Evidence:** `pages/practice-exam.astro` etc. read the whole `questions`
  collection + global `bookConfig.examDomains`; route injection
  (`integration.ts` ROUTE_REGISTRY) has one fixed pattern each.
- **Workaround here:** `routes:{ practiceExam:false, … }` + consumer-owned
  `src/pages/[book]/{practice-exam,glossary,flashcards,answers}.astro` that filter
  by `entry.id.startsWith('<book>/')` and reuse `groupByDomain`, `buildExamManifest`,
  `assertKnownDomain`, `buildFlashcardDeck`, `groupByChapter`, `QuestionCard`,
  `ExamRunner`, `Flashcards`.
- **Suggested fix:** a first-class multi-book mode (e.g. `getStaticPaths`-friendly
  route factories, or a `book` filter prop on the apparatus pages) so consumers
  don't copy ~250 lines of route logic.

### 2. examDomains is single-global, not per-book
- **Evidence:** `defineBookConfig({ examDomains })` is one array; `assertKnownDomain`
  validates every question against it; the `validate` CLI does too.
- **Workaround:** per-book `examDomains` in **book frontmatter** (drives our routes)
  + a **union** in `defineBookConfig` purely to satisfy the global validator.
  Dual source of truth.
- **Suggested fix:** allow `examDomains` to be a map keyed by book, or read it from
  book frontmatter.

### 3. `<Term id>` links to a global `/glossary`
- **Evidence:** `components/Term.astro` → `href="${BASE_URL}glossary#term-<id>"`.
  In a multi-book site the glossary is `/<book>/glossary`, so the link 404s.
- **Workaround:** plain relative links in prose (`../glossary#term-<slug>`).
- **Suggested fix:** make `<Term>` resolve relative to the current book, or accept a
  `base`/`book` prop.

### 4. Glossary anchors carry the book prefix
- **Evidence:** `pages/glossary.astro` anchors `term-${entry.id}`; multi-book ids are
  `<book>/<slug>`, yielding `term-<book>/<slug>` (slash in the id).
- **Workaround:** our route strips to the last path segment (`term-<slug>`).

---

## Theme: question/answer UX

### 5. MCQ rationale placement is awkward
- **Evidence:** `QuestionCard` renders the MDX stem (incl. any `<Rationale>`) **above**
  the options, and also renders its own "Show answer" reveal — so an MCQ with an
  explanatory `<Rationale>` shows two reveals ("Why" before options, "Show answer"
  after). Order reads oddly.
- **Suggested fix:** a dedicated post-options explanation slot on `QuestionCard`, or
  let `<Rationale>` target placement after the options.

### 6. No first-class components for two recurring guide shapes
- **DecisionTree:** the source guides use decision trees; no scaffold component
  (we ship a consumer `DecisionTree.astro`). Candidate to upstream.
- **Interview "answer ladder"** (30s / 2-min / deep-dive): no component; we instead
  seed the `questions` bank as applied practice (the chosen design), but a ladder
  component may be worth it.

---

## Theme: pedagogy enhancement backlog (from PEDAGOGY.md audit; Phase 3)

Additive to course-notes — ship as a scaffold minor:
- **#145 questions→flashcards** — web `/flashcards` is glossary-only; derive cards
  from the question bank too.
- **Spacing scheduler** (SM-2/Leitner) on flashcards (currently shuffle-only).
- **`<FadedExample>`** (full → completion → independent) + `fadeSteps` schema (#118).
- **`<LearningOutcomesMap>`** + `deriveLOCoverage` (LO-level coverage, not just domain).
- **Progressive-disclosure polish:** expand/collapse-all, keyboard nav, hint→answer.

---

## Worked fine (no action)
- `courseNotesChapterSchema.extend({ book })` — clean consumer extension.
- Pure helpers + islands all exported from the main entry.
- `Diagnostic`, `WorkedExample`, `EvidenceTag`, `Newthought` drop into the MDX
  component map and render correctly.
- KaTeX (consumer-wired remark-math/rehype-katex) renders in MDX + components.
