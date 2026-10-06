import { useCallback, useEffect, useRef, useState } from "react";
import { DiscereLogo } from "../ui/DiscereLogo.js";
import { useExperience } from "../study/experience.js";

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

/** When the opening mark first appeared, if the app was still loading at the time. */
let shownSince: number | null = null;

/**
 * Shown while the app's first data loads. It is the welcome's own artwork, so a learner sees
 * one opening moment that continues into the welcome, not a spinner followed by a splash. Once
 * the learner has been welcomed this launch, it is the ordinary loading line.
 */
export function OpeningScreen() {
  const first = !alreadyWelcomed();
  useEffect(() => {
    if (first && shownSince === null) shownSince = Date.now();
  }, [first]);
  if (!first) {
    return (
      <div className="loading-screen" role="status">
        <p>Opening Discere…</p>
      </div>
    );
  }
  return (
    <div className="welcome" role="status">
      <div className="welcome-inner">
        <DiscereLogo className="welcome-mark" size={104} />
        <p className="welcome-wordmark">Discere</p>
        <p className="welcome-line">Learn something real today</p>
        <p className="sr-only">Opening Discere…</p>
      </div>
    </div>
  );
}

function remember(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Nothing to do; the overlay has already dismissed itself.
  }
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
  const { reduced } = useExperience();
  const [visible, setVisible] = useState(() => !alreadyWelcomed());
  const [leaving, setLeaving] = useState(false);
  const dismissed = useRef(false);
  const leavingTimer = useRef<number | undefined>(undefined);

  const dismiss = useCallback(
    (immediate = false): void => {
      if (dismissed.current) return;
      dismissed.current = true;
      remember();
      if (immediate || reduced) {
        setVisible(false);
        return;
      }
      setLeaving(true);
      leavingTimer.current = window.setTimeout(() => setVisible(false), 320);
    },
    [reduced],
  );

  useEffect(() => {
    if (!visible) return undefined;
    // Time already spent on the opening screen counts towards the hold.
    const elapsed = shownSince === null ? 0 : Date.now() - shownSince;
    const hold = window.setTimeout(() => dismiss(), reduced ? 0 : Math.max(400, HOLD_MS - elapsed));
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") dismiss(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(hold);
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, dismiss, reduced]);
  useEffect(() => () => window.clearTimeout(leavingTimer.current), []);

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
        <DiscereLogo className="welcome-mark" size={104} />
        <p className="welcome-wordmark">Discere</p>
        <p className="welcome-line">Learn something real today</p>
      </div>
    </div>
  );
}
