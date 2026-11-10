import { readFileSync } from "node:fs";
import {
  type CourseBundle,
  decodeOrderResponse,
  encodeOrderResponse,
  encodeSortResponse,
  LearnerQuestionSchema,
  LessonFeedbackResponseSchema,
  orderAnswerIds,
  sortAnswerItems,
  structuredAnswerResponse,
} from "@discere/contracts";
import { resolveFromRepoRoot } from "@discere/paths";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { assessResponse, markStructured } from "../src/assessment.js";
import type { DiscereStore } from "../src/db/store.js";
import { isMarkable } from "../src/routes.js";

/**
 * Order and sort questions are marked by the server from the places of their items, and they go
 * through the same attempts, credit, hints, explanation and review as every other question.
 * History's own questions are used, so the content and the marking are tested together.
 */
const course = "history";
const bundle = JSON.parse(
  readFileSync(resolveFromRepoRoot(`content/${course}/bundle.json`), "utf8"),
) as CourseBundle;
const find = (id: string) => bundle.questions.find((item) => item.id === id)!;
const ORDER = find("his-one-war-many-causes-crisis-order");
const SORT = find("his-causes-conditions-triggers-riot-sort");
const PAIR = find("his-who-made-it-and-why-skill-two-accounts");
const orderStep = { courseId: course, lessonId: "one-war-many-causes", stepId: "days-to-britain" };
const sortStep = {
  courseId: course,
  lessonId: "causes-conditions-triggers",
  stepId: "name-the-trigger",
};

const rightOrder = orderAnswerIds(ORDER);
/** The right order with its first two items changed over: three of five still in place. */
const twoSwapped = encodeOrderResponse([rightOrder[1]!, rightOrder[0]!, ...rightOrder.slice(2)]);
const reversed = encodeOrderResponse([...rightOrder].reverse());
const rightSort = Object.fromEntries(sortAnswerItems(SORT).map((item) => [item.id, item.bin]));
/** Every item in the first bin: only the items that belong there are placed. */
const allInOne = encodeSortResponse(
  Object.fromEntries(sortAnswerItems(SORT).map((item) => [item.id, SORT.sort!.bins[0]!.id])),
);

let app: FastifyInstance;
let store: DiscereStore;
let now: number;
beforeEach(async () => {
  now = Date.parse("2026-11-10T09:00:00.000Z");
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    revealDelayMs: 0,
    clock: () => new Date(now),
  }));
});
afterEach(async () => {
  await app.close();
});
const post = (url: string, payload: Record<string, unknown> = {}) =>
  app.inject({ method: "POST", url, payload });
async function attempt(questionId: string, response: string, extra: Record<string, unknown> = {}) {
  now += 60_000;
  const reply = await post("/api/attempts", { questionId, response, mode: "coach", ...extra });
  return { status: reply.statusCode, body: reply.json() };
}

describe("marking an order question", () => {
  it("accepts the right sequence and nothing else", () => {
    expect(assessResponse(ORDER, encodeOrderResponse(rightOrder))).toMatchObject({ correct: true });
    expect(assessResponse(ORDER, twoSwapped).correct).toBe(false);
    // The words of the explanation, or of the accepted idea, are not an answer.
    expect(assessResponse(ORDER, "Every item in its place").correct).toBe(false);
    if (ORDER.answerAuthority.kind === "text")
      expect(assessResponse(ORDER, ORDER.answerAuthority.exampleAnswer).correct).toBe(false);
  });

  it("says how many items are in the right place, and never which", () => {
    const partial = assessResponse(ORDER, twoSwapped);
    expect(partial.feedback).toBe("3 of 5 are in the right place.");
    for (const label of ORDER.order!.items) expect(partial.feedback).not.toContain(label);
    // Reversing five items leaves only the middle one where it belongs.
    expect(assessResponse(ORDER, reversed).feedback).toBe("1 of 5 is in the right place.");
    const rotated = encodeOrderResponse([...rightOrder.slice(1), rightOrder[0]!]);
    expect(assessResponse(ORDER, rotated).feedback).toBe("None are in the right place.");
  });

  it("does not count a list that is not the whole list as a try", () => {
    for (const response of [
      encodeOrderResponse(rightOrder.slice(1)),
      encodeOrderResponse([rightOrder[0]!, ...rightOrder]),
      encodeOrderResponse([...rightOrder.slice(1), "not-an-item"]),
      "zzz",
    ]) {
      expect(markStructured(ORDER, response)?.whole, response).toBe(false);
      expect(isMarkable(ORDER, response), response).toBe(false);
      expect(assessResponse(ORDER, response).correct, response).toBe(false);
    }
    expect(isMarkable(ORDER, reversed)).toBe(true);
  });
});

