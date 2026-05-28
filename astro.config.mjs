// @ts-check
/**
 * astro.config.mjs — DLAI Study Notes corpus (tools-profile multi-book).
 *
 * Consumer of @brandon_m_behring/book-scaffold-astro v4.8.0+. Adds:
 *   - KaTeX integration (math rendering across all DLAI books)
 *   - Multi-book content routing (consumer-level extension; upstream to
 *     scaffold v3.2 after pilot validates the pattern)
 *
 * One Astro app serves the entire corpus at study-notes.brandon-behring.dev.
 * Books live at /<book-slug>/<chapter-slug>/.
 */
import { defineBookConfig, toolsStyle } from '@brandon_m_behring/book-scaffold-astro';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default await defineBookConfig({
  site: 'https://study-notes.brandon-behring.dev',
  // v4: preset/profile replaced by explicit style composition (MIGRATION-v3-to-v4).
  styles: [toolsStyle],
  routes: {
    chapters: false,
    convergence: false,
    // v4.5 auto-injects a `/` landing; dlai owns src/pages/index.astro (corpus landing).
    landing: false,
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false, output: 'htmlAndMathml' }]],
  },
  vite: {
    ssr: {
      noExternal: [
        '@fontsource-variable/roboto',
        '@fontsource-variable/source-code-pro',
      ],
    },
  },
});
