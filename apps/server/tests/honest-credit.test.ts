import { readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { resolveFromRepoRoot } from "@discere/paths";
import { createReviewState } from "@discere/progression-engine";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

/**
 * Credit is decided per question, from the first marked response, and the record of what the
 * learner did is never rewritten. These tests walk the routes a learner could once use to turn
 * a miss into full credit.
 */
const course = "maths-foundations";
const lesson = "what-a-letter-stands-for";
const q = (suffix: string) => `maths-${lesson}-${suffix}`;
const context = (stepId?: string) => ({
  courseId: course,
  lessonId: lesson,
  ...(stepId ? { stepId } : {}),
});
/** `times` is numeric (40) on a try step; `which-solves` is a three-option choice (x = 4). */
const TIMES_STEP = "the-value-of-5x";

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
const tick = (minutes = 1) => {
  now += minutes * 60_000;
};

async function attempt(
  questionId: string,
  response: string,
  extra: Record<string, unknown> = {},
  mode = "coach",
) {
  tick();
  const reply = await app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: { questionId, response, mode, ...extra },
  });
  return { status: reply.statusCode, body: reply.json() };
}
const post = (url: string, payload: Record<string, unknown> = {}) =>
  app.inject({ method: "POST", url, payload });
const independentTotal = async () =>
  (await app.inject({ method: "GET", url: "/api/study" })).json().totals.independent as number;
const conceptCounters = (questionId: string) => {
  const conceptId = (
    JSON.parse(
      readFileSync(resolveFromRepoRoot(`content/${course}/bundle.json`), "utf8"),
    ) as CourseBundle
  ).questions.find((item) => item.id === questionId)!.conceptIds[0]!;
  return store.getProgress().find((row) => row.conceptId === conceptId)!;
};

describe("attempt history", () => {
  it("keeps every response and gives a guessed-through choice no independent credit", async () => {
    const id = q("which-solves");
    const first = await attempt(id, "x = 3");
    const second = await attempt(id, "x = 5", { attemptId: first.body.attemptId });
    const third = await attempt(id, "x = 4", { attemptId: first.body.attemptId });
    expect(third.body).toMatchObject({
      correct: true,
      independent: false,
      credit: "recovered",
      tries: 3,
      misses: 2,
    });
    expect(conceptCounters(id)).toMatchObject({ independentAttempts: 0, assistedAttempts: 1 });
    // The third try keeps 40% of the award, and a first-try answer would have kept all of it.
    const firstTry = await attempt(q("minus"), "8");
    expect(firstTry.body).toMatchObject({ independent: true, credit: "independent", tries: 1 });
    expect(third.body.xpGained).toBeGreaterThan(0);
    expect(third.body.xpGained).toBeLessThan(firstTry.body.xpGained * 0.5);

    expect(store.attemptResponses(first.body.attemptId).map((row) => row.response)).toEqual([
      "x = 3",
      "x = 5",
      "x = 4",
    ]);
    expect(store.questionHistory(id)).toMatchObject({
      tries: 3,
      firstResponse: "x = 3",
      firstCorrect: false,
      solved: true,
    });
    // Only the question answered right first time counts anywhere independence is counted.
    expect(await independentTotal()).toBe(1);
    const events = store.study.events();
    expect(events.find((event) => event.key === `answer:${first.body.attemptId}`)).toMatchObject({
      correct: true,
      independent: false,
    });
    // Corrected alone, without a hint: that is still recorded as a recovery.
    expect(events.some((event) => event.key === `recovery:${id}`)).toBe(true);
  });

  it("never lowers mastery when a correct answer needed help", async () => {
    const id = q("which-solves");
    const conceptId = conceptCounters(id).conceptId;
    store.database
      .prepare("UPDATE concept_progress SET mastery = 0.9 WHERE concept_id = ?")
      .run(conceptId);
    const miss = await attempt(id, "x = 3");
    await post(`/api/attempts/${miss.body.attemptId}/hints`);
    const right = await attempt(id, "x = 4", { attemptId: miss.body.attemptId });
    expect(right.body).toMatchObject({ correct: true, credit: "assisted" });
    expect(store.getMastery(conceptId)).toBe(0.9);
  });

  it("carries misses and hints into a fresh attempt in another mode", async () => {
    const id = q("which-solves");
    const miss = await attempt(id, "x = 3");
    expect((await post(`/api/attempts/${miss.body.attemptId}/hints`)).statusCode).toBe(200);
    const exam = await attempt(id, "x = 4", {}, "exam");
    expect(exam.body.attemptId).not.toBe(miss.body.attemptId);
    expect(exam.body).toMatchObject({
      correct: true,
      independent: false,
      credit: "assisted",
      tries: 2,
    });
    expect(await independentTotal()).toBe(0);
  });

  it("answers a wrong unit with what to fix and does not count it as a try", async () => {
    const id = q("times");
    const slip = await attempt(id, "40 km", { lesson: context(TIMES_STEP) });
    expect(slip.body).toMatchObject({ correct: false, qualifying: false, misses: 0, tries: 0 });
    expect(slip.body.feedback).toBe("This answer has no unit. Enter only the number.");
    // The slip alone does not open the worked answer either.
    expect(
      (await post(`/api/attempts/${slip.body.attemptId}/lesson-feedback`, context(TIMES_STEP)))
        .statusCode,
    ).toBe(409);
    const right = await attempt(id, "40", { lesson: context(TIMES_STEP) });
    expect(right.body).toMatchObject({ correct: true, independent: true, credit: "independent" });
    expect(store.attemptResponses(right.body.attemptId)).toMatchObject([
      { response: "40 km", qualifying: false },
      { response: "40", qualifying: true },
    ]);
  });
});