describe("marking a sort question", () => {
  it("accepts every item in its own bin and nothing else", () => {
    expect(assessResponse(SORT, encodeSortResponse(rightSort))).toMatchObject({ correct: true });
    expect(assessResponse(SORT, allInOne).correct).toBe(false);
    expect(assessResponse(SORT, "Every item in its group").correct).toBe(false);
  });

  it("says how many items are in the right group, and never which", () => {
    const conditions = SORT.sort!.items.filter(
      (item) => item.bin === SORT.sort!.bins[0]!.id,
    ).length;
    const marked = assessResponse(SORT, allInOne);
    expect(marked.feedback).toBe(`${conditions} of ${SORT.sort!.items.length} are in the right group.`);
    for (const item of SORT.sort!.items) expect(marked.feedback).not.toContain(item.label);
  });

  it("does not count a sorting with an item left out or in an unknown bin as a try", () => {
    const [first, ...rest] = Object.keys(rightSort);
    const missing = encodeSortResponse(Object.fromEntries(rest.map((id) => [id, rightSort[id]!])));
    const unknownBin = encodeSortResponse({ ...rightSort, [first!]: "background" });
    for (const response of [missing, unknownBin, "zzz"]) {
      expect(isMarkable(SORT, response), response).toBe(false);
      expect(assessResponse(SORT, response).correct, response).toBe(false);
    }
  });
});

describe("what reaches the browser", () => {
  it("sends the items without their places, and the same way on every request", async () => {
    const journey = async () =>
      (
        await app.inject({
          method: "GET",
          url: `/api/courses/${course}/lessons/${orderStep.lessonId}/journey`,
        })
      ).body;
    const body = await journey();
    expect(await journey()).toBe(body);
    const stage = JSON.parse(body).stages.find((item: { type: string }) => item.type === "explainer");
    const shown = LearnerQuestionSchema.parse(
      stage.steps.find((step: { id: string }) => step.id === orderStep.stepId).question,
    );
    expect(shown.responseType).toBe("order");
    const ids = shown.order!.items.map((item) => item.id);
    expect([...ids].sort()).toEqual([...rightOrder].sort());
    expect(ids).not.toEqual(rightOrder);
    // Nothing in the lesson's payload holds the sequence or the explanation that states it.
    expect(body).not.toContain(rightOrder.join(","));
    expect(body).not.toContain("a week after Austria-Hungary's, so it cannot");
    expect(shown).not.toHaveProperty("answerAuthority");
  });

  it("sends the sort items without bins or explanations, and extracts with their attribution", async () => {
    const lesson = async (lessonId: string) =>
      (await app.inject({ method: "GET", url: `/api/courses/${course}/lessons/${lessonId}/journey` }))
        .body;
    const sorting = await lesson(sortStep.lessonId);
    for (const item of SORT.sort!.items) {
      expect(sorting).toContain(JSON.stringify(item.label).slice(1, -1));
      expect(sorting).not.toContain(item.explanation!);
    }
    const pair = await lesson("who-made-it-and-why");
    for (const extract of PAIR.extracts!) {
      expect(pair).toContain(extract.text);
      expect(pair).toContain(extract.who);
      expect(pair).toContain(extract.kind);
    }
  });
});

