import type { CourseBundle, CourseCheckDefinition, CourseCheckSession } from "@discere/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mathsCourseChecks } from "../../../content/maths-foundations/authoring/course-checks.js";
import { createApp, type DiscereApp } from "../src/app.js";
import { placedOutLessonIds } from "../src/course-checks.js";

let service: DiscereApp, now: Date;
const root = "/api/courses/maths-foundations/checks";
const body = (response: { json: () => unknown }) => response.json() as CourseCheckSession;
const get = (url: string) => service.app.inject({ method: "GET", url });
const post = (url: string, payload: unknown = {}) =>
  service.app.inject({ method: "POST", url, payload: payload as Record<string, unknown> });
const start = (id = "starting-point") => post(root + "/" + id + "/start");
const submit = (id: string, questionId: string, response: string, confidence = "sure") =>
  post("/api/course-check-sessions/" + id + "/responses", { questionId, response, confidence });
beforeEach(async () => {
  now = new Date("2026-10-02T00:00:00Z");
  service = await createApp({ dbPath: ":memory:", migrate: true, clock: () => now });
  service.content.bundle("maths-foundations")!.courseChecks = structuredClone(mathsCourseChecks);
});
afterEach(async () => {
  await service.app.close();
});
function solution(item: CourseCheckDefinition["items"][number]) {
  const q = item.question,
    a = q.answerAuthority;
  return a.kind === "numeric"
    ? String(a.value)
    : q.choices!.find((c) => a.acceptedIdeas.includes(c.label))!.id;
}
async function finish(check: CourseCheckDefinition, wrongFirst = false) {
  let session = body(await start(check.id));
  for (const [i, item] of check.items.entries()) {
    const result = await submit(
      session.id,
      item.question.id,
      i === 0 && wrongFirst ? "999" : solution(item),
    );
    expect(result.statusCode, result.body).toBe(200);
    session = body(result);
  }
  return session;
}
async function finishLessons() {
  const bundle = service.content.bundle("maths-foundations")! as CourseBundle;
  for (const lesson of bundle.lessons) {
    const questions = [...lesson.steps.map((s) => s.checkQuestionId), ...lesson.questionIds].filter(
      Boolean,
    );
    for (const id of questions) {
      const q = bundle.questions.find((q) => q.id === id)!;
      const a = q.answerAuthority;
      const response =
        a.kind === "numeric" ? String(a.value) : q.choices ? a.acceptedIdeas[0]! : a.exampleAnswer;
      const marked = await post("/api/attempts", { questionId: q.id, response, mode: "coach" });
      expect(marked.statusCode, marked.body).toBe(200);
      expect(marked.json().correct, q.id + ": " + response).toBe(true);
    }
    for (const cardId of lesson.flashcardIds) {
      const card = bundle.flashcards.find((c) => c.id === cardId)!;
      const created = await post("/api/review/sessions", {
        lessonId: lesson.id,
        cardId,
        mode: "coach",
      });
      const id = created.json().sessionId;
      const a = card.answerAuthority!;
      await post("/api/review/sessions/" + id + "/respond", {
        response: a.kind === "numeric" ? String(a.value) : a.acceptedIdeas[0],
      });
      await post("/api/review/sessions/" + id + "/reveal");
      const rated = await post("/api/review/sessions/" + id + "/rate", {
        rating: "easy",
        recalled: true,
      });
      expect(rated.statusCode, rated.body).toBe(200);
    }
    const journey = service.content.getJourney(bundle.course.id, lesson.id)!;
    for (const stage of journey.stages) {
      const response = await service.app.inject({
        method: "PUT",
        url: "/api/courses/" + bundle.course.id + "/lessons/" + lesson.id + "/progress",
        payload: { stageId: stage.id, state: "completed", interactionState: {} },
      });
      expect(response.statusCode, response.body).toBe(200);
    }
  }
}
describe("saved course checks", () => {
  it("starts once, shows one question and withholds all marking until completion", async () => {
    const initial = await start(),
      session = body(initial);
    expect(initial.statusCode).toBe(200);
    expect(initial.body).not.toMatch(
      /answerAuthority|acceptedIdeas|workedAnswer|explanation|correct|result/,
    );
    expect(session.current?.question.id).toBe(mathsCourseChecks[0]!.items[0]!.question.id);
    expect(body(await start()).id).toBe(session.id);
    const posted = await submit(session.id, session.current!.question.id, "999");
    expect(posted.body).not.toMatch(/"correct"|explanation|workedAnswer/);
    expect(body(posted).answered).toBe(1);
    expect(service.store.study.summary().totals.answers).toBe(0);
    expect(service.store.getProfile().xp).toBe(0);
    expect(
      (
        await post("/api/attempts", {
          questionId: session.current!.question.id,
          response: "1",
          mode: "direct",
        })
      ).statusCode,
    ).toBe(404);
  });
  it("rejects blanks, arbitrary choices, out-of-order answers, extra authority and changed retries", async () => {
    let session = body(await start());
    const id = session.current!.question.id;
    expect((await submit(session.id, id, " ")).statusCode).toBe(400);
    expect((await submit(session.id, id, "oops")).statusCode).toBe(400);
    expect((await submit(session.id, id, "1", "certain")).statusCode).toBe(400);
    expect((await submit(session.id, "later", "1")).statusCode).toBe(409);
    expect(
      (
        await post("/api/course-check-sessions/" + session.id + "/responses", {
          questionId: id,
          response: "1",
          confidence: "sure",
          correct: true,
        })
      ).statusCode,
    ).toBe(400);
    session = body(await submit(session.id, id, "1"));
    expect((await submit(session.id, id, "1")).statusCode).toBe(200);
    expect((await submit(session.id, id, "2")).statusCode).toBe(409);
    expect(
      (await submit(session.id, session.current!.question.id, "Subtract 5 from both sides"))
        .statusCode,
    ).toBe(400);
    expect(body(await get("/api/course-check-sessions/" + session.id)).answered).toBe(1);
  });
  it("scores fixed first responses, recommends the matching lesson, retains confidence and never repays reloads", async () => {
    const session = await finish(mathsCourseChecks[0]!, true);
    expect(session.result).toMatchObject({
      correct: 5,
      xp: 40,
      recommendedLessons: [{ id: "what-a-letter-stands-for", title: "What a letter stands for" }],
    });
    expect(session.result!.items[0]).toMatchObject({
      response: "999",
      correct: false,
      confidence: "sure",
    });
    expect(session.result!.items[0]!.explanation).toContain("= 1");
    expect(service.store.study.summary().totals.answers).toBe(6);
    expect(service.store.study.summary().totals.lessons).toBe(0);
    expect(service.store.getMastery("variable")).toBe(0);
    const replay = body(await start());
    expect(replay).toEqual(session);
    const last = mathsCourseChecks[0]!.items.at(-1)!;
    expect((await submit(session.id, last.question.id, solution(last))).statusCode).toBe(200);
    expect(service.store.getProfile().xp).toBe(40);
  });
  it("never rewards a failed placement and recommends a start rather than every lesson", async () => {
    const check = mathsCourseChecks[0]!;
    let session = body(await start());
    for (const item of check.items) {
      const right = solution(item);
      const wrong = item.question.choices
        ? item.question.choices.find((choice) => choice.id !== right)!.id
        : "999";
      const marked = await submit(session.id, item.question.id, wrong);
      expect(marked.statusCode, marked.body).toBe(200);
      session = body(marked);
    }
    expect(session.result?.correct).toBe(0);
    expect(session.result?.xp).toBe(0);
    expect(service.store.getProfile().xp).toBe(0);
    const order = service.content.bundle("maths-foundations")!.lessons.map((l) => l.id);
    expect(session.result?.recommendedLessons.map((l) => l.id)).toEqual(order.slice(0, 3));
    // Evidence is still recorded honestly: six wrong answers.
    expect(service.store.study.summary().totals.answers).toBe(check.items.length);
  });
  it("places out only lessons answered correctly without a guess", () => {
    const items = [{ lessonId: "a" }, { lessonId: "a" }, { lessonId: "b" }, { lessonId: "c" }];
    const known = placedOutLessonIds(items, [
      { correct: true, confidence: "sure" },
      { correct: true, confidence: "partly" },
      { correct: true, confidence: "unsure" },
      { correct: false, confidence: "sure" },
    ]);
    expect([...known]).toEqual(["a"]);
  });
  it("requires every required lesson stage, then unlocks fresh transfer exactly seven days after the actual challenge", async () => {
    expect((await start("mixed-challenge")).statusCode).toBe(409);
    const lesson = service.content.bundle("maths-foundations")!.lessons[0]!;
    service.store.saveStageProgress(
      "maths-foundations:" + lesson.id,
      [lesson.id + ":completion"],
      { stageId: lesson.id + ":completion", state: "completed", interactionState: {} },
      "completion",
    );
    expect(
      (await get(root)).json().checks.find((c: { id: string }) => c.id === "mixed-challenge")
        .remainingLessons,
    ).toBe(6);
    await finishLessons();
    expect((await start("later-transfer")).statusCode).toBe(409);
    const final = await finish(mathsCourseChecks[1]!);
    expect(final.result?.correct).toBe(8);
    expect(final.result?.nextCheckAt).toBe("2026-10-09T00:00:00.000Z");
    now = new Date("2026-10-08T23:59:59.999Z");
    expect((await start("later-transfer")).statusCode).toBe(409);
    expect((await get("/api/course-checks/due")).json().checks).toHaveLength(0);
    now = new Date("2026-10-09T00:00:00.000Z");
    expect((await get("/api/course-checks/due")).json().checks).toHaveLength(1);
    expect((await finish(mathsCourseChecks[2]!)).result?.correct).toBe(6);
    expect((await get("/api/course-checks/due")).json().checks).toHaveLength(0);
  });
  it("resumes against its saved definition even after the authored course changes", async () => {
    const original = body(await start());
    service.content.bundle("maths-foundations")!.courseChecks![0]!.items[0]!.question.prompt =
      "New wording";
    const changed = body(await start());
    expect(changed.id).not.toBe(original.id);
    expect(
      body(await get("/api/course-check-sessions/" + original.id)).current?.question.prompt,
    ).toBe(original.current?.question.prompt);
    const foreign = "00000000-0000-4000-8000-000000000000";
    expect((await get("/api/course-check-sessions/" + foreign)).statusCode).toBe(404);
  });
});
