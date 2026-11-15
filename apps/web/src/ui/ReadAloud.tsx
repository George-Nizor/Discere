import type { SpeechSentencesResponse, SpeechStatus } from "@discere/contracts";
import { useEffect, useRef, useState } from "react";
import { requestJson } from "../api/client.js";
import { AudioLines } from "../brand/icon-set.js";
import { emitMascot } from "../mascot/bus.js";
import { stripEmphasis } from "./RichText.js";

/**
 * Read aloud, shared by every surface that reads text to the learner.
 *
 * Discere's own voice (George, from the Kokoro model running in the local engine) reads when it
 * has been downloaded. The first press downloads it in the background and the browser's voice
 * reads in the meantime, as it does whenever the engine's voice cannot. A screen is read one
 * sentence at a time, so the first sentence plays while the next is being made.
 *
 * Speaking stops when the surface goes away: navigating between stages must not leave a voice
 * reading a screen nobody is looking at.
 */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function canPlayAudio(): boolean {
  return typeof window !== "undefined" && typeof window.Audio === "function";
}

let voiceStatus: Promise<SpeechStatus | null> | undefined;

/** The engine's voice, asked once and asked again only after a download was started. */
function engineVoice(refresh = false): Promise<SpeechStatus | null> {
  if (refresh || !voiceStatus)
    voiceStatus = requestJson<SpeechStatus>("/api/speech/status").catch(() => null);
  return voiceStatus;
}

/** Starts the voice download if it has not been started, without waiting for it. */
async function startVoiceDownload(status: SpeechStatus | null): Promise<void> {
  if (status?.state !== "missing" && status?.state !== "failed") return;
  try {
    await requestJson<SpeechStatus>("/api/speech/install", { method: "POST" });
  } catch {
    // The browser's voice keeps reading; the next press asks again.
  }
  voiceStatus = undefined;
}

/** Only for tests, which stand in a different engine for each case. */
export function resetReadAloudForTests(): void {
  voiceStatus = undefined;
}

interface Reading {
  cancelled: boolean;
  /** Set once the browser's voice has taken over the passage. */
  handedOver: boolean;
  audio: HTMLAudioElement | null;
  urls: string[];
}

async function sentenceAudio(sentence: string): Promise<string> {
  const response = await fetch("/api/speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: sentence }),
  });
  if (!response.ok) throw new Error(`The engine's voice answered ${response.status}.`);
  return URL.createObjectURL(await response.blob());
}

function play(reading: Reading, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    reading.audio = audio;
    audio.addEventListener("ended", () => resolve());
    audio.addEventListener("error", () => reject(new Error("The clip could not be played.")));
    audio.play().catch(reject);
  });
}

export function useReadAloud(text: string): {
  supported: boolean;
  speaking: boolean;
  toggle: () => void;
} {
  const [speaking, setSpeaking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const reading = useRef<Reading | null>(null);
  const browserVoice = canSpeak();
  const supported = browserVoice || (engineReady && canPlayAudio());

  useEffect(() => {
    if (!canPlayAudio()) return;
    let live = true;
    void engineVoice().then((status) => {
      if (live) setEngineReady(status?.state === "ready");
    });
    return () => {
      live = false;
    };
  }, []);

  function stop(): void {
    const current = reading.current;
    reading.current = null;
    if (current) {
      current.cancelled = true;
      current.audio?.pause();
      for (const url of current.urls) URL.revokeObjectURL(url);
    }
    if (browserVoice) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  // Unmounting, or moving to a different passage, abandons whatever is being read. `text` is
  // listed because a new passage is a new reading, not a continuation of the previous one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cleanup depends on the passage.
  useEffect(() => stop, [text]);

  function speakWithBrowser(passage: string, current: Reading): void {
    if (!browserVoice || current.cancelled) {
      if (reading.current === current) stop();
      return;
    }
    current.handedOver = true;
    const utterance = new SpeechSynthesisUtterance(passage);
    utterance.rate = 0.95;
    const finish = () => {
      if (reading.current === current) {
        reading.current = null;
        setSpeaking(false);
      }
    };
    utterance.addEventListener("end", finish);
    utterance.addEventListener("error", finish);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function speakWithEngine(current: Reading): Promise<void> {
    const passage = stripEmphasis(text);
    const { sentences } = await requestJson<SpeechSentencesResponse>("/api/speech/sentences", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    let next = sentences[0] ? sentenceAudio(sentences[0]) : undefined;
    for (let index = 0; index < sentences.length && next; index++) {
      let url: string;
      try {
        url = await next;
      } catch (error) {
        // A sentence the engine cannot say hands the rest of the passage to the browser.
        if (current.cancelled) return;
        speakWithBrowser(sentences.slice(index).join(" ") || passage, current);
        throw error;
      }
      if (current.cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      current.urls.push(url);
      const following = sentences[index + 1];
      next = following ? sentenceAudio(following) : undefined;
      // Keep the next request's failure from surfacing before its turn.
      next?.catch(() => undefined);
      await play(current, url);
      URL.revokeObjectURL(url);
      current.urls = current.urls.filter((kept) => kept !== url);
      if (current.cancelled) return;
    }
    if (reading.current === current) {
      reading.current = null;
      setSpeaking(false);
    }
  }

  function toggle(): void {
    if (speaking) {
      stop();
      return;
    }
    stop();
    const current: Reading = { cancelled: false, handedOver: false, audio: null, urls: [] };
    reading.current = current;
    setSpeaking(true);
    void (async () => {
      const status = canPlayAudio() ? await engineVoice() : null;
      if (current.cancelled) return;
      if (status?.state === "ready") {
        setEngineReady(true);
        try {
          await speakWithEngine(current);
        } catch {
          // The engine stopped before the browser took over, for instance while splitting the
          // passage, so the browser reads all of it.
          if (!current.cancelled && !current.handedOver)
            speakWithBrowser(stripEmphasis(text), current);
        }
        return;
      }
      void startVoiceDownload(status);
      speakWithBrowser(stripEmphasis(text), current);
    })();
  }

  useEffect(() => {
    emitMascot({ type: "listening", on: speaking });
  }, [speaking]);
  return { supported, speaking, toggle };
}

export function ReadAloudButton({
  text,
  label = "Read aloud",
  className = "button button-quiet",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { supported, speaking, toggle } = useReadAloud(text);
  if (!supported) return null;
  return (
    <button
      className={className}
      onClick={toggle}
      type="button"
      aria-pressed={speaking}
      title={speaking ? "Stop reading" : label}
    >
      <AudioLines aria-hidden="true" size={22} />
      <span className="lesson-tool-label">{speaking ? "Stop reading" : label}</span>
    </button>
  );
}
