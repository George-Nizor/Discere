import type { PythonExecution, TypeScriptDiagnostic, TypeScriptRun } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { assessTypeScript, runTypeScriptExample, typescriptTask } from "../src/typescript/questions.js";
import {
  IsolatedTypeScriptRuntime,
  type TypeScriptRuntime,
  seccompFilter,
} from "../src/typescript/runtime.js";

const course = "typescript-and-node";
const lesson = "what-types-are-for";
const exercise = "typn-what-types-are-for-code-annotate-add";
const SOLUTION = "function add(a: number, b: number): number {\n  return a + b;\n}\n";
const WRONG = SOLUTION.replace("a + b", "a - b");
const UNTYPED = "function add(a, b) {\n  return a + b;\n}\n";
const LOOSE = "function add(a: number | string, b: number): number {\n  return Number(a) + b;\n}\n";

/**
 * Stands in for the sandbox with just enough of this one exercise: it "compiles" and "runs" the
 * worked function, one that subtracts, one with no annotations, one that also takes a string,
 * and one that throws.
 */
function scripted(available = true): TypeScriptRuntime & { checked: string[]; ran: string[] } {
  const checked: string[] = [];
  const ran: string[] = [];
  return {
    checked,
    ran,
    available: async () => available,
    check: async (source: string): Promise<TypeScriptDiagnostic[]> => {
      checked.push(source);
      const found: TypeScriptDiagnostic[] = [];
      if (source.startsWith("function add(a, b)"))
        found.push(
          { line: 1, code: 7006, message: "Parameter 'a' implicitly has an 'any' type." },
          { line: 1, code: 7006, message: "Parameter 'b' implicitly has an 'any' type." },
        );
      // The second type test expects add("1", 2) to be refused; with a string allowed it is not.
      const directive = source.split("\n").indexOf("// @ts-expect-error") + 1;
      if (source.includes("number | string") && directive > 0)
        found.push({ line: directive, code: 2578, message: "Unused '@ts-expect-error' directive." });
      return found;
    },
    execute: async (code: string, runs: TypeScriptRun[]): Promise<PythonExecution[]> => {
      ran.push(code);
      return runs.map(({ inputs }) => {
        if (code.includes("throw"))
          return { error: "code", message: "Error on line 2: boom", output: "" };
        const a = Number(inputs["a"]);
        const b = Number(inputs["b"]);
        return {
          result: code.includes("a - b") ? a - b : a + b,
          output: code.includes("console.log") ? "adding\n" : "",
        };
      });
    },
  };
}

const start = (typescriptRuntime: TypeScriptRuntime) =>
  createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0, typescriptRuntime });
type App = Awaited<ReturnType<typeof createApp>>["app"];
const step = { courseId: course, lessonId: lesson, stepId: "annotate-a-function" };
const check = (app: App, response: string, mode = "coach") =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: { questionId: exercise, response, mode, lesson: step },
  });

