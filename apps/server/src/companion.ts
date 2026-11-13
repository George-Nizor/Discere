import type {
  EssayAssessmentDraft,
  EssayCriterionResult,
  EssayStage,
  LearningDiagram,
  LessonResponse,
  NotebookPage,
  Question,
  TutorEnvelopeBase,
  TutorIssue,
  TutoringMode,
  TutorReplyDraft,
  TutorReplyRequest,
  WorkingsReviewDraft,
  WorkingsReviewRequest,
} from "@discere/contracts";
import { LearningDiagramSchema, TutorReplyDraftSchema } from "@discere/contracts";
import { promptSection } from "@discere/prompts";
import { lintText, type WritingContext } from "@discere/writing-engine";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";

/** Named `CompanionIssue` since the copy/paste import raised the first ones; every tutor path
 * now reports the same shape because they share one validation core. */
export type CompanionIssue = TutorIssue;

/**
 * The accountability rules live in `prompts/tutor-system.md`. The packet quotes that file
 * rather than repeating the policy here, so an edited prompt reaches the tutor handoff.
 */
const MODE_SECTIONS: Record<Exclude<TutoringMode, "exam">, string> = {
  coach: "Coach",
  assisted: "Assisted",
  direct: "Direct",
};

export function modePolicy(mode: Exclude<TutoringMode, "exam">): string {
  return promptSection("tutor-system", MODE_SECTIONS[mode]).body;
}

export function buildTutorReplyPayload(
  lesson: LessonResponse,
  request: TutorReplyRequest,
  focusConceptIds?: readonly string[],
  /** The learner asked to be shown a parallel example rather than given a hint. */
  show?: { figure: LearningDiagram | undefined },
) {
  if (request.mode === "exam") {
    throw new Error("ChatGPT assistance is unavailable in Exam mode.");
  }
  const allowedSourceIds = lesson.sources.map((source) => source.id);
  return {
    learnerQuestion: request.question,
    tutoringMode: request.mode,
    responsePolicy: modePolicy(request.mode),
    ...(show
      ? {
          task: promptSection("tutor-system", "Show me").body,
          ...(show.figure ? { figureTemplate: show.figure } : {}),
        }
      : {}),
    ...(focusConceptIds && focusConceptIds.length > 0
      ? { focusConceptIds: [...focusConceptIds] }
      : {}),
    lessonContext: lesson,
    allowedSourceIds,
    sourceRule:
      "Use only allowedSourceIds in payload.sourceIds. Leave sourceIds empty when the response does not rely on a listed source.",
  };
}

/** What the tutor is told about the version a revision replaces. */
export interface PreviousEssayVersion {
  version: number;
  submission: string;
  /** The feedback that version received, or null when it was never assessed. */
  feedback: Pick<
    EssayAssessmentDraft,
    "assessment" | "summary" | "firstMeaningfulError" | "nextStep" | "criteria"
  > | null;
}

const ASSESS_TASK =
  "Assess the learner's submitted writing against each of the successCriteria. Return one entry in criteria for every item in successCriteria, in the same order. Copy the item's text into criterion exactly, set result to met, partly_met or not_met, and put in evidence a short quote from the learner's writing that shows it. When there is nothing to quote, give the reason in one sentence. In the summary, say in two to five plain sentences what the writing does and where it falls short, referring to the learner's own words and without praise. Put the unmet criterion that matters most in firstMeaningfulError, and make nextStep one change the learner can make to this piece. Use correct only when every criterion is met.";

const REVISION_TASK =
  " This is a revision. previousVersion holds the text the learner submitted before and the feedback it received. Assess the new learnerSubmission, and say in the summary whether the problem named in previousVersion.feedback.firstMeaningfulError is now fixed, quoting the words that changed. If it is not fixed, keep it as firstMeaningfulError.";

export function buildEssayAssessmentPayload(
  lesson: LessonResponse,
  stage: EssayStage,
  essay: { content: string; wordCount: number },
  mode: Exclude<TutoringMode, "exam">,
  previousVersion?: PreviousEssayVersion,
) {
  return {
    task: previousVersion ? ASSESS_TASK + REVISION_TASK : ASSESS_TASK,
    tutoringMode: mode,
    responsePolicy: modePolicy(mode),
    essayPrompt: stage.prompt,
    expectedScope: stage.expectedScope,
    successCriteria: stage.successCriteria,
    learnerSubmission: essay.content,
    wordCount: essay.wordCount,
    ...(previousVersion ? { previousVersion } : {}),
    lessonContext: lesson,
    allowedSourceIds: lesson.sources.map((source) => source.id),
    sourceRule:
      "Use only allowedSourceIds in payload.sourceIds. Leave sourceIds empty when the assessment does not rely on a listed source.",
  };
}

