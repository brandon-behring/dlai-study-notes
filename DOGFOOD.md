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

## Theme: rendering & affordances (found in chapter-1 design review)

### 7. KaTeX CSS not loaded under course-notes → math double-renders
- **Problem:** the scaffold gates the KaTeX stylesheet on the academic profile.
  A course-notes consumer that wires `remark-math`/`rehype-katex` (as we must)
  gets the markup but **no `katex.css`**, so the browser shows native MathML AND
  the unstyled `.katex-html` (spans collapse → "12"+"15" renders as "1512").
- **Evidence:** `[...document.styleSheets].some(s => …'katex-mathml')` was `false`;
  `.katex-mathml` computed `position:static` (not the SR-hidden clip). All 4
  equations on the chapter doubled.
- **Workaround:** consumer `src/styles/consumer-overrides.css` `@import`s
  `katex/dist/katex.min.css`, imported on every MDX-rendering route.
- **Suggested fix:** when math integrations are enabled for ANY profile, ship
  katex.css (or document the consumer requirement loudly).

### 8. `<WorkedExample>` hides its disclosure marker with no replacement
- **Problem:** `callouts.css` sets `.callout-worked summary { list-style:none }`
  + `::-webkit-details-marker { display:none }`, leaving only `cursor:pointer`
  and a static-looking chip. It doesn't read as expandable — and it's
  inconsistent with `<Diagnostic>` / SectionMap, which DO show a ▸.
- **Workaround:** consumer override adds a rotating `▸` `::before` on the summary.
- **Suggested fix:** ship the chevron in the scaffold (rotate on `[open]`,
  honor `prefers-reduced-motion`).

### 9. `--color-accent` is undefined in tokens.css → islands fall back to indigo
- **Problem:** ExamRunner/Flashcards/QuestionCard/Rationale/ObjectiveMap all use
  `var(--color-accent, #4f46e5)`, but `tokens.css` never defines `--color-accent`,
  so the apparatus renders cool indigo — off-palette from the warm-blue site.
- **Workaround:** consumer defines `--color-accent: var(--warm-blue)` (+ dark
  brightening) globally.
- **Suggested fix:** define `--color-accent` in tokens.css (map to `--warm-blue`
  or a dedicated accent role) so islands inherit the book palette by default.

### 10. Apparatus headings print the raw domain slug
- **Problem:** the scaffold `/practice-exam` (and our per-book clone) render the
  `examDomains` slug directly (`sft-vs-rl` → CSS-capitalized "Sft-Vs-Rl").
- **Workaround:** optional `examDomainLabels` map in book frontmatter +
  `humanizeDomain()` fallback (consumer `src/lib/domain-label.ts`).
- **Suggested fix:** let `examDomains` entries carry an optional label, or accept
  a labels map in `defineBookConfig`.

### 11. Tools-profile chrome controls aren't gated for course-notes
- **Problem:** `layouts/Base.astro` mounts `<ToolFilter>` (flag) + `<VersionSelector>`
  ("v") whenever `profile !== 'academic'`, so the **course-notes** profile shows
  them with no consumer opt-out — irrelevant controls for a study-notes site.
- **Workaround:** consumer CSS hides `.tool-filter` / `.version-selector` (still
  hydrate, just hidden).
- **Suggested fix:** gate on `profile === 'tools'`, or add a `chrome`/`hideToolsChrome`
  flag to `defineBookConfig`.

### 12. Consumer-component dark-mode footgun → ship a validate check
- **Problem:** a consumer component writing `var(--undefined-token, #lighthex)` pins
  the color in every theme → unreadable in dark. Hit 5 callouts + Sidenote + 9 more
  components here (found by our lint). The scaffold offers no guard.
- **Workaround:** consumer `lint:components` (tooling/lint-component-tokens) fails the
  build on the pattern; consumer-component correctness standard in COMPONENTS.md.
- **Suggested fix:** fold the lint into `book-scaffold validate` so every consumer
  inherits it; consider defining the `--color-*` semantic aliases in `tokens.css`.

### 13. Scored exam verdict is too subtle + answer-key label reads as a verdict
- **Problem:** after ExamRunner scores, a card's only right/wrong cue is
  `QuestionCard`'s faint `data-exam-result` border (+3px inset shadow). Meanwhile
  the reveal shows an answer-key line labeled **"Correct: \<answer>"** on *every*
  card — which reads as a verdict. Net effect: a wrong answer looks like a right
  one ("the exam says correct no matter what I pick"). Scoring itself is correct.
- **Workaround:** consumer CSS gives `[data-exam-result]` a tinted background + a
  bold ✓/✗ "Your answer — correct/incorrect" badge (themed), clearly distinct
  from the answer key.
- **Suggested fix:** ship a prominent per-card verdict in `QuestionCard`/ExamRunner
  (badge + tint, not just a border), and relabel the reveal key "Correct:" →
  "Answer:" so it isn't mistaken for the user's result.

## Theme: pedagogy enhancement backlog (from PEDAGOGY.md audit; Phase 3)

Additive to course-notes — ship as a scaffold minor:
- **#145 questions→flashcards** — web `/flashcards` is glossary-only; derive cards
  from the question bank too.
- **Spacing scheduler** (SM-2/Leitner) on flashcards (currently shuffle-only).
- **`<FadedExample>`** (full → completion → independent) + `fadeSteps` schema (#118).
- **`<LearningOutcomesMap>`** + `deriveLOCoverage` (LO-level coverage, not just domain).
- **Progressive-disclosure polish:** expand/collapse-all, keyboard nav, hint→answer.

---

## Theme: v4.26 consumer adoption (responsive nav + chrome + figures)

### showChrome doesn't reach chapter pages (#163 follow-up)
- **Problem:** v4.26 #163 added a `showChrome` Base prop, but `Chapter.astro`
  (Props `{ entry, headings }`) doesn't forward it — so only standalone Base pages
  (index/about/404) can drop the tools chrome via the prop; chapter + apparatus
  pages can't.
- **Workaround here:** `showChrome={false}` on the standalone pages; the consumer
  CSS hide (`.chrome-buttons .tool-filter/.version-selector { display:none }`)
  stays for chapter + apparatus pages.
- **Suggested fix:** `Chapter.astro` accepts + forwards `showChrome` (and
  `showSidebar`) to `Base`, so consumers can fully retire the CSS hide.

### build-figures hard-fails without LaTeX (node-only deploy containers)
- **Problem:** `book-scaffold build-figures` exits non-zero when
  `pdflatex`/`pdftocairo` are absent — which breaks the site build in a node-only
  deploy container (Cloudflare Workers Builds has no apt/texlive).
- **Workaround here:** the consumer's forked `tooling/build-figures` preflight-
  probes the toolchain and skips gracefully (serving committed `public/figures/`
  SVGs) when it's absent; CI/Workers build green without LaTeX.
- **Suggested fix:** add the same skip-when-absent guard to the scaffold's
  `build-figures` so any consumer deploying on Workers Builds is safe.

## Worked fine (no action)
- `courseNotesChapterSchema.extend({ book })` — clean consumer extension.
- Pure helpers + islands all exported from the main entry.
- `Diagnostic`, `WorkedExample`, `EvidenceTag`, `Newthought` drop into the MDX
  component map and render correctly.
- KaTeX (consumer-wired remark-math/rehype-katex) renders in MDX + components.
