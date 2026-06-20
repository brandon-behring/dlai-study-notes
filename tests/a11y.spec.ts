/**
 * WCAG-AA accessibility audit (Phase 2 launch gate) — axe-core over the key
 * surfaces. Runs per project so dark-mode contrast is checked too. Reports
 * serious + critical WCAG 2.0/2.1 A/AA violations (soft, so all pages report).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setTheme, type Theme } from './helpers';

const PAGES = [
  '/',
  '/about/',
  '/finetuning-rl-intro/',
  '/finetuning-rl-intro/04-data-driven/',
  '/knowledge-graphs-rag/practice-exam/',
  '/knowledge-graphs-rag/glossary/',
];

for (const url of PAGES) {
  test(`a11y ${url}`, async ({ page }, testInfo) => {
    const theme = (testInfo.project.metadata.theme ?? 'light') as Theme;
    await setTheme(page, theme);
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => {}));

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .flatMap((v) =>
        v.nodes.slice(0, 4).map(
          (n) => `${v.id} ${n.target.join(' ')} — ${(n.any[0]?.message || n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 180)}`,
        ),
      );

    expect.soft(serious, `WCAG A/AA serious+ violations @ ${url} [${theme}]`).toEqual([]);
  });
}
