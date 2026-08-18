import { loadPrompt } from "@discere/prompts";
import { describe, expect, it } from "vitest";
import { buildCompanionPacket } from "../src/index.js";
describe("companion packet", () => {
  it("contains protocol and style requirements", () => {
    const packet = buildCompanionPacket({ operation: "draft_lesson", requestId: "e33f7ec0-d5f6-4c0e-a22f-6afe7e9fda89", payload: { conceptId: "current" } });
    expect(packet.text).toContain('"protocolVersion": "0.2"');
    expect(packet.text).toContain("Write to the Discere tutor system prompt reproduced below.");
  });

  it("carries the tutor system prompt from disk rather than a copy in code", () => {
    const packet = buildCompanionPacket({ operation: "tutor_reply", requestId: "e33f7ec0-d5f6-4c0e-a22f-6afe7e9fda89", payload: { question: "Why?" } });
    expect(packet.text).toContain(loadPrompt("tutor-system").text);
    expect(packet.text).toContain("Do not use rhetorical negative parallelisms.");
    expect(packet.text).toContain("Do not invent uncertainty, slang, errors, personal anecdotes");
  });
});
