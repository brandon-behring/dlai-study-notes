# Context Engineering as book #4 — plan + status

> **Status (2026-10-29, end of Day 1).**
> - **dlai-study-notes:** PR #5 (per-chapter DLAI credit, `lint:notice` gate, docs truth pass,
>   `/print/` off; CI green) and PR #6 (proof-of-concept tooling removed; scaffold stays 4.26.0)
>   are open. Neither merges before the Day-2 codex audit and the owner's go.
> - **Scaffold v5 blocked:** every release ≥ 4.30.0 fails `validate` on valid TeX braces in
>   course-notes books (math gated on preset) → book-scaffold-astro#230 (fix scheduled for Day 2,
>   before the site port; publishing waits for the owner's go). Astro 7 / security advisories →
>   book-scaffold-astro#231.
> - **guides-dlai** branch `feat/dlai-context-engineering` (local, unpushed, 5 commits to `4ce1a99`):
>   37 transcripts (authenticated extraction), canon + verified inventories, `writer_selfcheck.py`
>   (+14 tests), 8 chapters + glossary (77) + appendices A/B/D + interview map written by a
>   9-agent Workflow, integrated and spot-read (Ch8). `make digital` exit 0, 0 undefined, 177 pages;
>   226 cards; Gold G1–G4, G6 PASS. Registered in `guides.yml` as guide #57.
> - **Day 2 agenda:** (1) codex audits — Gold chapters vs transcripts (one `/ask-codex` per chapter),
>   `/adversarial-review` of PR #5 and PR #6; re-verify every finding, then fix. (2) Scaffold #230
>   fix + tests (publish on go). (3) Epilogue (G7) + `gold_audit_<date>.md` (G5) + appendix E;
>   ledger blocks; `audit_gold.py --report`. (4) Push + guides-dlai PR (merge-commit convention).
> - **Owner actions pending:** Cloudflare Web Analytics toggle; decide on Discussions (CONTRIBUTING
>   invites them, the repo has them off).

## Context

The user asked for the project's state and what to do next, and named DeepLearning.AI's "Context
Engineering" course as a candidate. The launch is finished: 3 books are live and every PR is merged.
The project memory still describes the launch as "in progress", so it is stale.

This plan does three things:
1. It cleans up what the launch left behind.
2. It upgrades the scaffold to v5 without changing any URL.
3. It adds the course as book #4, by the established route: a Gold LaTeX guide in `guides-dlai`
   first, then a port to the site.

## Decisions (user, two rounds)

- **Pipeline:** Gold LaTeX guide first, then the site book.
- **Scaffold:** upgrade to `^5.2.0` without corpus mode, keeping every URL.
- **Cleanup:** all four items:
  - sync `main` and prune merged branches;
  - refresh README and NOTICE;
  - turn on Web Analytics;
  - remove the proof-of-concept tooling.
- **Authoring:** follow the documented agent practice, checked for fit (see the next section).
  - Gold chapters: 9 parallel writers, run with the **Workflow tool** (the user opted in).
  - Site chapters: I write chapter 1 inline as the template of record, the user reviews it, then
    parallel writers do the rest.
- **Codex** is paused today. Tomorrow it audits three things:
  - the Gold guide against the transcripts;
  - the scaffold-v5 PR;
  - the cleanup PR.

## Verified state (2026-10-29)

**Live site.**
- 3 books: `finetuning-rl-intro` (6 chapters), `evaluating-ai-agents` (5), `knowledge-graphs-rag` (7).
- Each book has 4 apparatus routes. Chapter URLs have the form `/<book>/<slug>/`.
- The last deploy was 07-14 and succeeded.

**Git.**
- Local `main` is `4acd282`. That is 4 commits behind `origin/main` (`f13c1c6`).
- Three branches were squash-merged, so `merge-base --is-ancestor` cannot show they are merged. Use
  the PR state instead:

  | Branch | Merged as |
  |---|---|
  | `feat/v4.25-pedagogy-rebuild` | PR #2 |
  | `feat/migrate-to-actions` | PR #3 |
  | `agent/83-provenance-dlai` | PR #4 |

