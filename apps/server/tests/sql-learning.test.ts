import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";
import { readingLessons } from "../../../content/sql-from-rows-to-reports/authoring/reading-lessons.js";
import { summaryLessons } from "../../../content/sql-from-rows-to-reports/authoring/summary-lessons.js";
import { combiningLessons } from "../../../content/sql-from-rows-to-reports/authoring/combining-lessons.js";
import { windowLessons } from "../../../content/sql-from-rows-to-reports/authoring/window-lessons.js";

let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => {
  ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 }));
});
afterEach(async () => {
  await app.close();
});
const lessons = [...readingLessons, ...summaryLessons, ...combiningLessons, ...windowLessons];
const answer = (id: string, response: string) =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: { questionId: id, response, mode: "coach" },
  });
describe("published SQL learner flow", () => {
  it("serves all fifteen lessons with compared tables and concealed assessment and hints", async () => {
    const courses = (await app.inject({ method: "GET", url: "/api/courses" })).json().courses;
    expect(
      courses.find((course: { id: string }) => course.id === "sql-from-rows-to-reports"),
    ).toMatchObject({ lessonCount: 15, subjects: ["Computer science", "Data literacy"] });
    for (const lesson of lessons) {
      const journey = await app.inject({
        method: "GET",
        url: "/api/courses/sql-from-rows-to-reports/lessons/" + lesson.id + "/journey",
      });
      expect(journey.statusCode).toBe(200);
      expect(journey.body).not.toMatch(/answerAuthority|workedAnswer|acceptedIdeas/);
      expect(journey.body).not.toContain('"hints":');
      const steps = journey.json().stages[0].steps;
      expect(steps).toHaveLength(4);
      expect(
        steps.every(
          (step: { diagram: { type: string }; question: { hintCount: number } }) =>
            step.diagram.type === "relational_query" && step.question.hintCount > 0,
        ),
      ).toBe(true);
    }
  });
  it("marks typed SQL terms and missing-value distinctions on the server", async () => {
    expect((await answer("sql-aggregate-known-values-4", "0")).json().correct).toBe(false);
    expect((await answer("sql-aggregate-known-values-4", "null")).json().correct).toBe(true);
    expect((await answer("sql-group-and-filter-groups-3", "WHERE")).json().correct).toBe(false);
    expect((await answer("sql-group-and-filter-groups-3", "HAVING")).json().correct).toBe(true);
    expect((await answer("sql-rank-with-ties-6", "ROW_NUMBER()")).json().correct).toBe(true);
    expect((await answer("sql-preserve-the-left-table-2", "1")).json().correct).toBe(false);
    expect((await answer("sql-preserve-the-left-table-2", "0")).json().correct).toBe(true);
    const xp = store.getProfile().xp;
    expect((await answer("sql-preserve-the-left-table-2", "0")).json().xpGained).toBe(0);
    expect(store.getProfile().xp).toBe(xp);
  });
  it("conceals symbolic recall until response and schedules actual independent evidence", async () => {
    const opened = await app.inject({
      method: "POST",
      url: "/api/review/sessions",
      payload: {
        lessonId: "aggregate-known-values",
        cardId: "sql-aggregate-known-values-card-2",
        mode: "exam",
      },
    });
    expect(opened.statusCode).toBe(200);
    const session = opened.json();
    expect(session.card.back).toBeUndefined();
    const reveal = () =>
      app.inject({
        method: "POST",
        url: "/api/review/sessions/" + session.sessionId + "/reveal",
        payload: {},
      });
    expect((await reveal()).statusCode).toBe(409);
    const marked = await app.inject({
      method: "POST",
      url: "/api/review/sessions/" + session.sessionId + "/respond",
      payload: { response: "COUNT(*)" },
    });
    expect(marked.json().correct).toBe(true);
    expect((await reveal()).statusCode).toBe(200);
    const rated = await app.inject({
      method: "POST",
      url: "/api/review/sessions/" + session.sessionId + "/rate",
      payload: { rating: "good", recalled: true },
    });
    expect(rated.json().evidence).toBe("independent");
    expect(Date.parse(rated.json().dueAt)).toBeGreaterThan(Date.now());
  });
});
