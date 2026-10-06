import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { type AppOptions, createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;

/** A movable clock, so a multi-day schedule is asserted rather than waited for. */
function testClock(start: string) {
  let current = Date.parse(start);
  return {
    now: () => new Date(current),
    advanceDays(days: number) {
      current += days * 24 * 60 * 60 * 1000;
    },
    advanceMinutes(minutes: number) {
      current += minutes * 60 * 1000;
    },
  };
}

async function start(options: Partial<AppOptions> = {}) {
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    revealDelayMs: 0,
    ...options,
  }));
  return { app, store };
}

/** General recall starts after a learner has encountered an idea in a listed lesson. */
async function introduceLessons() {
  for (const [courseId, lessonId, response] of [
    ["maths-foundations", "what-a-letter-stands-for", "7"],
    ["probability-statistics", "counting-outcomes", "36"],
  ]) {
    const journey = (
      await app.inject({
        method: "GET",
        url: "/api/courses/" + courseId + "/lessons/" + lessonId + "/journey",
      })
    ).json();
    const question = journey.stages.find((stage: { type: string }) => stage.type === "explainer")
      .steps[0].question;
    const attempt = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: question.id, response, mode: "coach" },
    });
    expect(attempt.statusCode).toBe(200);
  }
}

/** Opens a card, reveals it, and rates it, which is the only path that schedules a review. */
async function reviewOneCard(
  rating: "again" | "hard" | "good" | "easy",
  recalled = true,
  scoped = true,
) {
  const session = await app.inject({
    method: "POST",
    url: "/api/review/sessions",
    payload: scoped ? { lessonId: "what-a-letter-stands-for" } : {},
  });
  expect(session.statusCode).toBe(200);
  const { sessionId, card } = session.json();
  if (recalled && scoped)
    await app.inject({
      method: "POST",
      url: `/api/review/sessions/${sessionId}/respond`,
      payload: { response: "-5" },
    });
  await app.inject({
    method: "POST",
    url: `/api/review/sessions/${sessionId}/reveal`,
    payload: {},
  });
  const rated = await app.inject({
    method: "POST",
    url: `/api/review/sessions/${sessionId}/rate`,
    payload: { rating, recalled },
  });
  expect(rated.statusCode).toBe(200);
  return { cardId: card.cardId, result: rated.json() };
}

/**
 * Reviews one named card. The HTTP queue decides which card comes next, so a test that needs
 * to follow a single card through several reviews opens its session directly.
 */
function rateCardDirectly(cardId: string, rating: "again" | "good", recalled = true) {
  const session = store.createReviewSession(cardId);
  if (recalled) store.recordReviewRecall(session.id, "-5", true);
  store.revealReviewSession(session.id);
  const rated = store.rateReviewSession(session.id, rating, recalled);
  if (!rated) throw new Error(`Card '${cardId}' could not be rated.`);
  return rated.state;
}

afterEach(async () => {
  await app.close();
});

