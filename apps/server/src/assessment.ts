import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";
import type { Question } from "@discere/contracts";

export interface AssessmentResult {
  correct: boolean;
  feedback: string;
  /** True when the feedback is an authored misconception rather than the generic message. */
  specific?: boolean;
}

/**
 * The authored misconception a wrong response matches, if any. Numeric matches compare values
 * (so "6" and "6.0" are one slip); choices match by the chosen label; text by phrase.
 */
export function matchMisconception(question: Question, response: string): string | undefined {
  for (const misconception of question.misconceptions ?? []) {
    const { numeric, choiceIds, textIdeas } = misconception.match;
    if (numeric && question.answerAuthority.kind === "numeric") {
      const authority = question.answerAuthority;
      if (
        numeric.some(
          (value) =>
            assessNumericAnswer(response, {
              ...authority,
              value,
              absoluteTolerance: 1e-9,
              relativeTolerance: 0,
            }).correct,
        )
      )
        return misconception.feedback;
    }
    if (choiceIds && question.choices) {
      const chosen = question.choices.find((choice) => choice.label === response.trim());
      if (chosen && choiceIds.includes(chosen.id)) return misconception.feedback;
    }
    if (
      textIdeas &&
      assessTextAnswer(response, { acceptedIdeas: textIdeas, rejectedIdeas: [] }).matchedIdeas
        .length > 0
    )
      return misconception.feedback;
  }
  return undefined;
}

export function assessResponse(question: Question, response: string): AssessmentResult {
  const result = assessAgainstAuthority(question, response);
  if (result.correct) return result;
  const specific = matchMisconception(question, response);
  return specific ? { correct: false, feedback: specific, specific: true } : result;
}

function assessAgainstAuthority(question: Question, response: string): AssessmentResult {
  const authority = question.answerAuthority;
  if (authority.kind === "numeric") {
    const result = assessNumericAnswer(response, authority);
    if (result.correct) return { correct: true, feedback: authority.workedAnswer };
    if (
      authority.unit === "probability" &&
      (result.error === "unreadable" || result.error === "unit_mismatch")
    )
      return {
        correct: false,
        feedback:
          "Give a probability as a fraction, decimal, or percentage, such as 1/4, 0.25, or 25%.",
      };
    if (result.error === "unreadable")
      return {
        correct: false,
        feedback: authority.unit
          ? `Enter a number in ${authority.unit}.`
          : "Enter a number or a fraction such as 3/4.",
      };
    if (result.error === "unit_mismatch")
      return {
        correct: false,
        feedback: authority.unit
          ? `Give the result in ${authority.unit}.`
          : "This answer has no unit. Enter only the number.",
      };
    return {
      correct: false,
      feedback: "Recheck the calculation, signs, and decimal place before trying again.",
    };
  }
  const result = assessTextAnswer(response, authority);
  if (result.correct)
    return {
      correct: true,
      feedback: authority.exampleAnswer,
    };
  if (result.rejectedIdeasFound.length > 0)
    return {
      correct: false,
      feedback:
        "One statement conflicts with the sourced account. Recheck that part against the lesson.",
    };
  return {
    correct: false,
    feedback:
      "The response needs a clearer statement of the main relationship the question asks about.",
  };
}
