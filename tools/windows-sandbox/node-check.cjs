// Runs the compiled hello world through discere-sandbox the way the Discere server will:
// child_process.spawn with piped stdio and windowsHide. Used by test.sh.
// Usage: node node-check.cjs <discere-sandbox.exe> <work dir containing main.exe> <status file>
const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const [helper, work, status] = process.argv.slice(2);
const started = Date.now();
const child = spawn(
  helper,
  ["run", "--work", work, "--memory-mb", "256", "--cpu-ms", "2000", "--wall-ms", "4000",
   "--processes", "1", "--status", status, "--", work + "\\main.exe"],
  { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env: {} },
);
let stdout = "", stderr = "";
child.stdout.on("data", (d) => (stdout += d));
child.stderr.on("data", (d) => (stderr += d));
child.on("close", (code) => {
  const result = JSON.parse(readFileSync(status, "utf8"));
  const good = code === 0 && stdout.trim() === "hello, node" && result.reason === "ok" && result.exitCode === 0;
  console.log((good ? "NODE OK " : "NODE FAIL ") + JSON.stringify({ code, stdout, stderr, result, ms: Date.now() - started }));
});
child.stdin.end("node\n");
