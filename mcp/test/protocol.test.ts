/**
 * A real stdio smoke test. It runs the built server the way the hub does and speaks JSON-RPC to
 * it, because a server that type checks but never answers an initialize request is still broken.
 * The build runs before vitest through the package's test script, so dist is present here.
 */
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENTRY = fileURLToPath(new URL("../dist/index.js", import.meta.url));

/** Nothing listens on port 1, so every request fails the way a stopped Discere would. */
const UNREACHABLE_URL = "http://127.0.0.1:1";

const EXPECTED_TOOLS = [
  "list_courses",
  "get_course",
  "get_lesson_journey",
  "get_progress",
  "list_due_reviews",
  "ask_tutor",
  "get_attempt_feedback",
];

interface JsonRpcResponse {
  id: number;
  result?: {
    serverInfo?: { name?: string };
    tools?: { name: string }[];
    isError?: boolean;
    structuredContent?: unknown;
    content?: { type: string; text: string }[];
  };
  error?: { code: number; message: string };
}

class StdioClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, (response: JsonRpcResponse) => void>();
  private buffer = "";
  private nextId = 1;
  readonly stderr: string[] = [];

  constructor() {
    this.child = spawn(process.execPath, [ENTRY], {
      cwd: PACKAGE_ROOT,
      env: { ...process.env, DISCERE_URL: UNREACHABLE_URL },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.consume(chunk));
    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk: string) => this.stderr.push(chunk));
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    let index = this.buffer.indexOf("\n");
    while (index !== -1) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (line.length > 0) {
        const message = JSON.parse(line) as JsonRpcResponse;
        this.pending.get(message.id)?.(message);
        this.pending.delete(message.id);
      }
      index = this.buffer.indexOf("\n");
    }
  }

  notify(method: string, params: unknown = {}): void {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  request(method: string, params: unknown = {}): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`No answer to ${method}. stderr: ${this.stderr.join("")}`));
      }, 8_000);
      this.pending.set(id, (response) => {
        clearTimeout(timer);
        resolve(response);
      });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  kill(): void {
    this.child.kill("SIGKILL");
  }
}

let client: StdioClient;

beforeAll(() => {
  client = new StdioClient();
});

afterAll(() => {
  client?.kill();
});

it("serves the Discere tools over stdio and reports an unreachable server honestly", async () => {
  try {
    const initialize = await client.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "discere-mcp-test", version: "0.1.0" },
    });
    expect(initialize.error).toBeUndefined();
    expect(initialize.result?.serverInfo?.name).toBe("discere");

    client.notify("notifications/initialized");

    const list = await client.request("tools/list");
    const names = (list.result?.tools ?? []).map((tool) => tool.name);
    for (const expected of EXPECTED_TOOLS) {
      expect(names).toContain(expected);
    }

    // Discere is not running on this URL. The tool must say so rather than inventing a library.
    const call = await client.request("tools/call", {
      name: "list_courses",
      arguments: {},
    });
    expect(call.error).toBeUndefined();
    expect(call.result?.isError).toBe(true);
    expect(call.result?.structuredContent).toBeUndefined();
    const text = (call.result?.content ?? []).map((part) => part.text).join("\n");
    expect(text).toContain(UNREACHABLE_URL);
    expect(text).toMatch(/not reachable/i);
    expect(text).toMatch(/pnpm start|Instrumenta/);
    expect(text).not.toContain('"courses"');
  } finally {
    client.kill();
  }
}, 20_000);
