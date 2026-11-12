import { defineConfig } from "vitest/config";

// The content tests read whole course bundles, and several start a Python, SQL or TypeScript
// process. On a busy machine or a CI runner a test of that kind can take longer than vitest's
// five-second default, so the limit is raised for this package.
export default defineConfig({
  test: {
    testTimeout: 30_000,
  },
});
