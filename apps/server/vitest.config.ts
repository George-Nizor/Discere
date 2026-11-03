import { defineConfig } from "vitest/config";

// The first test in a file starts a server that loads every course bundle, which takes longer
// than Vitest's 5 s default on a CI runner.
export default defineConfig({
  test: { testTimeout: 30_000 },
});
