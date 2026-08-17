import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}

function formatHost(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  const apiHost = env["DISCERE_HOST"] || "127.0.0.1";
  const apiPort = parsePort(env["DISCERE_PORT"], 4317);
  const webHost = env["DISCERE_WEB_HOST"] || "127.0.0.1";
  const webPort = parsePort(env["DISCERE_WEB_PORT"], 4318);
  const proxy = {
    "/api": {
      target: `http://${formatHost(apiHost)}:${apiPort}`,
      changeOrigin: false,
    },
  };

  return {
    envDir: "../..",
    plugins: [react()],
    server: { host: webHost, port: webPort, strictPort: true, proxy },
    preview: { host: webHost, port: webPort, strictPort: true, proxy },
    test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
  };
});
