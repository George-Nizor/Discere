import type { CourseCheckSession } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { CHECK_NAMES, placedOutLessons, placementVerdict } from "./check-model.js";

const item = (lessonId: string, correct: boolean, confidence: "sure" | "partly" | "unsure") =>
  ({ lessonId, correct, confidence }) as unknown as NonNullable<
    CourseCheckSession["result"]
  >["items"][number];

describe("placement model", () => {
  it("places out a lesson only when every question from it was right and not a guess", () => {
    const session = {
      result: {
        items: [
          item("a", true, "sure"),
          item("a", true, "partly"),
          item("b", true, "unsure"),
          item("c", false, "sure"),
        ],
      },
    } as unknown as CourseCheckSession;
    expect([...placedOutLessons(session)]).toEqual(["a"]);
    expect(placedOutLessons(undefined).size).toBe(0);
  });
  it("never celebrates a zero", () => {
    expect(placementVerdict(0, 12).tone).toBe("start");
    expect(placementVerdict(5, 12).tone).toBe("partial");
    expect(placementVerdict(11, 12).tone).toBe("strong");
  });
  it("names each kind of check one way", () => {
    expect(Object.values(CHECK_NAMES)).toEqual([
      "Find your starting point",
      "Bring the ideas together",
      "Use it a week later",
    ]);
  });
});