describe("an order question in a lesson", () => {
  it("gives independent credit for the right order at the first check", async () => {
    const first = await attempt(ORDER.id, encodeOrderResponse(rightOrder), { lesson: orderStep });
    expect(first.body).toMatchObject({
      correct: true,
      independent: true,
      credit: "independent",
      allowedMisses: 2,
      misses: 0,
    });
    const feedback = LessonFeedbackResponseSchema.parse(
      (await post(`/api/attempts/${first.body.attemptId}/lesson-feedback`, orderStep)).json(),
    );
    expect(feedback.solution).toEqual({ order: rightOrder });
    expect(feedback.onCorrect).toBe(ORDER.onCorrect);
  });

  it("keeps the order closed after one miss, gives a hint, and credits the second try as recovered", async () => {
    const miss = await attempt(ORDER.id, twoSwapped, { lesson: orderStep });
    expect(miss.body).toMatchObject({
      correct: false,
      feedback: "3 of 5 are in the right place.",
      qualifying: true,
      misses: 1,
      closed: false,
    });
    expect(JSON.stringify(miss.body)).not.toContain(rightOrder.join(","));
    const hint = (await post(`/api/attempts/${miss.body.attemptId}/hints`)).json();
    expect(hint.hint).toBe(ORDER.hints[0]);
    const second = await attempt(ORDER.id, encodeOrderResponse(rightOrder), {
      attemptId: miss.body.attemptId,
      lesson: orderStep,
    });
    expect(second.body).toMatchObject({ correct: true, independent: false });
    expect(second.body.credit).not.toBe("independent");
  });

  it("closes on the second miss, shows the right order and sends the question to review", async () => {
    const miss = await attempt(ORDER.id, twoSwapped, { lesson: orderStep });
    const last = await attempt(ORDER.id, reversed, {
      attemptId: miss.body.attemptId,
      lesson: orderStep,
    });
    expect(last.body).toMatchObject({ correct: false, misses: 2, closed: true });
    const feedback = LessonFeedbackResponseSchema.parse(
      (await post(`/api/attempts/${miss.body.attemptId}/lesson-feedback`, orderStep)).json(),
    );
    expect(feedback).toMatchObject({ correct: false, reviewRequired: true });
    expect(feedback.solution?.order).toEqual(rightOrder);
    expect(store.getReviewCard(`flashcard:${ORDER.id}`)).toMatchObject({ origin: "question" });
    expect(
      (await attempt(ORDER.id, encodeOrderResponse(rightOrder), { attemptId: miss.body.attemptId }))
        .status,
    ).toBe(409);
  });

  it("does not spend a try on a list that is not whole", async () => {
    const partial = await attempt(ORDER.id, encodeOrderResponse(rightOrder.slice(2)), {
      lesson: orderStep,
    });
    expect(partial.body).toMatchObject({ correct: false, qualifying: false, misses: 0 });
    expect(partial.body.feedback).toBe("Put every item in the list before you check.");
  });

  it("keeps the answer closed in Exam mode after the last miss", async () => {
    const exam = { lesson: orderStep, mode: "exam" };
    const miss = await attempt(ORDER.id, twoSwapped, exam);
    const last = await attempt(ORDER.id, reversed, { ...exam, attemptId: miss.body.attemptId });
    expect(last.body).toMatchObject({ closed: true, correct: false });
    expect(
      (await post(`/api/attempts/${miss.body.attemptId}/lesson-feedback`, orderStep)).statusCode,
    ).toBe(403);
  });
});

describe("a sort question in a lesson", () => {
  it("shows where each item belongs, with its explanation, only once the question closes", async () => {
    const miss = await attempt(SORT.id, allInOne, { lesson: sortStep });
    expect(miss.body).toMatchObject({ correct: false, misses: 1, closed: false, allowedMisses: 2 });
    for (const item of SORT.sort!.items)
      expect(JSON.stringify(miss.body)).not.toContain(item.explanation!);
    const right = await attempt(SORT.id, encodeSortResponse(rightSort), {
      attemptId: miss.body.attemptId,
      lesson: sortStep,
    });
    expect(right.body).toMatchObject({ correct: true, independent: false });
    const feedback = LessonFeedbackResponseSchema.parse(
      (await post(`/api/attempts/${miss.body.attemptId}/lesson-feedback`, sortStep)).json(),
    );
    expect(feedback.solution?.sort).toEqual(
      sortAnswerItems(SORT).map(({ id, bin, explanation }) => ({ id, bin, explanation })),
    );
  });
});

