import { describe, expect, it } from "vitest";
import { buildCompanionPacket } from "../src/index.js";
describe("companion packet", () => {
  it("contains protocol and style requirements", () => {
    const packet = buildCompanionPacket({ operation: "draft_lesson", requestId: "e33f7ec0-d5f6-4c0e-a22f-6afe7e9fda89", payload: { conceptId: "current" } });
    expect(packet.text).toContain('"protocolVersion": "0.2"');
    expect(packet.text).toContain("Avoid negative parallelism");
  });
});
