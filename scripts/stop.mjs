import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { isProcessRunning, matchesRecordedProcess, terminateProcessTree } from "./lib/runtime.mjs";
const pidFile = resolve(".discere-pids.json");
if (!existsSync(pidFile)) {
  console.log("Discere has no recorded local processes.");
  process.exit(0);
}
let state;
try { state = JSON.parse(readFileSync(pidFile, "utf8")); }
catch {
  rmSync(pidFile, { force: true });
  console.log("Removed an unreadable Discere PID file. No processes were terminated.");
  process.exit(0);
}
const pids = [state.parent, ...(Array.isArray(state.children) ? state.children : [])];
if (state.schemaVersion !== 2 && pids.some((pid) => isProcessRunning(pid))) {
  console.error("These process records predate identity checking. Stop the original Discere terminal with Ctrl+C; no unverified process was terminated.");
  process.exit(1);
}
let stopped = 0;
for (const pid of [...pids.slice(1), pids[0]]) {
  if (matchesRecordedProcess(pid, state.processStartTokens?.[pid])) {
    terminateProcessTree(pid); stopped++;
  }
}
rmSync(pidFile, { force: true });
console.log(stopped ? "Stopped the recorded Discere processes." : "Removed stale Discere process records. No unrelated processes were terminated.");
