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
      ["roman-empire", "rise-of-the-roman-empire"],
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
  it("checks the authored order on the server and locks the attempt mode", async () => {
    // Read the private authored fixture only in the test process, never through a learner API.
    const { readFile } = await import("node:fs/promises");
    const bundle = JSON.parse(
      await readFile(new URL("../../../content/roman-empire/bundle.json", import.meta.url), "utf8"),
    );
    const activity = bundle.activities.find(
      (item: { type: string }) => item.type === "order_sequence",
    );
    const submit = (response: string[], mode = "coach", attemptId?: string) =>
      app.inject({
        method: "POST",
        url: "/api/activity-attempts",
        payload: { activityId: activity.id, response, mode, ...(attemptId ? { attemptId } : {}) },
      });
    const wrong = await submit([...activity.correctOrder].reverse());
    expect(wrong.statusCode).toBe(200);
    expect(wrong.json().correct).toBe(false);
    const id = wrong.json().attemptId;
    expect((await submit(activity.correctOrder, "direct", id)).statusCode).toBe(409);
    expect((await submit(["invented", "invented", "invented"], "coach", id)).statusCode).toBe(400);
    const correct = await submit(activity.correctOrder, "coach", id);
    expect(correct.json().correct).toBe(true);
    expect((await submit(activity.correctOrder, "coach", id)).statusCode).toBe(409);
  });
});
