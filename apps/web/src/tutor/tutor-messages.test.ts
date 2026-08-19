import { describe, expect, it } from "vitest";
import { tutorErrorMessage } from "./tutor-messages.js";

describe("tutor error wording", () => {
  it("explains each provider fault in plain words", () => {
    expect(tutorErrorMessage("EXAM_GUARDRAIL", "fallback")).toContain("Exam mode");
    expect(tutorErrorMessage("TUTOR_PROVIDER_TIMEOUT", "fallback")).toContain("did not finish");
    expect(tutorErrorMessage("TUTOR_PROVIDER_UNAVAILABLE", "fallback")).toContain("not running");
    expect(tutorErrorMessage("TUTOR_WRITING_GATE", "fallback")).toContain("withheld");
  });

  it("uses the server message when the code is unknown", () => {
    expect(tutorErrorMessage("SOMETHING_ELSE", "The server said no.")).toBe("The server said no.");
    expect(tutorErrorMessage(null, "The server said no.")).toBe("The server said no.");
  });
});
