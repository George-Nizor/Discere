import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * What runs a TypeScript exercise: the program handed to Node, the declarations and flags the
 * compiler is given, and where the compiler is. The app runs all of it inside its sandbox
 * (apps/server/src/typescript); the content check in typescript-exercises.ts runs the same
 * program without one, because authored code is trusted.
 */

/**
 * The trusted program Node runs with `-e`. It reads `{code, runs, call?, names?}` from stdin,
 * removes the types the way `node file.ts` does (`module.stripTypeScriptTypes`, which keeps every
 * line where it was), and runs the code once per entry of `runs` in a fresh `vm` context that
 * holds `console` and nothing of Node. It prints one result per run as JSON. The context is for
 * a clean scope and honest line numbers. It is not what contains the code: the sandbox is.
 *
 * Plain JavaScript without template literals, so it can live in this string.
 */
export const TYPESCRIPT_RUNNER = String.raw`"use strict";
const { stripTypeScriptTypes } = require("node:module");
const vm = require("node:vm");
const util = require("node:util");
const LIMIT = { error: "limit", message: "This program exceeded a practice limit. Keep loops, output and results small." };
class Guidance extends Error {}
class TooMuch extends Error {}

function lineOf(error) {
  const stack = String((error && error.stack) || "");
  const found = /^(?:main\.ts)?:(\d+)$/m.exec(stack) || /main\.ts:(\d+):\d+/.exec(stack);
  return found ? Number(found[1]) : undefined;
}
function describe(error) {
  if (error instanceof Guidance) return { error: "code", message: error.message };
  if (error instanceof TooMuch) return LIMIT;
  if (error && error.code === "ERR_SCRIPT_EXECUTION_TIMEOUT")
    return { error: "limit", message: "This program took too long. Check for a loop that never ends." };
  if (error && error.name === "RangeError" && /call stack/i.test(String(error.message)))
    return { error: "code", message: "RangeError: the call stack overflowed. Check that every recursive call moves towards a case that stops." };
  const isError = error !== null && typeof error === "object" && typeof error.message === "string";
  const name = isError ? String(error.name || "Error").slice(0, 60) : "The program threw a value that is not an Error";
  const said = isError ? String(error.message).split("\n")[0].slice(0, 300) : util.inspect(error, { depth: 1 }).slice(0, 200);
  const line = lineOf(error);
  return { error: "code", message: name + (line ? " on line " + line : "") + ": " + said };
}
function normalize(item, what, state, depth) {
  state.count += 1;
  if (state.count > 2000 || depth > 6) throw new TooMuch();
  if (item === undefined) throw new Guidance(what + " is undefined. " + (depth ? "Give every element and property a value." : "Check that the code reaches a value on every path."));
  if (item === null || typeof item === "boolean") return item;
  if (typeof item === "number") {
    if (!Number.isFinite(item)) throw new Guidance(what + " is " + String(item) + ", which is not a finite number. Check the arithmetic that produced it.");
    return item;
  }
  if (typeof item === "string") {
    if (item.length > 2000) throw new TooMuch();
    return item;
  }
  if (typeof item === "function") throw new Guidance(what + " is a function, not a value. Call it, or return what it computes.");
  if (typeof item !== "object") throw new Guidance(what + " is a " + typeof item + ". Use a number, a string, a boolean, null, an array or a plain object.");
  if (Array.isArray(item)) {
    if (item.length > 200) throw new TooMuch();
    return Array.from(item, (child) => normalize(child, what, state, depth + 1));
  }
  const tag = Object.prototype.toString.call(item);
  if (tag !== "[object Object]") throw new Guidance(what + " is a " + tag.slice(8, -1) + ". Use an array or a plain object so it can be compared.");
  const keys = Object.keys(item);
  if (keys.length > 200) throw new TooMuch();
  const out = {};
  for (const key of keys) out[key] = normalize(item[key], what, state, depth + 1);
  return out;
}

async function one(request, run, pending) {
  const captured = { text: "" };
  const print = (...parts) => {
    captured.text += util.format(...parts) + "\n";
    if (captured.text.length > 8000) throw new TooMuch();
  };
  const fail = (error) => Object.assign({}, describe(error), { output: captured.text.slice(0, 8000) });
  let script;
  try {
    const judged = request.call ? [request.call.name] : request.names;
    const given = request.call ? [] : Object.keys(run.inputs);
    const js = stripTypeScriptTypes(request.code).replace(/^export (?=(?:async )?(?:function|const|let|var|class)\b)/gm, "       ");
    const head = "(async function (" + given.join(", ") + ") { ";
    const tail = "\n;return { " + judged.map((name) => JSON.stringify(name) + ": typeof " + name + " === 'undefined' ? undefined : " + name).join(", ") + " };\n})(" + given.map((name) => JSON.stringify(run.inputs[name])).join(", ") + ")";
    script = new vm.Script(head + js + tail, { filename: "main.ts" });
  } catch (error) {
    const told = describe(error);
    if (told.error === "code" && /^SyntaxError/.test(told.message)) told.message = told.message.replace(/^SyntaxError/, "Syntax error");
    return Object.assign(told, { output: "" });
  }
  const context = vm.createContext({ console: { log: print, info: print, warn: print, error: print, debug: print } });
  try {
    pending.waiting = true;
    const scope = await script.runInContext(context, { timeout: 400 });
    let result;
    if (request.call) {
      const called = scope[request.call.name];
      if (typeof called !== "function") throw new Guidance("Define a function named " + request.call.name + ".");
      context.__discere_call = called;
      const args = request.call.arguments.map((name) => JSON.stringify(run.inputs[name])).join(", ");
      const returned = await vm.runInContext("__discere_call(" + args + ")", context, { timeout: 400, filename: "call.js" });
      result = normalize(returned, "What " + request.call.name + " returned", { count: 0 }, 0);
    } else {
      result = {};
      const state = { count: 0 };
      for (const name of request.names) if (scope[name] !== undefined) result[name] = normalize(scope[name], name, state, 0);
    }
    pending.waiting = false;
    return { result, output: captured.text };
  } catch (error) {
    pending.waiting = false;
    return fail(error);
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
  if (raw.length > 262144) process.exit(3);
});
process.stdin.on("end", async () => {
  let request;
  try {
    request = JSON.parse(raw);
  } catch {
    process.exit(3);
  }
  process.stderr.write("DISCERE_TS_READY\n");
  const results = [];
  const pending = { waiting: false };
  let written = false;
  const finish = () => {
    if (written) return;
    written = true;
    // A promise nothing will ever settle leaves the loop empty with a run still waiting.
    while (results.length < request.runs.length)
      results.push({ error: "code", message: "The program stopped while still waiting for a promise that nothing settles." });
    let encoded = JSON.stringify(results);
    if (encoded.length > 200000) encoded = JSON.stringify(request.runs.map(() => LIMIT));
    process.stdout.write(encoded);
  };
  process.on("beforeExit", finish);
  for (const run of request.runs) {
    const result = await one(request, run, pending);
    results.push(result);
    if (result.error === "limit") {
      while (results.length < request.runs.length) results.push(result);
      break;
    }
  }
  finish();
});
`;

