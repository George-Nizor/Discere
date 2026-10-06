import { assessTextAnswer } from "@discere/assessment-engine";
import {
  diagramChoiceIssues,
  graphPlotIssues,
  orderSequenceIssues,
} from "@discere/activity-engine";
import {
  type CourseBundle,
  CourseBundleSchema,
  REDISTRIBUTABLE_LICENCE_PATTERN,
  timelineActivityIssues,
} from "@discere/contracts";
import { inspectVisualBrief } from "@discere/visual-engine";
import { lintText, type WritingContext } from "@discere/writing-engine";
import { isV2Lesson, lessonQuestionRefs, lessonV2Issues } from "./lesson-v2.js";

export interface ContentIssue {
  path: string;
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface ContentValidation {
  passed: boolean;
  bundle?: CourseBundle;
  issues: ContentIssue[];
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    else seen.add(value);
  }
  return [...duplicate];
}

function missingReference(issues: ContentIssue[], path: string, kind: string, id: string): void {
  issues.push({
    path,
    code: "MISSING_REFERENCE",
    severity: "error",
    message: `Unknown ${kind} '${id}'.`,
  });
}

function lintField(
  issues: ContentIssue[],
  path: string,
  text: string,
  context: WritingContext,
  hiddenAnswer?: string,
): void {
  const lint = lintText(text, {
    context,
    ...(hiddenAnswer === undefined ? {} : { hiddenAnswer }),
  });
  for (const violation of lint.violations) {
    issues.push({
      path,
      code: violation.ruleId,
      severity: violation.severity === "hard" ? "error" : "warning",
      message: violation.message,
    });
  }
}

function prerequisiteCycleIssues(bundle: CourseBundle): ContentIssue[] {
  const prerequisiteIds = new Map(
    bundle.concepts.map((concept) => [concept.id, concept.prerequisiteIds]),
  );
  const state = new Map<string, "visiting" | "visited">();
  const reported = new Set<string>();
  const issues: ContentIssue[] = [];

  function visit(conceptId: string, stack: string[]): void {
    const currentState = state.get(conceptId);
    if (currentState === "visited") return;
    if (currentState === "visiting") {
      const cycleStart = stack.indexOf(conceptId);
      const cycle = [...stack.slice(Math.max(0, cycleStart)), conceptId];
      const key = [...new Set(cycle)].sort().join("|");
      if (!reported.has(key)) {
        reported.add(key);
        issues.push({
          path: `concepts.${conceptId}.prerequisiteIds`,
          code: "PREREQUISITE_CYCLE",
          severity: "error",
          message: `Prerequisites form a cycle: ${cycle.join(" -> ")}.`,
        });
      }
      return;
    }

    state.set(conceptId, "visiting");
    for (const prerequisiteId of prerequisiteIds.get(conceptId) ?? []) {
      if (prerequisiteIds.has(prerequisiteId)) visit(prerequisiteId, [...stack, conceptId]);
    }
    state.set(conceptId, "visited");
  }

  for (const concept of bundle.concepts) visit(concept.id, []);
  return issues;
}

/**
 * A lesson declares the kind of visual its explainer shows. The data that kind needs has to be
 * present, otherwise the learner reaches a stage that can only describe itself in words.
 */
function lessonVisualIssues(lesson: CourseBundle["lessons"][number]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  if (lesson.visualKind === "circuit" && !lesson.circuitSpec) {
    issues.push({
      path: `lessons.${lesson.id}.circuitSpec`,
      code: "VISUAL_DATA_MISSING",
      severity: "error",
      message: "A circuit explainer needs a circuit specification to render.",
    });
  }
  if (lesson.visualKind === "image" && !lesson.image) {
    issues.push({
      path: `lessons.${lesson.id}.image`,
      code: "VISUAL_DATA_MISSING",
      severity: "error",
      message: "An image explainer needs a retrieved image record with its provenance.",
    });
  }
  const image = lesson.image;
  if (image && !REDISTRIBUTABLE_LICENCE_PATTERN.test(image.licence)) {
    issues.push({
      path: `lessons.${lesson.id}.image.licence`,
      code: "LICENCE_NOT_REDISTRIBUTABLE",
      severity: "error",
      message: `Licence '${image.licence}' does not permit bundling the file. Use a public-domain, CC0, CC BY, or CC BY-SA image.`,
    });
  }
  if (image && !image.attribution.includes(image.creator)) {
    issues.push({
      path: `lessons.${lesson.id}.image.attribution`,
      code: "ATTRIBUTION_INCOMPLETE",
      severity: "error",
      message: "The attribution line must name the creator it credits.",
    });
  }
  return issues;
}

