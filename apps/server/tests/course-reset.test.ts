import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mathsCourseChecks } from "../../../content/maths-foundations/authoring/course-checks.js";
import { createApp, type DiscereApp } from "../src/app.js";

let service: DiscereApp;
const inject = (method: "GET" | "PUT" | "POST" | "DELETE", url: string, payload?: unknown) =>
  service.app.inject({
    method,
    url,
    ...(payload ? { payload: payload as Record<string, unknown> } : {}),
  });

beforeEach(async () => {
  service = await createApp({ dbPath: ":memory:", migrate: true });
  service.content.bundle("maths-foundations")!.courseChecks = structuredClone(mathsCourseChecks);
});
afterEach(async () => {
  await service.app.close();
});

/** Saves the first stage of a lesson as active, the way the player does on opening it. */
async function open(courseId: string) {
  const lessonId = service.content.bundle(courseId)!.lessons[0]!.id;
  const journey = (
    await inject("GET", `/api/courses/${courseId}/lessons/${lessonId}/journey`)
  ).json();
  const saved = await inject("PUT", `/api/courses/${courseId}/lessons/${lessonId}/progress`, {
    stageId: journey.stages[0].id,
    state: "active",
    interactionState: { stepId: "somewhere" },
  });
  expect(saved.statusCode, saved.body).toBe(200);
  return lessonId;
}

describe("resetting a course", () => {
  it("clears the course's lesson progress and checks, and leaves other courses alone", async () => {
    const lessonId = await open("maths-foundations");
    const other = await open("cs-basics");
    const check = await inject(
      "POST",
      "/api/courses/maths-foundations/checks/starting-point/start",
    );
    expect(check.statusCode, check.body).toBe(200);

    const reset = await inject("DELETE", "/api/courses/maths-foundations/progress");
    expect(reset.statusCode, reset.body).toBe(200);
    expect(reset.json()).toEqual({ stages: 1, checks: 1 });

    const after = (
      await inject("GET", `/api/courses/maths-foundations/lessons/${lessonId}/progress`)
    ).json();
    expect(
      after.stages.every(
        (stage: { interactionState: object }) => Object.keys(stage.interactionState).length === 0,
      ),
    ).toBe(true);
    const untouched = (
      await inject("GET", `/api/courses/cs-basics/lessons/${other}/progress`)
    ).json();
    expect(
      untouched.stages.some(
        (stage: { interactionState: { stepId?: string } }) =>
          stage.interactionState.stepId === "somewhere",
      ),
    ).toBe(true);
  });

  it("refuses a course that does not exist", async () => {
    expect((await inject("DELETE", "/api/courses/no-such-course/progress")).statusCode).toBe(404);
  });
});
