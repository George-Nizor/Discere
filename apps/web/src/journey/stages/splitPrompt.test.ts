import { describe, expect, it } from "vitest";
import { splitPrompt } from "./QuestionBlock.js";

describe("splitPrompt", () => {
  it("sets the last sentence apart as the question", () => {
    expect(splitPrompt("A loop holds one resistor. What does the meter read?")).toEqual({
      setup: "A loop holds one resistor.",
      ask: "What does the meter read?",
    });
  });

  it("returns a one-sentence prompt whole", () => {
    expect(splitPrompt("What does the meter read?")).toEqual({
      setup: "",
      ask: "What does the meter read?",
    });
  });

  it("never splits inside a code span", () => {
    expect(
      splitPrompt(
        "The query is `SELECT region FROM sales HAVING SUM(amount) >= 40`. How many rows does it return?",
      ),
    ).toEqual({
      setup: "The query is `SELECT region FROM sales HAVING SUM(amount) >= 40`.",
      ask: "How many rows does it return?",
    });
    expect(
      splitPrompt("Run `SELECT COUNT(*) FROM orders` on the table. What does it return?").ask,
    ).toBe("What does it return?");
  });

  it("lets a code span with a dot sit inside the question", () => {
    expect(splitPrompt("The frame has 9 rows. How many rows does `df.head(2)` return?")).toEqual({
      setup: "The frame has 9 rows.",
      ask: "How many rows does `df.head(2)` return?",
    });
  });

  it("keeps a question that ends on a code span whole", () => {
    expect(splitPrompt("Shift each letter by 5. What is `(24 + 5) % 26`?")).toEqual({
      setup: "Shift each letter by 5.",
      ask: "What is `(24 + 5) % 26`?",
    });
  });
});

describe("promptParts", () => {
  it("sets lines of code apart as one block, indentation kept", async () => {
    const { promptParts } = await import("./QuestionBlock.js");
    expect(promptParts("`def f(n):`\n    `return n + 1`\n\nWhat does `f(2)` return?")).toEqual([
      { kind: "code", code: "def f(n):\n    return n + 1" },
      { kind: "text", setup: "", ask: "What does `f(2)` return?" },
    ]);
  });

  it("keeps a question written before its code as the question", async () => {
    const { promptParts } = await import("./QuestionBlock.js");
    expect(
      promptParts('A file holds two lines. Where does tsc stop?\n\n`let n = 5;`\n`n = "five";`'),
    ).toEqual([
      { kind: "text", setup: "A file holds two lines.", ask: "Where does tsc stop?" },
      { kind: "code", code: 'let n = 5;\nn = "five";' },
    ]);
  });

  it("leaves a prompt without code lines to splitPrompt", async () => {
    const { promptParts } = await import("./QuestionBlock.js");
    expect(promptParts("Run `ls -l` in the folder. How many lines print?")).toEqual([
      { kind: "text", setup: "Run `ls -l` in the folder.", ask: "How many lines print?" },
    ]);
  });
});
