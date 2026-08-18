import type {
  LessonResponse,
  NotebookPage,
  Question,
  TutorReplyDraft,
  TutorReplyRequest,
  TutoringMode,
  WorkingsReviewDraft,
  WorkingsReviewRequest,
} from "@discere/contracts";
import { promptSection } from "@discere/prompts";
import { lintText, type WritingContext } from "@discere/writing-engine";

export interface CompanionIssue {
  field: string;
  code: string;
  severity: "hard" | "warning";
  message: string;
}

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

export function buildTutorReplyPayload(lesson: LessonResponse, request: TutorReplyRequest) {
  if (request.mode === "exam") {
    throw new Error("ChatGPT assistance is unavailable in Exam mode.");
  }
  return {
    learnerQuestion: request.question,
    tutoringMode: request.mode,
    responsePolicy: modePolicy(request.mode),
    lessonContext: lesson,
    allowedSourceIds: lesson.sources.map((source) => source.id),
    sourceRule:
      "Use only allowedSourceIds in payload.sourceIds. Leave sourceIds empty when the response does not rely on a listed source.",
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
  const answerBoundary = input.mode === "direct" ? undefined : hiddenAnswer(input.question);
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

export function validateWorkingsReview(input: {
  review: WorkingsReviewDraft;
  mode: Exclude<TutoringMode, "exam">;
  lesson: LessonResponse;
  question: Question;
}): CompanionIssue[] {
  const issues: CompanionIssue[] = [];
  const answerBoundary = input.mode === "direct" ? undefined : hiddenAnswer(input.question);

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
