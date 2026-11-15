import { readFile } from "node:fs/promises";
import { MAX_TOKENS, toPhonemes, toTokens } from "./text.js";

/** Kokoro writes 24 kHz mono. */
export const SAMPLE_RATE = 24_000;

/** The parts of onnxruntime-node the engine uses, so tests can stand in a fake. */
export interface OnnxRuntime {
  InferenceSession: {
    create(
      path: string,
      options?: { intraOpNumThreads?: number; graphOptimizationLevel?: "all" },
    ): Promise<{
      run(feeds: Record<string, unknown>): Promise<Record<string, { data: unknown }>>;
    }>;
  };
  Tensor: new (type: string, data: unknown, dims: number[]) => unknown;
}

export interface Synthesiser {
  /** One sentence in, 24 kHz float samples out. */
  speak(sentence: string): Promise<Float32Array>;
}

/**
 * Kokoro-82M run in-process on onnxruntime's CPU backend. The model is loaded once, on the first
 * request, and kept: loading takes a second or two and the session holds about 400 MB.
 */
export class KokoroEngine implements Synthesiser {
  private session:
    | Promise<Awaited<ReturnType<OnnxRuntime["InferenceSession"]["create"]>>>
    | undefined;
  private voice: Promise<Float32Array> | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly files: { model: string; voice: string },
    private readonly loadRuntime: () => Promise<OnnxRuntime> = async () =>
      (await import("onnxruntime-node")) as unknown as OnnxRuntime,
  ) {}

  private load() {
    this.session ??= this.loadRuntime().then((ort) =>
      ort.InferenceSession.create(this.files.model, { graphOptimizationLevel: "all" }),
    );
    this.voice ??= readFile(this.files.voice).then(
      (buffer) => new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4),
    );
    return Promise.all([this.loadRuntime(), this.session, this.voice]);
  }

  /** Requests run one at a time: two at once would only share the same CPU cores more slowly. */
  speak(sentence: string): Promise<Float32Array> {
    const next = this.queue.then(() => this.speakNow(sentence));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async speakNow(sentence: string): Promise<Float32Array> {
    const tokens = toTokens(await toPhonemes(sentence));
    if (tokens.length === 0) return new Float32Array(0);
    const [ort, session, voice] = await this.load();
    // The voice file holds one 256-value style vector per input length; the model expects the one
    // matching the number of tokens it is given.
    const row = Math.min(tokens.length, MAX_TOKENS - 1) * 256;
    const style = voice.slice(row, row + 256);
    const ids = BigInt64Array.from([0, ...tokens, 0].map(BigInt));
    const output = await session.run({
      input_ids: new ort.Tensor("int64", ids, [1, ids.length]),
      style: new ort.Tensor("float32", style, [1, 256]),
      speed: new ort.Tensor("float32", Float32Array.from([1]), [1]),
    });
    const waveform = output["waveform"]?.data;
    if (!(waveform instanceof Float32Array)) throw new Error("The voice model returned no audio.");
    return waveform;
  }
}

/** 16-bit PCM WAV, which every browser plays without a decoder of our own. */
export function encodeWav(samples: Float32Array, sampleRate = SAMPLE_RATE): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i] ?? 0));
    data.writeInt16LE(Math.round(value < 0 ? value * 0x8000 : value * 0x7fff), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
