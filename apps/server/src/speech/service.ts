import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SpeechStatus } from "@discere/contracts";
import { encodeWav, KokoroEngine, type Synthesiser } from "./engine.js";
import { prepareLessonText } from "./text.js";

/**
 * Read aloud's voice: George from Kokoro-82M v1.0, pinned to one revision of the ONNX export so
 * the files, and so the voice, never change underneath a learner. The model is about 325 MB and
 * is fetched only when Read aloud is first used, never shipped in the release.
 */
const REVISION = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
const BASE = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${REVISION}`;
export const VOICE_NAME = "George";

export interface VoiceFile {
  file: string;
  url: string;
  sha256: string;
  bytes: number;
}
export const VOICE_FILES: VoiceFile[] = [
  {
    file: "model.onnx",
    url: `${BASE}/onnx/model.onnx`,
    sha256: "8fbea51ea711f2af382e88c833d9e288c6dc82ce5e98421ea61c058ce21a34cb",
    bytes: 325532232,
  },
  {
    file: "bm_george.bin",
    url: `${BASE}/voices/bm_george.bin`,
    sha256: "c4b235a4c1f2cd3b939fed08b899ce9385638b763f7b73a59616c4fc9bd6c9bc",
    bytes: 522240,
  },
];

/**
 * Part of every cache key. Changing the voice, the model or how text is prepared means the old
 * clips no longer match what would be said, so bump this and they are simply never asked for again.
 */
const CACHE_VERSION = `kokoro-${REVISION.slice(0, 8)}-bm_george-1`;
/** Played clips are kept up to this size; the least recently played go first. */
const CACHE_LIMIT_BYTES = 1024 * 1024 * 1024;

interface Progress {
  state: "installing" | "failed";
  done: number;
  message?: string;
}

export interface SpeechServiceOptions {
  dataDirectory: string;
  files?: VoiceFile[];
  fetcher?: typeof fetch;
  createEngine?: (files: { model: string; voice: string }) => Synthesiser;
  cacheLimitBytes?: number;
}

export class SpeechService {
  private progress: Progress | undefined;
  private engine: Synthesiser | undefined;
  private readonly files: VoiceFile[];
  private readonly fetcher: typeof fetch;
  private readonly createEngine: (files: { model: string; voice: string }) => Synthesiser;
  private readonly cacheLimit: number;
  private readonly inFlight = new Map<string, Promise<Buffer>>();
  private pruning = false;
  private lastPrune = 0;

  constructor(private readonly options: SpeechServiceOptions) {
    this.files = options.files ?? VOICE_FILES;
    this.fetcher = options.fetcher ?? fetch;
    this.createEngine = options.createEngine ?? ((files) => new KokoroEngine(files));
    this.cacheLimit = options.cacheLimitBytes ?? CACHE_LIMIT_BYTES;
  }

  private get root(): string {
    return path.join(this.options.dataDirectory, "voice", `kokoro-${REVISION.slice(0, 12)}`);
  }
  private get cacheRoot(): string {
    return path.join(this.options.dataDirectory, "voice", "cache");
  }
  private get downloadBytes(): number {
    return this.files.reduce((sum, file) => sum + file.bytes, 0);
  }

  private async installed(): Promise<boolean> {
    try {
      const marker = JSON.parse(await readFile(path.join(this.root, "install.json"), "utf8")) as {
        files?: string[];
      };
      return JSON.stringify(marker.files) === JSON.stringify(this.files.map((f) => f.sha256));
    } catch {
      return false;
    }
  }

  async status(): Promise<SpeechStatus> {
    const base = { voice: VOICE_NAME, downloadBytes: this.downloadBytes };
    if (this.progress?.state === "installing")
      return {
        ...base,
        state: "installing",
        progress: Math.min(1, this.progress.done / this.downloadBytes),
      };
    if (await this.installed()) return { ...base, state: "ready" };
    if (this.progress?.state === "failed")
      return {
        ...base,
        state: "failed",
        message: this.progress.message ?? "The download stopped.",
      };
    return { ...base, state: "missing" };
  }

  /** Starts the download in the background and returns at once; poll status() for progress. */
  async install(): Promise<SpeechStatus> {
    const current = await this.status();
    if (current.state !== "missing" && current.state !== "failed") return current;
    this.progress = { state: "installing", done: 0 };
    this.installNow().then(
      () => {
        this.progress = undefined;
      },
      (error: unknown) => {
        this.progress = {
          state: "failed",
          done: 0,
          message:
            `Downloading the voice stopped: ${error instanceof Error ? error.message : String(error)}`.slice(
              0,
              600,
            ),
        };
      },
    );
    return this.status();
  }

  private async installNow(): Promise<void> {
    const staging = `${this.root}.partial`;
    await mkdir(staging, { recursive: true });
    for (const file of this.files) await this.download(file, staging);
    await writeFile(
      path.join(staging, "install.json"),
      `${JSON.stringify({ revision: REVISION, files: this.files.map((f) => f.sha256) }, null, 2)}\n`,
    );
    await rm(this.root, { recursive: true, force: true });
    await rename(staging, this.root);
  }

  /** A file already downloaded and intact is kept, so a stopped download resumes per file. */
  private async download(file: VoiceFile, folder: string): Promise<void> {
    const target = path.join(folder, file.file);
    const tracker = this.progress!;
    if (existsSync(target) && (await stat(target)).size === file.bytes) {
      const hash = createHash("sha256")
        .update(await readFile(target))
        .digest("hex");
      if (hash === file.sha256) {
        tracker.done += file.bytes;
        return;
      }
    }
    const response = await this.fetcher(file.url);
    if (!response.ok || !response.body)
      throw new Error(`${file.file} could not be downloaded (${response.status}).`);
    const hash = createHash("sha256");
    const output = createWriteStream(`${target}.partial`);
    let written = 0;
    try {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        written += chunk.length;
        if (written > file.bytes) throw new Error(`${file.file} is larger than expected.`);
        hash.update(chunk);
        tracker.done += chunk.length;
        if (!output.write(chunk))
          await new Promise<void>((resolve) => output.once("drain", () => resolve()));
      }
    } finally {
      await new Promise<void>((resolve, reject) => {
        output.once("error", reject);
        output.end(() => resolve());
      });
    }
    if (hash.digest("hex") !== file.sha256)
      throw new Error(`${file.file} does not match its pinned checksum, so it was not used.`);
    await rename(`${target}.partial`, target);
  }

  /**
   * One sentence as WAV. A sentence said before is read from the cache; a new one is made, saved
   * and returned. Two requests for the same sentence share one rendering.
   */
  async speak(text: string): Promise<Buffer> {
    const sentence = prepareLessonText(text);
    const key = createHash("sha256").update(`${CACHE_VERSION}\n${sentence}`).digest("hex");
    const file = path.join(this.cacheRoot, key.slice(0, 2), `${key}.wav`);
    try {
      const cached = await readFile(file);
      // The modified time records the last play, which is what pruning goes by.
      const now = new Date();
      await utimes(file, now, now).catch(() => undefined);
      return cached;
    } catch {
      // Not said before.
    }
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const rendering = this.render(sentence, file).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, rendering);
    return rendering;
  }

  private async render(sentence: string, file: string): Promise<Buffer> {
    if (!(await this.installed())) throw new SpeechNotReady();
    this.engine ??= this.createEngine({
      model: path.join(this.root, this.files[0]!.file),
      voice: path.join(this.root, this.files[1]!.file),
    });
    const wav = encodeWav(await this.engine.speak(sentence));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(`${file}.partial`, wav);
    await rename(`${file}.partial`, file);
    // Walking the cache is cheap but not free, so it happens at most every ten minutes.
    if (Date.now() - this.lastPrune > 10 * 60_000) {
      this.lastPrune = Date.now();
      void this.prune();
    }
    return wav;
  }

  /** Keeps the cache under its limit by deleting the clips played least recently. */
  async prune(): Promise<void> {
    if (this.pruning) return;
    this.pruning = true;
    try {
      const clips: { file: string; size: number; used: number }[] = [];
      for (const folder of await readdir(this.cacheRoot).catch(() => [] as string[])) {
        const directory = path.join(this.cacheRoot, folder);
        for (const name of await readdir(directory).catch(() => [] as string[])) {
          if (!name.endsWith(".wav")) continue;
          const info = await stat(path.join(directory, name)).catch(() => undefined);
          if (info)
            clips.push({ file: path.join(directory, name), size: info.size, used: info.mtimeMs });
        }
      }
      let total = clips.reduce((sum, clip) => sum + clip.size, 0);
      clips.sort((a, b) => a.used - b.used);
      for (const clip of clips) {
        if (total <= this.cacheLimit) break;
        await rm(clip.file, { force: true });
        total -= clip.size;
      }
    } finally {
      this.pruning = false;
    }
  }
}

export class SpeechNotReady extends Error {
  constructor() {
    super("The voice has not been downloaded yet.");
  }
}
