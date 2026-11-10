import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";
import {
  decodeOrderResponse,
  decodeSortResponse,
  orderAnswerIds,
  type Question,
  type StructuredSolution,
  sortAnswerItems,
} from "@discere/contracts";

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

/**
 * How an order or sort answer stands against the question: whether it is a whole answer (every
 * item, each once, each in a bin that exists), and how many items are where they belong.
 * Undefined for any other kind of question.
 */
export function markStructured(
  question: Question,
  response: string,
): { whole: boolean; placed: number; total: number } | undefined {
  if (question.order) {
    const right = orderAnswerIds(question);
    const given = decodeOrderResponse(response);
    const whole =
      given.length === right.length &&
      new Set(given).size === given.length &&
      given.every((id) => right.includes(id));
    return {
      whole,
      placed: whole ? right.filter((id, index) => given[index] === id).length : 0,
      total: right.length,
    };
  }
  if (question.sort) {
    const items = sortAnswerItems(question);
    const bins = new Set(question.sort.bins.map((bin) => bin.id));
    const given = decodeSortResponse(response);
    const whole =
      Object.keys(given).length === items.length &&
      items.every((item) => bins.has(given[item.id] ?? ""));
    return {
      whole,
      placed: whole ? items.filter((item) => given[item.id] === item.bin).length : 0,
      total: items.length,
    };
  }
  return undefined;
}

/** The right arrangement of an order or sort question, sent only once the question has closed. */
export function structuredSolution(question: Question): StructuredSolution | undefined {
  if (question.order) return { order: orderAnswerIds(question) };
  if (question.sort)
    return {
      sort: sortAnswerItems(question).map(({ id, bin, explanation }) => ({
        id,
        bin,
        ...(explanation ? { explanation } : {}),
      })),
    };
  return undefined;
}

/**
 * Marks an order or sort answer by comparing places. A wrong answer is told how many items are
 * where they belong and never which ones, so a retry is still the learner's own work.
 */
function assessStructured(question: Question, response: string): AssessmentResult | undefined {
  const marked = markStructured(question, response);
  if (!marked || question.answerAuthority.kind !== "text") return undefined;
  const ordering = Boolean(question.order);
  if (!marked.whole)
    return {
      correct: false,
      feedback: ordering
        ? "Put every item in the list before you check."
        : "Put every item in a group before you check.",
    };
  if (marked.placed === marked.total)
    return { correct: true, feedback: question.answerAuthority.exampleAnswer };
  const count = marked.placed === 0 ? "None" : `${marked.placed} of ${marked.total}`;
  const verb = marked.placed === 1 ? "is" : "are";
  return {
    correct: false,
    feedback: `${count} ${verb} in the right ${ordering ? "place" : "group"}.`,
  };
}

export function assessResponse(question: Question, response: string): AssessmentResult {
  const structured = assessStructured(question, response);
  if (structured) return structured;
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
      feedback: "That number is not right. Check your working, or take a hint.",
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
    feedback: "That is not the answer. Try again, or take a hint.",
  };
}
