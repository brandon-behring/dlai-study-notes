# Consumer-component correctness standard

Rules for consumer MDX components in `src/components/mdx/` so the dark-mode /
footgun bug class **cannot recur**. Enforced where noted; the rest are review
gates. (Origin: a design-review pass found 5 callouts + the old `Sidenote` pinned
to light hex in dark mode — unreadable — because each referenced an undefined CSS
custom property whose hardcoded fallback then won in every theme.)

## The rules

1. **Color only via scaffold dark-aware tokens.** Use `--color-*`, `--callout-*`,
   `--warm-*`, `--diagram-*` (all flip with `[data-theme]`). **Never** write
   `var(--some-undefined-token, #lighthex)` — if the token isn't defined, the
   hardcoded color wins in *every* theme and dark mode breaks. If you need a token
   that doesn't exist, define it in `src/styles/consumer-overrides.css` mapped to a
   `--warm-*`/`--callout-*` token (with dark-mode brightening for accent *text*).
   **Enforced:** `npm run lint:components` (chained into `npm run validate` →
   prebuild) fails the build on any `var(--undefined, <color>)`.

2. **Categorical props are closed enums, fail-loud.** A prop with a fixed set of
   values must `throw` at build on an out-of-range value (see `Aside.astro`, modeled
   on the scaffold's `assertEnumProp` / `EvidenceTag`). Never silently render a raw
   string or a blank label.

3. **No collisions with scaffold-reserved classes.** Don't reuse class names that
   carry global scaffold behavior — e.g. `.sidenote` (numbered-margin counter →
   stray "0."), `.callout`. Give a consumer component its own class (`.aside`, …).

4. **Honest names.** Name a component for what it *renders*, per the scaffold's
   `MarginNote` (inline) vs `Sidenote` (gutter float) distinction. An inline labeled
   callout is an `<Aside>`, not a `<Sidenote>`.

5. **Accent text needs dark-mode brightening.** A saturated accent (`--warm-*`) used
   for *text* on a dark surface often fails WCAG AA. Brighten it in the dark scope
   with `color-mix(in srgb, var(--warm-*) ~60%, white)` — mirroring how `tokens.css`
   brightens headings/links. (Borders/bars don't need this; they carry no text.)

## Why it's a standard, not a one-off fix

The bug recurred across 6 components because nothing *prevented* it. Rule 1's lint
turns the footgun into a build failure, so a new component can't reintroduce it.
Candidate to upstream into `book-scaffold validate` (DOGFOOD).
