/**
 * Generate the default Open Graph card (1200×630 PNG) by screenshotting an HTML
 * template with Playwright's Chromium — no external raster asset needed. Run:
 *   node tooling/og/generate.mjs
 * Output: public/og-default.png (wired via astro.config.mjs seo.ogImage).
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const BOOKS = [
  'Fine-tuning & Reinforcement Learning',
  'Evaluating AI Agents',
  'Knowledge Graphs for RAG',
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #faf7f0;
    color: #1f1b16;
    padding: 70px 80px;
    display: flex; flex-direction: column; justify-content: space-between;
    position: relative;
  }
  .bar { position: absolute; top: 0; left: 0; width: 14px; height: 630px;
         background: linear-gradient(180deg, #4e86c2 0%, #a65da0 50%, #b5862e 100%); }
  h1 { font-size: 76px; font-weight: 800; letter-spacing: -1.5px; line-height: 1.05; }
  .sub { font-size: 34px; color: #5b524a; margin-top: 14px; font-weight: 500; }
  .books { display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }
  .book { font-size: 30px; font-weight: 600; color: #2b2620;
          padding-left: 24px; border-left: 5px solid; }
  .book:nth-child(1) { border-color: #4e86c2; }
  .book:nth-child(2) { border-color: #a65da0; }
  .book:nth-child(3) { border-color: #b5862e; }
  .foot { display: flex; justify-content: space-between; align-items: baseline;
          font-size: 26px; color: #6b6258; }
  .foot b { color: #1f1b16; }
</style></head><body>
  <div class="bar"></div>
  <div>
    <h1>DLAI Study Notes</h1>
    <div class="sub">Interview-ready guides to applied AI</div>
  </div>
  <div class="books">
    ${BOOKS.map((b) => `<div class="book">${b}</div>`).join('')}
  </div>
  <div class="foot"><span>Synthesized from DeepLearning.AI courses · hand-authored</span><b>brandon-behring.dev</b></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready.then(() => {}));
await mkdir(join(root, 'public'), { recursive: true });
await page.screenshot({ path: join(root, 'public', 'og-default.png') });
await browser.close();
console.log('✓ public/og-default.png written (1200×630)');
