import { childEnvironment, resolvePackageManager, runPackageManager } from "./lib/runtime.mjs";
const [operation, ...args] = process.argv.slice(2);
try {
  if (!["backup", "restore"].includes(operation)) throw new Error("Choose backup or restore.");
  const manager = resolvePackageManager();
  if (!manager) throw new Error("pnpm is unavailable.");
  runPackageManager(manager, ["--filter", "@discere/server", operation, ...args], { env: childEnvironment() });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
