/**
 * Helpers for the responsive audit spec (hardened post independent-review).
 *
 *  - setTheme:        pin light/dark BEFORE navigation (FOUC script reads it).
 *  - findOverflowers: measure horizontal page overflow + name distinct offenders
 *                     (SVG-class-safe; scans <body> itself too).
 *  - collectNavHrefs: gather in-app nav links (sidebar / prev-next / drawer).
 *  - resolveLink:     memoized link-status check (one HTTP probe per URL per run).
 *  - bookOfHref:      the book segment of a `/<book>/…` link, or null.
 */
import type { Page, APIRequestContext } from '@playwright/test';

/** The scaffold's single-book nav route shape — a 404 on this multi-book consumer. */
export const DEAD_LINK_RE = /\/chapters\//;

export type Theme = 'light' | 'dark';

export async function setTheme(page: Page, theme: Theme): Promise<void> {
  // Runs in page context before any document script, i.e. before the Base.astro
  // inline FOUC reader. No flash, no post-load toggle, no layout reflow.
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem('theme', t as string);
    } catch {
      /* localStorage unavailable — page falls back to prefers-color-scheme */
    }
  }, theme);
}

export interface OverflowReport {
  scrollW: number;
  clientW: number;
  worst: Array<{ tag: string; cls: string; id: string; right: number; width: number; text: string }>;
}

/**
 * Horizontal page overflow = documentElement.scrollWidth > clientWidth (both
 * exclude the scrollbar, so the comparison is scrollbar-neutral). `worst` lists
 * DISTINCT offending elements (a child whose right edge matches an already-listed
 * ancestor is skipped, so one overflowing container doesn't flood the report).
 * A properly contained `overflow-x:auto` block reports its clamped box → absent.
 */
export async function findOverflowers(page: Page, tol = 2): Promise<OverflowReport> {
  return page.evaluate((tol) => {
    const docEl = document.documentElement;
    const clientW = docEl.clientWidth;
    // Scan <body> itself + every descendant (catches a body-level overflower too).
    const nodes = [document.body, ...Array.from(document.body.querySelectorAll('*'))];
    const raw: Array<{ node: Element; right: number; width: number }> = [];
    for (const el of nodes) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0) continue; // a true zero-width box can't overflow
      if (r.right > clientW + tol) raw.push({ node: el, right: r.right, width: r.width });
    }
    raw.sort((a, b) => b.right - a.right);
    // Drop descendants whose right edge matches an already-kept ancestor (±1px) —
    // report distinct offenders, not a container plus all its children.
    const kept: typeof raw = [];
    for (const cand of raw) {
      const dupOfAncestor = kept.some(
        (k) => Math.abs(k.right - cand.right) <= 1 && k.node.contains(cand.node),
      );
      if (!dupOfAncestor) kept.push(cand);
      if (kept.length >= 6) break;
    }
    const describe = (el: Element) => ({
      tag: el.tagName.toLowerCase(),
      // SVG className is an SVGAnimatedString — getAttribute('class') is string-safe.
      cls: (el.getAttribute('class') || '').slice(0, 70),
      id: (el as HTMLElement).id || '',
      right: 0,
      width: 0,
      text: (el.textContent || '').trim().slice(0, 60),
    });
    return {
      scrollW: docEl.scrollWidth,
      clientW,
      worst: kept.map((k) => ({ ...describe(k.node), right: Math.round(k.right), width: Math.round(k.width) })),
    };
  }, tol);
}

/** In-app nav hrefs (relative, root-anchored): sidebar + prev/next + drawer. */
export async function collectNavHrefs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        'aside.sidebar a, nav.chapter-nav a, .chapter-nav a, .nav-drawer a, [role="dialog"] a',
      ),
    )
      .map((a) => (a as HTMLAnchorElement).getAttribute('href') || '')
      .filter((h) => h.startsWith('/')),
  );
}

/** Memoized link-status probe — one HTTP request per distinct URL per run
 *  (nav links are viewport/theme-invariant, so don't refetch them 56×). */
const linkStatus = new Map<string, Promise<number>>();
export function resolveLink(request: APIRequestContext, url: string): Promise<number> {
  let p = linkStatus.get(url);
  if (!p) {
    p = request.get(url).then((r) => r.status());
    linkStatus.set(url, p);
  }
  return p;
}

/** The book segment of a `/<book>/…` href when `<book>` is a known book, else null.
 *  Apparatus + chapter links both live under `/<book>/`, so this is the book-scope key. */
export function bookOfHref(href: string, bookSlugs: readonly string[]): string | null {
  const seg = href.replace(/^\//, '').split('/')[0];
  return bookSlugs.includes(seg) ? seg : null;
}
