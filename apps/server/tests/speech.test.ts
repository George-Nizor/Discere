import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { encodeWav } from "../src/speech/engine.js";
import { SpeechService, type VoiceFile } from "../src/speech/service.js";
import {
  prepareLessonText,
  speakMath,
  splitSentences,
  toPhonemes,
  toTokens,
} from "../src/speech/text.js";

describe("preparing lesson text for the voice", () => {
  it("says inline maths the way a teacher would", () => {
    expect(speakMath("x = 0")).toBe("x equals 0");
    expect(speakMath("e^x")).toBe("e to the x");
    expect(speakMath("\\tfrac12")).toBe("a half");
    expect(speakMath("\\frac{a}{b} + uv")).toBe("a over b plus u v");
    expect(speakMath("y(0) = 1")).toBe("y of 0 equals 1");
    expect(speakMath("\\omega^2")).toBe("omega squared");
    expect(speakMath("\\sqrt{2x}")).toBe("the square root of 2 x");
  });

  it("drops markup and reads symbols in prose", () => {
    expect(prepareLessonText("A **positive** [[correlation|both rise]] when $x = 0$.")).toBe(
      "A positive correlation when x equals 0.",
    );
    expect(prepareLessonText("The function h(x) = 10 − x is defined at 4.")).toBe(
      "The function h of x equals 10 minus x is defined at 4.",
    );
  });

  it("splits a screen into sentences without breaking at decimals or titles", () => {
    expect(splitSentences("It is 3.5 metres. Dr. Shaw measured it! Was it right?")).toEqual([
      "It is 3.5 metres.",
      "Dr. Shaw measured it!",
      "Was it right?",
    ]);
  });

  it("keeps every piece under the model's limit", () => {
    const long = `${"word, ".repeat(200)}end.`;
    for (const piece of splitSentences(long)) expect(piece.length).toBeLessThanOrEqual(300);
  });

  it("phonemises British English and keeps the punctuation Kokoro pauses on", async () => {
    const phonemes = await toPhonemes("Hello, world.");
    expect(phonemes).toContain(",");
    expect(phonemes.endsWith(".")).toBe(true);
    expect(toTokens(phonemes).length).toBeGreaterThan(5);
  });
});

describe("the voice service", () => {
  let directory: string;
  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  const model = Buffer.from("model");
  const voice = Buffer.from("voice");
  const sha = (data: Buffer) => createHash("sha256").update(data).digest("hex");
  const files: VoiceFile[] = [
    {
      file: "model.onnx",
      url: "https://example.test/model",
      sha256: sha(model),
      bytes: model.length,
    },
    {
      file: "voice.bin",
      url: "https://example.test/voice",
      sha256: sha(voice),
      bytes: voice.length,
    },
  ];
  const fetcher = (async (url: string) =>
    new Response(url.endsWith("model") ? model : voice)) as unknown as typeof fetch;

  async function service(overrides: Partial<ConstructorParameters<typeof SpeechService>[0]> = {}) {
    directory = await mkdtemp(path.join(os.tmpdir(), "discere-speech-"));
    const spoken: string[] = [];
    const speech = new SpeechService({
      dataDirectory: directory,
      files,
      fetcher,
      createEngine: () => ({
        speak: async (sentence: string) => {
          spoken.push(sentence);
          return new Float32Array(240);
        },
      }),
      ...overrides,
    });
    return { speech, spoken };
  }

  async function until(speech: SpeechService, state: string) {
    for (let i = 0; i < 100; i++) {
      if ((await speech.status()).state === state) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`never reached ${state}`);
  }

  it("refuses to speak before the voice is downloaded", async () => {
    const { speech } = await service();
    expect((await speech.status()).state).toBe("missing");
    await expect(speech.speak("Charge flows.")).rejects.toThrow("not been downloaded");
  });

  it("downloads and verifies the voice, then says a sentence once and reuses it", async () => {
    const { speech, spoken } = await service();
    await speech.install();
    await until(speech, "ready");
    const first = await speech.speak("Charge flows.");
    const second = await speech.speak("Charge flows.");
    expect(first.subarray(0, 4).toString()).toBe("RIFF");
    expect(second.equals(first)).toBe(true);
    expect(spoken).toEqual(["Charge flows."]);
  });

  it("rejects a download that does not match its checksum", async () => {
    const { speech } = await service({
      fetcher: (async () => new Response(Buffer.from("tampered"))) as unknown as typeof fetch,
    });
    await speech.install();
    await until(speech, "failed");
    const status = await speech.status();
    expect(status.message).toMatch(/larger than expected|checksum/);
  });

  it("prunes the clips played least recently once the cache is over its limit", async () => {
    const { speech } = await service({
      cacheLimitBytes: encodeWav(new Float32Array(240)).length * 2,
    });
    await speech.install();
    await until(speech, "ready");
    for (const sentence of ["One.", "Two.", "Three.", "Four."]) await speech.speak(sentence);
    await speech.prune();
    const cache = path.join(directory, "voice", "cache");
    let count = 0;
    for (const folder of await readdir(cache))
      count += (await readdir(path.join(cache, folder))).length;
    expect(count).toBe(2);
  });
});
