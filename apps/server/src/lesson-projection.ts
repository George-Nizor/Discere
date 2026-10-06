/**
 * The before/after split of a lesson step lives in `@discere/curriculum`, so the server and the
 * lesson-migration scaffold (scripts/lesson-migration) project prose identically.
 */
export {
  answerLeakTokens,
  correctChoiceId,
  isV2Step,
  projectStep,
  projectV2Step,
  sentences,
  splitLegacyStep,
  type StepProjection,
} from "@discere/curriculum";
