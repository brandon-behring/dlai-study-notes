// @ts-check
/**
 * astro.config.mjs — DLAI Study Notes corpus (tools-profile multi-book).
 *
 * Consumer of @brandon_m_behring/book-scaffold-astro v3.1+. Adds:
 *   - KaTeX integration (math rendering across all DLAI books)
 *   - Multi-book content routing (consumer-level extension; upstream to
 *     scaffold v3.2 after pilot validates the pattern)
 *
 * One Astro app serves the entire corpus at study-notes.brandon-behring.dev.
 * Books live at /<book-slug>/<chapter-slug>/.
 */
import { defineBookConfig } from '@brandon_m_behring/book-scaffold-astro';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default await defineBookConfig({
  site: 'https://study-notes.brandon-behring.dev',
  profile: 'tools',
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false, output: 'htmlAndMathml' }]],
  },
});