describe("the lesson miss limit", () => {
  it("counts misses on the server, so a reload does not reset them", async () => {
    const id = q("times");
    const first = await attempt(id, "13", { lesson: context(TIMES_STEP) });
    expect(first.body).toMatchObject({ misses: 1, allowedMisses: 2, closed: false });
    // After a reload the client has forgotten the attempt and sends no attempt id.
    const second = await attempt(id, "45", { lesson: context(TIMES_STEP) });
    expect(second.body).toMatchObject({
      attemptId: first.body.attemptId,
      misses: 2,
      allowedMisses: 2,
      closed: true,
    });
    // The last allowed miss opens the worked answer, recorded as help.
    expect(store.getAttempt(first.body.attemptId)).toMatchObject({
      closed: true,
      answerRevealed: true,
      correct: false,
    });
    const explanation = await post(
      `/api/attempts/${first.body.attemptId}/lesson-feedback`,
      context(TIMES_STEP),
    );
    expect(explanation.json()).toMatchObject({ correct: false, reviewRequired: true });
    expect(
      (await attempt(id, "40", { attemptId: first.body.attemptId, lesson: context(TIMES_STEP) }))
        .status,
    ).toBe(409);
  });

  it("gives the revealed answer typed on a fresh attempt no independent credit", async () => {
    const id = q("times");
    await attempt(id, "13", { lesson: context(TIMES_STEP) });
    const closed = await attempt(id, "45", { lesson: context(TIMES_STEP) });
    // Reopening the step starts a new attempt row. The reveal still counts.
    const retyped = await attempt(id, "40", { lesson: context(TIMES_STEP) });
    expect(retyped.body.attemptId).not.toBe(closed.body.attemptId);
    expect(retyped.body).toMatchObject({
      correct: true,
      independent: false,
      credit: "revealed",
      tries: 3,
    });
    const firstTry = await attempt(q("minus"), "8");
    expect(retyped.body.xpGained).toBeLessThanOrEqual(Math.ceil(firstTry.body.xpGained * 0.25));
    expect(await independentTotal()).toBe(1);
    expect(store.study.events().some((event) => event.key === `recovery:${id}`)).toBe(false);
    expect(store.questionHistory(id)).toMatchObject({ firstResponse: "13", firstCorrect: false });
  });

  it("allows one miss on a prediction and on the end-of-lesson check", async () => {
    const predicted = await attempt(q("working-backwards"), "Divide 2014 by 7, then subtract 5.", {
      lesson: context("working-backwards"),
    });
    expect(predicted.body).toMatchObject({ allowedMisses: 1, closed: true });
    const check = await attempt(q("check-1"), "99", { lesson: context() });
    expect(check.body).toMatchObject({ allowedMisses: 1, closed: true });
  });

  it("refuses a lesson context the question does not belong to", async () => {
    expect((await attempt(q("times"), "40", { lesson: context("subtracting-2x") })).status).toBe(
      409,
    );
  });

  it("leaves a question asked outside a lesson without a limit", async () => {
    const id = q("times");
    const first = await attempt(id, "1");
    await attempt(id, "2", { attemptId: first.body.attemptId });
    const third = await attempt(id, "3", { attemptId: first.body.attemptId });
    expect(third.body).toMatchObject({ misses: 3, closed: false });
    expect(third.body.allowedMisses).toBeUndefined();
  });
});

