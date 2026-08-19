import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";
import type { Question } from "@discere/contracts";

export interface AssessmentResult {
  correct: boolean;
  feedback: string;
}
export function assessResponse(question: Question, response: string): AssessmentResult {
  const authority = question.answerAuthority;
  if (authority.kind === "numeric") {
    const result = assessNumericAnswer(response, authority);
    if (result.correct)
      return { correct: true, feedback: "Your value and its unit are both correct." };
    if (result.error === "unreadable")
      return {
        correct: false,
        feedback: `I could not read a number from that response. Enter a value with its unit, in ${authority.unit}.`,
      };
    if (result.error === "unit_mismatch")
      return {
        correct: false,
        feedback: `The unit does not match the quantity asked for. Give the result in ${authority.unit}.`,
      };
    return {
      correct: false,
      feedback:
        "Your response is outside the accepted tolerance. Recheck the working and the decimal place.",
    };
  }
  const result = assessTextAnswer(response, authority);
  if (result.correct)
    return {
      correct: true,
      feedback: "Your response covers the required idea and avoids the recorded misconception.",
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
