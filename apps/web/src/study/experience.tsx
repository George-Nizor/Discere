import { type StudyPreferences, StudyPreferencesSchema } from "@discere/contracts";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useStudyPreferences } from "../api/queries.js";

export const EXPERIENCE_KEY = "discere:experience:v1";
const defaults: StudyPreferences = {
  timeZone: "UTC",
  dailyGoal: 5,
  motion: "system",
  celebrations: true,
  sound: true,
};
function cachedPreferences(): StudyPreferences {
  try {
    return StudyPreferencesSchema.parse(JSON.parse(localStorage.getItem(EXPERIENCE_KEY) ?? "null"));
  } catch {
    return defaults;
  }
}
/**
 * Puts the last known theme and background on the page before React's first paint, so a light
 * theme never opens on a dark frame (and the intro is drawn in the right colours from the start).
 * The provider takes over once preferences load.
 */
export function applyCachedAppearance(): void {
  const preferences = cachedPreferences();
  const light =
    preferences.theme === "light" ||
    (preferences.theme === "system" &&
      typeof matchMedia === "function" &&
      matchMedia("(prefers-color-scheme: light)").matches);
  const root = document.documentElement;
  root.dataset["theme"] = light ? "light" : "dark";
  root.dataset["backdrop"] = preferences.backdrop ?? "galaxy";
  root.style.colorScheme = light ? "light" : "dark";
}
export function cacheExperience(preferences: StudyPreferences) {
  try {
    localStorage.setItem(EXPERIENCE_KEY, JSON.stringify(preferences));
  } catch {
    /* Server preferences remain authoritative. */
  }
}
function systemLight() {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;
}
function systemReduced() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
let audioContext: AudioContext | undefined;
let lastSound = 0;
export function prepareStudySound() {
  if (typeof AudioContext === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume().catch(() => {});
  } catch {
    /* Visual feedback works without audio. */
  }
}
export type StudySound =
  | "answer"
  | "review"
  | "complete"
  | "combo"
  | "levelup"
  | "chest"
  | "miss"
  | "quest";

const C5 = 523.25;
const semitone = (base: number, steps: number) => base * 2 ** (steps / 12);
/** Notes as [frequency, delay in seconds, length in seconds, waveform]. */
function score(kind: StudySound, intensity: number): Array<[number, number, number, OscillatorType]> {
  const lift = Math.min(12, Math.max(0, intensity - 1));
  switch (kind) {
    case "combo": {
      const root = semitone(C5, lift);
      return [
        [root, 0, 0.16, "sine"],
        [semitone(root, 4), 0.06, 0.16, "sine"],
        [semitone(root, 7), 0.12, 0.22, "triangle"],
        ...(intensity >= 5 ? ([[semitone(root, 12), 0.18, 0.3, "sine"]] as const) : []),
      ] as Array<[number, number, number, OscillatorType]>;
    }
    case "levelup":
      return [
        [C5, 0, 0.18, "triangle"],
        [semitone(C5, 4), 0.11, 0.18, "triangle"],
        [semitone(C5, 7), 0.22, 0.18, "triangle"],
        [semitone(C5, 12), 0.33, 0.5, "sine"],
        [semitone(C5, 16), 0.33, 0.5, "sine"],
      ];
    case "chest":
      return [
        [semitone(C5, -5), 0, 0.12, "triangle"],
        [semitone(C5, 2), 0.09, 0.12, "triangle"],
        [semitone(C5, 7), 0.18, 0.12, "triangle"],
        [semitone(C5, 11), 0.27, 0.14, "sine"],
        [semitone(C5, 14), 0.36, 0.45, "sine"],
      ];
    case "quest":
      return [
        [semitone(C5, 7), 0, 0.14, "sine"],
        [semitone(C5, 12), 0.08, 0.3, "sine"],
      ];
    case "miss":
      return [
        [semitone(C5, -10), 0, 0.14, "sine"],
        [semitone(C5, -13), 0.09, 0.2, "sine"],
      ];
    case "complete":
      return [
        [C5, 0, 0.18, "sine"],
        [659.25, 0.075, 0.18, "sine"],
        [783.99, 0.15, 0.3, "sine"],
      ];
    case "review":
      return [
        [440, 0, 0.18, "sine"],
        [587.33, 0.075, 0.18, "sine"],
      ];
    default:
      return [
        [C5, 0, 0.18, "sine"],
        [659.25, 0.075, 0.18, "sine"],
      ];
  }
}

/** Original, quiet synthesised cues. A saved mute preference always wins. */
export function playStudySound(kind: StudySound, intensity = 1) {
  if (typeof AudioContext === "undefined" || Date.now() - lastSound < 120) return;
  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    void context
      .resume()
      .then(() => {
        if (context.state !== "running") return;
        lastSound = Date.now();
        for (const [frequency, delay, length, wave] of score(kind, intensity)) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = context.currentTime + delay;
          oscillator.type = wave;
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(kind === "miss" ? 0.03 : 0.045, start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, start + length);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + length + 0.01);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        }
      })
      .catch(() => {
        /* A browser may require another user gesture. Visual feedback still works. */
      });
  } catch {
    /* Audio hardware and browser policies cannot prevent learning. */
  }
}
interface Experience {
  reduced: boolean;
  /** The resolved scheme: "system" has already been settled against the device. */
  theme: "dark" | "light";
  backdrop: "galaxy" | "calm";
  celebrations: boolean;
  sound: boolean;
  prepare: () => void;
  play: (kind: StudySound, intensity?: number) => void;
}
const ExperienceContext = createContext<Experience>({
  reduced: systemReduced(),
  theme: "dark",
  backdrop: "galaxy",
  celebrations: true,
  sound: true,
  prepare: () => {},
  play: () => {},
});
export function ExperienceProvider({ children }: { children: ReactNode }) {
  const query = useStudyPreferences();
  const [cached, setCached] = useState(cachedPreferences);
  const [osReduced, setOsReduced] = useState(systemReduced);
  const preferences = query.data ?? cached;
  const reduced = preferences.motion === "reduced" || osReduced;
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOsReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (query.data) {
      cacheExperience(query.data);
      setCached(query.data);
    }
  }, [query.data]);
  const [osLight, setOsLight] = useState(systemLight);
  const theme: "dark" | "light" =
    preferences.theme === "system" ? (osLight ? "light" : "dark") : (preferences.theme ?? "dark");
  const backdrop = preferences.backdrop ?? "galaxy";
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const media = matchMedia("(prefers-color-scheme: light)");
    const update = () => setOsLight(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = theme;
    root.dataset["backdrop"] = backdrop;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f6fb" : "#141515");
  }, [theme, backdrop]);
  useEffect(() => {
    document.documentElement.dataset["motion"] = reduced ? "reduced" : "system";
    return () => {
      delete document.documentElement.dataset["motion"];
    };
  }, [reduced]);
  return (
    <ExperienceContext.Provider
      value={{
        reduced,
        theme,
        backdrop,
        celebrations: preferences.celebrations,
        sound: preferences.sound,
        prepare: () => {
          if (preferences.sound) prepareStudySound();
        },
        play: (kind, intensity) => {
          if (preferences.sound) playStudySound(kind, intensity);
        },
      }}
    >
      {children}
    </ExperienceContext.Provider>
  );
}
export function useExperience() {
  return useContext(ExperienceContext);
}
export function reducedMotionEnabled() {
  return document.documentElement.dataset["motion"] === "reduced" || systemReduced();
}
