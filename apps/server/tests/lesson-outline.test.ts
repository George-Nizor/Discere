import type { LessonResponse } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { buildTutorReplyPayload, lessonOutline } from "../src/companion.js";

const lesson = {
  lesson: {
    title: "Approaching a value",
    steps: [
      {
        headline: "The limit",
        lead: [
          { kind: "paragraph", text: "The outputs close in on 4." },
          { kind: "equation", latex: "\\lim_{x \\to 2} f(x) = 4" },
        ],
        diagram: {
          type: "svg_figure",
          alt: "A graph near x = 2.",
          cases: [{ id: "a", svg: "<svg>…</svg>" }],
        },
      },
      { headline: "Later", lead: [{ kind: "paragraph", text: "x".repeat(400) }] },
    ],
  },
  question: { id: "q", prompt: "Find the limit." },
  sources: [{ id: "s1", title: "OpenStax", url: "https://example.org" }],
} as unknown as LessonResponse;

describe("the tutor's lesson outline", () => {
  it("keeps what a learner reads and drops markup", () => {
    const outline = lessonOutline(lesson);
    expect(outline).toContain("## The limit");
    expect(outline).toContain("The outputs close in on 4.");
    expect(outline).toContain("Equation: \\lim_{x \\to 2} f(x) = 4");
    expect(outline).toContain("Figure: A graph near x = 2.");
    expect(outline).toContain("Question: Find the limit.");
    expect(outline).not.toContain("<svg>");
  });

  it("keeps headings and the question when a lesson is over budget", () => {
    const outline = lessonOutline(lesson, 120);
    expect(outline).toContain("## Later");
    expect(outline).toContain("Question: Find the limit.");
    expect(outline).not.toContain("x".repeat(400));
    expect(outline).toContain("left out");
  });

  it("is sent only when asked for", () => {
    const full = buildTutorReplyPayload(lesson, { question: "Why?", mode: "coach" });
    const compact = buildTutorReplyPayload(
      lesson,
      { question: "Why?", mode: "coach" },
      undefined,
      undefined,
      true,
    );
    expect(full).toHaveProperty("lessonContext");
    expect(compact).not.toHaveProperty("lessonContext");
    expect(compact).toHaveProperty("lessonOutline");
    expect(compact.allowedSourceIds).toEqual(["s1"]);
  });
});
