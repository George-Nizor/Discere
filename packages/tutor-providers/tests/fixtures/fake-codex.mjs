#!/usr/bin/env node
/**
 * Stands in for the Codex CLI so the provider can be tested without spending the owner's
 * subscription. It reads the prompt from stdin, emits a `--json` event stream carrying a
 * session id, and writes the configured payload to the `-o` file.
 *
 * Behaviour comes from the environment:
 *   FAKE_CODEX_RESPONSES  JSON array of steps, one per invocation. The last step repeats.
 *                         Step fields: output, sleepMs, exitCode, rawOutput, skipOutputFile.
 *   FAKE_CODEX_STATE      File holding the invocation counter.
 *   FAKE_CODEX_LOG        File receiving one JSON line per invocation.
 *   FAKE_CODEX_SESSION_ID Session id reported in the event stream.
 */
import { appendFileSync, readFileSync, statSync, writeFileSync } from "node:fs";

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readCounter(statePath) {
  if (!statePath) return 0;
  try {
    return Number.parseInt(readFileSync(statePath, "utf8"), 10) || 0;
  } catch {
    return 0;
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const args = process.argv.slice(2);
const statePath = process.env.FAKE_CODEX_STATE;
const logPath = process.env.FAKE_CODEX_LOG;
const sessionId = process.env.FAKE_CODEX_SESSION_ID ?? "11111111-2222-4333-8444-555555555555";
const steps = JSON.parse(process.env.FAKE_CODEX_RESPONSES ?? "[{}]");

const call = readCounter(statePath);
if (statePath) writeFileSync(statePath, String(call + 1), "utf8");
const step = steps[Math.min(call, steps.length - 1)] ?? {};

const outputFile = argValue("-o");
const schemaFile = argValue("--output-schema");
const resumedSessionId = args[1] === "resume" ? args.at(-2) : null;
// `--image` is variadic in the real CLI, so the provider passes it in the `=` form. Recording
// what actually arrived on disk is how a test proves the attachment reached the model.
const images = args
  .filter((arg) => arg.startsWith("--image="))
  .map((arg) => arg.slice("--image=".length))
  .map((file) => {
    try {
      return { file, bytes: statSync(file).size, head: readFileSync(file).subarray(0, 8).toString("hex") };
    } catch (error) {
      return { file, bytes: 0, head: "", error: String(error) };
    }
  });
const prompt = await readStdin();

if (logPath) {
  appendFileSync(
    logPath,
    `${JSON.stringify({
      call,
      pid: process.pid,
      args,
      resumedSessionId,
      images,
      schema: schemaFile ? JSON.parse(readFileSync(schemaFile, "utf8")) : null,
      prompt,
      startedAt: Date.now(),
    })}\n`,
    "utf8",
  );
}

process.stdout.write(`${JSON.stringify({ type: "session.created", session_id: sessionId })}\n`);
process.stdout.write(`${JSON.stringify({ type: "item.started", item: { type: "reasoning" } })}\n`);

if (step.sleepMs) {
  await new Promise((resolve) => setTimeout(resolve, step.sleepMs));
}

if (outputFile && !step.skipOutputFile) {
  const body =
    step.rawOutput !== undefined ? step.rawOutput : JSON.stringify(step.output ?? {}, null, 2);
  writeFileSync(outputFile, body, "utf8");
}

if (logPath) {
  appendFileSync(logPath, `${JSON.stringify({ call, finishedAt: Date.now() })}\n`, "utf8");
}

process.stdout.write(`${JSON.stringify({ type: "turn.completed" })}\n`);
process.exit(step.exitCode ?? 0);
