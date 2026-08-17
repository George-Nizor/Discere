import { runStack } from "./lib/stack.mjs";

try {
  await runStack("prototype");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
