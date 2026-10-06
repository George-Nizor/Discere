import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";
import { legacyBundle, legacyContentRoot } from "./helpers/legacy-content.js";

/**
 * The legacy (question-first) lesson player, exercised on a pinned pre-rewrite bundle rather
 * than a live course, which is rewritten to the v2 format in turn (see helpers/legacy-content).
 * The v2 player has its own tests in lesson-v2-routes.test.ts.
 */
const bundle = legacyBundle();
const lesson = bundle.lessons[0]!;
const step = lesson.steps[0]!;
const question = bundle.questions.find((item) => item.id === step.checkQuestionId)!;
let app: FastifyInstance;
let store: DiscereStore;
let fixture: ReturnType<typeof legacyContentRoot>;
beforeAll(() => {
  fixture = legacyContentRoot();
});
afterAll(() => fixture.remove());
afterEach(async () => {
  await app.close();
});
const feedback = (attemptId: string, extra: Record<string, unknown> = {}) =>
  app.inject({
    method: "POST",
    url: "/api/attempts/" + attemptId + "/lesson-feedback",
    payload: { courseId: bundle.course.id, lessonId: lesson.id, stepId: step.id, ...extra },
  });
function wrongResponse(id: string) {
  const q = bundle.questions.find((item) => item.id === id)!;
  return (
    q.choices?.find(
      (choice) =>
        q.answerAuthority.kind !== "text" ||
        !q.answerAuthority.acceptedIdeas.includes(choice.label),
    )?.label ?? "999"
  );
}
const wrong = () =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: { questionId: question.id, response: "999", mode: "coach" },
  });
describe("the live catalogue", () => {
  beforeEach(async () => {
    ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 }));
  });
  it("lists reviewed courses and retains archived saved links without recommending prototypes", async () => {
    const courses = (await app.inject({ method: "GET", url: "/api/courses" })).json().courses;
    expect(courses.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([
        "maths-foundations",
        "logic-and-reasoning",
        "cs-basics",
        "probability-statistics",
        "sql-from-rows-to-reports",
        "python-for-data-analysis",
      ]),
    );
    expect(courses.length).toBeGreaterThanOrEqual(12);
    expect(courses.map((item: { id: string }) => item.id)).toContain(
      "linear-algebra-vectors-and-maps",
    );
    expect(courses.map((item: { id: string }) => item.id)).toContain("biology-cells-to-ecosystems");
    expect(courses.map((item: { id: string }) => item.id)).toContain(
      "chemistry-atoms-to-reactions",
    );
    expect(courses.map((item: { id: string }) => item.id)).toContain(
      "calculus-change-and-accumulation",
    );
    expect(courses.map((item: { id: string }) => item.id)).toContain("geometry-shape-and-space");
    expect(courses.map((item: { id: string }) => item.id)).toContain("physics-motion-and-forces");
    expect(courses.map((item: { id: string }) => item.id)).not.toContain("roman-empire");
    expect(courses.map((item: { id: string }) => item.id)).not.toContain("electronics-foundations");
    expect((await app.inject({ method: "GET", url: "/api/courses/roman-empire" })).statusCode).toBe(
      200,
    );
    await app.inject({
      method: "PUT",
      url: "/api/courses/roman-empire/lessons/republic-to-empire/progress",
      payload: { stageId: "republic-to-empire:explainer", state: "active", interactionState: {} },
    });
    const home = (await app.inject({ method: "GET", url: "/api/home" })).json();
    expect(home.currentMission.courseId).toBe("maths-foundations");
    expect(
      home.progress.some((item: { conceptId: string }) => item.conceptId === "roman-republic"),
    ).toBe(false);
  });
});

