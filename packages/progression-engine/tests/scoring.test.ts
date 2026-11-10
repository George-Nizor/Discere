import { describe, expect, it } from "vitest";
import { raiseMastery, scoreAttempt, updateMastery } from "../src/index.js";
describe("progression scoring", () => {
  it("separates XP from mastery", () => {
    const direct = scoreAttempt({
      correct: true,
      mode: "direct",
      hintsUsed: 2,
      answerRevealed: true,
      transferCorrect: false,
    });
    expect(direct.xp).toBeGreaterThan(0);
    expect(direct.masteryEvidence).toBeLessThan(0.2);
  });
  it("records direct mode as assisted even without a hint", () => {
    const direct = scoreAttempt({
      correct: true,
      mode: "direct",
      hintsUsed: 0,
      answerRevealed: false,
    });
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

describe("attempt XP", () => {
  const base = { mode: "coach" as const, hintsUsed: 0, answerRevealed: false };
  it("pays nothing for a wrong answer and most for one done alone", () => {
    expect(scoreAttempt({ ...base, correct: false }).xp).toBe(0);
    expect(scoreAttempt({ ...base, correct: true }).xp).toBe(20);
  });
  it("never pays more for taking hints", () => {
    const xp = [0, 1, 2, 3, 4].map(
      (hintsUsed) => scoreAttempt({ ...base, correct: true, hintsUsed }).xp,
    );
    expect(xp).toEqual([20, 15, 10, 8, 8]);
    expect(scoreAttempt({ ...base, correct: true, answerRevealed: true }).xp).toBe(5);
    expect(scoreAttempt({ ...base, mode: "direct", correct: true }).xp).toBe(10);
  });
});

describe("credit for a question", () => {
  const base = { mode: "coach" as const, hintsUsed: 0, answerRevealed: false, correct: true };
  it("is independent only for a first response with no help", () => {
    expect(scoreAttempt(base)).toMatchObject({ credit: "independent", independent: true, xp: 20 });
    expect(scoreAttempt({ ...base, priorTries: 0 }).independent).toBe(true);
  });
  it("records a correct answer after a miss as recovered, for less XP on each try", () => {
    const xp = [1, 2, 3, 4].map((priorTries) => {
      const scored = scoreAttempt({ ...base, priorTries });
      expect(scored).toMatchObject({ credit: "recovered", independent: false });
      return scored.xp;
    });
    expect(xp).toEqual([12, 8, 5, 5]);
    expect(scoreAttempt({ ...base, priorTries: 1 }).masteryEvidence).toBeLessThan(1);
    expect(scoreAttempt({ ...base, priorTries: 1 }).masteryEvidence).toBeGreaterThan(
      scoreAttempt({ ...base, priorTries: 3 }).masteryEvidence,
    );
  });
  it("pays at most the revealed award once the worked answer has been shown", () => {
    for (const priorTries of [0, 1, 2, 5])
      expect(scoreAttempt({ ...base, answerRevealed: true, priorTries })).toMatchObject({
        credit: "revealed",
        independent: false,
        xp: 5,
      });
  });
  it("counts a hint, the tutor or Direct mode on an earlier attempt as help", () => {
    expect(scoreAttempt({ ...base, hintsUsed: 1 })).toMatchObject({ credit: "assisted", xp: 15 });
    expect(scoreAttempt({ ...base, usedDirect: true })).toMatchObject({
      credit: "assisted",
      independent: false,
      xp: 10,
    });
  });
  it("gives a wrong answer no credit", () =>
    expect(scoreAttempt({ ...base, correct: false })).toMatchObject({ credit: "none", xp: 0 }));
  it("never lowers mastery for a correct answer", () => {
    const helped = scoreAttempt({ ...base, hintsUsed: 3 }).masteryEvidence;
    expect(updateMastery(0.9, helped)).toBeLessThan(0.9);
    expect(raiseMastery(0.9, helped)).toBe(0.9);
    expect(raiseMastery(0.2, helped)).toBeGreaterThan(0.2);
  });
});
