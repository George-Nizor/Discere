import type {
  EssayAssessmentDraft,
  EssayStage,
  LessonResponse,
  NotebookPage,
  Question,
  TutorEnvelopeBase,
  TutorIssue,
  TutorReplyDraft,
  TutorReplyRequest,
  TutoringMode,
  WorkingsReviewDraft,
  WorkingsReviewRequest,
} from "@discere/contracts";
import { TutorReplyDraftSchema } from "@discere/contracts";
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
) {
  if (request.mode === "exam") {
    throw new Error("ChatGPT assistance is unavailable in Exam mode.");
  }
  return {
    learnerQuestion: request.question,
    tutoringMode: request.mode,
    responsePolicy: modePolicy(request.mode),
    ...(focusConceptIds && focusConceptIds.length > 0
      ? { focusConceptIds: [...focusConceptIds] }
      : {}),
    lessonContext: lesson,
    allowedSourceIds: lesson.sources.map((source) => source.id),
    sourceRule:
      "Use only allowedSourceIds in payload.sourceIds. Leave sourceIds empty when the response does not rely on a listed source.",
  };
}

export function buildEssayAssessmentPayload(
  lesson: LessonResponse,
  stage: EssayStage,
  essay: { content: string; wordCount: number },
  mode: Exclude<TutoringMode, "exam">,
) {
  return {
    task: "Assess the learner's submitted teach-back.",
    tutoringMode: mode,
    responsePolicy: modePolicy(mode),
    essayPrompt: stage.prompt,
    expectedScope: stage.expectedScope,
    successCriteria: stage.successCriteria,
    learnerSubmission: essay.content,
    wordCount: essay.wordCount,
    lessonContext: lesson,
    allowedSourceIds: lesson.sources.map((source) => source.id),
    sourceRule:
      "Use only allowedSourceIds in payload.sourceIds. Leave sourceIds empty when the assessment does not rely on a listed source.",
  };
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
  return mode === "direct" ? undefined : hiddenAnswer(question);
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
  addSourceIssues(issues, input.reply.sourceIds, input.lesson, "The tutor reply");
  return issues;
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
  const reply = TutorReplyDraftSchema.parse(input.envelope.payload);
  const issues = validateTutorReply({
    reply,
    mode: input.mode,
    lesson: input.lesson,
    question: input.question,
  });
  const accepted = issues.every((issue) => issue.severity !== "hard");
  if (input.store && input.attemptId) {
    input.store.recordTutorAssistance(
      input.attemptId,
      `${input.mode}:${accepted ? "accepted" : "rejected"}`,
    );
  }
  return { accepted, operation: "tutor_reply", requestId: input.envelope.requestId, issues, reply };
}

export function validateEssayAssessment(input: {
  assessment: EssayAssessmentDraft;
  mode: Exclude<TutoringMode, "exam">;
  lesson: LessonResponse;
  question: Question;
}): CompanionIssue[] {
  const issues: CompanionIssue[] = [];
  const answerBoundary = answerBoundaryFor(input.question, input.mode);
  addTextIssues(issues, "summary", input.assessment.summary, "assessment", answerBoundary);
  addTextIssues(issues, "nextStep", input.assessment.nextStep, "hint", answerBoundary);
  if (input.assessment.firstMeaningfulError) {
    addTextIssues(
      issues,
      "firstMeaningfulError",
      input.assessment.firstMeaningfulError,
      "feedback",
      answerBoundary,
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
      message: "A review marked correct also identifies an error. Check that the assessment is consistent.",
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
