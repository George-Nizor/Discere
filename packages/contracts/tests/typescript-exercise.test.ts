import { describe, expect, it } from "vitest";
import {
  judgeTypeScriptCase,
  parseTypeScriptDiagnostics,
  typescriptCheckFile,
  typescriptCheckVerdict,
  typescriptEscapes,
  typescriptGiven,
  typescriptLiteral,
} from "../src/index.js";

describe("TypeScript exercises", () => {
  it("writes values the way TypeScript source does", () => {
    expect(typescriptLiteral({ name: "Ada", "full name": null, tags: ["a", 1, true] })).toBe(
      '{ name: "Ada", "full name": null, tags: ["a", 1, true] }',
    );
    expect(typescriptGiven({ call: { name: "add", arguments: ["a", "b"] } }, { a: 1, b: "x" })).toBe(
      'add(1, "x")',
    );
    expect(typescriptGiven({ names: ["total"] }, { price: 4 })).toBe("price = 4");
  });

  it("judges a call on its result and named values on the first that differs", () => {
    const call = { call: { name: "f", arguments: [] } };
    expect(judgeTypeScriptCase(call, { inputs: {}, expected: 0.3 }, { result: 0.1 + 0.2, output: "" }))
      .toEqual({ passed: true });
    expect(judgeTypeScriptCase(call, { inputs: {}, expected: [1] }, { result: [2], output: "" }))
      .toEqual({ passed: false, expected: "[1]", actual: "[2]" });
    expect(
      judgeTypeScriptCase(
        { names: ["a", "b"] },
        { inputs: {}, expected: { a: 1, b: "x" } },
        { result: { a: 1 }, output: "" },
      ),
    ).toEqual({ passed: false, expected: 'b = "x"', actual: "b was never given a value" });
  });

  it("refuses any and the comments that switch the compiler off, but not the word in text", () => {
    const found = typescriptEscapes(
      'const a: any = 1;\n// any comment\nconst s = "any: thing";\nconst b = c as any;\n// @ts-ignore\nlet xs: Array<any>;\nconst company = { any: 1 };\n',
    );
    expect(found.map((item) => item.line)).toEqual([1, 4, 5, 6]);
    expect(typescriptEscapes("function f<T>(xs: T[]): T | undefined { return xs[0]; }")).toEqual([]);
  });

  it("places the learner's lines and each type test in the file the compiler reads", () => {
    const file = typescriptCheckFile(
      { names: ["total"], typeCheck: true },
      { price: 4, tags: ["a"] },
      "const total: string = price;\n\n",
      [
        { code: "const t: number = total;", message: "total should be a number." },
        { code: "// @ts-expect-error\ntotal.x;", message: "second" },
      ],
    );
    expect(file.source).toBe(
      'let price = 4; let tags = ["a"];\nconst total: string = price;\n{\nconst t: number = total;\n}\n{\n// @ts-expect-error\ntotal.x;\n}\n',
    );
    expect(file).toMatchObject({ offset: 1, lines: 1, tests: [{ from: 3, to: 5 }, { from: 6, to: 9 }] });
    const diagnostics = parseTypeScriptDiagnostics(
      "main.ts(2,7): error TS2322: Type 'number' is not assignable to type 'string'.\n  Detail on a second line.\nother.ts(1,1): error TS1: not ours\nmain.ts(4,7): error TS2322: Type 'string' is not assignable to type 'number'.\n",
    );
    expect(diagnostics).toHaveLength(2);
    expect(typescriptCheckVerdict(file, diagnostics)).toEqual({
      errors: [
        "Line 1: A value is being stored where its type does not fit. The compiler says: Type 'number' is not assignable to type 'string'.",
      ],
      failedTests: ["total should be a number."],
    });
  });
});
