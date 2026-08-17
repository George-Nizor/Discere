import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  isSupportedNode,
  minimumNodeLabel,
  resolvePackageManager,
  runPackageManager,
} from "./lib/runtime.mjs";

function fail(message) {
  console.error(`\nSetup stopped: ${message}`);
  process.exit(1);
}

console.log("Discere local setup\n");
if (!isSupportedNode()) {
  fail(`Node.js ${minimumNodeLabel()} or newer is required. Current version: ${process.versions.node}.`);
}
console.log(`[ok] Node.js v${process.versions.node}`);

const manager = resolvePackageManager();
if (!manager) {
  fail("pnpm is unavailable. Run 'corepack enable' or install pnpm 11.17.0, then rerun setup.");
}
console.log(`[ok] Using ${manager.label}`);

const envPath = resolve(".env");
if (!existsSync(envPath)) {
  copyFileSync(resolve(".env.example"), envPath);
  console.log("[ok] Created .env from .env.example");
} else {
  console.log("[ok] Kept the existing .env file");
}

const steps = [
  { label: "Installing workspace dependencies", args: ["install", "--no-frozen-lockfile"] },
  { label: "Preparing the SQLite database", args: ["db:migrate"] },
  { label: "Seeding the electronics concept graph", args: ["db:seed"] },
  { label: "Building the prototype", args: ["build"] },
];

for (const step of steps) {
  console.log(`\n${step.label}...`);
  try {
    runPackageManager(manager, step.args);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

console.log("\nChecking the completed environment...");
const doctor = spawnSync(process.execPath, [resolve("scripts/doctor.mjs")], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
if (doctor.error) fail(doctor.error.message);
if (doctor.status !== 0) fail("the environment check found a blocking problem");

console.log("\nDiscere is ready.");
console.log("Development: pnpm dev");
console.log("Built prototype: pnpm start");
console.log("Open the URL printed by the start command.");
