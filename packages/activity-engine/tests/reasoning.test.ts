import { describe, expect, it } from "vitest";
import { runTeachingProgram, traceSearch, truthValue } from "../src/index.js";
describe("bounded teaching programs", () => {
  it("traces order, branch boundaries and a terminating loop", () => {
    expect(runTeachingProgram("x = 3\nx += 2\nx *= 4").value).toBe(20);
    expect(runTeachingProgram("x = 4\nif x >= 4:\n    x += 3\nelse:\n    x -= 1").value).toBe(7);
    const counted = runTeachingProgram("x = 3\nwhile x > 0:\n    x -= 1");
    expect(counted.value).toBe(0);
    expect(counted.steps.filter((step) => step.event === "Update x")).toHaveLength(3);
    expect(runTeachingProgram("x = 1\nfor i in range(4):\n    x *= 2").value).toBe(16);
  });
  it("reports unreachable syntax, missing inputs and division by zero", () => {
    for (const code of [
      "x += 1",
      "x = 1\nx /= 0",
      "x = 0\nif x > 1:\n    import os",
      "x = 1\n  x += 2",
      "else:\n    x = 1",
    ])
      expect(runTeachingProgram(code).error).not.toBeNull();
  });
  it("bounds infinite loops and oversized counts without executing host code", () => {
    const infinite = runTeachingProgram("x = 1\nwhile x > 0:\n    x += 1");
    expect(infinite.steps).toHaveLength(100);
    expect(infinite.error).toContain("stopping condition");
    expect(runTeachingProgram("x = 0\nfor i in range(999999):\n    x += 1").error).toContain(
      "step limit",
    );
    expect(runTeachingProgram("x = process.env.SECRET").error).not.toBeNull();
  });
});
describe("truth and search cases", () => {
  it("matches a conditional to its contrapositive across every assignment", () => {
    for (const p of [true, false])
      for (const q of [true, false])
        expect(truthValue("p_implies_q", p, q)).toBe(truthValue("notq_implies_notp", p, q));
    expect(truthValue("p_implies_q", false, true)).not.toBe(truthValue("q_implies_p", false, true));
  });
  it("counts successful and absent searches and rejects an unsorted binary search", () => {
    expect(traceSearch([2, 4, 6, 8, 10, 12, 14], 14, "linear")).toHaveLength(7);
    expect(traceSearch([2, 4, 6, 8, 10, 12, 14], 14, "binary").map((step) => step.index)).toEqual([
      3, 5, 6,
    ]);
    expect(traceSearch([2, 4, 6], 5, "binary").at(-1)?.found).toBe(false);
    expect(() => traceSearch([5, 1, 3], 1, "binary")).toThrow(/sorted/);
  });
});

describe("speaker consistency", () => {
  it("keeps the only assignment compatible with Ada and Ben's two claims", () => {
    const fits = [false, true].flatMap((p) =>
      [false, true].filter((q) => truthValue("speaker_agreement", p, q)).map((q) => ({ p, q })),
    );
    expect(fits).toEqual([{ p: true, q: false }]);
  });
  it("finds no consistent assignment for the conflicting claims", () => {
    for (const p of [false, true])
      for (const q of [false, true]) expect(truthValue("conflicting_speakers", p, q)).toBe(false);
  });
});
