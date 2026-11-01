import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

const bundle = JSON.parse(
  readFileSync(new URL("../../../content/maths-foundations/bundle.json", import.meta.url), "utf8"),
);

describe("worded review cards", () => {
  it("requires self-rating when a card asks for an explanation", () => {
    const codes = (candidate: unknown) =>
      validateCourseBundle(candidate).issues.map((issue) => issue.code);
    expect(codes(bundle)).not.toContain("FREE_TEXT_EXPLANATION_CARD");
    const unflagged = structuredClone(bundle);
    for (const card of unflagged.flashcards) delete card.recall;
    expect(codes(unflagged)).toContain("FREE_TEXT_EXPLANATION_CARD");
  });
});
