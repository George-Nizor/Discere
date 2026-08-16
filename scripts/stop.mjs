import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const pidFile = resolve(".discere-pids.json");
if (!existsSync(pidFile)) {
  console.log("Discere has no recorded background processes.");
  process.exit(0);
}

const state = JSON.parse(readFileSync(pidFile, "utf8"));
for (const pid of state.children ?? []) {
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {
    // A process may already have exited. The PID file still needs to be removed.
  }
}
rmSync(pidFile, { force: true });
console.log("Stopped Discere processes recorded by the project.");
