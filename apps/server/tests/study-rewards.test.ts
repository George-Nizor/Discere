import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StudySummarySchema } from "@discere/contracts";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;
let instant: string;
beforeEach(async () => {
  instant = "2026-09-30T13:55:00.000Z";
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    clock: () => new Date(instant),
  }));
  store.study.updatePreferences({ timeZone: "Australia/Sydney" });
  await app.inject({ method: "GET", url: "/api/review" });
});
afterEach(async () => {
  await app.close();
});
const answer = (response = "0.05 A", attemptId?: string) =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: {
      questionId: "calculate-current-5v-100ohm",
      response,
      mode: "coach",
      ...(attemptId ? { attemptId } : {}),
    },
  });
const summary = async () =>
  StudySummarySchema.parse((await app.inject({ method: "GET", url: "/api/study" })).json());

describe("earned learning rewards", () => {
  it("offers the next unfinished lesson after a completion instead of returning to the finish screen", async () => {
    const lesson = "what-a-letter-stands-for";
    store.saveStageProgress(
      `maths-foundations:${lesson}`,
      [`${lesson}:completion`],
      { stageId: `${lesson}:completion`, state: "completed", interactionState: {} },
      "completion",
    );
    const home = (await app.inject({ method: "GET", url: "/api/home" })).json();
    expect(home.currentMission).toMatchObject({
      courseId: "maths-foundations",
      lessonBeatId: "keeping-the-balance",
    });
  });
  it("uses the useful subject fact once in successful feedback", async () => {
    const reply = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        questionId: "maths-keeping-the-balance-1",
        response: "Subtract 6 from both sides",
        mode: "coach",
      },
    });
    expect(reply.json().feedback).toBe(
      "Subtracting 6 from both equal sides leaves 2x = 12. Changing only one side would generally break the equality.",
    );
    expect(reply.json().feedback).not.toContain("misconception");
  });
  it("does not turn a visit, blank response, or unparseable numeric response into study", async () => {
    await app.inject({ method: "GET", url: "/api/home" });
    await answer(" ");
    await answer("not a number");
    const study = await summary();
    expect(study.daily.current).toBe(0);
    expect(study.streak.days).toBe(0);
    expect(store.getProfile().xp).toBe(0);
  });
  it("separates a study streak from the larger daily goal and uses local midnight", async () => {
    await answer();
    const first = await summary();
    expect(first.today).toBe("2026-09-30");
    expect(first.daily).toEqual({ current: 1, target: 5, complete: false });
    expect(first.streak.activeToday).toBe(true);
    instant = "2026-09-30T14:05:00.000Z";
    expect((await summary()).daily.current).toBe(0);
    expect((await summary()).streak.days).toBe(1);
    expect((await summary()).streak.activeToday).toBe(false);
    await answer();
    expect((await summary()).streak.days).toBe(2);
  });
  it("bounds rewards and mastery across new attempts at the same question", async () => {
    const first = (await answer()).json();
    expect(first.xpGained).toBeGreaterThan(0);
    const xp = store.getProfile().xp;
    const progress = store.getProgress();
    const repeat = (await answer()).json();
    expect(repeat.correct).toBe(true);
    expect(repeat.xpGained).toBe(0);
    expect(store.getProfile().xp).toBe(xp);
    expect(store.getProgress()).toEqual(progress);
    expect((await summary()).daily.current).toBe(1);
    expect((await summary()).totals.independent).toBe(1);
  });
  it("awards only the improvement on a retry and earns a correction once", async () => {
    const wrong = (await answer("0.5 A")).json();
    const right = (await answer("0.05 A", wrong.attemptId)).json();
    expect(right.xpGained).toBeGreaterThan(0);
    expect(wrong.xpGained + right.xpGained).toBe(right.xpAwarded);
    const study = await summary();
    expect(wrong.xpGained).toBe(0);
    expect(study.achievements?.find((item) => item.id === "second-wind")?.earned).toEqual([
      { rank: 1, at: instant },
    ]);
    expect(study.totals.independent).toBe(1);
    expect(study.daily.current).toBe(1);
  });
  it("preserves terminal progress and never pays for reopening a completed screen", () => {
    const id = "test:lesson";
    const order = ["lesson:explainer", "lesson:completion"];
    store.saveStageProgress(
      id,
      order,
      { stageId: order[0]!, state: "completed", interactionState: {} },
      "explainer",
    );
    expect(store.getProfile().xp).toBe(0);
    store.saveStageProgress(
      id,
      order,
      { stageId: order[1]!, state: "completed", interactionState: {} },
      "completion",
    );
    const xp = store.getProfile().xp;
    store.saveStageProgress(
      id,
      order,
      { stageId: order[1]!, state: "active", interactionState: {} },
      "completion",
    );
    store.saveStageProgress(
      id,
      order,
      { stageId: order[1]!, state: "completed", interactionState: {} },
      "completion",
    );
    expect(store.getProfile().xp).toBe(xp);
    expect(store.study.summary().totals.lessons).toBe(1);
  });
  it("rewards a due card once even with duplicate sessions, and ignores early and blank reviews", () => {
    const cardId = store.dueReviewQueue(instant)[0]!.cardId;
    const first = store.createReviewSession(cardId);
    const duplicate = store.createReviewSession(cardId);
    for (const session of [first, duplicate]) {
      store.recordReviewRecall(session.id, "some remembered detail", false);
      store.revealReviewSession(session.id);
    }
    expect(store.rateReviewSession(first.id, "again", false)?.xpGained).toBe(3);
    expect(store.rateReviewSession(duplicate.id, "again", false)).toBeNull();
    expect(store.getReviewCard(cardId)?.state.repetition).toBe(1);
    const early = store.createReviewSession(cardId);
    store.recordReviewRecall(early.id, "some remembered detail", false);
    store.revealReviewSession(early.id);
    expect(store.rateReviewSession(early.id, "good", false)?.xpGained).toBe(0);
    const blank = store.createReviewSession(store.dueReviewQueue(instant)[0]!.cardId);
    store.revealReviewSession(blank.id);
    expect(store.rateReviewSession(blank.id, "good", false)?.xpGained).toBe(0);
    expect(store.study.summary().daily.current).toBe(1);
    expect(store.study.summary().streak.days).toBe(0);
  });
  it("earns and spends protection durably without claiming a missed day was practice", async () => {
    for (let day = 1; day <= 7; day++) {
      instant = `2026-09-${String(day).padStart(2, "0")}T08:00:00.000Z`;
      await answer();
    }
    expect((await summary()).streak.charges).toBe(1);
    instant = "2026-09-09T08:00:00.000Z";
    await answer();
    const study = await summary();
    expect(study.streak.days).toBe(9);
    expect(study.streak.charges).toBe(0);
    const missed = study.calendar.find((day) => day.date === "2026-09-08");
    expect(missed).toMatchObject({ protected: true, qualified: false, answers: 0 });
    expect((await summary()).streak.days).toBe(9);
    expect((await summary()).streak.charges).toBe(0);
    expect(study.totals.independent).toBe(1);
  });
  it("validates preferences and withholds unfinished lesson results", async () => {
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/study/preferences",
          payload: { timeZone: "Mars/Olympus" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/study/preferences",
          payload: { dailyGoal: 999, arbitrary: true },
        })
      ).statusCode,
    ).toBe(400);
    const saved = await app.inject({
      method: "PUT",
      url: "/api/study/preferences",
      payload: { dailyGoal: 3, motion: "reduced", sound: true },
    });
    expect(saved.json()).toMatchObject({
      dailyGoal: 3,
      motion: "reduced",
      sound: true,
      timeZone: "Australia/Sydney",
    });
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/courses/maths-foundations/lessons/what-a-letter-stands-for/result",
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/courses/cs-basics/lessons/what-a-letter-stands-for/result",
        })
      ).statusCode,
    ).toBe(404);
  });
});
