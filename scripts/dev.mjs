import { runStack } from "./lib/stack.mjs";

try {
  await runStack("development");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
