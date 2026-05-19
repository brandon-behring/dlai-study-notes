/**
 * MDX component registry — pass this as the `components` prop to the
 * <Content> component returned by Astro's `render(chapterEntry)` to
 * resolve our custom JSX tags in chapter MDX.
 *
 * Once these stabilize after the pilot, they will move upstream to
 * book-scaffold-astro v3.2 (Phase 0.C.0 deferred task) so all consumers
 * inherit them without re-implementing.
 */
import NarrativeBox from './NarrativeBox.astro';
import ConceptBox from './ConceptBox.astro';
import PipelineBox from './PipelineBox.astro';
import KeyConcept from './KeyConcept.astro';
import InterviewContext from './InterviewContext.astro';
import Problem from './Problem.astro';
import Solution from './Solution.astro';
import Sidenote from './Sidenote.astro';
import AnkiCard from './AnkiCard.astro';
import Term from './Term.astro';
import Citation from './Citation.astro';
import RedFlag from './RedFlag.astro';
import Vignette from './Vignette.astro';
import DecisionTree from './DecisionTree.astro';
import Figure from './Figure.astro';

export const mdxComponents = {
  NarrativeBox,
  ConceptBox,
  PipelineBox,
  KeyConcept,
  InterviewContext,
  Problem,
  Solution,
  Sidenote,
  AnkiCard,
  Term,
  Citation,
  RedFlag,
  Vignette,
  DecisionTree,
  Figure,
};
