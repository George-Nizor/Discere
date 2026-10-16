import type { FastifyInstance } from "fastify";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
let app: FastifyInstance;
beforeEach(async () => {
  ({ app } = await createApp({ dbPath: ":memory:", migrate: true }));
});
afterEach(async () => {
  await app.close();
});
describe("private activity marking", () => {
  it("withholds every activity answer and feedback from the journey", async () => {
    for (const [course, lesson] of [
      ["electronics-foundations", "current-in-one-loop"],
      ["maths-foundations", "what-a-letter-stands-for"],
    ]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/courses/${course}/lessons/${lesson}/journey`,
      });
      expect(response.statusCode).toBe(200);
      for (const key of [
        "correctTargetId",
        "correctOrder",
        "answerAuthority",
        '"feedback":',
        '"tolerance":',
      ])
        expect(response.body).not.toContain(key);
    }
  });
  it("checks the authored choice on the server and locks the attempt mode", async () => {
    // No published course ships a graded diagram choice any more, so the server is given a
    // private copy of Electronics Foundations that carries one. The copy lives in a temp
    // directory and is read only in the test process, never through a learner API.
    const { cp, mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const root = await mkdtemp(path.join(tmpdir(), "discere-activity-authority-"));
    const course = path.join(root, "electronics-foundations");
    await cp(new URL("../../../content/electronics-foundations", import.meta.url), course, {
      recursive: true,
    });
    const bundle = JSON.parse(await readFile(path.join(course, "bundle.json"), "utf8"));
    bundle.activities.push({
      id: "find-what-limits-current",
      type: "diagram_choice",
      title: "Find what limits the current",
      conceptIds: ["current", "resistance"],
      instructions: "Choose the part of the loop that limits the current.",
      prompt: "Which part holds the current back?",
      imageFile: "cover.svg",
      imageAlt: "The course cover",
      targets: [
        { id: "battery", label: "Battery", x: 20, y: 50, r: 8 },
        { id: "resistor", label: "Resistor", x: 50, y: 20, r: 8 },
        { id: "wire", label: "Wire", x: 80, y: 50, r: 8 },
      ],
      correctTargetId: "resistor",
      feedback: {
        correct: "The resistor is what limits the current.",
        incorrect: "Look at the part that holds the flow back.",
      },
    });
    await writeFile(path.join(course, "bundle.json"), JSON.stringify(bundle));
    await app.close();
    try {
      ({ app } = await createApp({ dbPath: ":memory:", migrate: true, contentRoot: root }));
      const activity = bundle.activities.find(
        (item: { type: string }) => item.type === "diagram_choice",
      );
      const wrongTarget = activity.targets.find(
        (target: { id: string }) => target.id !== activity.correctTargetId,
      ).id;
      const submit = (response: string, mode = "coach", attemptId?: string) =>
        app.inject({
          method: "POST",
          url: "/api/activity-attempts",
          payload: { activityId: activity.id, response, mode, ...(attemptId ? { attemptId } : {}) },
        });
      const wrong = await submit(wrongTarget);
      expect(wrong.statusCode).toBe(200);
      expect(wrong.json().correct).toBe(false);
      const id = wrong.json().attemptId;
      expect((await submit(activity.correctTargetId, "direct", id)).statusCode).toBe(409);
      expect((await submit("invented", "coach", id)).statusCode).toBe(400);
      const correct = await submit(activity.correctTargetId, "coach", id);
      expect(correct.json().correct).toBe(true);
      expect((await submit(activity.correctTargetId, "coach", id)).statusCode).toBe(409);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
