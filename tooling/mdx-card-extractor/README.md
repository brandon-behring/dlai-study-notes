# mdx-card-extractor

Walk MDX chapters in `src/content/chapters/`, find `<AnkiCard>` components, emit one `.apkg` per book.

The Anki deck is a derived artifact of the book build — no separate authoring step. Each `<AnkiCard>` in the MDX serves double duty: rendered in the book as a study widget (with reader-toggleable visibility), extracted as an Anki card for spaced repetition.

## Status: SKELETON

- AST walk: working (uses `unified` + `remark-mdx` + `unist-util-visit`).
- Grouping by `book` frontmatter: working.
- Card data extraction: working (emits JSON representation).
- **`.apkg` emission: STUB** — currently writes JSON; needs implementation of the Anki binary format (sqlite + zip).

## Outstanding work for `.apkg` emission

The Anki `.apkg` format is a zip containing a sqlite database with specific schema (`anki21.deck`, `notes`, `cards`, etc.). Options for implementation:

1. **JS port of python-genanki** — direct sqlite + zip writes from Node. Fastest, no external deps.
2. **Python subprocess wrapper** around `python -m genanki` — straightforward but adds a Python dependency to the build.
3. **`anki-card-generator` npm package** — third-party; check if current and maintained.

For pilot: defer the `.apkg` emission and use the `<book>.cards.json` artifact for manual Anki import via Anki's "Import from JSON" extension. Once `.apkg` emission is implemented, the JSON intermediate disappears.

## `<AnkiCard>` component shape (expected MDX)

```mdx
<AnkiCard
  type="term"
  los="KGR-1.2"
  front="Self-attention"
  back="A mechanism where each token computes a weighted sum over all other tokens..."
/>
```

Where `type` is one of `term | keyconcept | problem | vignette | drill | interview | formula | comparison | redflag | actuarialbridge` (the existing card type set from `course_learning`).

## Usage

```bash
# Extract all books
npm run extract:cards

# Extract one book
npm run extract:cards -- --book=knowledge-graphs-rag

# Dry-run (report cards without emitting files)
npm run extract:cards -- --dry-run
```

## Future scaffold integration

Per the plan, this tool moves into `book-scaffold-astro` as `book-scaffold extract-cards` in v3.2 once the pilot validates the design.