describe("Exam mode", () => {
  const stageId = async () => {
    const journey = (
      await app.inject({ method: "GET", url: `/api/courses/${course}/lessons/${lesson}/journey` })
    ).json();
    return journey.stages.find(
      (stage: { type: string; questionId?: string }) =>
        stage.type === "quiz" && stage.questionId === q("check-1"),
    ).id as string;
  };
  const complete = async () =>
    app.inject({
      method: "PUT",
      url: `/api/courses/${course}/lessons/${lesson}/progress`,
      payload: { stageId: await stageId(), state: "completed", interactionState: {} },
    });

  it("lets a closed miss finish the stage, recorded as wrong", async () => {
    expect((await complete()).statusCode).toBe(409);
    const miss = await attempt(q("check-1"), "99", { lesson: context() }, "exam");
    expect(miss.body).toMatchObject({ correct: false, closed: true, credit: "none", xpGained: 0 });
    expect(store.getAttempt(miss.body.attemptId)).toMatchObject({
      correct: false,
      closed: true,
      answerRevealed: false,
    });
    // Exam still shows no worked answer and takes no further response on the closed attempt.
    expect(
      (await post(`/api/attempts/${miss.body.attemptId}/lesson-feedback`, context())).statusCode,
    ).toBe(403);
    expect(
      (await attempt(q("check-1"), "17", { attemptId: miss.body.attemptId }, "exam")).status,
    ).toBe(409);
    expect((await complete()).statusCode).toBe(200);
    const answer = store.study
      .events()
      .find((event) => event.key === `answer:${miss.body.attemptId}`);
    expect(answer).toMatchObject({ correct: false, independent: false });
  });

  it("does not accept an open miss as evidence", async () => {
    // Outside a lesson there is no limit, so one miss leaves the attempt open.
    await attempt(q("check-1"), "99", {}, "exam");
    expect((await complete()).statusCode).toBe(409);
  });
});

