export { courseAssetDirectory, courseDirectories, loadCourseBundle } from "./load.js";
export { type ContentIssue, type ContentValidation, validateCourseBundle } from "./validate.js";
export { assertEditorialApproval, bundleDigest, scaffoldTopicMap } from "./curation.js";
export {
  importedToSteps,
  lessonPrompt,
  mergeLesson,
  textToBlocks,
  topicMapLessons,
  topicMapPrompt,
} from "./authoring-import.js";

export * from "./sql-projects.js";

export * from "./python-projects.js";
export * from "./lesson-v2.js";
export * from "./lesson-projection.js";
/** Contract types the authoring scripts need, re-exported so scripts depend on one package. */
export type {
  CalculatorPolicy,
  CourseBundle,
  LessonBeat,
  LessonStep,
  LessonStepKind,
  Question,
} from "@discere/contracts";
