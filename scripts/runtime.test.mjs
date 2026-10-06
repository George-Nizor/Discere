import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { processStartToken, matchesRecordedProcess } from "./lib/runtime.mjs";
test("start tokens distinguish an owned process from a stale record", () => {
  const token = processStartToken(process.pid);
  assert.ok(token);
  assert.equal(matchesRecordedProcess(process.pid, token), true);
  assert.equal(matchesRecordedProcess(process.pid, token + "-stale"), false);
  assert.equal(processStartToken(-1), null);
});
test("stop never kills a live unrelated PID referenced by stale records", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "discere-stop-test-"));
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  try {
    await once(child, "spawn");
    await writeFile(path.join(dir, ".discere-pids.json"), JSON.stringify({
      schemaVersion: 2, parent: child.pid, children: [], processStartTokens: { [child.pid]: "stale" },
    }));
    const stop = spawn(process.execPath, [fileURLToPath(new URL("./stop.mjs", import.meta.url))], { cwd: dir, stdio: "ignore" });
    const [code] = await once(stop, "exit");
    assert.equal(code, 0);
    assert.equal(child.exitCode, null);
    assert.doesNotThrow(() => process.kill(child.pid, 0));
  } finally { child.kill(); await rm(dir, { recursive: true, force: true }); }
});