**Scaffold.**
- The lockfile pins 4.26.0. npm's `latest` is 5.2.0.
- Per `package/MIGRATION-v4-to-v5.md`, an app that does not use corpus mode keeps its routes.
- v5 makes two required changes. This repo already meets both: the preset is explicit, and there is
  no `deploy` key.
- Corpus mode would move chapters to `/chapters/<book>/<slug>/`, so it is not adopted.

**Gaps.**
- No Web Analytics beacon is served. The CSP in `public/_headers` already allows it.
- `README.md` describes the proof-of-concept: Pages, scaffold v3.x, and a tex→MDX converter.
- A comment in `astro-build.yml` says Workers Builds deploys the site. That has been wrong since
  PR #3 moved deployment to `deploy.yml`.
- The per-book table in `NOTICE.md` is empty.
- The proof-of-concept tooling sits outside build, validate and CI:
  - the directories `tooling/{tex-to-mdx,inject-cards,mdx-card-extractor}`;
  - their `workspaces` entries;
  - three scripts.

**Course: "Context Engineering"** (DLAI × Chroma).
- Taught by Jeff Huber, with Drew Breunig as guest speaker. The course page says it was updated
  Oct 28, 2026.
- 4 modules: Intro, Agentic Search, Context Management, Agentic Memory.
- 37 videos (about 3h15m) and 10 one-hour labs.
- 6 graded assignments are Pro-gated. These are never reproduced, and neither are lab solutions or
  transcripts verbatim (NOTICE.md).

## Agent practice (researched, then checked for fit)

**Sources.**
- `lever_of_archimedes/.claude/rules/operating-discipline.md`
- `docs/routing-quickref.md` (Tables 1, 2 and 5)
- `skills/parallel-authors/SKILL.md`
- `research-dossiers/research_agent_multi_agent/synthesis.md`
- the guides-dlai runbook and handoff, sections 2A–3

**Rules applied.**
- The main session is the only writer of source and the only integrator.
- Chapter prose is drafted by parallel writers on the `opus` tier, under the parallel-authors
  contract:
  - one canon file holds the shared facts;
  - each writer gets a packet and a must-not-read list;
  - each writer owns exactly one file;
  - each writer returns a self-report with its gate output pasted in.
- Deterministic gates decide numeric questions. Truth-deciding audits run on `opus` or above.
- A model from another family (codex) acts as adversary.
- Every agent finding is re-verified against the primary source before any edit.
- Models are named by role alias. Effort stays at the default and moves only on evidence.

**Fit check.** The test is the parallelizability rule in `syn_multi_agent_06`. Fan-out pays when the
parts are independent. It fails when the parts share context, because parallel writers then make
conflicting implicit choices (`claim_0202`, `claim_0203`, `claim_0205`). It also costs about 15× the
tokens of a chat (`claim_0201`).
- **Gold chapters pass the test.** Each writer reads a separate set of lessons. Fixing the shared
  vocabulary in the canon before fan-out removes the remaining shared dependency. About 20 fleet
  guides were made this way.
- **Site chapters are borderline.** They share apparatus: glossary-term ownership, question IDs, and
  MCQ rules. So chapter 1 is written inline first and freezes the book canon; fan-out comes after.
- **Limits.** This session's workflow guideline is under 10 agents per workflow. Each fan-out stays
  at 9 or fewer, and the spot-read agent runs separately. Writers own disjoint files, so no
  worktrees are needed.

## Day 1 (today)

### Phase 0: hygiene (dlai-study-notes)

1. **Sync and prune.**
   - Run `git switch main && git pull --ff-only`.
   - Confirm each PR's state with `gh pr view 2`, `gh pr view 3` and `gh pr view 4`
     (`--json state`).
   - Delete the three local branches with `git branch -D`. `-D` is needed because they were
     squash-merged.
   - Delete the same three branches on the remote with `git push origin --delete` (user-approved).
   - Run `git fetch --prune`.
