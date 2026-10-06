import { isV2Lesson, lessonQuestionRefs } from "./lesson-v2.js";
import { createHash } from "node:crypto";
import {
  type EditorialApproval,
  EditorialApprovalSchema,
  type TopicMap,
  SourceSchema,
} from "@discere/contracts";
import type { ContentValidation } from "./validate.js";

/** The final review covers the exact serialised candidate, including its retained uncertainty. */
export function bundleDigest(bundle: unknown): string {
  return createHash("sha256")
    .update(`${JSON.stringify(bundle, null, 2)}\n`)
    .digest("hex");
}

function reviewedSources(sources: TopicMap["sources"]) {
  return sources.map((source) => {
    const parsed = SourceSchema.safeParse(source);
    if (
      !parsed.success ||
      !source.licenceUrl ||
      !source.attribution ||
      !source.section ||
      !source.edition ||
      !source.reuse
    ) {
      throw new Error(
        `Complete source '${source.title}': id, publisher, licence, licenceUrl, attribution, accessedAt, edition, section and reuse are required.`,
      );
    }
    if (/publisher's terms|unknown|pending|tbd/i.test(source.licence ?? ""))
      throw new Error(`Record the actual licence for '${source.title}'.`);
    if (
      source.reuse === "adaptable" &&
      !/^(?:public domain|cc0|cc by(?:-sa)?)(?: [\d.]+)?$/i.test(source.licence ?? "")
    ) {
      throw new Error(
        `Source '${source.title}' needs reference_only use or a reviewed redistribution policy for '${source.licence}'.`,
      );
    }
    return parsed.data;
  });
}

export function scaffoldTopicMap(map: TopicMap): Record<string, unknown> {
  const sources = reviewedSources(map.sources);
  if (new Set(sources.map((source) => source.id)).size !== sources.length)
    throw new Error("Source ids must be unique.");
  return {
    course: {
      id: map.courseId,
      version: "0.1.0",
      title: map.title,
      description: map.description,
      audience: map.audience,
      assuranceLevel: "source_backed",
      moduleIds: map.modules.map((module) => module.id),
      sourceIds: sources.map((source) => source.id),
      accent: map.accent,
      coverAsset: map.coverAsset,
      status: "coming_soon",
    },
    modules: map.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.summary,
      conceptIds: module.concepts.map((concept) => concept.id),
    })),
    concepts: map.modules.flatMap((module) =>
      module.concepts.map((concept) => ({
        id: concept.id,
        moduleId: module.id,
        title: concept.title,
        summary: concept.summary,
        prerequisiteIds: [...(concept.prerequisiteIds ?? [])],
        misconceptionIds: [],
        assuranceLevel: "source_backed",
      })),
    ),
    lessons: [],
    activities: [],
    questions: [],
    flashcards: [],
    essays: [],
    sources,
    authoringMetadata: [],
  };
}

export function assertEditorialApproval(
  candidate: unknown,
  review: unknown,
  validation: ContentValidation,
): EditorialApproval {
  const approval = EditorialApprovalSchema.parse(review);
  if (approval.decision !== "accepted" || approval.unresolvedIssues.length !== 0)
    throw new Error("Publication needs an accepted review with no unresolved issues.");
  if (approval.bundleSha256 !== bundleDigest(candidate))
    throw new Error(
      "The candidate changed after review. Review its new bundle hash before publishing.",
    );
  if (!validation.passed || !validation.bundle)
    throw new Error("The candidate fails curriculum or writing validation.");
  reviewedSources(validation.bundle.sources);
  for (const lesson of validation.bundle.lessons) {
    const metadata = validation.bundle.authoringMetadata?.find(
      (item) => item.lessonId === lesson.id,
    );
    if (!metadata)
      throw new Error(`Lesson '${lesson.id}' needs claim citations and prerequisite metadata.`);
    // Every question the lesson asks, wherever it is asked: quiz, step, opener, worked line.
    const questionIds = lessonQuestionRefs(lesson);
    if (new Set(questionIds).size < 4 || lesson.flashcardIds.length < 2)
      throw new Error(`Lesson '${lesson.id}' needs at least four questions and two recall cards.`);
    if (!lesson.steps.some((step) => step.kind === "transfer" && step.checkQuestionId))
      throw new Error(`Lesson '${lesson.id}' needs a changed case answered by the learner.`);
    if (!lesson.steps.some((step) => step.diagram) && !lesson.circuitSpec && !lesson.image)
      throw new Error(`Lesson '${lesson.id}' needs a rendered visual.`);
    if (isV2Lesson(lesson)) {
      // v2 (spec §3): a figure where it earns its place, not on every screen; every screen
      // except a worked example's reading asks the learner something.
      if (
        lesson.steps.length < 5 ||
        lesson.steps.some(
          (step) =>
            !step.checkQuestionId &&
            !step.activityId &&
            !step.workedSteps?.some((line) => line.blank || line.selfExplain),
        )
      )
        throw new Error(`Each screen in '${lesson.id}' needs a learner response.`);
      if (!lesson.recap) throw new Error(`Lesson '${lesson.id}' needs its close.`);
    } else if (
      lesson.steps.length < 4 ||
      lesson.steps.some(
        (step) =>
          (!step.diagram && !lesson.circuitSpec && !lesson.image) ||
          (!step.checkQuestionId && !step.activityId),
      )
    )
      throw new Error(`Each beat in '${lesson.id}' needs a visual and a learner response.`);
    const targets = [
      ...lesson.steps.map((step) => `step:${step.id}`),
      ...questionIds.map((id) => `question:${id}`),
      ...lesson.flashcardIds.map((id) => `flashcard:${id}`),
    ];
    for (const target of targets)
      if (!metadata.citations.some((item) => `${item.targetKind}:${item.targetId}` === target))
        throw new Error(`Missing citation for ${lesson.id}/${target}.`);
  }
  for (const warning of validation.issues.filter((item) => item.severity === "warning")) {
    if (
      !approval.acceptedWarnings.some(
        (item) => item.code === warning.code && item.path === warning.path,
      )
    )
      throw new Error(`Explain the accepted warning ${warning.code} at ${warning.path}.`);
  }
  for (const metadata of validation.bundle.authoringMetadata ?? []) {
    for (const concern of metadata.uncertainty) {
      if (
        !approval.resolvedUncertainty.some(
          (item) => item.lessonId === metadata.lessonId && item.concern === concern,
        )
      )
        throw new Error(`Resolve '${concern}' in lesson '${metadata.lessonId}' before publishing.`);
    }
  }
  return approval;
}
