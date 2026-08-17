import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { isProcessRunning, terminateProcessTree } from "./lib/runtime.mjs";

const pidFile = resolve(".discere-pids.json");
if (!existsSync(pidFile)) {
  console.log("Discere has no recorded local processes.");
  process.exit(0);
}

let state;
try {
  state = JSON.parse(readFileSync(pidFile, "utf8"));
} catch {
  rmSync(pidFile, { force: true });
  console.log("Removed an unreadable Discere PID file. No processes were terminated.");
  process.exit(0);
}

const childPids = Array.isArray(state.children) ? state.children : [];
const runningChildren = childPids.filter((pid) => isProcessRunning(pid));
for (const pid of runningChildren) terminateProcessTree(pid);

if (isProcessRunning(state.parent)) terminateProcessTree(state.parent);
rmSync(pidFile, { force: true });

if (runningChildren.length === 0) {
  console.log("Removed stale Discere process records.");
} else {
  console.log(`Stopped ${runningChildren.length} Discere service${runningChildren.length === 1 ? "" : "s"}.`);
}
