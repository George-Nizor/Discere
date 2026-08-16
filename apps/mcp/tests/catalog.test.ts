import { describe, expect, it } from "vitest";
import { toolCatalog } from "../src/index.js";
describe("MCP tool catalog", () => {
  it("uses unique names and marks reads accurately", () => {
    expect(new Set(toolCatalog.map((tool) => tool.name)).size).toBe(toolCatalog.length);
    expect(toolCatalog.find((tool) => tool.name === "discere_get_current_lesson")?.readOnly).toBe(true);
    expect(toolCatalog.find((tool) => tool.name === "discere_submit_answer")?.readOnly).toBe(false);
  });
});
