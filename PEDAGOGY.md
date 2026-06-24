# Pedagogy Template Spec — Evidence-Based Design Brief

> **Provenance:** synthesized during the v4.25 pedagogy-rebuild planning (2026-06) from the
> applied learning-science literature, then audited against the book-scaffold-astro course-notes
> apparatus. **Decision: enhance course-notes in place — no new profile.** This doc is the
> authoring standard for the pilot guides; the `## Implementation mapping` section ties each rule
> to a concrete scaffold component/route and a `guide_qa.yaml` check.

Audience: motivated self-learners (some interview-prep oriented). Content: math/code-heavy ML/AI
(KL divergence, reward modeling, RAG, knowledge graphs). Format: interactive web book —
chapters + glossary + practice exam + flashcards. All practice questions must be ORIGINAL
applied-practice, never copied from course quizzes.

Each rule below is template-ready: a concrete authoring/UX directive + one-line evidence basis + source.

---

## PRIORITY ORDER (build these first)

The two highest-leverage, best-evidenced levers are **(1) retrieval practice + spacing** and
**(2) worked examples + fading**. They have the largest, most replicated effect sizes
(Dunlosky et al. 2013 rated both retrieval practice and distributed practice "high utility" —
the only two techniques to earn that rating out of ten studied). Build these into the template
skeleton first. Constructive alignment (3) is the connective tissue that makes the other four
measurable. Elaboration (4) and cognitive load / disclosure (5) are refinements layered on top.

---

## LEVER 1 — Retrieval Practice & Spaced Repetition  [HIGHEST PRIORITY]

**What the evidence says:** Being tested on material (retrieving it) produces far more durable
learning than re-reading it — the "testing effect." Spacing those retrievals over time beats
massing them. These are the two strongest findings in the applied learning-science literature.

- **R1. Open every chapter with a 3-5 item low-stakes diagnostic ("What do you already know?").**
  Pre-testing — even guessing wrong — primes encoding and surfaces gaps; ungraded, dismissible.
  *Evidence: pretesting/testing effect improves later retention even when initial answers are wrong (Roediger & Karpicke 2006; Dunlosky et al. 2013 — practice testing "high utility").*

- **R2. Place 2-3 free-recall / short-answer retrieval prompts at the END of each section,
  collapsed answers, before the reader moves on.** End-of-section beats end-of-chapter because
  retrieval works best close to encoding but after a brief gap. Prefer recall ("derive/state X")
  over recognition (MCQ) where feasible.
  *Evidence: effortful free recall produces stronger testing effect than recognition; "desirable difficulties" (Bjork 1994; Karpicke & Roediger 2008).*

- **R3. Auto-generate a spaced flashcard deck from chapter key terms/derivations, scheduled on
  an EXPANDING interval (~1d, 3d, 7d, 21d).** Set first review gap to roughly 10-20% of the target
  retention horizon. Expanding > equal intervals for long-term retention.
  *Evidence: optimal spacing gap ≈ 10-20% of retention interval; expanding retrieval schedules aid long-term learning (Cepeda et al. 2008 meta-analysis; distributed practice d≈0.54, MDPI 2025 meta-analysis).*

- **R4. Give immediate correctness + rationale feedback on formative items; reserve "graded,
  delayed-feedback" mode only for the practice EXAM.** For learning, immediate feedback prevents
  misconception entrenchment; the exam simulates real recall conditions.
  *Evidence: immediate feedback reduces error persistence in formative contexts (Morris et al. 2021 systematic review — note: immediate-vs-delayed evidence is mixed, see flags).*

**Cadence summary for the template:** pre-reading diagnostic (chapter open) → inline retrieval
(each section end) → spaced flashcards (cross-session) → cumulative practice exam (chapter/unit end).

---

## LEVER 2 — Worked Examples + Faded Guidance  [HIGH PRIORITY]

**What the evidence says:** For novices, studying a fully worked solution beats unguided
problem-solving (the worked-example effect) because it cuts extraneous load. As expertise grows,
that same guidance becomes redundant and even harmful (expertise reversal) — so guidance must FADE.

