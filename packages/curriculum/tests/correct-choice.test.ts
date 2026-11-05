import type { Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { correctChoiceId } from "../src/lesson-projection.js";

const question = (accepted: string, labels: string[]) =>
  ({
    choices: labels.map((label, index) => ({ id: String.fromCharCode(97 + index), label })),
    answerAuthority: { kind: "text", acceptedIdeas: [accepted], rejectedIdeas: [] },
  }) as unknown as Question;

describe("correctChoiceId", () => {
  it("finds the accepted label whatever its case", () => {
    expect(
      correctChoiceId(
        question("raising the supply voltage", [
          "Making the wires longer",
          "Raising the supply voltage",
        ]),
      ),
    ).toBe("b");
  });

  it("finds a label set as code when the accepted text is plain", () => {
    expect(correctChoiceId(question("MM a.txt", ["` M a.txt`", "`MM a.txt`"]))).toBe("b");
  });
});
