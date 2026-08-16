import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { port: 4318, strictPort: true, proxy: { "/api": { target: "http://127.0.0.1:4317", changeOrigin: false } } },
  preview: { port: 4318, strictPort: true },
  test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
});
