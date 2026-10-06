import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IsolatedPythonRuntime, samePythonResult } from "../src/python-projects/runtime.js";

const directory = path.resolve(import.meta.dirname, "../../../data/python-runtime");
const supported =
  process.platform === "linux" &&
  process.arch === "x64" &&
  existsSync(path.join(directory, "lib/python3.12/site-packages/pandas")) &&
  existsSync("/usr/bin/bwrap");
const runtime = new IsolatedPythonRuntime({ directory });

describe("Python result comparison", () => {
  it("preserves order, duplicate values, null and Boolean types", () => {
    expect(samePythonResult([1, 1, null], [1, 1, null])).toBe(true);
    expect(samePythonResult([1, 2], [2, 1])).toBe(false);
    expect(samePythonResult([1, 1], [1])).toBe(false);
    expect(samePythonResult(false, 0)).toBe(false);
    expect(samePythonResult(null, "None")).toBe(false);
    expect(samePythonResult({ a: 1, b: [2] }, { b: [2], a: 1 })).toBe(true);
    expect(samePythonResult({ a: 1 }, { a: 1, b: null })).toBe(false);
    expect(samePythonResult(0.1 + 0.2, 0.3)).toBe(true);
    expect(samePythonResult(1, 1.00001)).toBe(false);
  });
  it("fails closed when the configured sandbox is missing", async () => {
    const absent = new IsolatedPythonRuntime({ directory, bubblewrap: "/discere-missing-bwrap" });
    expect(await absent.execute("result = 3", {})).toMatchObject({ error: "runtime" });
  });
  it("rejects malformed or oversized execution inputs", async () => {
    await expect(runtime.execute("x".repeat(16001), {})).rejects.toThrow();
    await expect(runtime.execute("result = 3", { result: 1 })).rejects.toThrow();
    await expect(runtime.execute("result = 3", { __builtins__: 1 })).rejects.toThrow();
    await expect(
      runtime.execute("result = 3", { value: Number.POSITIVE_INFINITY }),
    ).rejects.toThrow();
  });
});

