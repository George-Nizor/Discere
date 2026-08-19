import { useCallback, useEffect, useRef, useState } from "react";

const SEEN_KEY = "discere:welcomed";
/** Long enough for the mark to draw and the line to land; short enough not to be in the way. */
const HOLD_MS = 1_600;

function alreadyWelcomed(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) !== null;
  } catch {
    // Private modes can refuse storage. A welcome shown twice is better than a crash.
    return false;
  }
}

function remember(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Nothing to do; the overlay has already dismissed itself.
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The opening moment. The hub launches a fresh process each time Discere is opened, so this
 * plays once per launch rather than once ever: the owner asked to be greeted when they arrive,
 * not to be reminded that they have visited before.
 *
 * It is an overlay rather than a route, so a deep link into a lesson is never interrupted by it
 * and the home screen is already rendered and settled underneath when it lifts.
 */
export function WelcomeScreen() {
  const [visible, setVisible] = useState(() => !alreadyWelcomed());
  const [leaving, setLeaving] = useState(false);
  const dismissed = useRef(false);

  const dismiss = useCallback((immediate = false): void => {
    if (dismissed.current) return;
    dismissed.current = true;
    remember();
    if (immediate || prefersReducedMotion()) {
      setVisible(false);
      return;
    }
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 320);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const hold = window.setTimeout(() => dismiss(), prefersReducedMotion() ? 0 : HOLD_MS);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") dismiss(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(hold);
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div className={`welcome${leaving ? " is-leaving" : ""}`}>
      {/*
        A real button rather than a click handler on the backdrop: it takes focus, answers
        Enter and Space without any key handling of our own, and tells a screen reader that
        the moment can be skipped rather than leaving it as an unexplained pause.
      */}
      <button
        aria-label="Skip the welcome"
        className="welcome-skip"
        onClick={() => dismiss(true)}
        type="button"
      />
      <div className="welcome-inner">
        <svg
          aria-hidden="true"
          className="welcome-mark"
          height="72"
          viewBox="0 0 20 20"
          width="72"
        >
          <circle
            className="welcome-mark-ring"
            cx="10"
            cy="10"
            fill="none"
            r="8.25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            className="welcome-mark-bar"
            d="M6.4 10.2h7.2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
        <p className="welcome-wordmark">Discere</p>
        <p className="welcome-line">Learn something real today</p>
      </div>
    </div>
  );
}
