# MCQ authoring guidelines

Rules for every multiple-choice question under `src/content/questions/**`. The
checkable ones are **enforced by `npm run lint:mcq`** (chained into `validate` →
prebuild, so a violation fails the build); the rest are review rules. (Refined
after a cross-model review — Claude + GPT-5.5 — of the first MCQ set.)

## Enforced (lint:mcq fails the build)

1. **Answer-position balance.** Across a book's MCQs the correct option must not
   cluster on one position — no position may hold more than ⌈N/2⌉ of the correct
   answers (checked once a book has ≥4 MCQs). Author the *content* first, then put
   the correct option wherever keeps the book balanced; the position must carry
   **no signal**. (Aim tighter than the cap — roughly uniform — once N ≥ 8.)
2. **Rationales reference distractors by content, not letter.** Write "the
   reward-clipping option", never "(b)". Letter references break the instant
   options are reordered/shuffled and read as noise.
3. **Exactly one correct option; ≥3 options.** (Schema enforces single-correct.)
4. **No absolute-language tells in options.** No "always" / "never" / "cannot" /
   "all|none of the above" — a test-savvy reader eliminates such options without
   any domain knowledge. (Soft absolutes like "only"/"all"/"must" aren't linted but
   are discouraged under rule 6.)

## Review rules (judgment — not lint-enforced)

5. **Every distractor is a plausible misconception.** A wrong option must be
   something a knowledgeable person could believe — not joke/filler/absurd
   ("Give up"), and not trivially eliminable. Distractors should target *real*
   errors (e.g. "drop the KL term — a verifier reward can't be hacked").
6. **Parallel structure, no tells.** Options match in length, grammar, and
   specificity. The correct option must **not** be the longest or most-qualified
   (the #1 tell) — if it needs caveats, give the distractors comparable detail.
   Avoid soft absolutes ("only", "the one true way") that flag an option as wrong.
7. **Homogeneous options.** All options are the *same kind* of answer (all methods,
   or all hyperparameters, or all failure-causes) — never three mechanisms and one
   "give up". An odd-one-out is a give-away.
8. **One unambiguous answer.** Exactly one option is defensible. Watch synonymy
   traps (e.g. "offline" ≈ "off-policy") that make a distractor *also* arguably
   right, and superlatives in the stem ("most direct", "best") — verify no second
   option also satisfies them.
9. **Self-contained stem.** Answerable from the stem alone. Resource/feasibility
   stems must state the assumptions that make the answer unique (model size,
   precision, context length, batch size, offload/checkpointing) — otherwise a
   distractor may "also fit".
10. **Rationale addresses every distractor and doesn't overclaim.** Explain why the
    key is right *and* why each distractor is wrong, scoped to the stem — not as a
    universal truth (e.g. KL "constrains" collapse, it doesn't "prevent" it).
11. **Verify factual/numeric claims.** Memory figures, equations, and algorithm
    claims must be checked against a primary source; note the source in the rationale
    where non-obvious.

## Why this exists

Position clustering, length/structure tells, and absolute-language give-aways let a
test-savvy reader score well *without knowing the material* — which defeats a
practice exam. The lint makes the mechanical failures impossible to ship; rules 5–11
are the review checklist for the judgment calls.
