import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Browser speech synthesis, shared by every surface that reads text to the learner.
 *
 * The control is rendered only where speech is actually available, so no learner is offered a
 * button that does nothing. Speaking stops when the surface goes away: navigating between
 * stages must not leave a voice reading a screen nobody is looking at.
 */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useReadAloud(text: string): {
  supported: boolean;
  speaking: boolean;
  toggle: () => void;
} {
  const [speaking, setSpeaking] = useState(false);
  const supported = canSpeak();

  // Unmounting, or moving to a different passage, abandons whatever is being read. `text` is
  // listed because a new passage is a new reading, not a continuation of the previous one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cleanup depends on the passage.
  useEffect(() => {
    if (!supported) return;
    return () => {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [supported, text]);

  function toggle(): void {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.addEventListener("end", () => setSpeaking(false));
    utterance.addEventListener("error", () => setSpeaking(false));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

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
    <button className={className} onClick={toggle} type="button">
      <Volume2 aria-hidden="true" size={16} strokeWidth={1.8} />
      {speaking ? "Stop reading" : label}
    </button>
  );
}
