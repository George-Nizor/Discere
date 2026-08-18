import { describe, expect, it } from "vitest";
import { type CourseQueueEntry, interleaveByCourse } from "../src/index.js";

function card(cardId: string, courseId: string, dueAt: string, repetition = 0): CourseQueueEntry {
  return { cardId, courseId, dueAt, repetition };
}

const due = "2026-08-19T08:00:00.000Z";

describe("review queue interleaving", () => {
  it("returns a single course in its own due order", () => {
    const queue = interleaveByCourse([
      card("b", "electronics", "2026-08-19T09:00:00.000Z"),
      card("a", "electronics", "2026-08-19T08:00:00.000Z"),
    ]);
    expect(queue.map((entry) => entry.cardId)).toEqual(["a", "b"]);
  });

  it("takes turns between courses instead of clearing the first one", () => {
    const queue = interleaveByCourse([
      card("e1", "electronics", due),
      card("e2", "electronics", due),
      card("e3", "electronics", due),
      card("r1", "roman", due),
      card("r2", "roman", due),
    ]);
    expect(queue.map((entry) => entry.courseId)).toEqual([
      "electronics",
      "roman",
      "electronics",
      "roman",
      "electronics",
    ]);
  });

  it("starts with the course that was studied longest ago", () => {
    const recency = new Map([
      ["electronics", "2026-08-19T07:59:00.000Z"],
      ["roman", "2026-08-10T00:00:00.000Z"],
    ]);
    const queue = interleaveByCourse(
      [card("e1", "electronics", due), card("r1", "roman", due)],
      recency,
    );
    expect(queue.map((entry) => entry.cardId)).toEqual(["r1", "e1"]);
  });

  it("puts a course that has never been reviewed before one that has", () => {
    const recency = new Map<string, string | null>([
      ["electronics", "2026-08-19T07:59:00.000Z"],
      ["roman", null],
    ]);
    const queue = interleaveByCourse(
      [card("e1", "electronics", due), card("r1", "roman", due)],
      recency,
    );
    expect(queue.map((entry) => entry.cardId)).toEqual(["r1", "e1"]);
  });

  it("continues the rotation when the queue is recovered one card at a time", () => {
    const cards = [
      card("e1", "electronics", due),
      card("e2", "electronics", due),
      card("r1", "roman", due),
      card("r2", "roman", due),
    ];
    const recency = new Map<string, string | null>([
      ["electronics", null],
      ["roman", null],
    ]);
    const first = interleaveByCourse(cards, recency)[0];
    expect(first?.courseId).toBe("electronics");
    // Rating that card marks its course as just studied, which is what sends the next
    // request to the other course rather than back to the same one.
    recency.set("electronics", "2026-08-19T08:05:00.000Z");
    const second = interleaveByCourse(
      cards.filter((entry) => entry.cardId !== first?.cardId),
      recency,
    )[0];
    expect(second?.courseId).toBe("roman");
  });

  it("finishes the remaining course once the other runs out", () => {
    const queue = interleaveByCourse([
      card("e1", "electronics", due),
      card("e2", "electronics", due),
      card("e3", "electronics", due),
      card("r1", "roman", due),
    ]);
    expect(queue.map((entry) => entry.cardId)).toEqual(["e1", "r1", "e2", "e3"]);
  });

  it("returns nothing for an empty queue", () => {
    expect(interleaveByCourse([])).toEqual([]);
  });
});
