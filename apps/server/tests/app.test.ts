import { rmSync, symlinkSync } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => {
  ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 }));
});
afterEach(async () => {
  await app.close();
});

describe("Discere API", () => {
  it("serves a learner-safe routed journey with separate stages", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/journey",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    // One quiz stage per question the lesson asks, so the count follows the content.
    expect(body.stageOrder).toHaveLength(body.stages.length);
    expect([...new Set(body.stages.map((stage: { type: string }) => stage.type))]).toEqual([
      "explainer",
      "interactive_visual",
      "quiz",
      "essay",
      "review",
      "completion",
    ]);
    // One question moved inside the lesson as an inline check, so three remain as quiz stages.
    expect(body.stages.filter((stage: { type: string }) => stage.type === "quiz")).toHaveLength(3);
    const quiz = body.stages.find((stage: { type: string }) => stage.type === "quiz");
    expect(quiz.question.answerAuthority).toBeUndefined();
    expect(quiz.question.transfer).toBeUndefined();
  });

  it("delivers the lesson as steps with inline checks stripped of their answers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/journey",
    });
    const body = response.json();
    const explainer = body.stages.find((stage: { type: string }) => stage.type === "explainer");

    // The stage id is unchanged, so progress recorded before the step model still resolves.
    expect(explainer.id).toBe("current-in-one-loop:explainer");
    expect(explainer.completionPolicy).toBe("interaction");
    expect(explainer.steps.length).toBeGreaterThanOrEqual(3);
    expect(explainer.steps[0].kind).toBe("hook");

    const check = explainer.steps.find((step: { kind: string }) => step.kind === "check");
    expect(check.question.id).toBe("choose-change-that-raises-current");
    // Exactly the same protection a quiz stage gets: the answer never leaves the server.
    expect(check.question.answerAuthority).toBeUndefined();
    expect(check.question.transfer).toBeUndefined();
    expect(check.question.choices.length).toBeGreaterThan(1);

    // A question asked inline is not also asked as a quiz stage.
    const quizIds = body.stages
      .filter((stage: { type: string }) => stage.type === "quiz")
      .map((stage: { questionId: string }) => stage.questionId);
    expect(quizIds).not.toContain("choose-change-that-raises-current");
  });

  it("keeps the learner's position in a stepped lesson across a reload", async () => {
    await app.inject({
      method: "PUT",
      url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/progress",
      payload: {
        stageId: "current-in-one-loop:explainer",
        state: "active",
        interactionState: { stepIndex: 3 },
      },
    });
    const restored = await app.inject({
      method: "GET",
      url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/progress",
    });
    const stage = restored
      .json()
      .stages.find((entry: { stageId: string }) => entry.stageId === "current-in-one-loop:explainer");
    expect(stage.interactionState).toEqual({ stepIndex: 3 });
  });

  it("persists journey stage progress and restores the next active stage", async () => {
    const update = await app.inject({
      method: "PUT",
      url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/progress",
      payload: {
        stageId: "current-in-one-loop:explainer",
        state: "completed",
        interactionState: { readAloud: false },
      },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().activeStageId).toBe("current-in-one-loop:visual");
    const restored = await app.inject({
      method: "GET",
      url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/progress",
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json().activeStageId).toBe("current-in-one-loop:visual");
  });

  it("autosaves and submits a teach-back without exposing rubric authority", async () => {
    const essayId = "ohms-law-teach-back";
    const content =
      "Voltage provides the push, resistance limits current, and Ohm's law relates them. With five volts and one hundred ohms, the current is fifty milliamps.";
    const save = await app.inject({
      method: "PUT",
      url: `/api/essays/${encodeURIComponent(essayId)}`,
      payload: { content },
    });
    expect(save.statusCode).toBe(200);
    expect(save.json().content).toBe(content);
    expect(save.json().submitted).toBe(false);
    const submit = await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(essayId)}/submit`,
      payload: { content },
    });
    expect(submit.statusCode).toBe(200);
    expect(submit.json().submitted).toBe(true);
    expect(submit.json().rubric).toBeUndefined();
    const restored = await app.inject({
      method: "GET",
      url: `/api/essays/${encodeURIComponent(essayId)}`,
    });
    expect(restored.json().submitted).toBe(true);
  });

  it("accepts a teach-back whose prose trips the writing gate and returns advisory notes", async () => {
    const essayId = "ohms-law-teach-back";
    // The learner's wording uses a construction the gate rejects in generated prose.
    const content =
      "This is not a rule; it is a relationship. Current is voltage divided by resistance, so five volts across one hundred ohms gives fifty milliamps in the loop.";
    const submit = await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(essayId)}/submit`,
      payload: { content },
    });
    expect(submit.statusCode).toBe(200);
    expect(submit.json().submitted).toBe(true);
    expect(submit.json().styleNotes.length).toBeGreaterThan(0);
  });

  it("keeps review backs behind a reveal and records independent evidence", async () => {
    const session = await app.inject({ method: "POST", url: "/api/review/sessions", payload: {} });
    expect(session.statusCode).toBe(200);
    const sessionBody = session.json();
    expect(sessionBody.card.back).toBeUndefined();
    const revealed = await app.inject({
      method: "POST",
      url: `/api/review/sessions/${sessionBody.sessionId}/reveal`,
      payload: {},
    });
    expect(revealed.statusCode).toBe(200);
    // The queue is fed by the authored cards, so the back is the answer that card records.
    expect(revealed.json().back).toContain("I = V / R");
    const rated = await app.inject({
      method: "POST",
      url: `/api/review/sessions/${sessionBody.sessionId}/rate`,
      payload: { rating: "good", recalled: true },
    });
    expect(rated.statusCode).toBe(200);
    expect(rated.json().evidence).toBe("independent");
    const repeated = await app.inject({
      method: "POST",
      url: `/api/review/sessions/${sessionBody.sessionId}/rate`,
      payload: { rating: "easy", recalled: true },
    });
    expect(repeated.statusCode).toBe(409);
  });

  it("lists every bundled course and names its concepts", async () => {
    const list = await app.inject({ method: "GET", url: "/api/courses" });
    expect(list.statusCode).toBe(200);
    const ids = list.json().courses.map((course: { id: string }) => course.id);
    expect(ids).toContain("electronics-foundations");
    expect(ids).toContain("roman-empire");
    const detail = await app.inject({ method: "GET", url: "/api/courses/roman-empire" });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().concepts.length).toBeGreaterThan(0);
    expect(detail.json().concepts[0].title).toBeTruthy();
  });

  it("serves a second-subject journey with a retrieved image and a timeline activity", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/journey",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    const explainer = body.stages.find((stage: { type: string }) => stage.type === "explainer");
    expect(explainer.visual.kind).toBe("image");
    expect(explainer.visual.image.attribution).toContain("Tataryn");
    expect(explainer.visual.src).toContain("/api/content/roman-empire/assets/");
    const activity = body.stages.find(
      (stage: { type: string }) => stage.type === "interactive_visual",
    );
    expect(activity.activity.type).toBe("timeline_explorer");
    expect(activity.activity.events.length).toBeGreaterThan(1);
  });

  it("serves a course asset and refuses to escape its own directory", async () => {
    const asset = await app.inject({
      method: "GET",
      url: "/api/content/roman-empire/assets/roman-empire-extent-117ce.png",
    });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers["content-type"]).toBe("image/png");
    const outsideCourse = await app.inject({
      method: "GET",
      url: "/api/content/roman-empire/assets/%2e%2e%2fbundle.json",
    });
    expect(outsideCourse.statusCode).toBe(404);
    expect(outsideCourse.json().code).toBe("ASSET_NOT_FOUND");
  });

  it("refuses a course asset that is a symlink out of the course directory", async () => {
    // A lexical containment check cannot see through a link, so the route resolves both ends
    // before it reads. The link is first-party here only because a test has to create one.
    const assets = path.resolve(import.meta.dirname, "../../../content/roman-empire/assets");
    const link = path.join(assets, "escaped-bundle.json");
    const target = path.resolve(assets, "../bundle.json");
    rmSync(link, { force: true });
    symlinkSync(target, link);
    try {
      const escaped = await app.inject({
        method: "GET",
        url: "/api/content/roman-empire/assets/escaped-bundle.json",
      });
      expect(escaped.statusCode).toBe(404);
      expect(escaped.json().code).toBe("ASSET_NOT_FOUND");
      expect(escaped.body).not.toContain("lessons");
    } finally {
      rmSync(link, { force: true });
    }
  });

  it("reaches every lesson of every course, whatever activity it uses", async () => {
    for (const courseId of ["electronics-foundations", "roman-empire"]) {
      const detail = await app.inject({ method: "GET", url: `/api/courses/${courseId}` });
      for (const lesson of detail.json().lessons as Array<{ id: string; available: boolean }>) {
        expect(lesson.available).toBe(true);
        const journey = await app.inject({
          method: "GET",
          url: `/api/courses/${courseId}/lessons/${encodeURIComponent(lesson.id)}/journey`,
        });
        expect(journey.statusCode).toBe(200);
      }
    }
  });

  it("returns a visual-first current lesson without the answer authority", async () => {
    const response = await app.inject({ method: "GET", url: "/api/lessons/current" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.lesson.visualBrief.visualClass).toBe("deterministic_diagram");
    expect(body.question.answerAuthority).toBeUndefined();
  });

  it("renders the calculated circuit", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/visuals/circuit.svg?voltage=5&resistance=100",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("0.05 A");
  });

  it("honours an explicit false query value", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/visuals/circuit.svg?voltage=5&resistance=100&values=false",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('class="current"');
  });

  it("rejects generated-sounding negative parallelism", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/writing/lint",
      payload: {
        text: "This is not a formula; it is a powerful way of thinking.",
        context: "lesson",
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().passed).toBe(false);
  });

  it("assesses a free numeric response", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "50 mA", mode: "coach" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().correct).toBe(true);
  });

  it("rejects adversarial extra fields on learner attempt payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        questionId: "calculate-current-5v-100ohm",
        response: "50 mA",
        mode: "coach",
        answerAuthority: { value: 0.05, unit: "A" },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });

  it("records direct-mode evidence as assisted", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "50 mA", mode: "direct" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().correct).toBe(true);
    expect(response.json().independent).toBe(false);
  });

  it("keeps completed attempts immutable and closes assistance", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "50 mA", mode: "coach" },
    });
    const attemptId = first.json().attemptId as string;

    const overwrite = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        attemptId,
        questionId: "calculate-current-5v-100ohm",
        response: "1 A",
        mode: "coach",
      },
    });
    expect(overwrite.statusCode).toBe(409);
    expect(overwrite.json().code).toBe("ATTEMPT_COMPLETE");

    const hint = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/hints` });
    expect(hint.statusCode).toBe(409);
    expect(hint.json().code).toBe("ATTEMPT_COMPLETE");
    expect(store.getAttempt(attemptId)?.correct).toBe(true);
  });

  it("updates each concept from its own mastery baseline", async () => {
    store.database
      .prepare(
        "UPDATE concept_progress SET mastery = 0.8 WHERE user_id = 'local-user' AND concept_id = 'current'",
      )
      .run();
    const response = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        questionId: "calculate-current-5v-100ohm",
        response: "0.05 A",
        mode: "coach",
      },
    });
    expect(response.statusCode).toBe(200);
    const progress = Object.fromEntries(
      store.getProgress().map((item) => [item.conceptId, item.mastery]),
    );
    const currentMastery = progress["current"] ?? 0;
    const resistanceMastery = progress["resistance"] ?? 0;
    expect(currentMastery).toBeGreaterThan(resistanceMastery);
    expect(response.json().mastery).toBeCloseTo(resistanceMastery, 8);
  });

  it("keeps the tutoring mode fixed for the life of an attempt", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "coach" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        attemptId: attempt.json().attemptId,
        questionId: "calculate-current-5v-100ohm",
        response: "1 A",
        mode: "direct",
      },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("ATTEMPT_MODE_LOCKED");
  });

  it("enforces exam mode hint and reveal guardrails", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "exam" },
    });
    const attemptId = attempt.json().attemptId as string;
    const hint = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/hints` });
    expect(hint.statusCode).toBe(403);
    const reveal = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/reveal/start`,
      payload: { reason: "I have checked my working and remain stuck." },
    });
    expect(reveal.statusCode).toBe(403);
  });

  it("requires a reason and confirmation before revealing an answer", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "direct" },
    });
    const attemptId = attempt.json().attemptId as string;
    const start = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/reveal/start`,
      payload: { reason: "I checked the formula and cannot find the mistake." },
    });
    expect(start.statusCode).toBe(200);
    const token = start.json().token as string;
    const confirm = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/reveal/confirm`,
      payload: { token, confirmation: "show answer" },
    });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().answer).toContain("0.05 A");
    expect(confirm.json().transferPrompt).toContain("6 V");
    const repeated = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/reveal/confirm`,
      payload: { token, confirmation: "show answer" },
    });
    expect(repeated.statusCode).toBe(409);
  });
});
