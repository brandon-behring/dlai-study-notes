# MCQ authoring guidelines

Rules for every multiple-choice question under `src/content/questions/**`. The
checkable ones are **enforced by `npm run lint:mcq`** (chained into `validate` →
prebuild, so a violation fails the build); the rest are review rules.

## Enforced (lint:mcq fails the build)

1. **Answer-position balance.** Across a book's MCQs the correct option must not
   cluster on one position. No position may hold more than ⌈N/2⌉ of the correct
   answers (checked once a book has ≥4 MCQs). Author the *content* first, then put
   the correct option wherever keeps the book balanced — the position must carry
   **no signal**. (We shipped 7/8 answers on option "a"; that's the bug this prevents.)
2. **Rationales reference distractors by content, not letter.** Write "the
   reward-clipping option", never "(b)". Letter references break the instant
   options are reordered or shuffled, and read as noise to a learner. (Lint flags
   `(a)`/`(b)`/… and "option b" patterns in an MCQ body.)
3. **Exactly one correct option; ≥3 options.** (Schema enforces single-correct; the
   lint checks option count.)

## Review rules (judgment — not lint-enforced)

4. **Every distractor is plausible.** A wrong option must be a real misconception a
   knowledgeable person could hold. No joke / filler / obviously-absurd options
   ("Give up", "Delete the model") — they give the answer away and waste the item.
5. **Parallel structure.** Options should match in length, grammar, and specificity.
   The correct option must **not** stand out by being the longest or most-qualified —
   that's the #1 test-taking tell. If the right answer needs caveats, add comparable
   detail to the distractors.
6. **One unambiguous answer.** No "all/none of the above", no double negatives, no
   options that overlap or could both be defended.
7. **Self-contained stem.** A reader should know what's being asked from the stem
   alone, before reading the options.

## Why this exists

Position clustering and length/structure tells let a test-savvy reader score well
*without knowing the material* — which defeats a practice exam. The lint makes the
two mechanical failures (position clustering, letter-referenced rationales)
impossible to ship; rules 4–7 are the review checklist for the rest.
