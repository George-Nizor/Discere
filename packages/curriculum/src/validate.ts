import { CourseBundleSchema, type CourseBundle } from "@discere/contracts";
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
  const prerequisiteIds = new Map(bundle.concepts.map((concept) => [concept.id, concept.prerequisiteIds]));
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
      if (!conceptIds.has(id)) missingReference(issues, `concepts.${concept.id}.prerequisiteIds`, "concept", id);
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
      if (!conceptIds.has(id)) missingReference(issues, `lessons.${lesson.id}.conceptIds`, "concept", id);
    }
    for (const id of lesson.sourceIds) {
      if (!sourceIds.has(id)) missingReference(issues, `lessons.${lesson.id}.sourceIds`, "source", id);
    }
    for (const id of lesson.visualBrief.sourceIds) {
      if (!sourceIds.has(id)) missingReference(issues, `lessons.${lesson.id}.visualBrief.sourceIds`, "source", id);
    }
    if (!activityIds.has(lesson.activityId)) {
      missingReference(issues, `lessons.${lesson.id}.activityId`, "activity", lesson.activityId);
    }
    if (!questionIds.has(lesson.questionId)) {
      missingReference(issues, `lessons.${lesson.id}.questionId`, "question", lesson.questionId);
    }
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
  }

  for (const activity of bundle.activities) {
    for (const id of activity.conceptIds) {
      if (!conceptIds.has(id)) missingReference(issues, `activities.${activity.id}.conceptIds`, "concept", id);
    }
    lintField(issues, `activities.${activity.id}.instructions`, activity.instructions, "lesson");
    lintField(issues, `activities.${activity.id}.predictionPrompt`, activity.predictionPrompt, "question");
  }

  for (const question of bundle.questions) {
    for (const id of question.conceptIds) {
      if (!conceptIds.has(id)) missingReference(issues, `questions.${question.id}.conceptIds`, "concept", id);
    }
    for (const id of question.sourceIds) {
      if (!sourceIds.has(id)) missingReference(issues, `questions.${question.id}.sourceIds`, "source", id);
    }
    lintField(issues, `questions.${question.id}.prompt`, question.prompt, "question");
    const hiddenAnswer =
      question.answerAuthority.kind === "numeric"
        ? `${question.answerAuthority.value} ${question.answerAuthority.unit}`
        : question.answerAuthority.exampleAnswer;
    question.hints.forEach((hint, index) => {
      lintField(issues, `questions.${question.id}.hints.${index}`, hint, "hint", hiddenAnswer);
    });
  }

  return {
    passed: issues.every((item) => item.severity !== "error"),
    bundle,
    issues,
  };
}
