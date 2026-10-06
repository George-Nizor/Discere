import type { CourseBundle, LessonBeat, Question, RichTextBlock } from "@discere/contracts";
import { LESSON_V2_STEP_KINDS } from "@discere/contracts";
import type { WritingContext } from "@discere/writing-engine";
import type { ContentIssue } from "./validate.js";

/**
 * Rules for lesson schema v2 (docs/learning-experience §7). A lesson is v2 when it has an
 * `intro`; the legacy rules keep applying to every other lesson, so the 18 courses written
 * before v2 validate unchanged while they are migrated one at a time.
 *
 * What is checked here is what can be checked mechanically:
 * - the anatomy: opener and close, typed steps, three skill-check items, word limits;
 * - references inside the new fields resolve;
 * - vocabulary order: a term an `explain` step introduces is not used by an earlier screen,
 *   and a question's declared `usesTerms` are introduced before it (spec §7.3 rule 1);
 * - scope: a graded item's `skill` is taught by this lesson or an earlier one (rule 2);
 * - every figure in a graded step declares its answer visibility (rule 3);
 * - a course's first lesson does not open with a graded `try` (rule 4).
 * Whether the teaching is any good is the review's job, not the validator's.
 */

type Lint = (path: string, text: string, context: WritingContext, hiddenAnswer?: string) => void;

export const LEAD_WORD_LIMIT = 60;
export const ONE_LINE_WORD_LIMIT = 25;
export const WHY_WORD_LIMIT = 20;
export const SKILL_CHECK_SIZE = 3;

function words(text: string): number {
  return text
    .replace(/\$[^$]*\$/gu, "x")
    .split(/\s+/u)
    .filter(Boolean).length;
}

function blockWords(blocks: readonly RichTextBlock[]): number {
  return blocks.reduce(
    (sum, block) =>
      sum +
      (block.kind === "equation"
        ? 0
        : words(block.kind === "definition" ? `${block.term} ${block.text}` : block.text)),
    0,
  );
}

function blockText(blocks: readonly RichTextBlock[] | undefined): string {
  return (blocks ?? [])
    .map((block) =>
      block.kind === "equation"
        ? block.latex
        : block.kind === "definition"
          ? `${block.term} ${block.text}`
          : block.text,
    )
    .join(" ");
}

