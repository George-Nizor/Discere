import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Illustrations the tutor can draw to show something words are struggling with.
 *
 * Three facts shape this. Generating one costs about 150k input tokens and takes a couple of
 * minutes, so it is never done twice for the same request and never done without being asked.
 * The result is an illustration and not evidence — ADR-0002 keeps generated pictures out of the
 * class of things a learner may treat as a source — so every one is stored with the prompt that
 * produced it and is labelled where it is shown. And because it is slow, the request returns
 * immediately with a key and the interface collects the picture when it is ready.
 */

const CACHE_SEGMENTS = [".local", "share", "discere", "illustrations"] as const;
/** Long enough for a slow generation, short enough that a wedged job does not sit forever. */
const GENERATION_TIMEOUT_MS = 8 * 60_000;
const MAX_SUBJECT_CHARS = 600;

export type IllustrationStatus = "ready" | "generating" | "failed";

export interface IllustrationRecord {
  key: string;
  status: IllustrationStatus;
  /** What the picture shows, for the alt text and for the label beside it. */
  alt: string;
  /** The full prompt that produced it, kept so the image can always be accounted for. */
  prompt: string;
  createdAt: string;
  detail: string;
}

export function illustrationCacheDirectory(): string {
  const configured = process.env["DISCERE_ILLUSTRATION_CACHE"]?.trim();
  return configured ? configured : path.join(os.homedir(), ...CACHE_SEGMENTS);
}

/**
 * The house style, applied to every illustration so a lesson does not end up with a gallery of
 * unrelated drawings. The subject is the only part that varies.
 */
export function buildIllustrationPrompt(subject: string, accent: string): string {
  return [
    "Generate one educational illustration and save it as a PNG.",
    "",
    `Subject: ${subject}`,
    "",
    "Style, which matters as much as the subject:",
    "- Flat vector educational illustration. Clean geometry, confident stroke weights.",
    "- Landscape 16:9, composed to stay readable at 600 pixels wide.",
    `- One hue only: ${accent}, with tints and shades of it for depth. Linework in white or`,
    "  near-white. No second hue.",
    "- Generous negative space. No cinematic lighting, no 3D, no glow, no photorealism.",
    "- No text, letters, numbers, equations, labels, legends, logos or watermarks anywhere.",
    "  Exact wording is added by the application, never drawn into the pixels.",
    "- Do not invent components, connections or detail for visual interest. Draw only what the",
    "  subject states; where scale is not given, avoid any cue that claims a scale.",
    "",
    "It is an illustration, not a photograph and not documentary evidence. Do not make it look",
    "like a photograph of a real object or event.",
  ].join("\n");
}

/** The same request always resolves to the same file, so nothing is ever generated twice. */
export function illustrationKey(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 32);
}

function recordPath(key: string): string {
  return path.join(illustrationCacheDirectory(), `${key}.json`);
}

export function illustrationImagePath(key: string): string {
  return path.join(illustrationCacheDirectory(), `${key}.png`);
}

export async function readIllustration(key: string): Promise<IllustrationRecord | undefined> {
  try {
    return JSON.parse(await readFile(recordPath(key), "utf8")) as IllustrationRecord;
  } catch {
    return undefined;
  }
}

async function writeRecord(record: IllustrationRecord): Promise<void> {
  await mkdir(illustrationCacheDirectory(), { recursive: true });
  await writeFile(recordPath(record.key), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

/** Generations already running in this process, so a double click does not spend twice. */
const inFlight = new Map<string, Promise<void>>();

/**
 * Runs the CLI's own image generation and moves the result into the cache.
 *
 * The CLI writes generated images into its own store and reports the path it copied to, so the
 * instruction asks for a specific destination and the file is verified rather than trusted.
 */
async function generate(key: string, prompt: string): Promise<void> {
  const directory = illustrationCacheDirectory();
  await mkdir(directory, { recursive: true });
  const scratch = path.join(directory, `${key}.partial.png`);
  const binary = process.env["DISCERE_CODEX_BIN"]?.trim() ?? "codex";
  const model = process.env["DISCERE_CODEX_MODEL"]?.trim();
  const args = [
    "exec",
    "--skip-git-repo-check",
    "-C",
    directory,
    ...(model ? ["-m", model] : []),
    "-c",
    'model_reasoning_effort="low"',
    "-c",
    "mcp_servers={}",
    "--color",
    "never",
    "-s",
    "workspace-write",
    "-",
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, args, { cwd: directory, stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("The illustration took too long and was abandoned."));
    }, GENERATION_TIMEOUT_MS);
    timer.unref();
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk}`.slice(-2_000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Could not start '${binary}'. ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `The generator exited with code ${code ?? "unknown"}.`));
    });
    child.stdin.end(`${prompt}\n\nSave the image to exactly this path: ${scratch}\nThen reply with only that path.`, "utf8");
  });

  if (!existsSync(scratch)) {
    // Some runs save under the CLI's own name; take the newest PNG the run left behind.
    const stray = (await readdir(directory))
      .filter((name) => name.endsWith(".png") && !name.startsWith(key))
      .at(-1);
    if (!stray) throw new Error("The generator finished without producing an image.");
    await rename(path.join(directory, stray), scratch);
  }
  await rename(scratch, illustrationImagePath(key));
}

export interface IllustrationRequest {
  subject: string;
  alt: string;
  accent: string;
}

/**
 * Returns what is known about an illustration, starting one if it has never been asked for.
 * Never blocks on the generation: the caller polls, because two minutes is far too long to
 * hold a request open and the learner should be able to keep reading meanwhile.
 */
export async function requestIllustration(
  input: IllustrationRequest,
): Promise<IllustrationRecord> {
  const subject = input.subject.trim().slice(0, MAX_SUBJECT_CHARS);
  const prompt = buildIllustrationPrompt(subject, input.accent);
  const key = illustrationKey(prompt);

  const existing = await readIllustration(key);
  if (existing?.status === "ready" && existsSync(illustrationImagePath(key))) return existing;
  if (inFlight.has(key)) {
    return existing ?? { key, status: "generating", alt: input.alt, prompt, createdAt: new Date().toISOString(), detail: "" };
  }

  const record: IllustrationRecord = {
    key,
    status: "generating",
    alt: input.alt,
    prompt,
    createdAt: new Date().toISOString(),
    detail: "",
  };
  await writeRecord(record);

  const work = generate(key, prompt)
    .then(async () => {
      await writeRecord({ ...record, status: "ready" });
    })
    .catch(async (error: unknown) => {
      await writeRecord({
        ...record,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, work);
  return record;
}
