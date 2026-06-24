/**
 * domain-label.ts — turn an exam-domain slug into a human-readable heading.
 *
 * Exam domains are stored as kebab slugs ('sft-vs-rl') for stable anchors and
 * validator keys. Headings need display labels ('SFT vs RL'). Books MAY supply
 * an explicit `examDomainLabels` map (authoritative); `humanizeDomain` is the
 * fallback for any domain a book leaves unlabeled.
 *
 * The humanizer can't know that 'post-training' wants an internal hyphen, so it
 * yields 'Post Training Foundations' — good enough; books that want the hyphen
 * set an explicit label.
 */

/** Tokens that should render fully upper-cased. */
const ACRONYMS = new Set([
  'sft', 'rl', 'rlhf', 'dpo', 'ppo', 'grpo', 'rag', 'llm', 'llms',
  'kg', 'ai', 'kl', 'mcq', 'cot', 'api', 'gpu', 'sdk', 'rm',
]);

/** Tokens that stay lower-case unless they lead the label. */
const MINOR = new Set(['vs', 'and', 'or', 'the', 'of', 'to', 'a', 'for', 'with', 'in', 'on']);

/** 'sft-vs-rl' → 'SFT vs RL'; 'production-pipelines' → 'Production Pipelines'. */
export function humanizeDomain(slug: string): string {
  return slug
    .split('-')
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (i > 0 && MINOR.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** Prefer an author-supplied label; fall back to the humanizer. */
export function domainLabel(
  slug: string,
  labels?: Record<string, string>,
): string {
  return labels?.[slug] ?? humanizeDomain(slug);
}
