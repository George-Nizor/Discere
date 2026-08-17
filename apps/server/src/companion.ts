import type { LessonResponse, Question, TutorReplyDraft, TutorReplyRequest, TutoringMode } from "@discere/contracts";
import { lintText } from "@discere/writing-engine";

export interface CompanionIssue {
  field: string;
  code: string;
  severity: "hard" | "warning";
  message: string;
}

const MODE_POLICY: Record<Exclude<TutoringMode, "exam">, string> = {
  coach: "Help the learner make the next useful step. Ask or answer directly enough to unblock them, but do not state the final answer to the active assessment.",
  assisted: "Give a stronger explanation or partial worked step. Do not state the final answer to the active assessment.",
  direct: "Answer the learner's question directly. Show concise working when a calculation or causal explanation benefits from it.",
};

export function buildTutorReplyPayload(lesson: LessonResponse, request: TutorReplyRequest) {
  if (request.mode === "exam") throw new Error("ChatGPT assistance is unavailable in Exam mode.");
  return {
    learnerQuestion: request.question,
    tutoringMode: request.mode,
    responsePolicy: MODE_POLICY[request.mode],
    lessonContext: lesson,
    allowedSourceIds: lesson.sources.map((source) => source.id),
    sourceRule: "Use only allowedSourceIds in payload.sourceIds. Leave sourceIds empty when the response does not rely on a listed source.",
  };
}

function hiddenAnswer(question: Question): string {
  if (question.answerAuthority.kind === "numeric") {
    return `${question.answerAuthority.value} ${question.answerAuthority.unit}`;
  }
  return question.answerAuthority.exampleAnswer;
}

export function validateTutorReply(input: {
  reply: TutorReplyDraft;
  mode: Exclude<TutoringMode, "exam">;
  lesson: LessonResponse;
  question: Question;
}): CompanionIssue[] {
  const issues: CompanionIssue[] = [];
  const answerBoundary = input.mode === "direct" ? undefined : hiddenAnswer(input.question);
  const answerResult = lintText(input.reply.answer, {
    context: "feedback",
    ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
  });
  issues.push(...answerResult.violations.map((violation) => ({
    field: "answer",
    code: violation.ruleId,
    severity: violation.severity,
    message: violation.message,
  })));

  const questionResult = lintText(input.reply.followUpQuestion, {
    context: "question",
    ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
  });
  issues.push(...questionResult.violations.map((violation) => ({
    field: "followUpQuestion",
    code: violation.ruleId,
    severity: violation.severity,
    message: violation.message,
  })));

  const allowedSources = new Set(input.lesson.sources.map((source) => source.id));
  for (const sourceId of input.reply.sourceIds) {
    if (!allowedSources.has(sourceId)) {
      issues.push({
        field: "sourceIds",
        code: "SOURCE_NOT_ALLOWED",
        severity: "hard",
        message: `The tutor reply referenced source '${sourceId}', which was not supplied with the lesson.`,
      });
    }
  }

  return issues;
}
