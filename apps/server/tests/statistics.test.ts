import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DiscereStore } from "../src/db/store.js";
import { createApp } from "../src/app.js";
import { legacyContentRoot } from "./helpers/legacy-content.js";

let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => {
  ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 }));
});
afterEach(async () => { await app.close(); });
const lessons = ["counting-outcomes", "when-the-condition-changes", "independent-repetitions",
  "centre-and-outliers", "same-centre-different-spread", "samples-and-populations"];
const answer = (questionId: string, response: string) => app.inject({
  method: "POST", url: "/api/attempts", payload: { questionId, response, mode: "coach" },
});
describe("published statistics learning", () => {
  it("serves every lesson and catalogue subjects without answer keys", async () => {
    const list = (await app.inject({ method: "GET", url: "/api/courses" })).json();
    expect(list.courses.find((course: { id: string }) => course.id === "probability-statistics"))
      .toMatchObject({ lessonCount: 6, subjects: ["Mathematics", "Data literacy"] });
    for (const lessonId of lessons) {
      const journey = await app.inject({ method: "GET",
        url: "/api/courses/probability-statistics/lessons/" + lessonId + "/journey" });
      expect(journey.statusCode).toBe(200);
      expect(journey.body).not.toMatch(
        /answerAuthority|workedAnswer|acceptedIdeas|onCorrect|misconceptions/);
      expect(journey.body).not.toContain('"hints":');
      const stages = journey.json().stages;
      const explainer = stages[0];
      // Each lesson is published in the v2 format: an opener, its steps, and a recap.
      expect(explainer.intro.promise).toBeTruthy();
      expect(explainer.intro.hook.blocks.length).toBeGreaterThan(0);
      expect(stages.find((stage: { type: string }) => stage.type === "recap").keyIdea).toBeTruthy();
      const steps = explainer.steps;
      expect(steps.length).toBeGreaterThanOrEqual(5);
      expect(steps.some((step: { diagram?: unknown }) => step.diagram)).toBe(true);
      const asked = steps.filter((step: { question?: unknown }) => step.question);
      expect(asked.length).toBeGreaterThan(0);
      for (const step of asked) {
        expect(step.question.id).toMatch(/^stats-/);
        expect(step.question.hints).toBeUndefined();
        expect(step.question.hintCount).toBeGreaterThan(0);
      }
    }
  });
  it("delivers hints only after a permitted attempt and records assistance", async () => {
    const submit = (mode: string) => app.inject({ method: "POST", url: "/api/attempts",
      payload: { questionId: "stats-counting-outcomes-3", response: "1/36", mode } });
    const exam = (await submit("exam")).json();
    const hint = (attemptId: string) => app.inject({ method: "POST",
      url: "/api/attempts/" + attemptId + "/hints", payload: {} });
    expect((await hint(exam.attemptId)).statusCode).toBe(403);
    const coached = (await submit("coach")).json();
    const permitted = await hint(coached.attemptId);
    expect(permitted.statusCode).toBe(200);
    expect(permitted.json().hint).toBe("Count only matching pairs, then divide by all 36 pairs.");
    const assisted = await app.inject({ method: "POST", url: "/api/attempts",
      payload: { questionId: "stats-counting-outcomes-3", attemptId: coached.attemptId,
        response: "1/6", mode: "coach" } });
    expect(assisted.json().correct).toBe(true);
    expect(assisted.json().independent).toBe(false);
  });
  it("marks conditional denominators and equivalent fractions and bounds earned evidence", async () => {
    const id = "stats-when-the-condition-changes-3";
    const wrong = (await answer(id, "1/12")).json();
    expect(wrong.correct).toBe(false);
    const correct = (await answer(id, "3/12")).json();
    expect(correct.correct).toBe(true);
    const xp = store.getProfile().xp;
    const repeat = (await answer(id, "0.25")).json();
    expect(repeat.correct).toBe(true);
    expect(repeat.xpGained).toBe(0);
    expect(store.getProfile().xp).toBe(xp);
    expect((await answer("stats-same-centre-different-spread-4", "64/3")).json().correct).toBe(false);
    expect((await answer("stats-same-centre-different-spread-4", "16")).json().correct).toBe(true);
  });
  it("requires actual evidence for completion and schedules lesson-specific recall", async () => {
    const lessonId = "counting-outcomes";
    const completion = await app.inject({ method: "PUT",
      url: "/api/courses/probability-statistics/lessons/" + lessonId + "/progress",
      payload: { stageId: lessonId + ":completion", state: "completed", interactionState: {} } });
    expect(completion.statusCode).toBe(409);
    const opened = await app.inject({ method: "POST", url: "/api/review/sessions",
      payload: { lessonId, cardId: "stats-counting-outcomes-card-1", mode: "exam" } });
    expect(opened.statusCode).toBe(200);
    const session = opened.json();
    expect(session.card.back).toBeUndefined();
    const reveal = () => app.inject({ method: "POST",
      url: "/api/review/sessions/" + session.sessionId + "/reveal", payload: {} });
    expect((await reveal()).statusCode).toBe(409);
    const response = await app.inject({ method: "POST",
      url: "/api/review/sessions/" + session.sessionId + "/respond", payload: { response: "2/36" } });
    expect(response.json().correct).toBe(true);
    expect((await reveal()).statusCode).toBe(200);
    const rated = await app.inject({ method: "POST",
      url: "/api/review/sessions/" + session.sessionId + "/rate", payload: { rating: "good", recalled: true } });
    expect(rated.json().evidence).toBe("independent");
    expect(Date.parse(rated.json().dueAt)).toBeGreaterThan(Date.now());
  });
});

/** The same lessons as last published in the legacy format, pinned (see helpers/legacy-content). */
describe("legacy statistics lessons", () => {
  let fixture: ReturnType<typeof legacyContentRoot>;
  let legacy: FastifyInstance;
  beforeAll(async () => {
    fixture = legacyContentRoot();
    ({ app: legacy } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0,
      contentRoot: fixture.root }));
  });
  afterAll(async () => {
    await legacy.close();
    fixture.remove();
  });
  it("serves every visual lesson as four question-led steps without answer keys", async () => {
    for (const lessonId of lessons) {
      const journey = await legacy.inject({ method: "GET",
        url: "/api/courses/probability-statistics/lessons/" + lessonId + "/journey" });
      expect(journey.statusCode).toBe(200);
      expect(journey.body).not.toMatch(/answerAuthority|workedAnswer|acceptedIdeas/);
      expect(journey.body).not.toContain('"hints":');
      expect(journey.json().stages[0].intro).toBeUndefined();
      const steps = journey.json().stages[0].steps;
      expect(steps).toHaveLength(4);
      for (const step of steps) {
        expect(step.diagram).toBeDefined();
        expect(step.question.id).toMatch(/^stats-/);
        expect(step.question.hints).toBeUndefined();
        expect(step.question.hintCount).toBeGreaterThan(0);
      }
    }
  });
});
