import { describe, expect, it } from "vitest";
import { scoreAttempt, updateMastery } from "../src/index.js";
describe("progression scoring", () => {
  it("separates XP from mastery", () => {
    const direct = scoreAttempt({ correct: true, mode: "direct", hintsUsed: 2, answerRevealed: true, transferCorrect: false });
    expect(direct.xp).toBeGreaterThan(0);
    expect(direct.masteryEvidence).toBeLessThan(0.2);
  });
  it("records direct mode as assisted even without a hint", () => {
    const direct = scoreAttempt({ correct: true, mode: "direct", hintsUsed: 0, answerRevealed: false });
    expect(direct.independent).toBe(false);
    expect(direct.masteryEvidence).toBeLessThan(0.5);
  });
  it("rewards an independent exam answer", () => {
    const exam = scoreAttempt({ correct: true, mode: "exam", hintsUsed: 0, answerRevealed: false });
    expect(exam.independent).toBe(true);
    expect(exam.masteryEvidence).toBe(1);
  });
  it("moves mastery towards evidence", () => expect(updateMastery(0.4, 1)).toBeGreaterThan(0.4));
});
