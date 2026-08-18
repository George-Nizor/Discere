import { describe, expect, it } from "vitest";
import { autosaveLabel } from "./autosave.js";

describe("autosave status wording", () => {
  const now = Date.parse("2026-08-18T12:00:00.000Z");

  it("states the current step while saving", () => {
    expect(autosaveLabel("saving", null, now)).toBe("Saving…");
    expect(autosaveLabel("waiting", null, now)).toBe("Unsaved changes");
  });

  it("admits a failed save instead of claiming a saved draft", () => {
    expect(autosaveLabel("failed", "2026-08-18T11:59:00.000Z", now)).toBe(
      "Not saved. The last change is still in the editor.",
    );
  });

  it("reports when the draft last reached the server", () => {
    expect(autosaveLabel("saved", "2026-08-18T11:59:50.000Z", now)).toBe("Saved just now");
    expect(autosaveLabel("idle", null, now)).toBe("Not saved yet");
  });
});