describe.runIf(supported)("real isolated learner Python", () => {
  let sentinelDirectory: string, sentinelFile: string;
  beforeAll(async () => {
    sentinelDirectory = await mkdtemp(path.join(tmpdir(), "discere-python-boundary-"));
    sentinelFile = path.join(sentinelDirectory, "owner-sentinel.txt");
    await writeFile(sentinelFile, "owner data stays outside", "utf8");
  });
  afterAll(async () => {
    await rm(sentinelDirectory, { recursive: true, force: true });
  });
  it("calls learner-defined functions and requires the requested function", async () => {
    const call = { name: "job_cost", arguments: ["unit_price", "quantity"] };
    expect(
      await runtime.execute(
        "def job_cost(unit_price, quantity):\n    return unit_price * quantity",
        { unit_price: 3.5, quantity: 4 },
        call,
      ),
    ).toEqual({ result: 14, output: "" });
    expect(
      await runtime.execute("result = 14", { unit_price: 3.5, quantity: 4 }, call),
    ).toMatchObject({ error: "code" });
  });
  it("executes built-in Python against changing inputs", async () => {
    expect(
      await runtime.execute("result = [n * 2 for n in values if n > 0]", { values: [-1, 3, 7] }),
    ).toEqual({ result: [6, 14], output: "" });
    expect(
      await runtime.execute("result = [n * 2 for n in values if n > 0]", { values: [0, 5] }),
    ).toEqual({ result: [10], output: "" });
  });
  it("executes the pinned NumPy and pandas packages and captures useful output", async () => {
    const result = await runtime.execute(
      "import numpy as np\nimport pandas as pd\nprint('rows', len(values))\nresult = {'total': np.array(values).sum(), 'table': pd.DataFrame({'value': values})}",
      { values: [2, 4, 7] },
    );
    expect(result).toEqual({
      result: { total: 13, table: { columns: ["value"], rows: [[2], [4], [7]] } },
      output: "rows 3\n",
    });
  });
  it("normalizes missing values, timestamps, Series, arrays and tuples", async () => {
    const result = await runtime.execute(
      "import numpy as np\nimport pandas as pd\nresult = {'array': np.array([1, np.nan]), 'series': pd.Series([True, False]), 'date': pd.Timestamp('2026-01-03'), 'missing': pd.NA, 'tuple': (2, 3)}",
      {},
    );
    expect(result).toEqual({
      result: {
        array: [1, null],
        series: [true, false],
        date: "2026-01-03T00:00:00",
        missing: null,
        tuple: [2, 3],
      },
      output: "",
    });
  });
  it("says plainly when result was never assigned, without blaming a ValueError", async () => {
    const missing = await runtime.execute("answer = 3", {});
    expect(missing).toMatchObject({ error: "code", message: "Assign your answer to result." });
    const learner = await runtime.execute("raise ValueError('bad')", {});
    expect(learner).toMatchObject({ error: "code" });
    expect((learner as { message: string }).message).toMatch(/^ValueError on line 1\./);
  });
  it("supports temporary file construction and closes it with with", async () => {
    expect(
      await runtime.execute(
        "with open('/tmp/notes.txt', 'w') as f:\n    f.write(text)\nwith open('/tmp/notes.txt') as f:\n    result = f.read().upper()",
        { text: "sample" },
      ),
    ).toEqual({ result: "SAMPLE", output: "" });
    expect(
      await runtime.execute("import os\nresult = os.path.exists('/tmp/notes.txt')", {}),
    ).toEqual({ result: false, output: "" });
  });
  it("excludes host workspace, home, sentinel files and inherited environment", async () => {
    process.env["DISCERE_PYTHON_TEST_SECRET"] = "test secret must stay in parent";
    try {
      const result = await runtime.execute(
        "import os\nresult = {'workspace': os.path.exists('/workspace'), 'home': os.path.exists('/home'), 'sentinel': os.path.exists(sentinel), 'secret': os.getenv('DISCERE_PYTHON_TEST_SECRET'), 'uid': os.geteuid()}",
        { sentinel: sentinelFile },
      );
      expect(result).toEqual({
        result: { workspace: false, home: false, sentinel: false, secret: null, uid: 65534 },
        output: "",
      });
      expect(await readFile(sentinelFile, "utf8")).toBe("owner data stays outside");
    } finally {
      delete process.env["DISCERE_PYTHON_TEST_SECRET"];
    }
  });
  it("does not expose the owner's files through process descriptors", async () => {
    const result = await runtime.execute(
      "import os\nresult = [os.readlink('/proc/self/fd/' + n) for n in os.listdir('/proc/self/fd') if n.isdigit() and os.path.exists('/proc/self/fd/' + n)]",
      {},
    );
    expect("result" in result).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/workspace|owner-sentinel|discere\.sqlite|\/home\//);
  });
  it("applies fixed hard resource limits, no-new-privileges, seccomp and no capabilities", async () => {
    const result = await runtime.execute(
      "import resource\nstatus = open('/proc/self/status').read()\nresult = {'cpu': resource.getrlimit(resource.RLIMIT_CPU), 'memory': resource.getrlimit(resource.RLIMIT_AS), 'children': resource.getrlimit(resource.RLIMIT_NPROC), 'privileges': 'NoNewPrivs:\\t1' in status, 'seccomp': 'Seccomp:\\t2' in status, 'capabilities': 'CapEff:\\t0000000000000000' in status}",
      {},
    );
    expect(result).toEqual({
      result: {
        cpu: [2, 2],
        memory: [536870912, 536870912],
        children: [0, 0],
        privileges: true,
        seccomp: true,
        capabilities: true,
      },
      output: "",
    });
  });
  it("cannot reach a server on the owner's loopback interface", async () => {
    let connections = 0;
    const server = createServer((socket) => {
      connections += 1;
      socket.destroy();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server missing");
      const result = await runtime.execute(
        "import socket\ntry:\n    socket.create_connection(('127.0.0.1', port), timeout=0.2)\n    result = False\nexcept OSError:\n    result = True",
        { port: address.port },
      );
      expect(result).toEqual({ result: true, output: "" });
      expect(connections).toBe(0);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    }
  });
  it.each([
    [
      "fork",
      "import os\ntry:\n    child = os.fork()\n    if child == 0:\n        os._exit(0)\n    os.waitpid(child, 0)\n    result = False\nexcept PermissionError:\n    result = True",
    ],
    [
      "exec",
      "import os\ntry:\n    os.execve('/usr/bin/python3.12', ['python', '-c', 'pass'], {})\nexcept PermissionError:\n    result = True",
    ],
    [
      "nested namespaces",
      "import ctypes\nlibc=ctypes.CDLL(None, use_errno=True)\nresult = libc.unshare(0x10000000) == -1 and ctypes.get_errno() == 1",
    ],
    [
      "raise memory limit",
      "import resource\ntry:\n    resource.setrlimit(resource.RLIMIT_AS, (1073741824, 1073741824))\n    result = False\nexcept (ValueError, PermissionError):\n    result = True",
    ],
    [
      "write runtime files",
      "try:\n    open('/app/bootstrap.py', 'w').write('changed')\n    result = False\nexcept OSError:\n    result = True",
    ],
  ])("blocks %s", async (_name, code) => {
    expect(await runtime.execute(code, {})).toEqual({ result: true, output: "" });
  });
  it.each([
    ["syntax", "result = ("],
    ["missing result", "print('done')"],
    ["missing variable", "result = unknown_variable"],
    ["division by zero", "result = 1 / 0"],
    [
      "process launch",
      "import subprocess\nsubprocess.run(['/usr/bin/python3.12', '-c', 'pass'])\nresult=1",
    ],
    ["infinite numeric result", "result = float('inf')"],
    ["unsupported result", "result = {1, 2}"],
  ])("returns a bounded code error for %s", async (_name, code) => {
    expect(await runtime.execute(code, {})).toMatchObject({ error: "code" });
  });
  it("bounds nested and oversized result collections", async () => {
    expect(await runtime.execute("result = list(range(201))", {})).toMatchObject({
      error: "limit",
    });
    expect(
      await runtime.execute("result=1\nfor _ in range(8):\n    result=[result]", {}),
    ).toMatchObject({ error: "limit" });
  });
  it("bounds captured and raw descriptor output", async () => {
    expect(await runtime.execute("print('x' * 8001)\nresult=1", {})).toMatchObject({
      error: "limit",
    });
    expect(
      await runtime.execute(
        "import os\nfor _ in range(100):\n    os.write(1, b'x' * 65536)\nresult=1",
        {},
      ),
    ).toMatchObject({ error: "limit" });
  });
  it("bounds memory and recovers with a fresh worker", async () => {
    expect(await runtime.execute("result = [0] * 150000000", {})).toMatchObject({ error: "limit" });
    expect(await runtime.execute("result = 6 * 7", {})).toEqual({ result: 42, output: "" });
  });
  it("stops infinite CPU loops", async () => {
    expect(await runtime.execute("while True:\n    pass", {})).toMatchObject({ error: "limit" });
  }, 7000);
  it("kills sleeping workers at the parent deadline and recovers", async () => {
    expect(await runtime.execute("import time\ntime.sleep(30)\nresult=1", {})).toMatchObject({
      error: "limit",
    });
    expect(await runtime.execute("result = 9", {})).toEqual({ result: 9, output: "" });
  }, 7000);
  it("caps simultaneous workers even after asynchronous readiness reads", async () => {
    const outputs = await Promise.all(
      Array.from({ length: 6 }, () =>
        runtime.execute("import time\ntime.sleep(0.15)\nresult=1", {}),
      ),
    );
    expect(outputs.filter((r) => "result" in r)).toHaveLength(2);
    expect(outputs.filter((r) => "error" in r && r.error === "runtime")).toHaveLength(4);
    expect(await runtime.execute("result=2", {})).toEqual({ result: 2, output: "" });
  });
});
