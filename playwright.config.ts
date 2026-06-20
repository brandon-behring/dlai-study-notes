import { defineConfig, devices } from '@playwright/test';

/**
 * Responsive cross-device audit config (Workstream 2 / N0).
 *
 * 8 projects = 4 viewports × 2 themes. Theme rides as project metadata and is
 * applied per-test via addInitScript (helpers.setTheme) before navigation.
 *
 * webServer builds then previews the production output (NOT `astro dev` — the
 * env's inotify watch limit, 65536, makes dev unreliable). reuseExistingServer
 * lets you pre-start `npm run preview` against an existing dist/ and iterate the
 * audit without a rebuild each run; after any source change, rebuild first.
 */
// Dedicated audit port (not Astro's default 4321) so a stray dev/preview server
// from another project can't squat it and stall the webServer health check.
const PORT = 4373;
const BASE = `http://localhost:${PORT}`;

// NOTE: these are Desktop-Chromium-at-width (CSS-breakpoint emulation), not full
// device emulation — intended for layout/overflow, not mobile-Safari quirks.
// `tablet-1023` pins the 1023/1024 drawer↔sidebar cutover (last drawer pixel).
const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, hasTouch: true },
  'ipad-portrait': { width: 768, height: 1024, deviceScaleFactor: 2, hasTouch: true },
  'tablet-1023': { width: 1023, height: 1366, deviceScaleFactor: 2, hasTouch: true },
  'ipad-landscape': { width: 1024, height: 1366, deviceScaleFactor: 2, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, hasTouch: false },
} as const;

const THEMES = ['light', 'dark'] as const;

const projects = Object.entries(VIEWPORTS).flatMap(([vpName, vp]) =>
  THEMES.map((theme) => ({
    name: `${vpName}-${theme}`,
    // v4.26.0 (#80): the full 3-column (sidebar) activates at ≥80rem (1280px);
    // below that (incl. iPad-landscape 1024) the drawer is the chapter nav.
    metadata: { theme, breakpointClass: vp.width >= 1280 ? 'desktop' : 'mobile' },
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      hasTouch: vp.hasTouch,
    },
  })),
);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Cap local parallelism: unbounded workers on a many-core box oversubscribe the
  // single preview server → flaky `page.evaluate` timeouts on the heaviest pages.
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE,
    headless: true,
    screenshot: 'only-on-failure',
    // retries:0 (below) surfaces flakiness instead of masking it — so
    // 'on-first-retry' would never fire; retain a trace on any failure.
    trace: 'retain-on-failure',
  },
  projects,
  webServer: {
    // Build runs unconditionally via the `pretest:responsive` npm hook (so it is
    // NEVER skipped by reuse) — this command only SERVES the freshly-built dist/.
    // `astro preview` (sirv) streams from disk per request, so a reused server
    // serves the just-rebuilt files; no stale-dist trap. Run `npx playwright test`
    // directly to skip the rebuild when you know dist/ is current.
    command: `npm run preview -- --port ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