/**
 * A selectable question is marked by the same text authority that marks a written answer, so
 * exactly one option must satisfy it. Two matching options would make the question unmarkable.
 */
function choiceIssues(question: CourseBundle["questions"][number]): ContentIssue[] {
  const choices = question.choices;
  if (!choices || choices.length === 0) return [];
  const path = `questions.${question.id}.choices`;
  if (question.answerAuthority.kind !== "text") {
    return [
      {
        path,
        code: "CHOICE_AUTHORITY_MISMATCH",
        severity: "error",
        message: "A question answered by selection needs a text answer authority.",
      },
    ];
  }
  const authority = question.answerAuthority;
  const accepted = choices.filter((choice) => assessTextAnswer(choice.label, authority).correct);
  if (accepted.length === 1) return [];
  return [
    {
      path,
      code: "CHOICE_NOT_MARKABLE",
      severity: "error",
      message:
        accepted.length === 0
          ? "No option satisfies the answer authority, so the question can never be answered correctly."
          : `${accepted.length} options satisfy the answer authority: ${accepted.map((choice) => choice.id).join(", ")}.`,
    },
  ];
}

/**
 * A written answer is marked by looking for the accepted ideas inside what the learner wrote,
 * so an accepted idea has to be a short phrase a correct answer would plainly contain. A whole
 * sentence can never be matched, which would leave the question unanswerable.
 */
const MAX_ACCEPTED_IDEA_CHARS = 60;

function acceptedIdeaIssues(question: CourseBundle["questions"][number]): ContentIssue[] {
  // A selectable question is marked against whole option labels, which are allowed to be long.
  if (question.answerAuthority.kind !== "text" || (question.choices?.length ?? 0) > 0) return [];
  return question.answerAuthority.acceptedIdeas
    .filter((idea) => idea.length > MAX_ACCEPTED_IDEA_CHARS)
    .map((idea) => ({
      path: `questions.${question.id}.answerAuthority.acceptedIdeas`,
      code: "ACCEPTED_IDEA_TOO_LONG",
      severity: "error" as const,
      message: `'${idea.slice(0, 48)}…' is a sentence rather than a phrase a learner's answer would contain.`,
    }));
}

/** Spec v0.2 section 18.4: at most 35% of a course's questions may be multiple choice. */
/**
 * A course that is mostly multiple choice is testing recognition rather than understanding.
 *
 * The share is only enforced once there are enough questions for it to mean anything: over two
 * or three questions a proportion is an artefact of the count, and a course being written one
 * lesson at a time would be blocked by its own first import. Below the threshold the imbalance
 * is still reported, as a warning.
 */
const MULTIPLE_CHOICE_LIMIT = 0.35;
const SHARE_MEANINGFUL_FROM = 8;

function multipleChoiceShareIssues(bundle: CourseBundle): ContentIssue[] {
  if (bundle.questions.length === 0) return [];
  const selected = bundle.questions.filter(
    (question) => (question.choices?.length ?? 0) > 0,
  ).length;
  const share = selected / bundle.questions.length;
  if (share <= MULTIPLE_CHOICE_LIMIT) return [];
  const settled = bundle.questions.length >= SHARE_MEANINGFUL_FROM;
  return [
    {
      path: "questions",
      code: "MULTIPLE_CHOICE_SHARE",
      severity: settled ? "error" : "warning",
      message: `${selected} of ${bundle.questions.length} questions are multiple choice (${Math.round(share * 100)}%). The limit is ${Math.round(MULTIPLE_CHOICE_LIMIT * 100)}%.${settled ? "" : " Reported as a warning while the course is small."}`,
    },
  ];
}

/** Words a learner actually reads in a step, so an equation is not counted as prose. */
function stepWordCount(step: CourseBundle["lessons"][number]["steps"][number]): number {
  return step.blocks
    .flatMap((block) =>
      block.kind === "equation"
        ? []
        : [block.kind === "definition" ? `${block.term} ${block.text}` : block.text],
    )
    .join(" ")
    .split(/\s+/u)
    .filter(Boolean).length;
}

