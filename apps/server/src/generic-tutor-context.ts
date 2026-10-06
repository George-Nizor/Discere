import { learnerQuestion, type LessonResponse, type TutoringMode } from "@discere/contracts";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";

/** Resolve the requested teaching question within its lesson and locked attempt. */
export function genericTutorContext(
  content: ContentRepository,
  store: DiscereStore,
  lesson: LessonResponse,
  mode: TutoringMode,
  questionId?: string,
  attemptId?: string,
) {
  const attempt = attemptId ? store.getAttempt(attemptId) : null;
  if (attemptId && !attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
  const id = questionId ?? attempt?.questionId ?? lesson.question.id;
  const ownedIds = [
    ...lesson.lesson.questionIds,
    ...lesson.lesson.steps.map((step) => step.checkQuestionId),
  ];
  if (!ownedIds.includes(id))
    throw new HttpError(
      409,
      "The question does not belong to this lesson.",
      "TUTOR_QUESTION_MISMATCH",
    );
  if (attempt && (attempt.questionId !== id || attempt.mode !== mode))
    throw new HttpError(
      409,
      "The attempt belongs to another question or mode.",
      "TUTOR_ATTEMPT_MISMATCH",
    );
  const question = content.getQuestion(id);
  if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
  return {
    question,
    lesson: {
      ...lesson,
      question: learnerQuestion(question),
    },
  };
}