- **W2-1. For each new technique, present a fully worked example FIRST, then a completion
  problem (solution with 1-2 key steps blanked), then an independent problem.** This is the
  canonical worked → completion → solo fading sequence; make it the default 3-step pattern
  for any derivation (e.g., deriving the KL-divergence gradient, computing a reward-model loss).
  *Evidence: worked-example effect + guidance-fading effect (Sweller & Cooper 1985; Renkl & Atkinson 2003 completion problems).*

- **W2-2. Pair every worked example with at least one "self-explanation" prompt at a key step
  ("why this step?").** Prompting learners to explain steps converts passive example-study into
  active processing and boosts transfer.
  *Evidence: self-explanation effect (Chi et al. 1989; Dunlosky 2013 — "moderate utility").*

- **W2-3. Let learners toggle guidance level ("Show full solution" / "Hint only" / "Hide").
  Default to MORE guidance early in a chapter, LESS in later sections and the exam.** This
  operationalizes expertise reversal: adapt scaffolding to growing competence.
  *Evidence: expertise reversal effect — detailed guidance helps novices, hinders experts (Kalyuga et al. 2003).*

- **W2-4. Use contrasting worked examples (correct vs. a plausible WRONG approach, side by side)
  for error-prone concepts** (e.g., forward vs. reverse KL; cosine vs. dot-product retrieval).
  *Evidence: contrasting cases / studying errors sharpens discrimination of deep structure (Bjork; VanLehn — moderate, see flags on incorrect-examples).*

---

## LEVER 3 — Constructive Alignment & Objective Transparency

