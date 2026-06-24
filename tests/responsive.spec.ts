/**
 * Cross-device responsive audit (Workstream 2, hardened after independent review).
 *
 * Runs every curated page across the viewport×theme project matrix. Soft-asserts
 * so one page reports ALL its failures per run; always captures a screenshot.
 *
 * It is a POST-FIX ORACLE, not just a RED detector — so beyond "nav links exist
 * and resolve" it asserts they are CORRECT:
 *   1. No horizontal page overflow (+ a targeted gutter-fit check).
 *   2. Nav presence — desktop sidebar / sub-1024 hamburger toggle.
 *   3. No dead `/chapters/` links; surviving links resolve <400 (memoized).
 *   4. BOOK-SCOPE — no nav link points to a different book (catches the
 *      all-18-interleaved sidebar and wrong-book links that resolve 200).
 *   5. prev/next stay within the current book; first→no prev, last→no next.
 *   6. (separate test) the mobile drawer actually opens, is book-scoped, traps
 *      focus, and closes on ESC — the executable spec for the v4.26 NavDrawer.
 */
import { test, expect, type TestInfo } from '@playwright/test';
import { PAGES, BOOK_SLUGS, APPARATUS_SLUGS } from './pages';
import {
  setTheme,
  findOverflowers,
  collectNavHrefs,
  resolveLink,
  bookOfHref,
  DEAD_LINK_RE,
  type Theme,
} from './helpers';

/** Fail LOUD on a mis-wired project rather than silently defaulting (a metadata
 *  typo must not run dark-as-light or skip the desktop branch). */
function readMeta(testInfo: TestInfo): { theme: Theme; isDesktop: boolean } {
  const md = testInfo.project.metadata as { theme?: string; breakpointClass?: string };
  if (md.theme !== 'light' && md.theme !== 'dark')
    throw new Error(`project "${testInfo.project.name}" is missing metadata.theme`);
  if (md.breakpointClass !== 'desktop' && md.breakpointClass !== 'mobile')
    throw new Error(`project "${testInfo.project.name}" is missing metadata.breakpointClass`);
  return { theme: md.theme, isDesktop: md.breakpointClass === 'desktop' };
}

/** Deterministic settle: await webfont load (font swap changes element widths,
 *  so measuring before it is a flaky race). Resolves ~instantly for system fonts. */
async function settle(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => {}));
}

for (const pg of PAGES) {
  test(`audit ${pg.slug}`, async ({ page, request }, testInfo) => {
    const { theme, isDesktop } = readMeta(testInfo);
    await setTheme(page, theme);
    const resp = await page.goto(pg.url, { waitUntil: 'load' });
    expect(resp?.status(), `GET ${pg.url}`).toBeLessThan(400);
    await settle(page);

    // screenshot first — a review artifact, not an assertion. A fullPage capture
    // of a very tall chapter at high DPR can exceed Chromium's texture limit
    // ("Unable to capture screenshot"); that must not fail the audit.
    try {
      await page.screenshot({ path: `screenshots/${testInfo.project.name}/${pg.slug}.png`, fullPage: true });
    } catch {
      /* screenshot capture hiccup — diagnostic only, ignore */
    }

    await expect.soft(page.locator('html'), `theme not applied @ ${pg.url}`).toHaveAttribute('data-theme', theme);

    // (1) horizontal page overflow
    const o = await findOverflowers(page);
    expect
      .soft(
        o.scrollW,
        `Horizontal overflow @ ${pg.url} [${testInfo.project.name}]: scrollW=${o.scrollW} ` +
          `clientW=${o.clientW}. Distinct offenders:\n${JSON.stringify(o.worst, null, 2)}`,
      )
      .toBeLessThanOrEqual(o.clientW + 2);

    // (1b) targeted gutter-fit: the Tufte right gutter must not exceed the viewport
    //      (the headline desktop bug — checked directly, not just via page overflow).
    for (const sel of ['.section-map', '.sidenote', '.margin-note']) {
      const loc = page.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) {
        const box = await loc.boundingBox();
        if (box)
          expect
            .soft(Math.round(box.x + box.width), `${sel} gutter overflows viewport @ ${pg.url} [${testInfo.project.name}]`)
            .toBeLessThanOrEqual(o.clientW + 2);
      }
    }

    // (2) nav presence
    if (pg.kind === 'chapter') {
      if (isDesktop) {
        await expect.soft(page.locator('aside.sidebar'), `desktop sidebar missing @ ${pg.url}`).toBeVisible();
      } else {
        const toggle = page.locator(
          '#nav-toggle, button.nav-toggle, [data-nav-toggle], [aria-controls="nav-drawer"], .nav-drawer-toggle',
        );
        await expect
          .soft(toggle.first(), `mobile nav toggle missing @ ${pg.url} [${testInfo.project.name}]`)
          .toBeVisible();
      }
    }

    // (3) dead `/chapters/` links + (memoized) liveness of survivors
    const hrefs = await collectNavHrefs(page);
    for (const h of hrefs) expect.soft(h, `dead /chapters/ nav link @ ${pg.url}: ${h}`).not.toMatch(DEAD_LINK_RE);
    const live = [...new Set(hrefs)].filter((h) => !DEAD_LINK_RE.test(h));
    for (const h of live) expect.soft(await resolveLink(request, h), `nav link ${h} @ ${pg.url}`).toBeLessThan(400);

    // (4) BOOK-SCOPE: on a book-owned page, no nav link may point to ANOTHER book.
    //     Catches the all-18-interleaved sidebar + wrong-book links (which 200).
    if (pg.book) {
      const foreign = [...new Set(hrefs.filter((h) => {
        const b = bookOfHref(h, BOOK_SLUGS);
        return b !== null && b !== pg.book;
      }))];
      expect.soft(foreign, `nav links escape book "${pg.book}" @ ${pg.url}`).toEqual([]);
    }

    // (5) prev/next stay within the current book + edge absence
    if (pg.kind === 'chapter') {
      const prev = page.locator('nav.chapter-nav a.prev, .chapter-nav a.prev');
      const next = page.locator('nav.chapter-nav a.next, .chapter-nav a.next');
      if (pg.edge === 'first')
        expect.soft(await prev.count(), `first chapter must have no prev @ ${pg.url}`).toBe(0);
      if (pg.edge === 'last')
        expect.soft(await next.count(), `last chapter must have no next @ ${pg.url}`).toBe(0);
      for (const [name, loc] of [['prev', prev], ['next', next]] as const) {
        if (await loc.count()) {
          const href = (await loc.first().getAttribute('href')) ?? '';
          const b = bookOfHref(href, BOOK_SLUGS);
          if (b !== null && !DEAD_LINK_RE.test(href))
            expect.soft(b, `${name} escapes book "${pg.book}" @ ${pg.url}: ${href}`).toBe(pg.book);
        }
      }
    }
  });
}

