import { defineConfig } from "vitest/config";

// Each test file starts a server that loads every course bundle, in a test or in a beforeAll
// hook. With dozens of courses that takes longer than Vitest's 5 s and 10 s defaults on a CI
// runner, and it grows with every course added.
export default defineConfig({
  test: { testTimeout: 60_000, hookTimeout: 60_000 },
});