2. **PR A** (`chore/docs-notice-gate`), for docs and the attribution gate.
   - Rewrite the tech stack and architecture in `README.md`.
   - Check every feature claim against the code and fix or drop the false ones. Claims to check:
     `.apkg` downloads, Paged.js PDF output, and the stale badge with its annual-sweep script.
   - Fix the stale comment in `astro-build.yml`.
   - Fill the per-book table in `NOTICE.md` from the frontmatter in `src/content/books/*.mdx`.
   - Add `tooling/lint-notice/`, mirroring the structure of `tooling/lint-mcq/`, and wire it into
     `npm run validate`. It fails when a book has no matching NOTICE row, so book #4 cannot ship
     unattributed.
   - Add the durable copy of this plan at `docs/plans/active/2026-10-29-context-engineering-book.md`.
3. **Web Analytics.**
   - I read the current Cloudflare docs and then give exact steps.
   - The user enables automatic (edge-injected) Web Analytics for
     `study-notes.brandon-behring.dev` in the dashboard.
   - I verify the beacon is in the served HTML and that the browser console shows no CSP errors.
4. **Memory.** Rewrite `memory/dlai-guide-rebuild-state.md` to the shipped state. It should point at
   the durable plan and drop the dead plan-file pointer.

### Phase 1: PR B (`chore/scaffold-v5`): scaffold v5 and proof-of-concept removal

All lockfile changes go in this one PR, so it cannot conflict with PR A.
- **Baseline first.** Save the sorted `<loc>` list from `dist/sitemap-0.xml` to the scratchpad
  (`urls-before`).
- **Remove the proof-of-concept tooling.** Delete the three directories, their `workspaces` entries,
  and the scripts `convert:tex`, `inject:cards` and `extract:cards`.
- **Upgrade.** Set `^4.26.0` → `^5.2.0`, then run
  `rm -rf node_modules package-lock.json && npm install`. Keep these unchanged:
  - `src/pages/[book]/*`;
  - the hand-rolled `content.config.ts`;
  - the nav fields in `astro.config.mjs`.
- **Headers check.** Diff `dist/_headers` against `public/_headers`. The scaffold's v4.27
  "deploy-safe default headers" must not override the site's CSP.
- **Merges.** Open PR A and PR B today. Merge both only after tomorrow's codex audit and the user's
  go.

### Phase 2a: Gold guide #57 draft

Location: guides-dlai, branch `feat/dlai-context-engineering`, guide `agents/dlai_context_engineering`,
prefix `CE`.

**Before starting.** Run `git pull --ff-only` on `main`, then branch. Do not touch the two unrelated
dirty files:
- `foundations/.../.claude/settings.json`;
- the untracked `synthesis_export.jsonl`.

1. **Extract** the course text with the Playwright MCP browser, using the handoff §2A recipe:
   - read the `__NEXT_DATA__` captions;
   - batch-fetch through `/_next/data/<buildId>/…`;
   - parse the saved file with `json.loads` twice.

   Write the results to `source/chapters/Lesson_*.md`. Take `course_released` from the JSON-LD
   `datePublished`. **Dependency:** if this Linux browser profile is not logged into DLAI, the user
   logs in once. I never type credentials.
2. **Canon** in `review/canon.md`. It fixes:
   - the chapter map (about 7 chapters of roughly half a module each, decided from the transcripts);
   - the learning-outcome ID scheme `CE-c.n`;
   - which chapter owns each term, plus the shared definitions: context rot, pruning, compaction,
     scratchpads, harness, agentic search, tool registry, memory read/write;
   - cross-reference targets: `dlai_agent_memory`, `dlai_longterm_memory_langgraph`,
     `dlai_advanced_retrieval_chroma`, `dlai_claude_code_assistant`, `dlai_mcp_anthropic`;
   - banned content;
   - the no-list rule.
3. **Scaffold** the guide with `scripts/scaffold_dlai_guide.py`, adding a GUIDES block. Confirm the
   empty skeleton builds.
4. **Workflow fan-out.** Load the `workflow-authoring` skill first. Then run one workflow of 9
   `opus` writers, each given the canon, a packet and a must-not-read list:
   - 7 writers, one per `chNN.tex`;
   - 1 for `glossary-local` plus appendices A, B, D and E;
   - 1 for `source_manifest`, `gold_audit` and `interview_connections`.

   Each writer returns a structured self-report.