describe("missed questions in review", () => {
  const cardId = `flashcard:${q("times")}`;
  const review = async () => (await app.inject({ method: "GET", url: "/api/review" })).json();
  const mathsCards = async () =>
    (await review()).courses.find((item: { courseId: string }) => item.courseId === course) as
      | { cardCount: number; dueCount: number }
      | undefined;

  it("queues a question missed at the limit for the next day and marks it by its own authority", async () => {
    // Another question first, so the lesson's own cards are already in the queue.
    await attempt(q("minus"), "8");
    const before = await mathsCards();
    await attempt(q("times"), "13", { lesson: context(TIMES_STEP) });
    await attempt(q("times"), "45", { lesson: context(TIMES_STEP) });

    const card = store.getReviewCard(cardId)!;
    expect(card).toMatchObject({ origin: "question", courseId: course });
    expect(card.card).toMatchObject({
      questionId: q("times"),
      back: "5x means 5 × x, so 5 × 8 = 40.",
    });
    expect(Date.parse(card.state.dueAt) - now).toBe(24 * 60 * 60 * 1000);
    expect(await mathsCards()).toEqual({
      ...before,
      cardCount: before!.cardCount + 1,
    });

    now += 24 * 60 * 60 * 1000;
    expect((await mathsCards())!.dueCount).toBe(before!.dueCount + 1);
    expect((await app.inject({ method: "GET", url: "/api/home" })).json().dueReviews).toBe(
      (await review()).dueCount,
    );

    const session = store.createReviewSession(cardId);
    const shown = (
      await app.inject({ method: "GET", url: `/api/review/sessions/${session.id}` })
    ).json();
    expect(shown.card).toMatchObject({ cardId, recall: "typed", front: card.card.front });
    const recall = (
      await post(`/api/review/sessions/${session.id}/respond`, { response: "40" })
    ).json();
    expect(recall.correct).toBe(true);
    const revealed = (await post(`/api/review/sessions/${session.id}/reveal`)).json();
    expect(revealed.back).toBe("5x means 5 × x, so 5 × 8 = 40.");
    const rated = (
      await post(`/api/review/sessions/${session.id}/rate`, { rating: "good", recalled: true })
    ).json();
    expect(rated).toMatchObject({ evidence: "independent", repetition: 1 });
    expect(rated.xpGained).toBeGreaterThan(0);
  });

  it("queues a question put right after a miss for the next day", async () => {
    const miss = await attempt(q("times"), "13", { lesson: context(TIMES_STEP) });
    const right = await attempt(q("times"), "40", {
      attemptId: miss.body.attemptId,
      lesson: context(TIMES_STEP),
    });
    expect(right.body).toMatchObject({ correct: true, credit: "recovered" });
    const card = store.getReviewCard(cardId)!;
    expect(card).toMatchObject({ origin: "question" });
    expect(Date.parse(card.state.dueAt) - now).toBe(24 * 60 * 60 * 1000);
  });

  it("queues a question answered right only with a hint", async () => {
    const id = q("which-solves");
    const miss = await attempt(id, "x = 3");
    await post(`/api/attempts/${miss.body.attemptId}/hints`);
    const right = await attempt(id, "x = 4", { attemptId: miss.body.attemptId });
    expect(right.body).toMatchObject({ correct: true, credit: "assisted" });
    expect(store.getReviewCard(`flashcard:${id}`)).toMatchObject({ origin: "question" });
  });

  it("leaves a question answered right first time to the authored cards", async () => {
    await attempt(q("times"), "40", { lesson: context(TIMES_STEP) });
    expect(store.getReviewCard(cardId)).toBeNull();
  });

  it("queues a question whose worked answer was asked for, and one closed in Exam mode", async () => {
    const miss = await attempt(q("times"), "13", { lesson: context(TIMES_STEP) });
    expect(store.getReviewCard(cardId)).toBeNull();
    await post(`/api/attempts/${miss.body.attemptId}/lesson-feedback`, context(TIMES_STEP));
    expect(store.getReviewCard(cardId)).toMatchObject({ origin: "question" });

    await attempt(q("check-1"), "99", { lesson: context() }, "exam");
    expect(store.getReviewCard(`flashcard:${q("check-1")}`)).toMatchObject({ origin: "question" });
  });

  it("makes a choice question's card self-rated, with its options on the front", async () => {
    const id = q("which-solves");
    const miss = await attempt(id, "x = 3", { lesson: context("which-number-solves-it") });
    await post(
      `/api/attempts/${miss.body.attemptId}/lesson-feedback`,
      context("which-number-solves-it"),
    );
    const saved = store.getReviewCard(`flashcard:${id}`)!;
    expect(saved.card.front).toContain("Options:\nx = 3\nx = 4\nx = 5");
    const session = store.createReviewSession(saved.card.id);
    expect(
      (await app.inject({ method: "GET", url: `/api/review/sessions/${session.id}` })).json().card
        .recall,
    ).toBe("self");
    expect(
      (await post(`/api/review/sessions/${session.id}/respond`, { response: "x = 4" })).statusCode,
    ).toBe(409);
  });

  it("keeps a card's schedule when the question is missed again, bringing a later date forward", async () => {
    await attempt(q("times"), "13", { lesson: context(TIMES_STEP) });
    await attempt(q("times"), "45", { lesson: context(TIMES_STEP) });
    store.database
      .prepare("UPDATE review_cards SET due_at = ?, repetition = 4 WHERE card_id = ?")
      .run("2027-06-01T00:00:00.000Z", cardId);
    await attempt(q("times"), "13", { lesson: context(TIMES_STEP) });
    await attempt(q("times"), "45", { lesson: context(TIMES_STEP) });
    const again = store.getReviewCard(cardId)!;
    expect(again.state.repetition).toBe(4);
    expect(Date.parse(again.state.dueAt) - now).toBe(24 * 60 * 60 * 1000);
    expect(
      store.database
        .prepare("SELECT COUNT(*) AS count FROM review_cards WHERE card_id = ?")
        .get(cardId),
    ).toEqual({ count: 1 });
  });

  it("does not duplicate an authored card that already rehearses the question", async () => {
    // In electronics-foundations the card `card-ohms-law` names this question.
    const questionId = "calculate-current-5v-100ohm";
    const miss = await attempt(questionId, "999");
    const reveal = (
      await post(`/api/attempts/${miss.body.attemptId}/reveal/start`, {
        reason: "I have tried and want to study the worked answer.",
      })
    ).json();
    const confirmed = await post(`/api/attempts/${miss.body.attemptId}/reveal/confirm`, {
      token: reveal.token,
      confirmation: "show answer",
    });
    expect(confirmed.statusCode).toBe(200);
    expect(store.getReviewCard(`flashcard:${questionId}`)).toBeNull();
    expect(store.questionCards()).toEqual([]);

    // A question with no authored card is queued by the same reveal.
    const other = await attempt(q("times"), "13");
    const second = (
      await post(`/api/attempts/${other.body.attemptId}/reveal/start`, {
        reason: "I have tried and want to study the worked answer.",
      })
    ).json();
    await post(`/api/attempts/${other.body.attemptId}/reveal/confirm`, {
      token: second.token,
      confirmation: "show answer",
    });
    expect(store.questionCards()).toEqual([{ cardId, questionId: q("times") }]);
  });

  it("retires a card whose question has left the content", async () => {
    await attempt(q("minus"), "8");
    const before = await review();
    store.queueQuestionCard(
      course,
      {
        id: "flashcard:a-question-that-was-removed",
        questionId: "a-question-that-was-removed",
        conceptIds: [],
        front: "An old prompt",
        back: "An old answer",
        sourceIds: ["source"],
        reviewedAt: store.now(),
      },
      store.now(),
    );
    expect(await review()).toEqual(before);
    // The row is kept, so a return to content that has the question brings the card back.
    expect(store.getReviewCard("flashcard:a-question-that-was-removed")).not.toBeNull();
  });
});