/** True when a term appears as a whole word or phrase, ignoring case and maths delimiters. */
export function mentionsTerm(text: string, term: string): boolean {
  const plain = ` ${text.toLocaleLowerCase().replace(/[$*_]/gu, " ")} `;
  const needle = term.toLocaleLowerCase().trim();
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:s|es)?(?=$|[^\\p{L}\\p{N}])`, "u").test(
    plain,
  );
}

export function isV2Lesson(lesson: LessonBeat): boolean {
  return lesson.intro !== undefined;
}

/** Every question a lesson asks, wherever it is asked. */
export function lessonQuestionRefs(lesson: LessonBeat): string[] {
  return [
    ...lesson.questionIds,
    ...(lesson.intro?.hook.questionId ? [lesson.intro.hook.questionId] : []),
    ...(lesson.intro?.warmUpQuestionId ? [lesson.intro.warmUpQuestionId] : []),
    ...lesson.steps.flatMap((step) => [
      step.checkQuestionId,
      ...(step.workedSteps ?? []).flatMap((line) => [
        line.blank?.questionId ?? "",
        line.selfExplain?.questionId ?? "",
      ]),
    ]),
  ].filter(Boolean);
}

/** Checks that apply to the new fields wherever they appear, v2 lesson or not. */
function referenceIssues(
  lesson: LessonBeat,
  questions: ReadonlyMap<string, Question>,
  issues: ContentIssue[],
): void {
  const at = `lessons.${lesson.id}`;
  const ref = (path: string, id: string | undefined) => {
    if (id && !questions.has(id))
      issues.push({
        path,
        code: "MISSING_REFERENCE",
        severity: "error",
        message: `Unknown question '${id}'.`,
      });
  };
  ref(`${at}.intro.hook.questionId`, lesson.intro?.hook.questionId);
  ref(`${at}.intro.warmUpQuestionId`, lesson.intro?.warmUpQuestionId);
  for (const step of lesson.steps) {
    (step.workedSteps ?? []).forEach((line, index) => {
      ref(`${at}.steps.${step.id}.workedSteps.${index}.blank`, line.blank?.questionId);
      ref(`${at}.steps.${step.id}.workedSteps.${index}.selfExplain`, line.selfExplain?.questionId);
    });
    if (step.blocks.length === 0 && !step.lead && !step.headline) {
      issues.push({
        path: `${at}.steps.${step.id}`,
        code: "STEP_WITHOUT_TEXT",
        severity: "error",
        message: `Step '${step.id}' has no prose: give it blocks (legacy) or a lead or headline (v2).`,
      });
    }
  }
}

function misconceptionIssues(question: Question, issues: ContentIssue[]): void {
  question.misconceptions?.forEach((misconception, index) => {
    const at = `questions.${question.id}.misconceptions.${index}`;
    const { numeric, choiceIds } = misconception.match;
    const authority = question.answerAuthority;
    if (
      numeric &&
      authority.kind === "numeric" &&
      numeric.some((value) => value === authority.value)
    )
      issues.push({
        path: at,
        code: "MISCONCEPTION_IS_KEY",
        severity: "error",
        message: "A misconception cannot match the correct answer.",
      });
    for (const id of choiceIds ?? [])
      if (!question.choices?.some((choice) => choice.id === id))
        issues.push({
          path: at,
          code: "MISSING_REFERENCE",
          severity: "error",
          message: `Unknown choice '${id}'.`,
        });
  });
  if (question.onCorrect && words(question.onCorrect) > ONE_LINE_WORD_LIMIT)
    issues.push({
      path: `questions.${question.id}.onCorrect`,
      code: "ON_CORRECT_TOO_LONG",
      severity: "error",
      message: `onCorrect is ${words(question.onCorrect)} words; keep it to ${ONE_LINE_WORD_LIMIT}.`,
    });
}

/** The anatomy and ordering rules for one v2 lesson. */
function v2LessonIssues(
  lesson: LessonBeat,
  lessonIndex: number,
  bundle: CourseBundle,
  questions: ReadonlyMap<string, Question>,
  issues: ContentIssue[],
): void {
  const at = `lessons.${lesson.id}`;
  const push = (
    path: string,
    code: string,
    message: string,
    severity: "error" | "warning" = "error",
  ) => issues.push({ path, code, severity, message });
  const intro = lesson.intro;
  if (!intro) return;

  if (!lesson.recap) push(`${at}.recap`, "V2_MISSING_CLOSE", "A v2 lesson needs a close (recap).");
  if (words(intro.promise) > ONE_LINE_WORD_LIMIT)
    push(
      `${at}.intro.promise`,
      "PROMISE_TOO_LONG",
      `The promise is ${words(intro.promise)} words; keep it to ${ONE_LINE_WORD_LIMIT}.`,
    );
  if (!/\byou(?:'|’)ll\b|\byou will\b/iu.test(intro.promise))
    push(
      `${at}.intro.promise`,
      "PROMISE_VOICE",
      "Write the promise in the learner's voice: “By the end you'll …”.",
      "warning",
    );
  if (intro.whyItMatters && words(intro.whyItMatters) > WHY_WORD_LIMIT)
    push(
      `${at}.intro.whyItMatters`,
      "WHY_TOO_LONG",
      `Keep “why it matters” to ${WHY_WORD_LIMIT} words.`,
    );
  if (lesson.questionIds.length !== SKILL_CHECK_SIZE)
    push(
      `${at}.questionIds`,
      "SKILL_CHECK_SIZE",
      `A v2 lesson ends on a ${SKILL_CHECK_SIZE}-item skill check; it has ${lesson.questionIds.length}.`,
    );

  for (const step of lesson.steps) {
    const sat = `${at}.steps.${step.id}`;
    if (!(LESSON_V2_STEP_KINDS as readonly string[]).includes(step.kind))
      push(
        sat,
        "V2_LEGACY_KIND",
        `Step kind '${step.kind}' is legacy; use explore, predict, explain, worked_example, faded_example, try or transfer.`,
      );
    if (step.blocks.some((block) => block.kind === "heading"))
      push(sat, "V2_HEADING_BLOCK", "Heading blocks are not valid in a v2 step; use an eyebrow.");
    if (step.lead && blockWords(step.lead) > LEAD_WORD_LIMIT)
      push(
        `${sat}.lead`,
        "LEAD_TOO_LONG",
        `The lead is ${blockWords(step.lead)} words; keep it to ${LEAD_WORD_LIMIT}.`,
      );
    if (
      (step.kind === "explain" ||
        step.kind === "worked_example" ||
        step.kind === "faded_example") &&
      !step.headline
    )
      push(
        sat,
        "STEP_MISSING_HEADLINE",
        `A ${step.kind} step needs a headline: the key idea, or the problem being worked.`,
      );
    if (
      (step.kind === "worked_example" || step.kind === "faded_example") &&
      !step.workedSteps?.length
    )
      push(sat, "STEP_MISSING_WORKED_LINES", `A ${step.kind} step needs workedSteps.`);
    if (step.kind === "faded_example" && !step.workedSteps?.some((line) => line.blank))
      push(sat, "FADED_WITHOUT_BLANK", "A faded example leaves at least one line for the learner.");
    if (
      (step.kind === "predict" ||
        step.kind === "try" ||
        step.kind === "transfer" ||
        step.kind === "explore") &&
      !step.checkQuestionId
    )
      push(sat, "STEP_MISSING_QUESTION", `A ${step.kind} step needs a question.`);
    const graded =
      Boolean(step.checkQuestionId) || Boolean(step.workedSteps?.some((line) => line.blank));
    if (graded && step.diagram && !step.answerVisibility)
      push(
        `${sat}.diagram`,
        "ANSWER_VISIBILITY_UNDECLARED",
        "A figure in a graded step declares answerVisibility: hidden-until-response, or live for an explore step.",
      );
    if (step.answerVisibility === "live" && step.kind !== "explore")
      push(
        `${sat}.answerVisibility`,
        "LIVE_FIGURE_OUTSIDE_EXPLORE",
        "Only an explore step may show a live figure: anywhere else it prints the answer.",
      );
  }
  if (lessonIndex === 0 && lesson.steps[0]?.kind === "try")
    push(
      `${at}.steps`,
      "FIRST_LESSON_OPENS_WITH_TRY",
      "A course's first lesson cannot open with a graded try.",
    );
  if (!lesson.steps.some((step) => step.kind === "transfer"))
    push(`${at}.steps`, "V2_WITHOUT_TRANSFER", "A v2 lesson needs at least one transfer step.");

  // Vocabulary order (rule 1). The opener and each screen are read in order; a term an explain
  // step introduces must not appear in anything the learner is asked to act on before it.
  const screens: Array<{ path: string; text: string; usesTerms: string[] }> = [];
  const hookQuestion = intro.hook.questionId ? questions.get(intro.hook.questionId) : undefined;
  screens.push({
    path: `${at}.intro`,
    text: `${blockText(intro.hook.blocks)} ${hookQuestion?.prompt ?? ""}`,
    usesTerms: hookQuestion?.usesTerms ?? [],
  });
  const introducedAt = new Map<string, number>();
  lesson.steps.forEach((step, index) => {
    const question = step.checkQuestionId ? questions.get(step.checkQuestionId) : undefined;
    const lineQuestions = (step.workedSteps ?? []).flatMap((line) =>
      [line.blank?.questionId, line.selfExplain?.questionId].flatMap((id) => {
        const found = id ? questions.get(id) : undefined;
        return found ? [found] : [];
      }),
    );
    screens.push({
      path: `${at}.steps.${step.id}`,
      text: [question?.prompt ?? "", ...lineQuestions.map((item) => item.prompt)].join(" "),
      usesTerms: [question, ...lineQuestions].flatMap((item) => item?.usesTerms ?? []),
    });
    for (const term of step.introducesTerms ?? [])
      if (!introducedAt.has(term.toLocaleLowerCase()))
        introducedAt.set(term.toLocaleLowerCase(), index + 1);
  });
  screens.forEach((screen, position) => {
    for (const [term, introduced] of introducedAt) {
      if (position < introduced && mentionsTerm(screen.text, term))
        push(
          screen.path,
          "TERM_BEFORE_INTRODUCTION",
          `“${term}” is asked about here, before the step that introduces it.`,
          "warning",
        );
    }
    for (const term of screen.usesTerms) {
      const introduced = introducedAt.get(term.toLocaleLowerCase());
      if (introduced === undefined || introduced > position)
        push(
          screen.path,
          "TERM_NOT_INTRODUCED",
          `The question uses “${term}”, which no earlier explain step introduces.`,
        );
    }
  });

  // Scope (rule 2): graded items require a skill this lesson or an earlier one teaches.
  const earlierSkills = new Set(
    bundle.lessons.slice(0, lessonIndex + 1).flatMap((item) => item.taughtSkills ?? []),
  );
  if (!lesson.taughtSkills?.length)
    push(
      `${at}.taughtSkills`,
      "V2_MISSING_SKILLS",
      "Name the skills this lesson teaches, so its items can be checked against them.",
      "warning",
    );
  for (const id of lessonQuestionRefs(lesson)) {
    const question = questions.get(id);
    if (!question) continue;
    if (!question.skill) {
      push(
        `questions.${id}.skill`,
        "ITEM_WITHOUT_SKILL",
        "Tag the skill this item requires.",
        "warning",
      );
      continue;
    }
    if (lesson.taughtSkills?.length && !earlierSkills.has(question.skill))
      push(
        `questions.${id}.skill`,
        "ITEM_OUTSIDE_SCOPE",
        `Item requires '${question.skill}', which neither this lesson nor an earlier one teaches.`,
      );
  }
}

/** All v2 issues for a bundle, including lint of the new learner-facing strings. */
export function lessonV2Issues(bundle: CourseBundle, lint: Lint): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const questions = new Map(bundle.questions.map((question) => [question.id, question]));
  bundle.lessons.forEach((lesson, index) => {
    referenceIssues(lesson, questions, issues);
    v2LessonIssues(lesson, index, bundle, questions, issues);
    const at = `lessons.${lesson.id}`;
    const lintBlocks = (path: string, blocks: readonly RichTextBlock[] | undefined) =>
      (blocks ?? []).forEach((block, i) => {
        if (block.kind === "equation") return;
        if (block.kind === "definition") lint(`${path}.${i}.term`, block.term, "lesson");
        lint(`${path}.${i}.text`, block.text, "lesson");
      });
    if (lesson.intro) {
      lintBlocks(`${at}.intro.hook.blocks`, lesson.intro.hook.blocks);
      lint(`${at}.intro.promise`, lesson.intro.promise, "lesson");
      if (lesson.intro.whyItMatters)
        lint(`${at}.intro.whyItMatters`, lesson.intro.whyItMatters, "lesson");
    }
    if (lesson.recap) {
      lint(`${at}.recap.keyIdea`, lesson.recap.keyIdea, "lesson");
      lintBlocks(`${at}.recap.blocks`, lesson.recap.blocks);
      if (lesson.recap.nextHook) lint(`${at}.recap.nextHook`, lesson.recap.nextHook, "lesson");
    }
    for (const step of lesson.steps) {
      const sat = `${at}.steps.${step.id}`;
      if (step.headline) lint(`${sat}.headline`, step.headline, "lesson");
      if (step.eyebrow) lint(`${sat}.eyebrow`, step.eyebrow, "lesson");
      lintBlocks(`${sat}.lead`, step.lead);
      lintBlocks(`${sat}.reveal`, step.reveal);
      (step.workedSteps ?? []).forEach((line, i) =>
        lint(`${sat}.workedSteps.${i}.text`, line.text, "lesson"),
      );
    }
  });
  for (const question of bundle.questions) {
    misconceptionIssues(question, issues);
    const hiddenAnswer =
      question.answerAuthority.kind === "numeric"
        ? `${question.answerAuthority.value} ${question.answerAuthority.unit}`
        : question.answerAuthority.exampleAnswer;
    if (question.onCorrect)
      lint(`questions.${question.id}.onCorrect`, question.onCorrect, "lesson");
    // Misconception feedback is shown before the answer, so it must not give it away.
    question.misconceptions?.forEach((item, index) =>
      lint(
        `questions.${question.id}.misconceptions.${index}.feedback`,
        item.feedback,
        "hint",
        hiddenAnswer,
      ),
    );
  }
  return issues;
}