const MAX_EXPLAIN_WORDS = 120;

/**
 * Rules for the step model. Broken references are errors because the lesson cannot play; shape
 * advice is a warning, because a lesson that opens without a hook is worse rather than invalid.
 */
function lessonStepIssues(
  lesson: CourseBundle["lessons"][number],
  questionIds: ReadonlySet<string>,
  activityIds: ReadonlySet<string>,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const path = `lessons.${lesson.id}.steps`;
  if (lesson.steps.length === 0) return issues;

  const seen = new Set<string>();
  const quizIds = new Set(lesson.questionIds);
  const stateIds = new Set(lesson.visualStates.map((state) => state.id));
  for (const step of lesson.steps) {
    const at = `${path}.${step.id}`;
    if (seen.has(step.id)) {
      issues.push({
        path: at,
        code: "DUPLICATE_STEP_ID",
        severity: "error",
        message: `Lesson '${lesson.id}' has more than one step called '${step.id}'.`,
      });
    }
    seen.add(step.id);

    if (step.checkQuestionId) {
      if (!questionIds.has(step.checkQuestionId)) {
        missingReference(issues, at, "question", step.checkQuestionId);
      }
      // Answering inline and then meeting the same question as a quiz stage is a drafting slip.
      if (quizIds.has(step.checkQuestionId)) {
        issues.push({
          path: at,
          code: "QUESTION_ASKED_TWICE",
          severity: "error",
          message: `Question '${step.checkQuestionId}' is asked by step '${step.id}' and again as a quiz stage of '${lesson.id}'. Remove it from questionIds.`,
        });
      }
    }
    if (step.activityId && !activityIds.has(step.activityId)) {
      missingReference(issues, at, "activity", step.activityId);
    }
    // A step naming a state that was never authored would silently show the previous one.
    if (step.visualStateId && !stateIds.has(step.visualStateId)) {
      missingReference(issues, at, "visual state", step.visualStateId);
    }
    if ((step.kind === "check" || step.kind === "transfer") && !step.checkQuestionId) {
      issues.push({
        path: at,
        code: "STEP_MISSING_QUESTION",
        severity: "error",
        message: `Step '${step.id}' is a ${step.kind} step, so it needs a question to ask.`,
      });
    }
    if (step.kind === "interact" && !step.activityId) {
      issues.push({
        path: at,
        code: "STEP_MISSING_ACTIVITY",
        severity: "warning",
        message: `Step '${step.id}' is an interact step with no activity wired to it yet, so it reads as plain prose. Add an activity or change its kind.`,
      });
    }
    if (step.kind === "explain" && stepWordCount(step) > MAX_EXPLAIN_WORDS) {
      issues.push({
        path: at,
        code: "STEP_TOO_LONG",
        severity: "warning",
        message: `Step '${step.id}' runs to ${stepWordCount(step)} words. Split it: a step should be readable without losing the visual.`,
      });
    }
  }

  const namedStates = new Set(lesson.steps.map((step) => step.visualStateId).filter(Boolean));
  for (const state of lesson.visualStates) {
    if (namedStates.has(state.id)) continue;
    issues.push({
      path: `lessons.${lesson.id}.visualStates`,
      code: "UNREACHABLE_CONTENT",
      severity: "warning",
      message: `No step of '${lesson.id}' shows visual state '${state.id}'.`,
    });
  }

  if (lesson.steps[0]?.kind !== "hook" && !isV2Lesson(lesson)) {
    issues.push({
      path,
      code: "LESSON_WITHOUT_HOOK",
      severity: "warning",
      message: `Lesson '${lesson.id}' does not open with a hook, so the learner reads before they predict.`,
    });
  }
  if (
    !lesson.steps.some(
      (step) => step.kind === "check" || step.kind === "transfer" || step.kind === "try",
    )
  ) {
    issues.push({
      path,
      code: "LESSON_WITHOUT_CHECK",
      severity: "warning",
      message: `Lesson '${lesson.id}' asks the learner nothing while it teaches.`,
    });
  }
  return issues;
}

