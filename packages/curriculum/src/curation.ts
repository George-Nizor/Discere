import { isV2Lesson, lessonQuestionRefs } from "./lesson-v2.js";
import { createHash } from "node:crypto";
import {
  type CourseBundle,
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

/**
 * The per-lesson publication rules (citations, enough questions and recall cards, a learner
 * response on every screen). Exported so the migration's apply step can refuse a draft that would
 * only fail here, at publish.
 */
export function assertLessonsPublishable(bundle: CourseBundle): void {
  for (const lesson of bundle.lessons) {
    const metadata = bundle.authoringMetadata?.find((item) => item.lessonId === lesson.id);
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
      // except a worked example's reading and a teaching screen asks the learner something.
      if (
        lesson.steps.length < 5 ||
        lesson.steps.some(
          (step) =>
            step.kind !== "explain" &&
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
  assertLessonsPublishable(validation.bundle);
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

/** The parts of a bundle that a regenerated candidate must not silently drop. */
type KeptContent = {
  lessons?: readonly { id: string; steps?: readonly { id: string }[] }[];
  questions?: readonly { id: string }[];
  essays?: readonly { id: string }[];
};

export type ContentLoss = { questions: string[]; steps: string[]; essays: string[] };

/**
 * Lists the questions, lesson steps and essays that the published bundle has and the candidate
 * lacks. Work is sometimes added straight to bundle.json (code exercises, writing tasks), and a
 * script that rebuilds a candidate from authoring files knows nothing about it.
 */
export function contentLoss(published: KeptContent, candidate: KeptContent): ContentLoss {
  const missing = (before: readonly string[], after: readonly string[]): string[] => {
    const kept = new Set(after);
    return before.filter((id) => !kept.has(id));
  };
  const ids = (items: readonly { id: string }[] | undefined): string[] =>
    (items ?? []).map((item) => item.id);
  const stepIds = (bundle: KeptContent): string[] =>
    (bundle.lessons ?? []).flatMap((lesson) =>
      (lesson.steps ?? []).map((step) => `${lesson.id}/${step.id}`),
    );
  return {
    questions: missing(ids(published.questions), ids(candidate.questions)),
    steps: missing(stepIds(published), stepIds(candidate)),
    essays: missing(ids(published.essays), ids(candidate.essays)),
  };
}

/** Throws when the candidate would drop published content, unless the caller forces it. */
export function assertNoContentLoss(
  courseId: string,
  published: KeptContent,
  candidate: KeptContent,
  options: { force?: boolean } = {},
): ContentLoss {
  const loss = contentLoss(published, candidate);
  const total = loss.questions.length + loss.steps.length + loss.essays.length;
  if (!total || options.force) return loss;
  const sample = [...loss.questions, ...loss.essays, ...loss.steps].slice(0, 5).join(", ");
  throw new Error(
    `Refusing to replace ${courseId}: the published bundle.json has ${loss.questions.length} ` +
      `question(s), ${loss.steps.length} lesson step(s) and ${loss.essays.length} writing task(s) ` +
      `that this candidate does not (for example ${sample}). They were probably added to ` +
      "bundle.json directly and are not in the authoring files. Carry them into the candidate, " +
      "or pass --force (or set DISCERE_ALLOW_CONTENT_LOSS=1) to drop them on purpose.",
  );
}