5. **Integrate** in the main session:
   - `finalize_dlai_guide.sh` and `fix_chapter_xrefs.py`;
   - `make digital`, `make cards`, `make qa-health`;
   - `audit_gold.py --guide`;
   - `audit_transcript_grounding.py` (adjudicate every flag);
   - `audit_card_presentation`.
6. **Spot-read.** One independent `opus` agent, outside the workflow, checks one chapter's grounding
   against its transcript.

## Day 2 (tomorrow): codex audits, then Gold

1. **Codex audit of the guide** with `/ask-codex`, one call per chapter. Stage the chapter and its
   lesson transcripts with `--path`. Codex checks claims and numbers against the transcripts.
2. **Codex review of PR A and PR B** with `/adversarial-review`, one run per PR.
3. **Re-verify, then fix.** Clean-room re-verify every finding against the primary source before
   editing. With the user's go, merge PR A, then PR B, then check the live site.
4. **Epilogue.** Write the cited Epilogue: what changed since release, and contested views. Take
   leads from the local dossiers, then re-verify every citation against its primary source:
   - `research_agent_context_rot`
   - `research_agent_context_assembly`
   - `research_agent_memory`
   - `research_agent_multi_agent`
   - `research_agent_sub_agents`
   - the hub's `docs/pdf/context_engineering/`
5. **Register and finish.** Add the guide to `guides.yml` and append its ledger blocks. Then run:
   - `audit_gold.py --report` (expect 57 Gold);
   - `audit_epilogue.py`;
   - `make inventory && make study-order`.

   Open the guides-dlai PR (merge-commit convention).

## Day 3+: book #4 `context-engineering` (dlai-study-notes, branch `feat/context-engineering`)

1. **Write the book's skeleton and chapter 1 inline:**
   - `src/content/books/context-engineering.mdx`: instructor, partner, `source_url`, examDomains and
     their labels;
   - chapter 1 with its glossary and question files;
   - the NOTICE row;
   - the examDomains union in `astro.config.mjs`;
   - the `citations.bib` keys;
   - the book canon: which chapter owns each term, LO and question IDs, and cross-link targets.

   Follow `PEDAGOGY.md`, `MCQ-GUIDELINES.md` and `COMPONENTS.md`. Use `evaluating-ai-agents` as the
   template of record. Every learning outcome gets at least 2 questions, and all questions are
   original.
2. **Pause** for the user to review chapter 1.
3. **Fan out the remaining 6 chapters.** Each writer owns one chapter file, its own
   `q<N>-*.mdx` files and the glossary files its canon assigns. Use the Workflow tool, with the
   user's go confirmed again at that point; the earlier opt-in covered the LaTeX stage.
4. **Integrate and review.**
   - Run validate, the lints, build and the responsive tests.
   - Run a skeptic panel: 2 `opus` agents plus 2 `sonnet` agents.
   - Run a codex audit.
   - Re-verify every finding, then fix.
   - Open the PR. On the user's go, merge; Actions deploys. Verify the live site.

## Verification

**Phase 0.**
- `npm run validate` passes.
- It also fails when one NOTICE row is deliberately removed, which proves the gate works.
- `npm run build` passes.
- Each deleted branch shows MERGED in `gh pr list --state merged`.
- The beacon appears in `curl -sL https://study-notes.brandon-behring.dev/`.

**Phase 1.**
- `npm run validate` and `npm run build` pass.
- `diff urls-before urls-after` is empty.
- The `_headers` diff has been reviewed.
- `npm run test:responsive` passes (the last baseline was 184 passed / 6 skipped / 0 failed).
- PR CI `astro-build` is green.

**Phase 2.**
- `make -C agents/dlai_context_engineering/guide digital` reports 0 undefined references.
- `audit_gold.py --report` shows 57 Gold and 0 fail.
- `audit_epilogue.py` passes.
- Every grounding flag has been adjudicated.

**Phase 3.**
- `npm run validate` passes, including `lint:mcq`, `lint:components` and `lint-notice`.
- `npm run build` and `npm run test:responsive` pass.
- The new chapters and all 4 apparatus routes return 200 in production.