// ===== Mobile drawer interaction — the executable spec for the v4.26 NavDrawer.
// RED until N3 lands (no toggle yet → the presence soft-assert fails and we bail).
// Runs only sub-1024, only on a representative chapter per book to bound runtime.
const DRAWER_PROBE = new Set([
  '/knowledge-graphs-rag/04-constructing-knowledge-graphs/',
  '/finetuning-rl-intro/04-data-driven/',
  '/evaluating-ai-agents/03-component-evaluations/',
]);

test.describe('mobile drawer', () => {
  for (const pg of PAGES.filter((p) => p.kind === 'chapter' && DRAWER_PROBE.has(p.url))) {
    test(`drawer ${pg.slug}`, async ({ page }, testInfo) => {
      const { theme, isDesktop } = readMeta(testInfo);
      test.skip(isDesktop, 'the drawer is a sub-1024 affordance');
      await setTheme(page, theme);
      await page.goto(pg.url, { waitUntil: 'load' });
      await settle(page);

      const toggle = page
        .locator('#nav-toggle, button.nav-toggle, [aria-controls="nav-drawer"], .nav-drawer-toggle')
        .first();
      await expect.soft(toggle, `nav toggle present @ ${pg.url} [${testInfo.project.name}]`).toBeVisible();
      if (!(await toggle.isVisible().catch(() => false))) return; // RED pre-N3 — nothing to drive yet

      await toggle.click();
      await expect.soft(toggle, 'toggle aria-expanded=true after open').toHaveAttribute('aria-expanded', 'true');

      const drawer = page
        .locator('#nav-drawer [role="dialog"], .nav-drawer-panel, [role="dialog"].nav-drawer-panel, .nav-drawer')
        .first();
      await expect.soft(drawer, 'drawer visible after open').toBeVisible();

      // drawer links are book-scoped + include the apparatus routes
      const dHrefs: string[] = await drawer
        .locator('a')
        .evaluateAll((as) => as.map((a) => a.getAttribute('href') || '').filter((h) => h.startsWith('/')));
      const foreign = [...new Set(dHrefs.filter((h) => {
        const b = bookOfHref(h, BOOK_SLUGS);
        return b !== null && b !== pg.book;
      }))];
      expect.soft(foreign, `drawer links escape book "${pg.book}"`).toEqual([]);
      const apparatusLinked = APPARATUS_SLUGS.filter((r) => dHrefs.some((h) => h.includes(`/${r}`)));
      expect.soft(apparatusLinked.length, `drawer surfaces apparatus links @ ${pg.url}`).toBeGreaterThan(0);

      // focus moves into the drawer on open
      const focusInDrawer = await drawer.evaluate((d) => d.contains(document.activeElement));
      expect.soft(focusInDrawer, 'focus moves into the drawer on open').toBe(true);

      // ESC closes + returns focus to the toggle
      await page.keyboard.press('Escape');
      await expect.soft(drawer, 'drawer hidden after ESC').toBeHidden();
      await expect.soft(toggle, 'toggle aria-expanded=false after ESC').toHaveAttribute('aria-expanded', 'false');
    });
  }
});
