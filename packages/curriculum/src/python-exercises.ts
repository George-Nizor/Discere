import { spawnSync } from "node:child_process";
import {
  type CourseBundle,
  type PythonExecution,
  judgePythonCase,
  pythonExerciseProgram,
  pythonGiven,
} from "@discere/contracts";

/**
 * Runs every Python exercise of a bundle the way the app marks it: the worked program must pass
 * each test and the starter must fail at least one. The app runs learner code in its sandbox
 * (apps/server/src/python-projects); authored code is trusted, so this check uses whatever
 * Python 3 is on the machine and needs no sandbox. The harness below follows the sandbox's
 * bootstrap.py: inputs are set as names, `result` or a function's return value is read back,
 * tuples come back as lists, and arrays, Series, tables and dates come back as the sandbox
 * returns them.
 *
 * An exercise that imports NumPy or pandas runs only where that Python has the library. Where
 * it has not, the exercise is listed under `skipped` and is not checked here; the sandbox test
 * in apps/server/tests/python-questions.test.ts checks it against the reviewed versions.
 */
const HARNESS = String.raw`
import contextlib, datetime, io, json, math, sys

try:
    import numpy as np
except ImportError:
    np = None
try:
    import pandas as pd
except ImportError:
    pd = None

def normalize(item, depth=0):
    if depth > 6:
        raise TypeError("too deep")
    if pd is not None and (item is pd.NA or item is pd.NaT):
        return None
    if np is not None and isinstance(item, np.generic):
        return normalize(item.item(), depth)
    if item is None or isinstance(item, (bool, str)):
        return item
    if isinstance(item, (int, float)):
        if isinstance(item, float) and math.isnan(item):
            return None
        if not math.isfinite(item) or abs(item) > 1e15:
            raise TypeError("number out of range")
        return item
    if isinstance(item, (datetime.datetime, datetime.date)):
        return item.isoformat()
    if np is not None and isinstance(item, np.ndarray):
        return normalize(item.tolist(), depth)
    if pd is not None and isinstance(item, pd.Series):
        return normalize(item.tolist(), depth)
    if pd is not None and isinstance(item, pd.DataFrame):
        return normalize({"columns": [str(c) for c in item.columns], "rows": item.values.tolist()}, depth)
    if isinstance(item, (list, tuple)):
        return [normalize(child, depth + 1) for child in item]
    if isinstance(item, dict):
        if any(not isinstance(key, str) for key in item):
            raise TypeError("dictionary keys must be text")
        return {key: normalize(value, depth + 1) for key, value in item.items()}
    raise TypeError("Assign result a number, text, list or dictionary.")

def run(job):
    captured = io.StringIO()
    try:
        scope = json.loads(json.dumps(job["inputs"]))
        with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
            exec(compile(job["code"], "<exercise>", "exec"), scope, scope)
            if job.get("call"):
                function = scope.get(job["call"]["name"])
                if not callable(function):
                    raise NameError("Define the requested function.")
                result = normalize(function(*(scope[name] for name in job["call"]["arguments"])))
            else:
                result = normalize(scope["result"])
        return {"result": result, "output": captured.getvalue()[:8000]}
    except BaseException as error:
        return {"error": "code", "message": (type(error).__name__ + ": " + str(error))[:400] or "error"}

print(json.dumps([run(job) for job in json.load(sys.stdin)]))
`;

/** A Python 3.10 or later on this machine, or undefined. `DISCERE_PYTHON` names one directly. */
export function findPython(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env["DISCERE_PYTHON"]?.trim();
  for (const candidate of configured ? [configured] : ["python3", "python"]) {
    const probe = spawnSync(
      candidate,
      ["-I", "-c", "import sys; print(sys.version_info >= (3, 10))"],
      { encoding: "utf8", timeout: 15000 },
    );
    if (probe.status === 0 && probe.stdout.trim() === "True") return candidate;
  }
  return undefined;
}

/** The data libraries an exercise may import, and which of them a Python has. */
const LIBRARIES = ["numpy", "pandas"] as const;
export type PythonLibrary = (typeof LIBRARIES)[number];

export function pythonLibraries(python: string): PythonLibrary[] {
  const probe = spawnSync(
    python,
    [
      "-I",
      "-c",
      "import importlib.util as u; print(' '.join(n for n in ('numpy', 'pandas') if u.find_spec(n)))",
    ],
    { encoding: "utf8", timeout: 15000 },
  );
  const found = probe.status === 0 ? probe.stdout.trim().split(/\s+/u) : [];
  return LIBRARIES.filter((name) => found.includes(name));
}

/** The libraries a program imports, read from its import lines. */
export function importedLibraries(code: string): PythonLibrary[] {
  return LIBRARIES.filter((name) =>
    new RegExp(`^\\s*(?:import|from)\\s+${name}\\b`, "mu").test(code),
  );
}

export interface PythonExerciseReport {
  /** How many exercises the bundle holds. */
  exercises: number;
  /** Exercises not run because this Python lacks NumPy or pandas. They are not checked here. */
  skipped: string[];
  /** One line per fault; empty when every worked program passes and no starter does. */
  issues: string[];
}

export function checkPythonExercises(
  bundle: CourseBundle,
  python: string,
  libraries: PythonLibrary[] = pythonLibraries(python),
): PythonExerciseReport {
  const all = bundle.questions.flatMap((question) =>
    question.code?.language === "python" && question.pythonCases
      ? [{ question, code: question.code, cases: question.pythonCases }]
      : [],
  );
  const runnable = ({ question, code }: (typeof all)[number]) =>
    importedLibraries(
      code.starter +
        "\n" +
        (question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : ""),
    ).every((name) => libraries.includes(name));
  const exercises = all.filter(runnable);
  const skipped = all.filter((item) => !runnable(item)).map(({ question }) => question.id);
  const jobs = exercises.flatMap(({ question, code, cases }) =>
    [
      question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "",
      code.starter,
    ].flatMap((program) =>
      cases.map((item) => ({
        code: pythonExerciseProgram(code, program),
        inputs: item.inputs,
        ...(code.call ? { call: code.call } : {}),
      })),
    ),
  );
  if (jobs.length === 0) return { exercises: all.length, skipped, issues: [] };
  const ran = spawnSync(python, ["-I", "-c", HARNESS], {
    input: JSON.stringify(jobs),
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (ran.status !== 0)
    return {
      exercises: all.length,
      skipped,
      issues: [`Python could not run the exercises: ${ran.error?.message ?? ran.stderr.slice(0, 400)}`],
    };
  const results = JSON.parse(ran.stdout) as PythonExecution[];
  const issues: string[] = [];
  let at = 0;
  for (const { question, code, cases } of exercises) {
    const solved = cases.map((item) => judgePythonCase(code, item, results[at++]!));
    const started = cases.map((item) => judgePythonCase(code, item, results[at++]!));
    solved.forEach((verdict, index) => {
      if (verdict.passed) return;
      const given = pythonGiven(code, cases[index]!.inputs);
      issues.push(
        `${question.id}: the worked program fails test ${index + 1} (${given}): ` +
          (verdict.error
            ? verdict.error.message
            : `expected ${verdict.expected}, got ${verdict.actual}`),
      );
    });
    if (started.every((verdict) => verdict.passed))
      issues.push(`${question.id}: the starter code already passes every test`);
  }
  return { exercises: all.length, skipped, issues };
}
