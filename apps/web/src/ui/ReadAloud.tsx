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

/** The browser's voice cannot read maths markup, so the dollar delimiters go. */
function browserText(text: string): string {
  return stripEmphasis(text).replaceAll("$", "");
}

/** Which voice reads, chosen per device: a phone may sound better with its own. */
export type VoiceChoice = "discere" | "device";
const VOICE_KEY = "discere.readAloudVoice";

export function voiceChoice(): VoiceChoice {
  try {
    return window.localStorage.getItem(VOICE_KEY) === "device" ? "device" : "discere";
  } catch {
    return "discere";
  }
}

export function setVoiceChoice(choice: VoiceChoice): void {
  try {
    window.localStorage.setItem(VOICE_KEY, choice);
  } catch {
    // Without storage the default voice reads; nothing else depends on it.
  }
}

const DEVICE_VOICE_KEY = "discere.deviceVoice";

function storedDeviceVoice(): string | null {
  try {
    return window.localStorage.getItem(DEVICE_VOICE_KEY);
  } catch {
    return null;
  }
}

/**
 * The device's English voices, the better ones first. On Android, Google's speech engine offers
 * several voices per accent, and the ones marked "network" are its higher-quality voices; the
 * browser picks an ordinary one unless told otherwise, which is why the default sounds flat.
 */
export function deviceVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  const rank = (voice: SpeechSynthesisVoice) =>
    (/network|natural|neural|online|enhanced|premium/i.test(`${voice.name} ${voice.voiceURI}`)
      ? 0
      : 2) + (voice.localService ? 1 : 0);
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort(
      (a, b) => rank(a) - rank(b) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name),
    );
}

function applyDeviceVoice(utterance: SpeechSynthesisUtterance): void {
  const wanted = storedDeviceVoice();
  if (!wanted) return;
  const voice = window.speechSynthesis.getVoices().find((item) => item.voiceURI === wanted);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
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
    applyDeviceVoice(utterance);
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
    const passage = browserText(text);
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
      if (voiceChoice() === "device" && browserVoice) {
        speakWithBrowser(browserText(text), current);
        return;
      }
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
            speakWithBrowser(browserText(text), current);
        }
        return;
      }
      void startVoiceDownload(status);
      speakWithBrowser(browserText(text), current);
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

/** The Settings card that picks between George and the device's own voice. */
export function ReadAloudVoiceSetting() {
  const [choice, setChoice] = useState<VoiceChoice>(() => voiceChoice());
  if (!canSpeak()) return null;
  return (
    <section aria-labelledby="read-aloud-heading" className="settings-card practice-settings">
      <h2 className="settings-card-title" id="read-aloud-heading">
        Read aloud
      </h2>
      <label className="practice-setting-row">
        <span>
          <strong>Voice</strong>
          <small>
            George is Discere's own voice. This device's voice is the one your phone or computer
            already has. The choice is kept on this device only.
          </small>
        </span>
        <select
          aria-label="Read aloud voice"
          value={choice}
          onChange={(event) => {
            const next = event.currentTarget.value as VoiceChoice;
            setVoiceChoice(next);
            setChoice(next);
          }}
        >
          <option value="discere">George</option>
          <option value="device">This device's voice</option>
        </select>
      </label>
      {choice === "device" ? <DeviceVoicePicker /> : null}
    </section>
  );
}

/** Lists the device's English voices, keeps the one chosen, and plays a sample of it. */
function DeviceVoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => deviceVoices());
  const [chosen, setChosen] = useState<string>(() => storedDeviceVoice() ?? "");
  useEffect(() => {
    // Chrome loads the voice list after the page, and says so with this event.
    const update = () => setVoices(deviceVoices());
    window.speechSynthesis.addEventListener("voiceschanged", update);
    update();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  function sample(): void {
    const utterance = new SpeechSynthesisUtterance(
      "Drawing well starts with confident lines. This is how I will read your lessons.",
    );
    utterance.rate = 0.95;
    applyDeviceVoice(utterance);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  return (
    <>
      <label className="practice-setting-row">
        <span>
          <strong>Device voice</strong>
          <small>
            On Android, voices marked network are Google's better ones and need a connection. More
            can be added in Android's Text-to-speech settings.
          </small>
        </span>
        <select
          aria-label="Device voice"
          value={chosen}
          onChange={(event) => {
            const next = event.currentTarget.value;
            try {
              if (next) window.localStorage.setItem(DEVICE_VOICE_KEY, next);
              else window.localStorage.removeItem(DEVICE_VOICE_KEY);
            } catch {
              // Without storage the device's default voice reads.
            }
            setChosen(next);
          }}
        >
          <option value="">The device's default</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </label>
      <button className="button button-secondary" onClick={sample} type="button">
        Play a sample
      </button>
    </>
  );
}