describe("lesson questions answered with TypeScript", () => {
  it("sends the starter and one example, and never the tests, the type tests or the worked program", async () => {
    const { app } = await start(scripted());
    try {
      const journey = await app.inject({ url: `/api/courses/${course}/lessons/${lesson}/journey` });
      expect(journey.statusCode).toBe(200);
      expect(journey.body).toContain('"language":"typescript"');
      expect(journey.body).toContain('"example":{"inputs":{"a":2,"b":3},"expected":5}');
      expect(journey.body).not.toContain("typescriptCases");
      expect(journey.body).not.toContain("typescriptTypeTests");
      expect(journey.body).not.toContain("ts-expect-error");
      expect(journey.body).not.toContain("a: number, b: number): number {\\n");
      expect(journey.body).not.toContain('"a":-4');
      expect((await app.inject({ url: "/api/typescript-runtime" })).json()).toEqual({ ready: true });
    } finally {
      await app.close();
    }
  });

  it("runs the example without marking it, and without the hidden type tests", async () => {
    const runtime = scripted();
    const { app } = await start(runtime);
    try {
      const run = async (code: string) =>
        (await app.inject({ method: "POST", url: `/api/questions/${exercise}/run`, payload: { code } })).json();
      expect(await run(SOLUTION.replace("return", "console.log('adding');\n  return"))).toEqual({
        status: "ok",
        diagnostics: "",
        stdout: "adding\n",
        stderr: "",
        returned: "5",
      });
      expect(runtime.checked[0]).not.toContain("ts-expect-error");
      // A function that also takes a string compiles and runs: only Check answer has the type tests.
      expect(await run(LOOSE)).toMatchObject({ status: "ok", returned: "5" });
      expect(await run(UNTYPED)).toEqual({
        status: "compile_error",
        diagnostics:
          "Line 1: This parameter has no type, and the compiler will not guess one. The compiler says: Parameter 'a' implicitly has an 'any' type.\n" +
          "Line 1: This parameter has no type, and the compiler will not guess one. The compiler says: Parameter 'b' implicitly has an 'any' type.",
        stdout: "",
        stderr: "",
        message: "The compiler found type errors, so the program was not run.",
      });
      // Nothing that does not compile is run.
      expect(runtime.ran).toHaveLength(2);
      expect(await run(SOLUTION.replace("return a + b", 'throw new Error("boom")'))).toMatchObject({
        status: "runtime_error",
        message: "Error on line 2: boom",
      });
    } finally {
      await app.close();
    }
  });

  it("marks by running every test, and names the first that fails with both values", async () => {
    const { app } = await start(scripted());
    try {
      const wrong = (await check(app, WRONG)).json();
      expect(wrong).toMatchObject({
        correct: false,
        qualifying: true,
        misses: 1,
        closed: false,
        codeRun: {
          status: "ok",
          passed: 3,
          total: 6,
          failed: { test: 1, given: "add(2, 3)", expected: "5", actual: "-1" },
        },
      });
      expect(wrong.feedback).toBe(
        "Test 1 of 6 failed. `add(2, 3)` should return `5`, but it returned `-1`.",
      );
      const right = (await check(app, SOLUTION)).json();
      expect(right).toMatchObject({ correct: true, codeRun: { passed: 6, total: 6 } });
      expect(right.feedback).toBe("It passes all 6 tests.");
    } finally {
      await app.close();
    }
  });

  it("does not count a type error, any or a thrown error as a wrong answer", async () => {
    const runtime = scripted();
    const { app } = await start(runtime);
    try {
      const untyped = (await check(app, UNTYPED)).json();
      expect(untyped).toMatchObject({
        correct: false,
        qualifying: false,
        misses: 0,
        codeRun: { status: "compile_error", diagnostics: expect.stringContaining("Line 1: This parameter has no type") },
      });
      expect(untyped.feedback).toContain("A type error is not counted as a wrong answer.");
      const loose = (await check(app, SOLUTION.replaceAll(": number", ": any"))).json();
      expect(loose).toMatchObject({ qualifying: false, misses: 0, codeRun: { status: "compile_error" } });
      expect(loose.codeRun.diagnostics).toContain("Line 1: This exercise does not allow 'any'");
      const ignored = (await check(app, "// @ts-nocheck\n" + UNTYPED)).json();
      expect(ignored.codeRun.diagnostics).toContain("@ts-nocheck is not allowed");
      // The compiler was not asked about either, and nothing ran.
      expect(runtime.checked).toHaveLength(1);
      expect(runtime.ran).toHaveLength(0);
      const thrown = (await check(app, SOLUTION.replace("return a + b", 'throw new Error("boom")'))).json();
      expect(thrown).toMatchObject({ qualifying: false, misses: 0, codeRun: { status: "runtime_error" } });
      expect(thrown.feedback).toContain("An error is not counted as a wrong answer.");
    } finally {
      await app.close();
    }
  });

  it("counts a type test the program fails as a wrong answer, with the author's message", async () => {
    const { app } = await start(scripted());
    try {
      const loose = (await check(app, LOOSE)).json();
      expect(loose).toMatchObject({
        correct: false,
        qualifying: true,
        misses: 1,
        codeRun: {
          status: "ok",
          passed: 5,
          total: 6,
          message: "`add` still accepts a string. Annotate both parameters as `number`.",
        },
      });
      expect(loose.codeRun.failed).toBeUndefined();
      expect(loose.feedback).toBe(
        "The values are right, but the types are not what was asked for. `add` still accepts a string. Annotate both parameters as `number`.",
      );
    } finally {
      await app.close();
    }
  });

  it("says plainly when TypeScript cannot run, records nothing, and does not require the exercise", async () => {
    const { app, store } = await start(scripted(false));
    try {
      expect((await app.inject({ url: "/api/typescript-runtime" })).json()).toEqual({ ready: false });
      const refused = await check(app, SOLUTION);
      expect(refused.statusCode).toBe(503);
      expect(refused.json()).toMatchObject({ code: "TYPESCRIPT_UNAVAILABLE" });
      expect(store.hasQuestionEvidence(exercise, false)).toBe(false);
      const run = await app.inject({ method: "POST", url: `/api/questions/${exercise}/run`, payload: { code: SOLUTION } });
      expect(run.statusCode).toBe(503);
      const journey = (await app.inject({ url: `/api/courses/${course}/lessons/${lesson}/journey` })).json();
      const stage = journey.stages.find((item: { type: string }) => item.type === "explainer");
      for (const item of stage.steps) {
        const question = item.question;
        if (!question || question.code) continue;
        for (let turn = 0; turn < 4; turn += 1) {
          const response = question.choices
            ? question.choices[turn % question.choices.length].label
            : question.responseType === "numeric"
              ? "-987654"
              : "zzz";
          const marked = (
            await app.inject({
              method: "POST",
              url: "/api/attempts",
              payload: { questionId: question.id, response, mode: "coach", lesson: { courseId: course, lessonId: lesson, stepId: item.id } },
            })
          ).json();
          if (marked.correct || marked.closed) break;
        }
      }
      const finished = await app.inject({
        method: "PUT",
        url: `/api/courses/${course}/lessons/${lesson}/progress`,
        payload: { stageId: stage.id, state: "completed" },
      });
      expect(finished.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});

// The same marking in the real sandbox, where this machine has Bubblewrap and the compiler.
const real = new IsolatedTypeScriptRuntime();
const sandboxed = await real.available();

describe.skipIf(!sandboxed)("TypeScript exercises in the sandbox", () => {
  const call = { call: { name: "f", arguments: ["x"] } };
  const one = [{ inputs: { x: 1 } }];

  it("builds a seccomp filter of whole instructions that ends by allowing", () => {
    const filter = seccompFilter();
    expect(filter.length % 8).toBe(0);
    expect(filter.readUInt32LE(filter.length - 4)).toBe(0x7fff0000);
  });

  it("passes every worked program and fails every starter", async () => {
    const { app, content } = await start(real);
    try {
      const exercises = content
        .bundle(course)!
        .questions.filter((question) => question.code?.language === "typescript");
      expect(exercises.length).toBe(15);
      for (const question of exercises) {
        const task = typescriptTask(question)!;
        const worked = question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "";
        const solved = await assessTypeScript(real, task, worked);
        expect(solved.correct, question.id + ": " + solved.feedback + " " + solved.run.diagnostics).toBe(true);
        const started = await assessTypeScript(real, task, question.code!.starter);
        expect(started.correct, question.id).toBe(false);
      }
    } finally {
      await app.close();
    }
  }, 120000);

  it("reports the compiler's own errors by the learner's line, and runs what compiles", async () => {
    const { app, content } = await start(real);
    try {
      const task = typescriptTask(content.getQuestion("typn-what-types-are-for-code-fix-values")!)!;
      const broken = await runTypeScriptExample(real, task, 'let count: number = "3";\nlet label: string = "3";\nconst total: number = count + 1;\n');
      expect(broken).toMatchObject({ status: "compile_error" });
      expect(broken.diagnostics).toBe(
        "Line 1: A value is being stored where its type does not fit. The compiler says: Type 'string' is not assignable to type 'number'.",
      );
      const fixed = await runTypeScriptExample(real, task, 'let count: number = 3;\nlet label: string = "3";\nconst total: number = count + 1;\nconsole.log("total is", total);\n');
      expect(fixed).toEqual({
        status: "ok",
        diagnostics: "",
        stdout: "total is 4\n",
        stderr: "",
        values: [
          { name: "count", value: "3" },
          { name: "label", value: '"3"' },
          { name: "total", value: "4" },
        ],
      });
      // An enum needs generated code, which removing types cannot give: the compiler says so first.
      const generated = await real.check("enum Colour { Red }\nconsole.log(Colour.Red);\n");
      expect(generated).toMatchObject([{ line: 1, code: 1294 }]);
    } finally {
      await app.close();
    }
  }, 60000);

  it("gives an error its line, keeps non-ASCII text, and holds input names as variables", async () => {
    expect(await real.execute("function f(x: number): number {\n  const o: { y?: { z: number } } = {};\n  return o.y!.z + x;\n}", one, call)).toEqual([
      { error: "code", message: "TypeError on line 3: Cannot read properties of undefined (reading 'z')", output: "" },
    ]);
    expect(await real.execute('function f(x: number): string {\n  return "£" + x.toFixed(2);\n}', one, call)).toEqual([
      { result: "£1.00", output: "" },
    ]);
    expect(
      await real.execute("const total: number = price * 2;\nlet unset: number;", [{ inputs: { price: 4 } }, { inputs: { price: 5 } }], {
        names: ["total", "unset"],
      }),
    ).toEqual([
      { result: { total: 8 }, output: "" },
      { result: { total: 10 }, output: "" },
    ]);
    expect(await real.execute("function f(x: number) {\n  if (x > 5) return x;\n}", one, call)).toMatchObject([
      { error: "code", message: expect.stringContaining("What f returned is undefined") },
    ]);
    expect(await real.execute("function f(x: number {", one, call)).toMatchObject([
      { error: "code", message: expect.stringContaining("Syntax error on line 1") },
    ]);
  }, 60000);

  it("stops a loop, a memory hog and a flood of output at a limit", async () => {
    for (const body of [
      "while (true) {}",
      "await null; while (true) {}",
      "const hold: number[][] = []; while (true) hold.push(new Array(1e6).fill(1));",
      "const hold: ArrayBuffer[] = []; while (true) hold.push(new Uint8Array(5e7).fill(1).buffer);",
      "for (let i = 0; i < 1e6; i++) console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'); return 1;",
    ]) {
      const [result] = await real.execute(`async function f(x: number) { ${body} }`, one, call);
      // Refused memory surfaces inside the program as a RangeError; everything else is a limit.
      expect(result, body).toMatchObject(
        body.includes("Uint8Array") ? { error: expect.stringMatching(/code|limit/u) } : { error: "limit" },
      );
    }
  }, 60000);

  it("gives code that climbs out of the vm context no files, no network and no new process", async () => {
    const climber = `async function f(x: number) {
  const p = console.log.constructor("return process")();
  const tried: string[] = [];
  const attempt = async (label: string, action: () => unknown) => {
    try { tried.push(label + ": WORKED " + String(await action()).slice(0, 40)); }
    catch (error) { tried.push(label + ": " + String((error as { code?: string }).code ?? error).slice(0, 60)); }
  };
  await attempt("binding", () => p.binding("fs"));
  await attempt("read home", () => p.getBuiltinModule("fs").readdirSync("/home"));
  await attempt("read root", () => p.getBuiltinModule("fs").readdirSync("/"));
  await attempt("write", () => p.getBuiltinModule("fs").writeFileSync("/tmp/x", "a"));
  await attempt("spawn", () => p.getBuiltinModule("child_process").execFileSync("/app/node", ["-v"]));
  await attempt("worker", () => new (p.getBuiltinModule("worker_threads").Worker)("1", { eval: true }));
  await attempt("connect", () => new Promise((resolve, reject) => p.getBuiltinModule("net").connect(443, "1.1.1.1").on("error", reject).on("connect", () => resolve("connected"))));
  await attempt("env", () => Object.keys(p.env).join(","));
  return tried;
}`;
    const [result] = await real.execute(climber, one, call);
    expect(result).toMatchObject({ result: expect.any(Array) });
    const tried = (result as { result: string[] }).result;
    expect(tried.filter((line) => line.includes("WORKED"))).toEqual(["env: WORKED LANG,PWD"]);
    // Node's permission layer answers first; the socket is refused by the seccomp filter.
    expect(tried.slice(0, 7)).toEqual([
      "binding: ERR_ACCESS_DENIED",
      "read home: ERR_ACCESS_DENIED",
      "read root: ERR_ACCESS_DENIED",
      "write: ERR_ACCESS_DENIED",
      "spawn: ERR_ACCESS_DENIED",
      "worker: ERR_ACCESS_DENIED",
      "connect: EPERM",
    ]);
    expect(tried).toHaveLength(8);
  }, 60000);
});