/** Authored material no lesson reaches is a drafting slip worth reporting, not a failure. */
function unreachableContentIssues(bundle: CourseBundle): ContentIssue[] {
  const usedActivities = new Set([
    ...bundle.lessons.map((lesson) => lesson.activityId),
    ...bundle.lessons.flatMap((lesson) =>
      lesson.steps.map((step) => step.activityId).filter(Boolean),
    ),
  ]);
  // A question asked inline by a step is reached, even though it is not a quiz stage.
  const usedQuestions = new Set(bundle.lessons.flatMap((lesson) => lessonQuestionRefs(lesson)));
  const usedCards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
  const usedEssays = new Set(
    bundle.lessons.flatMap((lesson) => (lesson.essayId ? [lesson.essayId] : [])),
  );
  const unreachable = (name: string, ids: string[], used: Set<string>): ContentIssue[] =>
    ids
      .filter((id) => !used.has(id))
      .map((id) => ({
        path: name,
        code: "UNREACHABLE_CONTENT",
        severity: "warning" as const,
        message: `No lesson uses ${name.slice(0, -1)} '${id}'.`,
      }));
  return [
    ...unreachable(
      "activities",
      bundle.activities.map((item) => item.id),
      usedActivities,
    ),
    ...unreachable(
      "questions",
      bundle.questions.map((item) => item.id),
      usedQuestions,
    ),
    ...unreachable(
      "flashcards",
      bundle.flashcards.map((item) => item.id),
      usedCards,
    ),
    ...unreachable(
      "essays",
      bundle.essays.map((item) => item.id),
      usedEssays,
    ),
  ];
}

