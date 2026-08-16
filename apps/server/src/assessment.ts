import type { Question } from "@discere/contracts";
import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";

export interface AssessmentResult { correct: boolean; feedback: string; }
export function assessResponse(question: Question, response: string): AssessmentResult {
  const authority = question.answerAuthority;
  if (authority.kind === "numeric") {
    const result = assessNumericAnswer(response, authority);
    if (result.correct) return { correct: true, feedback: "Your value and unit are correct. The calculation uses Ohm's law accurately." };
    if (result.error === "unreadable") return { correct: false, feedback: "I could not read a number from that response. Enter a value with its unit, such as 2 A." };
    if (result.error === "unit_mismatch") return { correct: false, feedback: "The unit does not describe current. Give the result in amperes." };
    return { correct: false, feedback: "Use I = V / R and check the division. Your response is outside the accepted tolerance." };
  }
  const result = assessTextAnswer(response, authority);
  if (result.correct) return { correct: true, feedback: "Your response includes the required idea and avoids the listed misconception." };
  if (result.rejectedIdeasFound.length > 0) return { correct: false, feedback: "One statement conflicts with the source model. Recheck what moves through the circuit and what remains available around the loop." };
  return { correct: false, feedback: "The response needs a clearer statement of the main causal relationship." };
}