function criterionKey(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Lines a reply's per-criterion results up with the task's own list. Each result is matched to a
 * criterion by its text, ignoring case and punctuation. A reply that reworded the criteria but
 * gave one result for each is read in order. Anything else returns null, and the assessment is
 * kept with its overall verdict alone. The returned results carry the task's wording.
 */
export function matchCriteria(
  results: readonly EssayCriterionResult[] | undefined,
  successCriteria: readonly string[],
): EssayCriterionResult[] | null {
  if (!results || results.length === 0 || results.length !== successCriteria.length) return null;
  const byKey = new Map(results.map((entry) => [criterionKey(entry.criterion), entry]));
  const exact = byKey.size === results.length && successCriteria.every((c) => byKey.has(criterionKey(c)));
  return successCriteria.map((criterion, index) => {
    const entry = exact ? byKey.get(criterionKey(criterion)) : results[index];
    // Both lookups are guarded by the length and key checks above.
    const found = entry as EssayCriterionResult;
    return { criterion, result: found.result, evidence: found.evidence };
  });
}

export function buildWorkingsReviewPayload(
  lesson: LessonResponse,
  request: WorkingsReviewRequest,
  notebook: NotebookPage,
) {
  if (request.mode === "exam") {
    throw new Error("ChatGPT assistance is unavailable in Exam mode.");
  }
  return {
    reviewQuestion: request.reviewQuestion,
    tutoringMode: request.mode,
    responsePolicy: modePolicy(request.mode),
    attachment: {
      required: true,
      expectedFilename: `discere-${lesson.lesson.id}-workings.png`,
      instruction:
        "Attach the PNG exported from the Discere notebook before sending this request. Review that image rather than inferring the work from the typed note alone.",
    },
    savedWorkings: {
      pageType: notebook.pageType,
      typedNote: notebook.note,
      strokeCount: notebook.strokes.length,
      savedAt: notebook.updatedAt,
    },
    lessonContext: lesson,
    allowedSourceIds: lesson.sources.map((source) => source.id),
    sourceRule:
      "Use only allowedSourceIds in payload.sourceIds. Leave sourceIds empty when the review does not rely on a listed source.",
  };
}

function hiddenAnswer(question: Question): string {
  if (question.answerAuthority.kind === "numeric") {
    return `${question.answerAuthority.value} ${question.answerAuthority.unit}`;
  }
  return question.answerAuthority.exampleAnswer;
}

/**
 * The answer a tutoring mode keeps hidden, or nothing in Direct mode where the learner may see
 * it. Callers pass this to a provider so a generated draft is checked before it is returned,
 * and the server checks it again when the reply arrives.
 */
export function answerBoundaryFor(
  question: Question,
  mode: Exclude<TutoringMode, "exam">,
): string | undefined {
  if (mode === "direct") return undefined;
  // An essay has no example answer to withhold. An empty string would match every reply.
  const answer = hiddenAnswer(question);
  return answer.trim() === "" ? undefined : answer;
}

function addTextIssues(
  issues: CompanionIssue[],
  field: string,
  text: string,
  context: WritingContext,
  answerBoundary: string | undefined,
): void {
  const result = lintText(text, {
    context,
    ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
  });
  issues.push(
    ...result.violations.map((violation) => ({
      field,
      code: violation.ruleId,
      severity: violation.severity,
      message: violation.message,
    })),
  );
}

function addSourceIssues(
  issues: CompanionIssue[],
  sourceIds: string[],
  lesson: LessonResponse,
  label: string,
): void {
  const allowedSources = new Set(lesson.sources.map((source) => source.id));
  for (const sourceId of sourceIds) {
    if (!allowedSources.has(sourceId)) {
      issues.push({
        field: "sourceIds",
        code: "SOURCE_NOT_ALLOWED",
        severity: "hard",
        message: `${label} referenced source '${sourceId}', which was not supplied with the lesson.`,
      });
    }
  }
}

export function validateTutorReply(input: {
  reply: TutorReplyDraft;
  mode: Exclude<TutoringMode, "exam">;
  lesson: LessonResponse;
  question: Question;
}): CompanionIssue[] {
  const issues: CompanionIssue[] = [];
  const answerBoundary = answerBoundaryFor(input.question, input.mode);
  addTextIssues(issues, "answer", input.reply.answer, "feedback", answerBoundary);
  addTextIssues(
    issues,
    "followUpQuestion",
    input.reply.followUpQuestion,
    "question",
    answerBoundary,
  );
  (input.reply.walkthrough ?? []).forEach((step, index) =>
    addTextIssues(issues, `walkthrough.${index}.text`, step.text, "feedback", answerBoundary),
  );
  addSourceIssues(issues, input.reply.sourceIds, input.lesson, "The tutor reply");
  return issues;
}

/**
 * The figure the learner is looking at when they ask about a question: the figure of the step
 * that asks it, the opener's figure for the hook question, or else the nearest figure earlier in
 * the lesson. A worked example drawn on this figure is drawn on something the learner already
 * knows how to read.
 */
export function tutorFigureFor(
  lesson: LessonResponse,
  questionId: string,
): LearningDiagram | undefined {
  const beat = lesson.lesson;
  if (beat.intro?.hook.questionId === questionId && beat.intro.hook.diagram)
    return beat.intro.hook.diagram;
  const index = beat.steps.findIndex(
    (step) =>
      step.checkQuestionId === questionId ||
      (step.workedSteps ?? []).some(
        (line) =>
          line.blank?.questionId === questionId || line.selfExplain?.questionId === questionId,
      ),
  );
  const before = index === -1 ? beat.steps : beat.steps.slice(0, index + 1);
  return (
    [...before].reverse().find((step) => step.diagram)?.diagram ??
    beat.steps.find((step) => step.diagram)?.diagram ??
    beat.intro?.hook.diagram
  );
}

/**
 * Keeps a walkthrough figure only when it is a valid figure of the same kind as the lesson's,
 * with different values. A figure identical to the lesson's would be the learner's own problem
 * worked in front of them, which Coach mode forbids. Anything dropped leaves the step as text.
 */
export function checkWalkthroughFigures(
  reply: TutorReplyDraft,
  template: LearningDiagram | undefined,
): { reply: TutorReplyDraft; issues: CompanionIssue[] } {
  if (!reply.walkthrough?.length) return { reply, issues: [] };
  const issues: CompanionIssue[] = [];
  const own = template ? JSON.stringify(template) : undefined;
  const walkthrough = reply.walkthrough.map((step, index) => {
    if (!step.figure) return step;
    const parsed = LearningDiagramSchema.safeParse(step.figure);
    const reason = !template
      ? "This lesson has no figure to draw the example on."
      : !parsed.success
        ? "The example's figure did not match the figure format."
        : parsed.data.type !== template.type
          ? `The example used a '${parsed.data.type}' figure; the lesson's is '${template.type}'.`
          : JSON.stringify(parsed.data) === own
            ? "The example's figure was the learner's own problem."
            : undefined;
    if (!reason) return { ...step, figure: parsed.data as Record<string, unknown> };
    issues.push({
      field: `walkthrough.${index}.figure`,
      code: "WALKTHROUGH_FIGURE_DROPPED",
      severity: "warning",
      message: reason,
    });
    return { text: step.text };
  });
  return { reply: { ...reply, walkthrough }, issues };
}

export interface TutorReplyAcceptance {
  accepted: boolean;
  operation: "tutor_reply";
  requestId: string;
  issues: CompanionIssue[];
  reply: TutorReplyDraft;
}

/**
 * The single gate every tutor reply passes, whether the learner pasted it back from ChatGPT or
 * a local provider generated it in process. Both routes call this so the mode guardrail,
 * request correlation, payload shape, prose lint, answer-leak check, and source allowlist can
 * never drift apart between the two paths.
 */
export function acceptTutorReply(input: {
  envelope: TutorEnvelopeBase;
  expectedRequestId: string;
  mode: TutoringMode;
  lesson: LessonResponse;
  question: Question;
  store?: DiscereStore;
  attemptId?: string | undefined;
}): TutorReplyAcceptance {
  if (input.mode === "exam") {
    throw new HttpError(403, "ChatGPT assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
  }
  if (input.envelope.operation !== "tutor_reply") {
    throw new HttpError(400, "The response is not a tutor reply.", "COMPANION_OPERATION_MISMATCH");
  }
  if (input.envelope.requestId !== input.expectedRequestId) {
    throw new HttpError(
      409,
      "This response belongs to a different tutor request. Copy the latest prompt and try again.",
      "COMPANION_REQUEST_MISMATCH",
    );
  }
  const checked = checkWalkthroughFigures(
    TutorReplyDraftSchema.parse(input.envelope.payload),
    tutorFigureFor(input.lesson, input.question.id),
  );
  const reply = checked.reply;
  const issues = [
    ...validateTutorReply({
      reply,
      mode: input.mode,
      lesson: input.lesson,
      question: input.question,
    }),
    ...checked.issues,
  ];
  const accepted = issues.every((issue) => issue.severity !== "hard");
  let attemptId = input.attemptId;
  if (accepted && input.store && !attemptId) {
    const conceptMastery = Object.fromEntries(
      input.question.conceptIds.map((id) => [id, input.store!.getMastery(id)]),
    );
    attemptId =
      input.store.getOpenAttempt(input.question.id, input.mode)?.id ??
      input.store.saveAttempt({
        questionId: input.question.id,
        mode: input.mode,
        response: "",
        correct: false,
        feedback: "",
        xpAwarded: 0,
        mastery: Math.min(...Object.values(conceptMastery)),
        conceptIds: input.question.conceptIds,
        conceptMastery,
        independent: false,
      }).id;
  }
  if (input.store && attemptId) {
    input.store.recordTutorAssistance(
      attemptId,
      `${input.mode}:${accepted ? "accepted" : "rejected"}`,
    );
  }
  return { accepted, operation: "tutor_reply", requestId: input.envelope.requestId, issues, reply };
}

/** A writing task has no hidden answer, so its assessment is checked for style and sources only. */
export function validateEssayAssessment(input: {
  assessment: EssayAssessmentDraft;
  lesson: LessonResponse;
}): CompanionIssue[] {
  const issues: CompanionIssue[] = [];
  addTextIssues(issues, "summary", input.assessment.summary, "assessment", undefined);
  addTextIssues(issues, "nextStep", input.assessment.nextStep, "hint", undefined);
  if (input.assessment.firstMeaningfulError) {
    addTextIssues(
      issues,
      "firstMeaningfulError",
      input.assessment.firstMeaningfulError,
      "feedback",
      undefined,
    );
  }
  addSourceIssues(issues, input.assessment.sourceIds, input.lesson, "The essay assessment");
  if (
    (input.assessment.assessment === "partly_correct" ||
      input.assessment.assessment === "incorrect") &&
    input.assessment.firstMeaningfulError === null
  ) {
    issues.push({
      field: "firstMeaningfulError",
      code: "FIRST_ERROR_REQUIRED",
      severity: "hard",
      message:
        "An incorrect or partly correct assessment must identify the first meaningful error.",
    });
  }
  return issues;
}

export function validateWorkingsReview(input: {
  review: WorkingsReviewDraft;
  mode: Exclude<TutoringMode, "exam">;
  lesson: LessonResponse;
  question: Question;
}): CompanionIssue[] {
  const issues: CompanionIssue[] = [];
  const answerBoundary = answerBoundaryFor(input.question, input.mode);

  addTextIssues(issues, "feedback", input.review.feedback, "feedback", answerBoundary);
  addTextIssues(issues, "nextStep", input.review.nextStep, "hint", answerBoundary);
  if (input.review.firstMeaningfulError) {
    addTextIssues(
      issues,
      "firstMeaningfulError",
      input.review.firstMeaningfulError,
      "feedback",
      answerBoundary,
    );
  }
  addSourceIssues(issues, input.review.sourceIds, input.lesson, "The workings review");

  if (!input.review.imageReviewed) {
    issues.push({
      field: "imageReviewed",
      code: "IMAGE_NOT_REVIEWED",
      severity: "hard",
      message: "The response did not confirm that a usable workings image was reviewed.",
    });
  }
  if (input.review.transcriptionConfidence < 0.55 && input.review.assessment !== "unclear") {
    issues.push({
      field: "assessment",
      code: "LOW_CONFIDENCE_OVERCLAIM",
      severity: "hard",
      message: "Low-confidence transcription must use the 'unclear' assessment state.",
    });
  }
  if (
    (input.review.assessment === "partly_correct" || input.review.assessment === "incorrect") &&
    input.review.firstMeaningfulError === null
  ) {
    issues.push({
      field: "firstMeaningfulError",
      code: "FIRST_ERROR_REQUIRED",
      severity: "hard",
      message: "An incorrect or partly correct review must identify the first meaningful error.",
    });
  }
  if (input.review.assessment === "correct" && input.review.firstMeaningfulError !== null) {
    issues.push({
      field: "firstMeaningfulError",
      code: "CORRECT_REVIEW_HAS_ERROR",
      severity: "warning",
      message:
        "A review marked correct also identifies an error. Check that the assessment is consistent.",
    });
  }
  if (
    input.review.imageReviewed &&
    input.review.transcriptionConfidence >= 0.55 &&
    input.review.transcription.length === 0
  ) {
    issues.push({
      field: "transcription",
      code: "TRANSCRIPTION_REQUIRED",
      severity: "hard",
      message: "A confident image review must include a transcription of the visible working.",
    });
  }

  return issues;
}