export function validateCourseBundle(input: unknown): ContentValidation {
  const parsed = CourseBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      passed: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: "SCHEMA",
        severity: "error",
        message: issue.message,
      })),
    };
  }

  const bundle = parsed.data;
  const issues: ContentIssue[] = [];
  const collections = [
    ["modules", bundle.modules.map((item) => item.id)],
    ["concepts", bundle.concepts.map((item) => item.id)],
    ["lessons", bundle.lessons.map((item) => item.id)],
    ["activities", bundle.activities.map((item) => item.id)],
    ["questions", bundle.questions.map((item) => item.id)],
    ["flashcards", bundle.flashcards.map((item) => item.id)],
    ["essays", bundle.essays.map((item) => item.id)],
    ["sources", bundle.sources.map((item) => item.id)],
  ] as const;

  for (const [name, ids] of collections) {
    for (const id of duplicates(ids)) {
      issues.push({
        path: name,
        code: "DUPLICATE_ID",
        severity: "error",
        message: `Duplicate id '${id}'.`,
      });
    }
  }

  const conceptIds = new Set(bundle.concepts.map((item) => item.id));
  const moduleIds = new Set(bundle.modules.map((item) => item.id));
  const sourceIds = new Set(bundle.sources.map((item) => item.id));
  const activityIds = new Set(bundle.activities.map((item) => item.id));
  const questionIds = new Set(bundle.questions.map((item) => item.id));
  const flashcardIds = new Set(bundle.flashcards.map((item) => item.id));
  const essayIds = new Set(bundle.essays.map((item) => item.id));
  const courseModuleIds = new Set(bundle.course.moduleIds);
  const lessonIds = new Set(bundle.lessons.map((lesson) => lesson.id));
  for (const metadata of bundle.authoringMetadata ?? []) {
    if (!lessonIds.has(metadata.lessonId))
      missingReference(issues, "authoringMetadata", "lesson", metadata.lessonId);
    for (const prerequisite of metadata.prerequisiteLessonIds) {
      if (!lessonIds.has(prerequisite))
        missingReference(
          issues,
          `authoringMetadata.${metadata.lessonId}.prerequisiteLessonIds`,
          "lesson",
          prerequisite,
        );
      if (prerequisite === metadata.lessonId)
        issues.push({
          path: "authoringMetadata",
          code: "SELF_REFERENCE",
          severity: "error",
          message: "A lesson cannot require itself.",
        });
    }
    for (const citation of metadata.citations) {
      if (!sourceIds.has(citation.sourceId))
        missingReference(
          issues,
          `authoringMetadata.${metadata.lessonId}.citations`,
          "source",
          citation.sourceId,
        );
      const lesson = bundle.lessons.find((item) => item.id === metadata.lessonId);
      const targets =
        citation.targetKind === "step"
          ? new Set(lesson?.steps.map((step) => step.id))
          : citation.targetKind === "question"
            ? new Set(lesson ? lessonQuestionRefs(lesson) : [])
            : new Set(lesson?.flashcardIds);
      if (!targets.has(citation.targetId))
        missingReference(
          issues,
          `authoringMetadata.${metadata.lessonId}.citations`,
          citation.targetKind,
          citation.targetId,
        );
    }
  }
  const orderedLessonIds = bundle.lessons.map((lesson) => lesson.id);
  for (const metadata of bundle.authoringMetadata ?? []) {
    for (const prerequisite of metadata.prerequisiteLessonIds) {
      if (orderedLessonIds.indexOf(prerequisite) >= orderedLessonIds.indexOf(metadata.lessonId))
        issues.push({
          path: `authoringMetadata.${metadata.lessonId}.prerequisiteLessonIds`,
          code: "PREREQUISITE_ORDER",
          severity: "error",
          message: "A prerequisite lesson must appear earlier in the course.",
        });
    }
  }

  for (const id of bundle.course.moduleIds) {
    if (!moduleIds.has(id)) missingReference(issues, "course.moduleIds", "module", id);
  }
  for (const id of bundle.course.sourceIds) {
    if (!sourceIds.has(id)) missingReference(issues, "course.sourceIds", "source", id);
  }
  for (const module of bundle.modules) {
    if (!courseModuleIds.has(module.id)) {
      issues.push({
        path: `modules.${module.id}`,
        code: "UNLISTED_MODULE",
        severity: "error",
        message: `Module '${module.id}' is not listed by the course.`,
      });
    }
    for (const conceptId of module.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        missingReference(issues, `modules.${module.id}.conceptIds`, "concept", conceptId);
        continue;
      }
      const concept = bundle.concepts.find((item) => item.id === conceptId);
      if (concept && concept.moduleId !== module.id) {
        issues.push({
          path: `modules.${module.id}.conceptIds`,
          code: "MODULE_CONCEPT_MISMATCH",
          severity: "error",
          message: `Concept '${conceptId}' belongs to module '${concept.moduleId}', not '${module.id}'.`,
        });
      }
    }
    lintField(issues, `modules.${module.id}.description`, module.description, "lesson");
  }

  for (const concept of bundle.concepts) {
    if (!moduleIds.has(concept.moduleId)) {
      missingReference(issues, `concepts.${concept.id}.moduleId`, "module", concept.moduleId);
    } else {
      const module = bundle.modules.find((item) => item.id === concept.moduleId);
      if (module && !module.conceptIds.includes(concept.id)) {
        issues.push({
          path: `concepts.${concept.id}.moduleId`,
          code: "UNLISTED_CONCEPT",
          severity: "error",
          message: `Concept '${concept.id}' is not listed by module '${concept.moduleId}'.`,
        });
      }
    }
    for (const id of concept.prerequisiteIds) {
      if (!conceptIds.has(id))
        missingReference(issues, `concepts.${concept.id}.prerequisiteIds`, "concept", id);
      if (id === concept.id) {
        issues.push({
          path: `concepts.${concept.id}.prerequisiteIds`,
          code: "SELF_REFERENCE",
          severity: "error",
          message: `Concept '${concept.id}' cannot require itself.`,
        });
      }
    }
    lintField(issues, `concepts.${concept.id}.summary`, concept.summary, "lesson");
  }
  issues.push(...prerequisiteCycleIssues(bundle));

  for (const lesson of bundle.lessons) {
    if (lesson.courseId !== bundle.course.id) {
      issues.push({
        path: `lessons.${lesson.id}.courseId`,
        code: "COURSE_MISMATCH",
        severity: "error",
        message: `Lesson belongs to course '${lesson.courseId}', expected '${bundle.course.id}'.`,
      });
    }
    for (const id of lesson.conceptIds) {
      if (!conceptIds.has(id))
        missingReference(issues, `lessons.${lesson.id}.conceptIds`, "concept", id);
    }
    for (const id of lesson.sourceIds) {
      if (!sourceIds.has(id))
        missingReference(issues, `lessons.${lesson.id}.sourceIds`, "source", id);
    }
    for (const id of lesson.visualBrief?.sourceIds ?? []) {
      if (!sourceIds.has(id))
        missingReference(issues, `lessons.${lesson.id}.visualBrief.sourceIds`, "source", id);
    }
    if (lesson.activityId && !activityIds.has(lesson.activityId)) {
      missingReference(issues, `lessons.${lesson.id}.activityId`, "activity", lesson.activityId);
    }
    for (const id of lesson.questionIds) {
      if (!questionIds.has(id))
        missingReference(issues, `lessons.${lesson.id}.questionIds`, "question", id);
    }
    for (const id of duplicates(lesson.questionIds)) {
      issues.push({
        path: `lessons.${lesson.id}.questionIds`,
        code: "DUPLICATE_ID",
        severity: "error",
        message: `Question '${id}' is asked twice in the same lesson.`,
      });
    }
    for (const id of lesson.flashcardIds) {
      if (!flashcardIds.has(id))
        missingReference(issues, `lessons.${lesson.id}.flashcardIds`, "flashcard", id);
    }
    if (lesson.essayId !== undefined && !essayIds.has(lesson.essayId)) {
      missingReference(issues, `lessons.${lesson.id}.essayId`, "essay", lesson.essayId);
    }
    issues.push(...lessonVisualIssues(lesson));
    issues.push(...lessonStepIssues(lesson, questionIds, activityIds));
    for (const visualIssue of lesson.visualBrief ? inspectVisualBrief(lesson.visualBrief) : []) {
      issues.push({
        path: `lessons.${lesson.id}.visualBrief`,
        code: visualIssue.code,
        severity: "error",
        message: visualIssue.message,
      });
    }
    lintField(issues, `lessons.${lesson.id}.orientation`, lesson.orientation, "lesson");
    for (const step of lesson.steps) {
      step.blocks.forEach((block, index) => {
        if (block.kind === "equation") return;
        const at = `lessons.${lesson.id}.steps.${step.id}.blocks.${index}`;
        if (block.kind === "definition") lintField(issues, `${at}.term`, block.term, "lesson");
        lintField(issues, `${at}.text`, block.text, "lesson");
      });
    }
    lintField(issues, `lessons.${lesson.id}.nextAction`, lesson.nextAction, "lesson");
    lintField(issues, `lessons.${lesson.id}.reviewLabel`, lesson.reviewLabel, "lesson");
    for (const [name, title] of Object.entries(lesson.stageTitles)) {
      lintField(issues, `lessons.${lesson.id}.stageTitles.${name}`, title, "lesson");
    }
  }

  for (const activity of bundle.activities) {
    for (const id of activity.conceptIds) {
      if (!conceptIds.has(id))
        missingReference(issues, `activities.${activity.id}.conceptIds`, "concept", id);
    }
    if (activity.type === "timeline_explorer") {
      for (const message of timelineActivityIssues(activity)) {
        issues.push({
          path: `activities.${activity.id}`,
          code: "TIMELINE_SHAPE",
          severity: "error",
          message,
        });
      }
      for (const event of activity.events) {
        lintField(
          issues,
          `activities.${activity.id}.events.${event.id}.detail`,
          event.detail,
          "lesson",
        );
      }
    }
    lintField(issues, `activities.${activity.id}.instructions`, activity.instructions, "lesson");
    // The explorers ask the learner to predict before checking; the newer types ask directly.
    if ("predictionPrompt" in activity) {
      lintField(
        issues,
        `activities.${activity.id}.predictionPrompt`,
        activity.predictionPrompt,
        "question",
      );
    }
    if ("prompt" in activity) {
      lintField(issues, `activities.${activity.id}.prompt`, activity.prompt, "question");
    }
    if ("feedback" in activity) {
      lintField(
        issues,
        `activities.${activity.id}.feedback.correct`,
        activity.feedback.correct,
        "feedback",
      );
      lintField(
        issues,
        `activities.${activity.id}.feedback.incorrect`,
        activity.feedback.incorrect,
        "feedback",
      );
    }
    // Structural faults the schema cannot express.
    const structural =
      activity.type === "diagram_choice"
        ? diagramChoiceIssues(activity)
        : activity.type === "order_sequence"
          ? orderSequenceIssues(activity)
          : activity.type === "graph_plot"
            ? graphPlotIssues(activity)
            : [];
    for (const message of structural) {
      issues.push({
        path: `activities.${activity.id}`,
        code: "ACTIVITY_INVALID",
        severity: "error",
        message,
      });
    }
  }

  const checkQuestions = (bundle.courseChecks ?? []).flatMap((check) =>
    check.items.map((item) => item.question),
  );
  for (const id of duplicates([...bundle.questions, ...checkQuestions].map((q) => q.id)))
    issues.push({
      path: "courseChecks",
      code: "DUPLICATE_ID",
      severity: "error",
      message: "Course check question id is reused: " + id,
    });
  for (const id of duplicates((bundle.courseChecks ?? []).map((c) => c.id)))
    issues.push({
      path: "courseChecks",
      code: "DUPLICATE_ID",
      severity: "error",
      message: "Course check id is reused: " + id,
    });
  for (const kind of duplicates((bundle.courseChecks ?? []).map((c) => c.kind)))
    issues.push({
      path: "courseChecks",
      code: "DUPLICATE_CHECK_KIND",
      severity: "error",
      message: "Use one check per kind: " + kind,
    });
  for (const check of bundle.courseChecks ?? []) {
    const prefix = "courseChecks." + check.id;
    lintField(issues, prefix + ".title", check.title, "lesson");
    lintField(issues, prefix + ".description", check.description, "lesson");
    for (const id of check.requiredLessonIds)
      if (!lessonIds.has(id)) missingReference(issues, prefix + ".requiredLessonIds", "lesson", id);
    if (
      check.kind === "checkpoint" &&
      (check.requiredLessonIds.length !== lessonIds.size ||
        bundle.lessons.some((l) => !check.requiredLessonIds.includes(l.id)))
    )
      issues.push({
        path: prefix,
        code: "CHECK_PREREQUISITES",
        severity: "error",
        message: "The final course check requires every course lesson.",
      });
    if (
      check.kind === "transfer" &&
      !bundle.courseChecks?.some((c) => c.id === check.afterCheckId && c.kind === "checkpoint")
    )
      issues.push({
        path: prefix,
        code: "CHECK_PREREQUISITES",
        severity: "error",
        message: "A delayed transfer must follow the course checkpoint.",
      });
    for (const item of check.items) {
      const lesson = bundle.lessons.find((l) => l.id === item.lessonId);
      if (!lesson) missingReference(issues, prefix, "lesson", item.lessonId);
      else if (item.question.conceptIds.some((id) => !lesson.conceptIds.includes(id)))
        issues.push({
          path: prefix,
          code: "CHECK_CONCEPT",
          severity: "error",
          message: "Each check item must map to the lesson that teaches its concepts.",
        });
      if (!item.question.sourceIds.length)
        issues.push({
          path: prefix,
          code: "CHECK_SOURCE",
          severity: "error",
          message: "Each check question needs a precise subject source.",
        });
      const visualText =
        item.visual.type === "statements"
          ? [
              item.visual.title,
              ...item.visual.statements.flatMap((s) => [s.label, s.text]),
              ...(item.visual.conclusion ? [item.visual.conclusion] : []),
            ]
          : item.visual.type === "data_series"
            ? [item.visual.label, ...item.visual.series.map((s) => s.label)]
            : item.visual.type === "machine"
              ? [item.visual.input, ...item.visual.operations]
              : item.visual.type === "balance"
                ? [item.visual.left, item.visual.right]
                : item.visual.type === "table"
                  ? [...item.visual.columns, ...item.visual.rows.flat()]
                  : item.visual.type === "coordinates"
                    ? item.visual.points.map((p) => p.label)
                    : []; // Program/query source and input cells are literal data; schemas bound them.
      for (const text of visualText) lintField(issues, prefix + ".visual", text, "lesson");
    }
    if (bundle.lessons.some((l) => !check.items.some((item) => item.lessonId === l.id)))
      issues.push({
        path: prefix,
        code: "CHECK_COVERAGE",
        severity: "error",
        message: "The check must assess each course lesson.",
      });
  }
  const checkIds = new Set(checkQuestions.map((q) => q.id));
  for (const question of [...bundle.questions, ...checkQuestions]) {
    for (const id of question.conceptIds) {
      if (!conceptIds.has(id))
        missingReference(issues, `questions.${question.id}.conceptIds`, "concept", id);
    }
    for (const id of question.sourceIds) {
      if (!sourceIds.has(id))
        missingReference(issues, `questions.${question.id}.sourceIds`, "source", id);
    }
    lintField(issues, `questions.${question.id}.prompt`, question.prompt, "question");
    for (const choice of question.choices ?? [])
      lintField(issues, `questions.${question.id}.choices.${choice.id}`, choice.label, "question");
    lintField(
      issues,
      `questions.${question.id}.answerAuthority`,
      question.answerAuthority.kind === "numeric"
        ? question.answerAuthority.workedAnswer
        : question.answerAuthority.exampleAnswer,
      "lesson",
    );
    const hiddenAnswer =
      question.answerAuthority.kind === "numeric"
        ? `${question.answerAuthority.value} ${question.answerAuthority.unit}`
        : question.answerAuthority.exampleAnswer;
    question.hints.forEach((hint, index) => {
      lintField(issues, `questions.${question.id}.hints.${index}`, hint, "hint", hiddenAnswer);
    });
    if (
      !checkIds.has(question.id) &&
      question.answerAuthority.kind === "numeric" &&
      question.hints.length < 3
    ) {
      issues.push({
        path: `questions.${question.id}.hints`,
        code: "HINT_LADDER_TOO_SHORT",
        severity: "error",
        message:
          "A calculated question needs a three-step hint ladder before its answer may be revealed.",
      });
    }
    issues.push(...choiceIssues(question));
    issues.push(...acceptedIdeaIssues(question));
  }

  issues.push(...multipleChoiceShareIssues(bundle));

  for (const card of bundle.flashcards) {
    for (const id of card.conceptIds) {
      if (!conceptIds.has(id))
        missingReference(issues, `flashcards.${card.id}.conceptIds`, "concept", id);
    }
    for (const id of card.sourceIds) {
      if (!sourceIds.has(id))
        missingReference(issues, `flashcards.${card.id}.sourceIds`, "source", id);
    }
    if (card.questionId !== undefined && !questionIds.has(card.questionId)) {
      missingReference(issues, `flashcards.${card.id}.questionId`, "question", card.questionId);
    }
    lintField(issues, `flashcards.${card.id}.front`, card.front, "question");
    lintField(issues, `flashcards.${card.id}.back`, card.back, "lesson");
    if (card.answerAuthority)
      lintField(
        issues,
        `flashcards.${card.id}.answerAuthority`,
        card.answerAuthority.kind === "numeric"
          ? card.answerAuthority.workedAnswer
          : card.answerAuthority.exampleAnswer,
        "lesson",
      );
    // A card must be answerable on its own (spec v0.2 section 16.1), so a front that only
    // points at surrounding material is reported rather than shipped.
    if (/\b(?:this (?:lesson|circuit|diagram|passage)|the above|as shown)\b/iu.test(card.front)) {
      issues.push({
        path: `flashcards.${card.id}.front`,
        code: "CARD_NEEDS_CONTEXT",
        severity: "error",
        message: "A review card must be answerable without the lesson around it.",
      });
    }
  }

  for (const essay of bundle.essays) {
    for (const id of essay.conceptIds) {
      if (!conceptIds.has(id))
        missingReference(issues, `essays.${essay.id}.conceptIds`, "concept", id);
    }
    for (const id of essay.sourceIds) {
      if (!sourceIds.has(id))
        missingReference(issues, `essays.${essay.id}.sourceIds`, "source", id);
    }
    lintField(issues, `essays.${essay.id}.prompt`, essay.prompt, "question");
    lintField(issues, `essays.${essay.id}.expectedScope`, essay.expectedScope, "lesson");
    essay.successCriteria.forEach((criterion, index) => {
      lintField(issues, `essays.${essay.id}.successCriteria.${index}`, criterion, "lesson");
    });
  }

  issues.push(...unreachableContentIssues(bundle));
  issues.push(
    ...lessonV2Issues(bundle, (path, text, context, hiddenAnswer) =>
      lintField(issues, path, text, context, hiddenAnswer),
    ),
  );

  return {
    passed: issues.every((item) => item.severity !== "error"),
    bundle,
    issues,
  };
}