describe("a missed order or sort question in review", () => {
  async function missTwice(questionId: string, wrong: string, other: string, lesson: object) {
    const miss = await attempt(questionId, wrong, { lesson });
    await attempt(questionId, other, { attemptId: miss.body.attemptId, lesson });
    now += 24 * 60 * 60 * 1000;
    return store.createReviewSession(`flashcard:${questionId}`);
  }

  it("asks the order again with its items, marks the arrangement and then shows the right one", async () => {
    const session = await missTwice(ORDER.id, twoSwapped, reversed, orderStep);
    const shown = (
      await app.inject({ method: "GET", url: `/api/review/sessions/${session.id}` })
    ).json();
    expect(shown.card.recall).toBe("typed");
    const question = LearnerQuestionSchema.parse(shown.card.question);
    expect(question.order!.items.map((item) => item.id).sort()).toEqual([...rightOrder].sort());
    expect(JSON.stringify(shown)).not.toContain(rightOrder.join(","));
    // The card's text names the items, for reading aloud, and holds no order.
    expect(shown.card.front).toContain("Items to put in order:");

    const recall = (
      await post(`/api/review/sessions/${session.id}/respond`, {
        response: structuredAnswerResponse(ORDER),
      })
    ).json();
    expect(recall.correct).toBe(true);
    const revealed = (await post(`/api/review/sessions/${session.id}/reveal`)).json();
    expect(revealed.solution).toEqual({ order: rightOrder });
    expect(revealed.back).toBe(
      ORDER.answerAuthority.kind === "text" ? ORDER.answerAuthority.exampleAnswer : "",
    );
    const rated = (
      await post(`/api/review/sessions/${session.id}/rate`, { rating: "good", recalled: true })
    ).json();
    expect(rated).toMatchObject({ evidence: "independent", repetition: 1 });
  });

  it("marks a wrong arrangement on the card wrong", async () => {
    const session = await missTwice(ORDER.id, twoSwapped, reversed, orderStep);
    const recall = (
      await post(`/api/review/sessions/${session.id}/respond`, { response: twoSwapped })
    ).json();
    expect(recall.correct).toBe(false);
    expect(decodeOrderResponse(recall.response)).toHaveLength(rightOrder.length);
  });

  it("asks the sort again and shows each item's bin once the card is revealed", async () => {
    const [first] = Object.keys(rightSort);
    const oneWrong = encodeSortResponse({
      ...rightSort,
      [first!]: SORT.sort!.bins.find((bin) => bin.id !== rightSort[first!])!.id,
    });
    const session = await missTwice(SORT.id, allInOne, oneWrong, sortStep);
    const shown = (
      await app.inject({ method: "GET", url: `/api/review/sessions/${session.id}` })
    ).json();
    expect(shown.card.recall).toBe("typed");
    expect(shown.card.question.sort.items).toHaveLength(SORT.sort!.items.length);
    for (const item of SORT.sort!.items)
      expect(JSON.stringify(shown)).not.toContain(item.explanation!);
    const recall = (
      await post(`/api/review/sessions/${session.id}/respond`, {
        response: structuredAnswerResponse(SORT),
      })
    ).json();
    expect(recall.correct).toBe(true);
    const revealed = (await post(`/api/review/sessions/${session.id}/reveal`)).json();
    expect(revealed.solution.sort).toHaveLength(SORT.sort!.items.length);
  });

  it("sends a missed source pair to review with both extracts, to be recalled and self-rated", async () => {
    const lesson = { courseId: course, lessonId: "who-made-it-and-why" };
    await attempt(PAIR.id, PAIR.choices![0]!.label, { lesson });
    now += 24 * 60 * 60 * 1000;
    const session = store.createReviewSession(`flashcard:${PAIR.id}`);
    const shown = (
      await app.inject({ method: "GET", url: `/api/review/sessions/${session.id}` })
    ).json();
    expect(shown.card.recall).toBe("self");
    expect(shown.card.question.extracts).toEqual(PAIR.extracts);
    expect(shown.card.front).toContain("Source A. Augustus, Res Gestae");
    expect(shown.card.front).toContain("Options:");
  });
});
