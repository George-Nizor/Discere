import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * The rules for order questions, sort questions and extracts, checked by breaking History's own
 * questions one way at a time. History is the course that uses all three.
 */
async function history(): Promise<CourseBundle> {
  const file = path.resolve(import.meta.dirname, "../../../content/history/bundle.json");
  return JSON.parse(await readFile(file, "utf8")) as CourseBundle;
}
type Question = CourseBundle["questions"][number];
const ORDER = "his-one-war-many-causes-crisis-order";
const SORT = "his-causes-conditions-triggers-riot-sort";
const PAIR = "his-who-made-it-and-why-skill-two-accounts";

/** The error codes History reports once one question has been changed. */
async function codesAfter(id: string, change: (question: Question) => void): Promise<string[]> {
  const bundle = await history();
  const question = bundle.questions.find((item) => item.id === id);
  if (!question) throw new Error(`History has no question ${id}.`);
  change(question);
  return validateCourseBundle(bundle)
    .issues.filter((issue) => issue.severity === "error" && issue.path === `questions.${id}`)
    .map((issue) => issue.code);
}

describe("order questions, sort questions and extracts", () => {
  it("accepts History as it is written", async () => {
    const result = validateCourseBundle(await history());
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("refuses an order question with two items that read the same", async () => {
    const codes = await codesAfter(ORDER, (question) => {
      question.order!.items[1] = ` ${question.order!.items[0]!.toUpperCase()} `;
    });
    expect(codes).toContain("ORDER_ITEMS_REPEAT");
  });

  it("refuses an order question whose authority could be met by typing", async () => {
    const codes = await codesAfter(ORDER, (question) => {
      if (question.answerAuthority.kind === "text")
        question.answerAuthority.acceptedIdeas = ["Sarajevo first"];
    });
    expect(codes).toContain("ORDER_QUESTION_SHAPE");
  });

  it("refuses items to order on a question of another type, and an order question without them", async () => {
    expect(
      await codesAfter(ORDER, (question) => {
        question.responseType = "short_text";
      }),
    ).toContain("ORDER_QUESTION_SHAPE");
    expect(
      await codesAfter(ORDER, (question) => {
        delete question.order;
      }),
    ).toContain("ORDER_QUESTION_SHAPE");
  });

  it("refuses a sort item that appears twice, so no item belongs to two bins", async () => {
    const codes = await codesAfter(SORT, (question) => {
      const items = question.sort!.items;
      items.push({ label: items[0]!.label, bin: "trigger" });
    });
    expect(codes).toContain("SORT_ITEMS_REPEAT");
  });

  it("refuses a sort item in a bin that does not exist", async () => {
    const codes = await codesAfter(SORT, (question) => {
      question.sort!.items[0]!.bin = "background";
    });
    expect(codes).toContain("SORT_ITEM_BIN_UNKNOWN");
  });

  it("refuses a bin that no item belongs in", async () => {
    const codes = await codesAfter(SORT, (question) => {
      for (const item of question.sort!.items) if (item.bin === "trigger") item.bin = "cause";
    });
    expect(codes).toContain("SORT_BIN_UNUSED");
  });

  it("refuses two bins with one name", async () => {
    const codes = await codesAfter(SORT, (question) => {
      question.sort!.bins[1]!.label = question.sort!.bins[0]!.label;
    });
    expect(codes).toContain("SORT_BINS_REPEAT");
  });

  it("refuses choices on an order or sort question", async () => {
    const codes = await codesAfter(SORT, (question) => {
      question.choices = [
        { id: "a", label: "One" },
        { id: "b", label: "Two" },
      ];
    });
    expect(codes).toContain("STRUCTURED_QUESTION_SHAPE");
  });

  it("refuses an extract with a blank part of its attribution", async () => {
    for (const part of ["who", "when", "kind"] as const) {
      const codes = await codesAfter(PAIR, (question) => {
        question.extracts![1]![part] = "   ";
      });
      expect(codes, part).toContain("EXTRACT_ATTRIBUTION_MISSING");
    }
  });

  it("refuses an extract written into the prompt as well, and a prompt that does not end by asking", async () => {
    expect(
      await codesAfter(PAIR, (question) => {
        question.prompt = `> ${question.extracts![0]!.text}\n\n${question.prompt}`;
      }),
    ).toContain("EXTRACT_TWICE");
    expect(
      await codesAfter(PAIR, (question) => {
        question.prompt = "Read the two accounts.";
      }),
    ).toContain("EXTRACT_PROMPT_SHAPE");
  });

  it("refuses a pair made of the same extract twice", async () => {
    const codes = await codesAfter(PAIR, (question) => {
      question.extracts![1]!.text = question.extracts![0]!.text;
    });
    expect(codes).toContain("EXTRACT_TWICE");
  });
});
