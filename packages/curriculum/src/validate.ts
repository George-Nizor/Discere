import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  CourseBundleSchema,
  REDISTRIBUTABLE_LICENCE_PATTERN,
  timelineActivityIssues,
} from "@discere/contracts";
import { inspectVisualBrief } from "@discere/visual-engine";
import { lintText, type WritingContext } from "@discere/writing-engine";

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
function multipleChoiceShareIssues(bundle: CourseBundle): ContentIssue[] {
  if (bundle.questions.length === 0) return [];
  const selected = bundle.questions.filter(
    (question) => (question.choices?.length ?? 0) > 0,
  ).length;
  const share = selected / bundle.questions.length;
  if (share <= 0.35) return [];
  return [
    {
      path: "questions",
      code: "MULTIPLE_CHOICE_SHARE",
      severity: "error",
      message: `${selected} of ${bundle.questions.length} questions are multiple choice (${Math.round(share * 100)}%). The limit is 35%.`,
    },
  ];
}

/** Authored material no lesson reaches is a drafting slip worth reporting, not a failure. */
function unreachableContentIssues(bundle: CourseBundle): ContentIssue[] {
  const usedActivities = new Set(bundle.lessons.map((lesson) => lesson.activityId));
  const usedQuestions = new Set(bundle.lessons.flatMap((lesson) => lesson.questionIds));
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
    for (const id of lesson.visualBrief.sourceIds) {
      if (!sourceIds.has(id))
        missingReference(issues, `lessons.${lesson.id}.visualBrief.sourceIds`, "source", id);
    }
    if (!activityIds.has(lesson.activityId)) {
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
    for (const visualIssue of inspectVisualBrief(lesson.visualBrief)) {
      issues.push({
        path: `lessons.${lesson.id}.visualBrief`,
        code: visualIssue.code,
        severity: "error",
        message: visualIssue.message,
      });
    }
    lintField(issues, `lessons.${lesson.id}.orientation`, lesson.orientation, "lesson");
    lintField(issues, `lessons.${lesson.id}.explanation`, lesson.explanation, "lesson");
    lintField(issues, `lessons.${lesson.id}.takeaway`, lesson.takeaway, "lesson");
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
    lintField(
      issues,
      `activities.${activity.id}.predictionPrompt`,
      activity.predictionPrompt,
      "question",
    );
  }

  for (const question of bundle.questions) {
    for (const id of question.conceptIds) {
      if (!conceptIds.has(id))
        missingReference(issues, `questions.${question.id}.conceptIds`, "concept", id);
    }
    for (const id of question.sourceIds) {
      if (!sourceIds.has(id))
        missingReference(issues, `questions.${question.id}.sourceIds`, "source", id);
    }
    lintField(issues, `questions.${question.id}.prompt`, question.prompt, "question");
    const hiddenAnswer =
      question.answerAuthority.kind === "numeric"
        ? `${question.answerAuthority.value} ${question.answerAuthority.unit}`
        : question.answerAuthority.exampleAnswer;
    question.hints.forEach((hint, index) => {
      lintField(issues, `questions.${question.id}.hints.${index}`, hint, "hint", hiddenAnswer);
    });
    if (question.answerAuthority.kind === "numeric" && question.hints.length < 3) {
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

  return {
    passed: issues.every((item) => item.severity !== "error"),
    bundle,
    issues,
  };
}