**What the evidence says:** Learning improves when stated outcomes, the content, and the
assessment all target the same cognitive operations (Biggs' constructive alignment). Making
objectives visible lets self-learners self-regulate and self-assess coverage.

- **A3-1. Every chapter declares 3-6 measurable learning objectives using observable verbs
  (Bloom's: "compute," "compare," "critique" — not "understand").** Render them as a checklist
  at chapter top; let the reader tick them off.
  *Evidence: measurable, aligned outcomes drive deeper approaches (Biggs 1996; Anderson & Krathwohl 2001 revised Bloom's).*

- **A3-2. Tag every practice/exam question with the objective ID it assesses, and the question's
  verb must MATCH the objective's verb.** If the objective says "derive," the item must require
  derivation, not recognition. Surface an objective→question coverage map to the learner.
  *Evidence: constructive alignment — assessment must operate at the same Bloom's level as the outcome (Biggs & Tang).*

- **A3-3. Balance question Bloom's levels per chapter to ~40% apply / 30% analyze-evaluate /
  30% recall, NOT recall-heavy.** Interview-prep audiences need application and judgment, not
  definition recall. Track the live distribution in the authoring tool.
  *Evidence: alignment studies show assessments routinely under-sample higher-order levels (Jideani & Jideani 2012, revised-Bloom alignment audit).*

- **A3-4. Coverage rule of thumb: ≥2-3 distinct questions per objective (one apply + one
  analyze/transfer minimum), more for objectives flagged high-difficulty.** A single item per
  objective gives no reliability and lets a lucky guess mask a gap.
  *Evidence: single items are unreliable measures; multiple items needed for objective-level inference (classical test theory; practice-exam design norms, e.g. ~25 items spanning all objectives, arXiv 2505.13381).*

---

## LEVER 4 — Elaboration & Transfer

**What the evidence says:** Asking "why/how" and connecting new ideas to prior knowledge
(elaborative interrogation, self-explanation, contrasting cases) builds transferable understanding
and judgment rather than rote recall. Moderate but reliable effects.

- **E4-1. After each major concept, add one elaborative-interrogation prompt ("Why does this
  hold? Why this and not the alternative?").** Forces integration with prior knowledge.
  *Evidence: elaborative interrogation effect — generating "why" explanations aids retention (Dunlosky 2013 — moderate utility).*

- **E4-2. Include a recurring "Where experts disagree / it depends" margin block** for genuinely
  contested design choices (e.g., RAG chunking strategy, on-policy vs. off-policy reward modeling,
  KG schema rigidity). Frame trade-offs, not a single right answer.
  *Evidence: building discriminative judgment via contrasting cases > teaching a single canonical answer (Schwartz & Bransford 1998 "time for telling"; transfer literature). [judgment-building rationale; treat the specific block as design, not a proven UI component]*

- **E4-3. Write at least one "transfer" question per chapter applying the concept to an UNSEEN
  context** (e.g., "apply this regularizer idea to a different loss"), not the chapter's own example.
  *Evidence: near/far transfer requires practice on novel surface features (transfer-appropriate processing, Morris et al. 1977).*

---

## LEVER 5 — Cognitive Load, Progressive Disclosure & Scannability

**What the evidence says:** Working memory is narrow; instruction should minimize extraneous load
via segmenting (chunking), signaling (cueing what matters), and removing redundancy. Progressive
disclosure (hide detail until needed) is the UX expression of this.

- **C5-1. Solutions, long derivations, and proofs are COLLAPSED BY DEFAULT (expandable).**
  Keeps the main flow scannable and prevents the answer being visible during retrieval (protects Lever 1).
  *Evidence: segmenting principle + avoiding redundancy reduces extraneous load (Mayer 2009; Sweller CLT).*

- **C5-2. Segment chapters into short sections (one objective ≈ one section) with a visible
  section-level progress indicator.** Chunking + signaling supports limited working memory and
  self-paced learners.
  *Evidence: segmenting & signaling principles (Mayer's multimedia principles).*

- **C5-3. Use margin notes / sidenotes for definitions, intuition, and "gotchas" — supplementary,
  not load-bearing — so the main column stays a clean linear path.** Glossary terms link to
  sidenote definitions on hover/tap rather than interrupting prose.
  *Evidence: split-attention / signaling — keep essential and supplementary info spatially distinct without forcing integration (Sweller; Mayer contiguity).*

- **C5-4. Show math/code progressively: high-level statement first, "expand for full derivation/
  full code" second.** Lets experts skim and novices drill in — also a soft expertise-reversal hedge.
  *Evidence: progressive disclosure manages intrinsic load by sequencing (CLT; consistent with W2-3).*

---

## ASSESSMENT / QUESTION DESIGN (cross-cutting spec)

**What makes a good APPLIED-CONCEPT question (vs. a recall item):**

- **Q1. An applied item gives a NOVEL scenario/data/code and asks the learner to DO something
  (compute, choose, debug, critique), not restate a definition.** Bad: "What is KL divergence?"
  Good: "Given these two predicted distributions, which incurs higher reverse-KL penalty, and why?"
  *Evidence: assessment must hit application/analysis Bloom's levels to measure transfer (revised Bloom's; constructive alignment).*

- **Q2. Calibrate difficulty deliberately and label it (intro / core / stretch). Aim for items
  that are effortful but answerable from chapter content — "desirable difficulty."** Avoid both
  trivial recognition and unfair gotchas. For a spaced deck, target ~70-85% success to keep items
  in the productive-struggle zone.
  *Evidence: desirable difficulties — productive struggle aids long-term learning (Bjork 1994).*

- **Q3. Every question ships with a MODEL ANSWER + RATIONALE that (a) states the answer, (b) shows
  the reasoning/derivation, (c) names the common wrong answer and why it's wrong.** The distractor
  explanation is where the learning happens.
  *Evidence: feedback with explanation > correctness-only; addressing misconceptions (Hattie & Timperley 2007; self-explanation).*

- **Q4. ORIGINALITY rule (hard constraint): write items from the concept, never from any course's
  quiz. Author from the learning objective + a fresh scenario.** Vary surface features
  (different datasets, different domains) to force transfer and guarantee non-duplication.
  *Evidence: transfer requires varied surface contexts; also satisfies the no-copying constraint.*

- **Q5. Coverage: ≥2-3 items per objective (Lever A3-4); the cumulative practice exam samples
  ACROSS chapters (interleaved), not blocked by chapter.** Interleaving improves discrimination
  between related techniques.
  *Evidence: interleaved practice "moderate utility" and aids discrimination (Dunlosky 2013; Rohrer & Taylor 2007).*

---

## FLAGGED: practices that sound good but have WEAK / CONTESTED evidence

- **Learning styles (visual/auditory/kinesthetic matching): DEBUNKED. Do NOT build modality
  toggles claiming pedagogical benefit.** 15+ years of research find no learning gain from
  matching instruction to "style." *(Pashler et al. 2008; Dunlosky 2013.)* (Format choice for
  accessibility/preference is fine — just don't claim it improves learning.)

- **Summarization, highlighting, re-reading: LOW utility per Dunlosky 2013.** Don't center the
  UX on highlight tools or "review by re-reading" as a primary strategy; they feel productive but
  underperform retrieval/spacing.

- **Immediate-vs-delayed feedback: MIXED evidence.** The R4 "immediate for formative" rule is a
  reasonable default but the literature is genuinely unsettled (Morris et al. 2021). Don't over-engineer
  feedback-timing logic on the assumption it's settled.

- **Studying INCORRECT/erroneous worked examples: PROMISING BUT CONDITIONAL.** Helps only when
  learners have enough prior knowledge and the error is clearly flagged + explained; can backfire
  for true novices. Use contrasting correct/incorrect (W2-4) sparingly and only with explanation.

- **Expanding vs. equal spacing intervals: REAL but modest difference.** Expanding is a fine
  default (R3), but don't treat the exact schedule as critical — the big win is spacing at all
  vs. massing. *(Cepeda et al. 2008; Karpicke & Roediger.)*

- **"Where experts disagree" block (E4-2): pedagogically motivated, not a validated UI pattern.**
  The underlying transfer/judgment science is sound; the specific component is a design bet, so
  pilot it rather than mandating it.

---

## Implementation mapping (rule → scaffold mechanism → guide_qa check)

Maps each authoring rule to a book-scaffold-astro v4.25 mechanism and a checkable gate. "✅ ships
today" = available now; "⏳ Phase 3" = enhancement-backlog contribution (guides launch without it).

| Rule | Scaffold mechanism (v4.25) | Status | `guide_qa.yaml` check |
|---|---|---|---|
| R1 pre-reading diagnostic | `<Diagnostic>` (collapsible DIKTA) | ✅ ships today | ≥1 Diagnostic per chapter |
| R2 end-of-section recall | `<Rationale>` / inline collapsed Q | ✅ ships today | ≥2 recall prompts per chapter |
| R3 spaced flashcard deck | `/flashcards` (glossary) → SM-2 scheduler | ⏳ Phase 3 (scheduler) | flashcards route enabled |
| R4 formative feedback | `<Rationale>` immediate; exam delayed | ✅ ships today | every formative item has rationale |
| W2-1 worked→completion→solo | `<WorkedExample>` + `<Practice>` (manual fade) → `<FadedExample>` | ✅ manual today / ⏳ component | derivations use a fade sequence |
| W2-2 self-explanation prompt | prose prompt inside `<WorkedExample>` | ✅ ships today | each WorkedExample has a "why" prompt |
| W2-3 toggleable guidance | guidance levels in `<FadedExample>` | ⏳ Phase 3 | — |
| W2-4 contrasting correct/wrong | side-by-side `<WorkedExample>` + `<Pitfall>` | ✅ ships today | error-prone concepts have a contrast |
| A3-1 measurable objectives | `learning_outcomes` frontmatter (verb/id/text) | ✅ ships today | 3–6 LOs/chapter, observable verbs |
| A3-2 objective-tagged questions | question `objective_id` + `<ObjectiveMap>` | ✅ ships today | every question has objective_id; verb match |
| A3-3 Bloom mix ~40/30/30 | question `bloom_level` | ✅ tag today (report ⏳) | distribution within tolerance |
| A3-4 ≥2–3 items/objective | question bank | ✅ ships today | per-objective item count ≥2 |
| E4-1 elaborative interrogation | prose prompt / `<KeyIdea>` | ✅ ships today | ≥1 "why" prompt per major concept |
| E4-2 "experts disagree" block | `<Divergence>` / margin block (pilot) | ✅ ships today | optional |
| E4-3 transfer question | question on unseen context | ✅ ships today | ≥1 transfer item per chapter |
| C5-1 collapsed solutions | `<WorkedExample>`/`<Rationale>` collapse-by-default | ✅ ships today | solutions collapsed by default |
| C5-2 segmented sections | chapter structure + `<SectionMap>` | ✅ ships today | section length sane |
| C5-3 margin sidenotes | `<MarginNote>` / `<Sidenote>` / `<Term>` | ✅ ships today | glossary terms linked |
| C5-4 progressive math/code | `<details>` / collapse | ✅ ships today | long derivations behind expand |
| Q1–Q3 applied items + rationale | question schema (stem/answer/rationale) | ✅ ships today | rationale names common wrong answer |
| Q4 originality (no quiz copy) | authoring discipline | ✅ (manual gate) | **review check: no item traces to a course quiz** |
| Q5 interleaved cumulative exam | `/practice-exam` (cross-chapter sampling) | ✅ ships today | exam samples across chapters |

**Enhancement backlog (Phase 3 dogfooding → book-scaffold-astro):** spacing scheduler (R3),
`<FadedExample>` + `fadeSteps` (W2-1/W2-3, #118), `<LearningOutcomesMap>` + `deriveLOCoverage`
(A3-2), Bloom-distribution report (A3-3), progressive-disclosure polish (expand/collapse-all,
keyboard nav, hint→answer), and questions→flashcards (#145).

---

## SOURCES

- [Dunlosky et al. 2013 — Improving Students' Learning With Effective Learning Techniques](https://journals.sagepub.com/doi/abs/10.1177/1529100612453266) (the utility-rating backbone of this brief)
- [Distributed Practice meta-analysis, MDPI 2025 (d≈0.54)](https://www.mdpi.com/2076-328X/15/6/771)
- [Testing Effect meta-analysis — Schwieren et al. 2017](https://journals.sagepub.com/doi/10.1177/1475725717695149)
- [Spaced retrieval practice in STEM — Springer 2024](https://link.springer.com/article/10.1186/s40594-024-00468-5)
- [Worked-example effect — overview](https://en.wikipedia.org/wiki/Worked-example_effect)
- [Sweller — Guidance Fading Effect (PDF)](https://cogscisci.wordpress.com/wp-content/uploads/2019/08/sweller-guidance-fading.pdf)
- [Kalyuga et al. — Expertise Reversal Effect (PDF)](https://www.uky.edu/~gmswan3/EDC608/Kalyuga2007_Article_ExpertiseReversalEffectAndItsI.pdf)
- [Worked examples & transfer — Tandfonline 2023](https://www.tandfonline.com/doi/full/10.1080/01443410.2023.2273762)
- [Self-explanation / elaborative interrogation — Learning Scientists](https://www.learningscientists.org/blog/2020/2/20-1)
- [Constructive alignment — Biggs overview (UOW)](https://ltc.uow.edu.au/hub/article/constructive-alignment)
- [Revised Bloom's alignment audit — Jideani & Jideani 2012](https://ift.onlinelibrary.wiley.com/doi/10.1111/j.1541-4329.2012.00141.x)
- [Desirable difficulties / spacing interval ~10-20% — Bjork guide](https://www.structural-learning.com/post/robert-bjork-teachers-guide-desirable)
- [Retrieval + spacing + desirable difficulty — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4480221/)
- [Formative assessment & feedback systematic review — Morris et al. 2021](https://bera-journals.onlinelibrary.wiley.com/doi/10.1002/rev3.3292)
- [Practice-exam design (objective coverage, ~25 items) — arXiv 2505.13381](https://arxiv.org/pdf/2505.13381)
- [Learning styles debunked — VU Amsterdam](https://vu.nl/en/employee/didactics/learning-styles-debunked-what-does-work)