describe("review card text", () => {
  it("follows the content while the schedule stays as it was", async () => {
    const card = {
      id: "card-under-correction",
      questionId: "card-under-correction",
      conceptIds: ["old-concept"],
      front: "The old front",
      back: "The old back",
      sourceIds: ["old-source"],
      reviewedAt: store.now(),
    };
    store.ensureReviewCard(course, card, createReviewState(card.id, store.now()));
    const session = store.createReviewSession(card.id);
    store.revealReviewSession(session.id, true);
    const scheduled = store.rateReviewSession(session.id, "good", true)!.state;

    tick(5);
    const corrected = store.ensureReviewCard(
      course,
      {
        ...card,
        conceptIds: ["new-concept"],
        front: "The corrected front",
        back: "The corrected back",
        sourceIds: ["new-source"],
      },
      createReviewState(card.id, store.now()),
    );
    expect(corrected.card).toMatchObject({
      front: "The corrected front",
      back: "The corrected back",
      conceptIds: ["new-concept"],
      sourceIds: ["new-source"],
    });
    expect(corrected.state).toEqual(scheduled);
    expect(corrected.origin).toBe("authored");
  });
});

describe("a database from before attempt history", () => {
  it("reads an attempt with no response log as one try", async () => {
    const id = q("times");
    store.database
      .prepare(
        "INSERT INTO attempts (id, user_id, question_id, response, mode, correct, feedback, hint_count, answer_revealed, xp_awarded, mastery, created_at, updated_at) VALUES ('legacy-attempt', 'local-user', ?, '13', 'coach', 0, 'No.', 0, 0, 0, 0, ?, ?)",
      )
      .run(id, store.now(), store.now());
    expect(store.getAttempt("legacy-attempt")).toMatchObject({
      tries: 1,
      misses: 1,
      closed: false,
    });
    expect(store.questionHistory(id)).toMatchObject({
      tries: 1,
      firstResponse: null,
      firstCorrect: false,
    });
    // The old row is still the open attempt, and its miss still counts against the limit.
    const next = await attempt(id, "45", { lesson: context(TIMES_STEP) });
    expect(next.body).toMatchObject({ attemptId: "legacy-attempt", misses: 2, closed: true });
    expect(store.attemptResponses("legacy-attempt").map((row) => row.response)).toEqual([
      "13",
      "45",
    ]);
  });
});