describe("question-first learning (legacy player)", () => {
  beforeEach(async () => {
    ({ app, store } = await createApp({
      dbPath: ":memory:",
      migrate: true,
      revealDelayMs: 0,
      contentRoot: fixture.root,
    }));
  });
  it("shows teaching before the question but withholds the answer and its authority", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/courses/" + bundle.course.id + "/lessons/" + lesson.id + "/journey",
    });
    const steps = response.json().stages[0].steps as Array<{
      id: string;
      questionLed: boolean;
      eyebrow?: string;
      blocks: Array<{ kind: string; text?: string }>;
    }>;
    expect(steps.every((item) => item.questionLed)).toBe(true);
    // Audit B1: the step's prose reaches the learner; its heading is only an eyebrow.
    expect(steps.some((item) => item.blocks.length > 0)).toBe(true);
    expect(steps.every((item) => item.blocks.every((block) => block.kind !== "heading"))).toBe(
      true,
    );
    for (const item of steps) {
      const authored = lesson.steps.find((candidate) => candidate.id === item.id)!;
      const question = bundle.questions.find((q) => q.id === authored.checkQuestionId)!;
      if (question.answerAuthority.kind !== "numeric") continue;
      const key = String(Math.abs(question.answerAuthority.value));
      const shown = item.blocks.map((block) => block.text ?? "").join(" ");
      const promptNumbers: string[] = question.prompt.match(/\d+(?:\.\d+)?/gu) ?? [];
      if (!promptNumbers.includes(key))
        expect(
          shown.match(/\d[\d,]*(?:\.\d+)?/gu)?.map((n) => n.replaceAll(",", "")) ?? [],
        ).not.toContain(key);
    }
    expect(response.body).not.toMatch(
      /answerAuthority|workedAnswer|acceptedIdeas|"hints":|onCorrect|misconceptions/,
    );
    const missing = await feedback("00000000-0000-4000-8000-000000000000");
    expect(missing.statusCode).toBe(404);
  });
  it("opens a correction once without increasing XP or recording correctness or mastery", async () => {
    const attempt = (await wrong()).json();
    expect(attempt.correct).toBe(false);
    const before = store.getMastery(question.conceptIds[0]!);
    const response = await feedback(attempt.attemptId);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ correct: false, reviewRequired: true });
    expect(response.json().answer).toBe(
      question.answerAuthority.kind === "numeric"
        ? question.answerAuthority.workedAnswer
        : question.answerAuthority.exampleAnswer,
    );
    // The reveal is the prose the step held back, never the whole paragraph again.
    const journey = (
      await app.inject({
        method: "GET",
        url: "/api/courses/" + bundle.course.id + "/lessons/" + lesson.id + "/journey",
      })
    ).json();
    const shown = journey.stages[0].steps[0].blocks as Array<{ text?: string }>;
    const revealed = response.json().blocks as Array<{ text?: string }>;
    const all = step.blocks
      .filter((block) => block.kind === "paragraph")
      .map((block) => ("text" in block ? block.text : ""))
      .join(" ");
    expect([...shown, ...revealed].map((block) => block.text).join(" ").length).toBeLessThanOrEqual(
      all.length + 2,
    );
    expect(store.getAttempt(attempt.attemptId)).toMatchObject({
      correct: false,
      answerRevealed: true,
      xpAwarded: attempt.xpAwarded,
    });
    expect(store.getMastery(question.conceptIds[0]!)).toBe(before);
    expect((await feedback(attempt.attemptId)).statusCode).toBe(200);
    expect(
      store.database
        .prepare(
          "SELECT COUNT(*) AS n FROM assistance_events WHERE attempt_id = ? AND type = 'worked_example'",
        )
        .get(attempt.attemptId),
    ).toEqual({ n: 1 });
    const retry = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        attemptId: attempt.attemptId,
        questionId: question.id,
        response: "999",
        mode: "coach",
      },
    });
    expect(retry.statusCode).toBe(409);
  });
  it("rejects lesson and step mismatches without exposing the answer", async () => {
    const attempt = (await wrong()).json();
    for (const extra of [
      { stepId: "invented" },
      { lessonId: bundle.lessons[1]!.id },
      { courseId: "sql-from-rows-to-reports" },
    ]) {
      const response = await feedback(attempt.attemptId, extra);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.body).not.toContain(
        question.answerAuthority.kind === "numeric"
          ? question.answerAuthority.workedAnswer
          : question.answerAuthority.exampleAnswer,
      );
    }
    expect(store.getAttempt(attempt.attemptId)?.answerRevealed).toBe(false);
  });
  it("keeps Exam explanations closed and does not let an ungraded numeric response open a correction", async () => {
    const exam = (
      await app.inject({
        method: "POST",
        url: "/api/attempts",
        payload: { questionId: question.id, response: "999", mode: "exam" },
      })
    ).json();
    expect((await feedback(exam.attemptId)).statusCode).toBe(403);
    expect(store.getAttempt(exam.attemptId)?.answerRevealed).toBe(false);
    const malformed = (
      await app.inject({
        method: "POST",
        url: "/api/attempts",
        payload: { questionId: question.id, response: "not a number", mode: "coach" },
      })
    ).json();
    expect((await feedback(malformed.attemptId)).statusCode).toBe(409);
    expect(store.getAttempt(malformed.attemptId)?.answerRevealed).toBe(false);
  });
  it("requires each recorded question or correction before advancing the lesson", async () => {
    const url = "/api/courses/" + bundle.course.id + "/lessons/" + lesson.id + "/progress";
    const complete = () =>
      app.inject({
        method: "PUT",
        url,
        payload: { stageId: lesson.id + ":explainer", state: "completed", interactionState: {} },
      });
    expect((await complete()).statusCode).toBe(409);
    for (const item of lesson.steps) {
      const attempt = (
        await app.inject({
          method: "POST",
          url: "/api/attempts",
          payload: {
            questionId: item.checkQuestionId,
            response: wrongResponse(item.checkQuestionId!),
            mode: "coach",
          },
        })
      ).json();
      expect((await feedback(attempt.attemptId, { stepId: item.id })).statusCode).toBe(200);
    }
    expect((await complete()).statusCode).toBe(200);
    expect(lesson.steps.every((item) => store.hasQuestionEvidence(item.checkQuestionId!))).toBe(
      true,
    );
    expect(store.getProfile().xp).toBeGreaterThanOrEqual(0);
    expect(
      lesson.steps.every((item) =>
        store.database
          .prepare("SELECT correct FROM attempts WHERE question_id = ?")
          .get(item.checkQuestionId),
      ),
    ).toBe(true);
  });
  it("reviews only introduced ideas and excludes archived courses from general review", async () => {
    const initial = (await app.inject({ method: "GET", url: "/api/review" })).json();
    expect(initial).toMatchObject({ dueCount: 0, courses: [] });
    const attempt = (await wrong()).json();
    await feedback(attempt.attemptId);
    const home = (await app.inject({ method: "GET", url: "/api/review" })).json();
    expect(home.dueCount).toBe(lesson.flashcardIds.length);
    expect(home.courses.map((item: { courseId: string }) => item.courseId)).toEqual([
      bundle.course.id,
    ]);
    const session = await app.inject({ method: "POST", url: "/api/review/sessions", payload: {} });
    expect(session.statusCode).toBe(200);
    expect(lesson.flashcardIds).toContain(session.json().card.cardId);
  });
});
