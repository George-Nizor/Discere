import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
});
describe("learner recall repair through the server", () => {
  it("grades natural responses, exposes public titles, and keeps answers hidden before submission", async () => {
    const started = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 });
    app = started.app;
    await app.inject({ method: "GET", url: "/api/review" });
    for (const [id, answer, correct] of [
      ["chem-what-makes-an-element-card-2", "16 electrons", true],
      ["chem-what-makes-an-element-card-2", "16 protons", false],
      ["stats-counting-outcomes-card-1", "5.5555555556%", true],
      ["stats-counting-outcomes-card-1", "25", false],
      ["maths-keeping-the-balance-card-2", "Zero, because division by zero is undefined.", true],
      ["maths-keeping-the-balance-card-2", "not zero", false],
    ] as const) {
      const session = started.store.createReviewSession(id);
      const front = (
        await app.inject({ method: "GET", url: "/api/review/sessions/" + session.id })
      ).json();
      expect(front.card.conceptTitles.length).toBeGreaterThan(0);
      expect(front.card).not.toHaveProperty("back");
      expect(front.card).not.toHaveProperty("answerAuthority");
      const response = await app.inject({
        method: "POST",
        url: "/api/review/sessions/" + session.id + "/respond",
        payload: { response: answer },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().correct, answer).toBe(correct);
      const reveal = await app.inject({
        method: "POST",
        url: "/api/review/sessions/" + session.id + "/reveal",
        payload: {},
      });
      expect(reveal.statusCode).toBe(200);
      expect(reveal.json().back.length).toBeGreaterThan(0);
    }
  });
});