/** Node flags for the runner: a small heap, and Node's own refusal of files, children and workers. */
export const TYPESCRIPT_NODE_FLAGS = [
  "--max-old-space-size=64",
  // The type stripper is WebAssembly. Without this V8 reserves gigabytes of address space for
  // it, which an address-space limit refuses.
  "--disable-wasm-trap-handler",
  "--disable-warning=ExperimentalWarning",
  "--permission",
];

/** `module.stripTypeScriptTypes` arrived in Node 22.13. */
export function nodeStripsTypes(version: string = process.versions.node): boolean {
  const [major = 0, minor = 0] = version.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 13);
}

/** Declared for the compiler beside the learner's file: the one global the runner provides. */
export const TYPESCRIPT_AMBIENT = `declare const console: {
  log(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
  debug(...data: unknown[]): void;
};
`;

/**
 * The compiler's flags. `erasableSyntaxOnly` refuses the syntax Node cannot run by removing
 * types (enums, namespaces with code, parameter properties), so what compiles also runs.
 */
export const TYPESCRIPT_COMPILER_FLAGS = [
  "--noEmit",
  "--strict",
  "--target",
  "es2023",
  "--lib",
  "es2023",
  "--module",
  "esnext",
  "--moduleDetection",
  "force",
  "--erasableSyntaxOnly",
  "--noImplicitReturns",
  "--types",
  "",
  "--pretty",
  "false",
];

/**
 * The native TypeScript compiler: `DISCERE_TSC`, or the one the `typescript` package installed
 * for this platform. A release bundle has no node_modules and names its own copy instead.
 */
export function findTypeScriptCompiler(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env["DISCERE_TSC"]?.trim();
  if (configured) return existsSync(configured) ? configured : undefined;
  try {
    const require = createRequire(import.meta.url);
    const typescript = createRequire(require.resolve("typescript/package.json"));
    const platform = `@typescript/typescript-${process.platform}-${process.arch}/package.json`;
    const found = path.join(
      path.dirname(typescript.resolve(platform)),
      "lib",
      process.platform === "win32" ? "tsc.exe" : "tsc",
    );
    return existsSync(found) ? found : undefined;
  } catch {
    return undefined;
  }
}
