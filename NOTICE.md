# Attribution Notice

This repository contains study notes synthesized from courses on
deeplearning.ai. Course content © DeepLearning.AI and the respective
instructors named below. Synthesis, margin notes, original practice
questions, glossary, and flashcards © Brandon Behring (CC-BY-NC-4.0 on
prose, MIT on code).

## Per-book attribution

| Book slug | Course title | Instructor(s) | Partner | Source URL |
|---|---|---|---|---|
| `evaluating-ai-agents` | Evaluating AI Agents | John Gilhuly & Aman Khan | Arize AI | https://www.deeplearning.ai/short-courses/evaluating-ai-agents/ |
| `finetuning-rl-intro` | Fine-tuning & RL for LLMs: Intro to Post-training | Sharon Zhou | AMD | https://www.deeplearning.ai/short-courses/fine-tuning-rl-for-llms-intro-to-post-training/ |
| `knowledge-graphs-rag` | Knowledge Graphs for RAG | Andreas Kollegger | Neo4j | https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/ |

Each row mirrors that book's frontmatter (`src/content/books/<slug>.mdx`).
`npm run lint:notice` — part of `npm run validate`, which runs before every
build — fails when a published book has no row here, or when a row disagrees
with the book's title, instructor, partner, or source URL.

## DLAI Community Code of Conduct compliance

Each book in this corpus follows the requirements in DLAI's
[Respecting Intellectual Property](https://community.deeplearning.ai/t/respecting-intellectual-property-how-to-share-deeplearning-ai-course-materials-responsibly/681787)
policy:

- **Non-commercial sharing only** — CC-BY-NC-4.0 prose, MIT code; no
  paywall, no ads, no commercial reuse.
- **DeepLearning.AI cited as source** — every chapter page carries a course
  credit (course title linked to its DeepLearning.AI page, instructors,
  partner), rendered from the book's frontmatter; each book's page and this
  table cite the course too.
- **Instructor named** on each book's page and in every chapter's course
  credit.
- **No quizzes, no graded-assignment statements, no lab solutions, no
  verbatim transcripts** — these are paraphrased synthesis notes only, and
  every practice question is original.

## Takedown / corrections

Email <brandon.m.behring@gmail.com> for any takedown request from DLAI,
the named instructor, or anyone else with a substantive concern. 48-hour
response window.

## Course-existence verification

Each book's `course_existence_verified` frontmatter date records when its
course page was last checked by hand (at least annually) to confirm the
course is still listed and its lesson structure has not substantively
changed. The corpus landing page and the book's page show a yellow
`⚠ stale` badge when that date is more than 365 days old.

## Other DLAI-derived public repos

Long-lived public repos of DLAI-derived study notes that informed this
corpus's compliance posture:

- [`mbadry1/DeepLearning.ai-Summary`](https://github.com/mbadry1/DeepLearning.ai-Summary)
- [`lijqhs/deeplearning-notes`](https://github.com/lijqhs/deeplearning-notes)
- [`ppant/deeplearning.ai-notes`](https://github.com/ppant/deeplearning.ai-notes) (75 MB rendered PDFs, 7 years live)
- [`ViiSkor/Anki-decks-deeplearning.ai`](https://github.com/ViiSkor/Anki-decks-deeplearning.ai) (5 `.apkg` decks, 7 years live)
- [`Anri-Lombard/DL-AI-Short-Courses-Notes`](https://github.com/Anri-Lombard/DL-AI-Short-Courses-Notes)