describe("review scheduling across courses", () => {
  it("reports introduced lessons per course as well as in total", async () => {
    let timestamp = Date.parse("2026-08-19T08:00:00.000Z");
    await start({ clock: () => new Date(timestamp++) });
    await introduceLessons();
    const review = await app.inject({ method: "GET", url: "/api/review" });
    expect(review.statusCode).toBe(200);
    const body = review.json();
    expect(body.courses.length).toBeGreaterThan(1);
    // Each row names its course rather than repeating the identifier.
    const maths = body.courses.find(
      (row: { courseId: string }) => row.courseId === "maths-foundations",
    );
    expect(maths.title).toBe("Maths Foundations");
    expect(maths.cardCount).toBe(2);
    expect(maths.dueCount).toBe(maths.cardCount);
    expect(body.courses.map((row: { courseId: string }) => row.courseId)).not.toContain(
      "electronics-foundations",
    );
    expect(
      body.courses.reduce((total: number, row: { dueCount: number }) => total + row.dueCount, 0),
    ).toBe(body.dueCount);
  });

  it("takes turns between courses instead of clearing one first", async () => {
    const clock = testClock("2026-08-19T08:00:00.000Z");
    await start({ clock: clock.now });
    await introduceLessons();
    const courseOfCard = (cardId: string) => store.getReviewCard(cardId)?.courseId;

    const seen: Array<string | undefined> = [];
    for (let index = 0; index < 4; index += 1) {
      const { cardId } = await reviewOneCard("good", true, false);
      seen.push(courseOfCard(cardId));
      clock.advanceMinutes(1);
    }
    // Two courses are bundled, so a fair queue must alternate rather than repeat.
    expect(new Set(seen).size).toBeGreaterThan(1);
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[1]).not.toBe(seen[2]);
  });

  it("persists FSRS memory state and lengthens the interval as recall succeeds", async () => {
    const clock = testClock("2026-08-19T08:00:00.000Z");
    await start({ clock: clock.now });

    const first = await reviewOneCard("good");
    const afterFirst = store.getReviewCard(first.cardId);
    expect(afterFirst?.state.stability).toBeGreaterThan(0);
    expect(afterFirst?.state.phase).toBe("learning");
    expect(afterFirst?.state.repetition).toBe(1);
    expect(Date.parse(afterFirst?.state.dueAt ?? "")).toBeGreaterThan(
      Date.parse("2026-08-19T08:00:00.000Z"),
    );

    // The same card, recalled again after its learning step, leaves learning for a real
    // interval measured in days.
    clock.advanceMinutes(11);
    const afterSecond = rateCardDirectly(first.cardId, "good");
    expect(afterSecond.phase).toBe("review");
    expect(afterSecond.scheduledDays).toBeGreaterThanOrEqual(1);
    expect(afterSecond.repetition).toBe(2);

    clock.advanceDays(3);
    const afterThird = rateCardDirectly(first.cardId, "good");
    expect(afterThird.stability).toBeGreaterThan(afterSecond.stability);
    expect(afterThird.intervalDays).toBeGreaterThan(afterSecond.intervalDays);
  });

  it("returns a failed card to relearning and records the lapse", async () => {
    const clock = testClock("2026-08-19T08:00:00.000Z");
    await start({ clock: clock.now });
    const { cardId } = await reviewOneCard("good");
    clock.advanceMinutes(11);
    const settled = rateCardDirectly(cardId, "good");
    expect(settled.phase).toBe("review");

    clock.advanceDays(3);
    const lapsed = rateCardDirectly(cardId, "again", false);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.phase).toBe("relearning");
    expect(lapsed.lastOutcome).toBe("incorrect");
    // The evidence history is not erased by a lapse; only the schedule restarts.
    expect(lapsed.independentReviews).toBe(2);
  });

  it("caps assisted recall at a hard grade", async () => {
    const clock = testClock("2026-08-19T08:00:00.000Z");
    await start({ clock: clock.now });
    const assisted = await reviewOneCard("easy", false);
    const card = store.getReviewCard(assisted.cardId);
    expect(card?.state.assistedReviews).toBe(1);
    expect(card?.state.independentReviews).toBe(0);
    // Hard is a six-minute step; Easy would have left learning altogether.
    expect(card?.state.phase).toBe("learning");
  });
});

describe("study streak", () => {
  it("starts at nothing and counts the day the learner first answers", async () => {
    const clock = testClock("2026-08-19T08:00:00.000Z");
    await start({ clock: clock.now });

    expect((await app.inject({ method: "GET", url: "/api/home" })).json().streakDays).toBe(0);
    const attempt = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "0.05 A", mode: "coach" },
    });
    expect(attempt.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/home" })).json().streakDays).toBe(1);
  });

  it("grows on consecutive days and resets after a missed one", async () => {
    const clock = testClock("2026-08-19T08:00:00.000Z");
    await start({ clock: clock.now });
    const answer = () =>
      app.inject({
        method: "POST",
        url: "/api/attempts",
        payload: { questionId: "calculate-current-5v-100ohm", response: "0.05 A", mode: "coach" },
      });
    const streak = async () =>
      (await app.inject({ method: "GET", url: "/api/home" })).json().streakDays;

    await answer();
    clock.advanceDays(1);
    await answer();
    expect(await streak()).toBe(2);

    clock.advanceDays(1);
    await answer();
    expect(await streak()).toBe(3);

    // Two clear days with no work, so only the new day counts.
    clock.advanceDays(3);
    expect(await streak()).toBe(0);
    await answer();
    expect(await streak()).toBe(1);
  });

  it("counts three genuine due recall responses as a day of study", async () => {
    const clock = testClock("2026-08-19T08:00:00.000Z");
    await start({ clock: clock.now });
    await app.inject({ method: "GET", url: "/api/review" });
    const cards = store.dueReviewQueue(clock.now().toISOString()).slice(0, 3);
    for (const card of cards) rateCardDirectly(card.cardId, "good");
    expect((await app.inject({ method: "GET", url: "/api/home" })).json().streakDays).toBe(1);
  });
});
