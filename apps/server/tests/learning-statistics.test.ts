import { StudyStatisticsSchema } from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance, store: DiscereStore;
let instant: string;
beforeEach(async () => {
  instant = "2026-10-02T02:00:00.000Z";
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    clock: () => new Date(instant),
  }));
  store.study.updatePreferences({ timeZone: "Australia/Sydney" });
});
afterEach(async () => {
  await app.close();
});
const statistics = async (period = "all") =>
  StudyStatisticsSchema.parse(
    (await app.inject({ method: "GET", url: "/api/study/statistics?period=" + period })).json(),
  );
function answer(key: string, referenceId: string, correct: boolean) {
  store.study.record({
    key,
    referenceId,
    kind: "answer",
    correct,
    independent: correct,
    qualifying: true,
  });
}

describe("personal learning statistics and saved course continuation", () => {
  it("reports an honest empty account without treating visits as practice or perfect accuracy", async () => {
    await app.inject({ method: "GET", url: "/api/home" });
    const value = await statistics();
    expect(value.accuracy).toBeNull();
    expect(value.totals).toEqual({
      answers: 0,
      correct: 0,
      reviews: 0,
      lessons: 0,
      studyDays: 0,
      xp: 0,
    });
  });
  it("counts one latest result per question per local day and keeps corrections explicit", async () => {
    answer("answer:a", "question-one", false);
    answer("answer:b", "question-two", false);
    instant = "2026-10-02T02:05:00.000Z";
    answer("answer:c", "question-one", true);
    const value = await statistics();
    expect(value.totals.answers).toBe(2);
    expect(value.totals.correct).toBe(1);
    expect(value.accuracy).toBe(0.5);
    expect(value.days[0]).toMatchObject({ answers: 2, correct: 1 });
  });
  it("uses Sydney midnight, calendar range boundaries, and all history beyond seventy days", async () => {
    instant = "2026-01-31T13:05:00.000Z"; // 1 February in Sydney.
    answer("answer:old", "old-question", true);
    instant = "2026-09-30T13:50:00.000Z";
    answer("answer:september", "september-question", false);
    instant = "2026-09-30T14:05:00.000Z";
    answer("answer:october", "october-question", true);
    instant = "2026-10-02T02:00:00.000Z";
    expect((await statistics("all")).totals.answers).toBe(3);
    expect((await statistics("all")).from).toBe("2026-02-01");
    expect((await statistics("year")).totals.answers).toBe(3);
    const month = await statistics("month");
    expect(month.from).toBe("2026-10-01");
    expect(month.totals).toMatchObject({ answers: 1, correct: 1, studyDays: 1 });
    expect((await statistics("week")).from).toBe("2026-09-28");
    expect((await statistics("week")).totals.answers).toBe(2);
  });
  it("keeps the current weekly summary stable while the activity filter changes", async () => {
    instant = "2026-09-15T01:00:00.000Z";
    answer("answer:older", "older-question", true);
    instant = "2026-10-02T02:00:00.000Z";
    store.study.record({
      key: "stage:course:lesson:completion",
      referenceId: "course:lesson",
      kind: "stage",
      correct: false,
      independent: false,
      qualifying: true,
    });
    store.study.record({
      key: "review:one",
      referenceId: "card-one",
      kind: "review",
      correct: true,
      independent: true,
      qualifying: true,
    });
    store.study.reward(15, "stage:course:lesson:completion");
    expect((await statistics("all")).week).toEqual((await statistics("month")).week);
    expect((await statistics("all")).week.totals).toMatchObject({
      lessons: 1,
      reviews: 1,
      studyDays: 1,
      xp: 15,
    });
  });
  it("omits future records and exposes aggregates without private response or answer fields", async () => {
    instant = "2026-10-03T02:00:00.000Z";
    answer("answer:future", "a-private-question-id", true);
    instant = "2026-10-02T02:00:00.000Z";
    const value = await statistics();
    expect(value.totals.answers).toBe(0);
    expect(JSON.stringify(value)).not.toContain("a-private-question-id");
    expect(Object.keys(value).sort()).toEqual([
      "accuracy",
      "days",
      "from",
      "period",
      "timeZone",
      "to",
      "today",
      "totals",
      "week",
    ]);
  });
  it("never changes study rows, earned XP, or preferences when reading stats", async () => {
    answer("answer:one", "one", true);
    const before = store.study.events();
    const preferences = store.study.preferences();
    const xp = store.getProfile().xp;
    for (const period of ["all", "week", "month", "year"]) await statistics(period);
    expect(store.study.events()).toEqual(before);
    expect(store.study.preferences()).toEqual(preferences);
    expect(store.getProfile().xp).toBe(xp);
  });
  it("counts a real transfer-only study day while visits and reward-only days remain empty", async () => {
    store.study.record({
      key: "transfer:changed-case",
      referenceId: "changed-case",
      kind: "transfer",
      correct: true,
      independent: true,
      qualifying: true,
    });
    instant = "2026-10-03T02:00:00.000Z";
    store.study.record({
      key: "stage:preview",
      referenceId: "course:preview",
      kind: "stage",
      correct: false,
      independent: false,
      qualifying: false,
    });
    store.study.reward(5, "stage:preview");
    const value = await statistics();
    expect(value.totals.studyDays).toBe(1);
    expect(value.week.totals.studyDays).toBe(1);
    expect(value.totals.answers).toBe(0);
    expect(value.accuracy).toBeNull();
  });
  it("rejects invalid and repeated filter values", async () => {
    for (const url of [
      "/api/study/statistics?period=forever",
      "/api/study/statistics?period=all&period=week",
      "/api/study/statistics?period=all&extra=1",
    ]) {
      expect((await app.inject({ method: "GET", url })).statusCode).toBe(400);
    }
  });
  it("resumes a later unfinished lesson in each course and advances after its completion", async () => {
    const lesson = "undoing-in-the-right-order";
    store.saveStageProgress(
      "maths-foundations:" + lesson,
      [lesson + ":explainer"],
      { stageId: lesson + ":explainer", state: "active", interactionState: {} },
      "explainer",
    );
    const detail = () => app.inject({ method: "GET", url: "/api/courses/maths-foundations" });
    expect((await detail()).json().resumeLessonId).toBe(lesson);
    instant = "2026-10-02T02:10:00.000Z";
    store.saveStageProgress(
      "maths-foundations:" + lesson,
      [lesson + ":explainer"],
      { stageId: lesson + ":explainer", state: "completed", interactionState: {} },
      "explainer",
    );
    const value = (await detail()).json();
    const index = value.lessons.findIndex((item: { id: string }) => item.id === lesson);
    expect(value.resumeLessonId).toBe(value.lessons[index + 1].id);
    expect(value.resumeLessonId).not.toBe(value.lessons[0].id);
  });
});
