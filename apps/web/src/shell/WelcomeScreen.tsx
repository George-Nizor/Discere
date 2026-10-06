import { useIsFetching } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bonehead, type BoneheadAction } from "../mascot/Bonehead.js";
import { useExperience } from "../study/experience.js";
import { DiscereLogo } from "../ui/DiscereLogo.js";

const SEEN_KEY = "discere:welcomed";
/** The whole little scene: book lands, Bonehead pops out, the name arrives. */
const SCENE_MS = 2_400;
/** Never hold a learner longer than this, however slow the first data is. */
const CAP_MS = 4_500;
const LEAVE_MS = 420;

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
    // Nothing to do; the intro has already dismissed itself.
  }
}

/**
 * Decided once, when the app boots: the intro plays when Discere opens on the home screen and
 * has not greeted the learner this launch. A deep link into a lesson starts the lesson.
 */
const playsThisLaunch =
  typeof window !== "undefined" && window.location.pathname === "/" && !alreadyWelcomed();

/**
 * Shown by the router while its first data loads. While the intro is playing it sits on top, so
 * this draws nothing rather than a second copy of the artwork that would restart underneath.
 */
export function OpeningScreen() {
  if (playsThisLaunch) return null;
  return (
    <div className="loading-screen" role="status">
      <p>Opening Discere…</p>
    </div>
  );
}

/**
 * The opening moment: the blue book lands, Bonehead pops up out of it, and the name arrives.
 *
 * It is mounted above the router, so it is on screen, fully opaque, from the very first frame and
 * stays the same element while the app loads underneath. It lifts once, when the scene has played
 * and the first data has arrived (or after a cap), revealing a home screen that is already
 * settled. Before, the welcome was mounted inside the shell and faded in from nothing, so the home
 * screen showed through for a moment, then the intro, then home again.
 *
 * Plays once per launch: the hub starts a fresh process each time Discere is opened, and the owner
 * asked to be greeted on arrival rather than reminded of earlier visits. A click, Enter, Space or
 * Escape skips it.
 */
export function WelcomeScreen() {
  const { reduced } = useExperience();
  const [visible, setVisible] = useState(playsThisLaunch);
  const [leaving, setLeaving] = useState(false);
  const [sceneDone, setSceneDone] = useState(false);
  const [action, setAction] = useState<{ name: BoneheadAction; key: number } | null>(null);
  const fetching = useIsFetching();
  const dismissed = useRef(false);
  const timers = useRef<number[]>([]);

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
      timers.current.push(window.setTimeout(() => setVisible(false), LEAVE_MS));
    },
    [reduced],
  );

  // The scene's own clock, and Bonehead's little celebration once he is out of the book.
  useEffect(() => {
    if (!visible) return undefined;
    const at = (ms: number, run: () => void) => timers.current.push(window.setTimeout(run, ms));
    if (reduced) at(900, () => setSceneDone(true));
    else {
      at(1_250, () => setAction({ name: "celebrate", key: 1 }));
      at(SCENE_MS, () => setSceneDone(true));
    }
    at(CAP_MS, () => dismiss());
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") dismiss(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, reduced, dismiss]);

  // Lift only when the scene has played and the home screen's data is in.
  useEffect(() => {
    if (sceneDone && fetching === 0) dismiss();
  }, [sceneDone, fetching, dismiss]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  if (!visible) return null;
  return (
    <div className={`intro${leaving ? " is-leaving" : ""}`} data-intro>
      {/*
        A real button rather than a click handler on the backdrop: it takes focus, answers
        Enter and Space without any key handling of our own, and tells a screen reader that
        the moment can be skipped rather than leaving it as an unexplained pause.
      */}
      <button
        aria-label="Skip the welcome"
        className="intro-skip"
        onClick={() => dismiss(true)}
        type="button"
      />
      <div className="intro-scene" aria-hidden="true">
        <div className="intro-stage">
          <div className="intro-glow" />
          <div className="intro-pop">
            <div className="intro-pet">
              <Bonehead expression="delighted" glow live action={action} size={132} />
            </div>
          </div>
          <span className="intro-spark intro-spark--a">✦</span>
          <span className="intro-spark intro-spark--b">✦</span>
          <span className="intro-spark intro-spark--c">✦</span>
          <div className="intro-book">
            <DiscereLogo size={128} />
          </div>
          <div className="intro-shadow" />
        </div>
        <p className="intro-wordmark">Discere</p>
        <p className="intro-line">Learn something real today</p>
      </div>
      <p className="sr-only" role="status">
        Opening Discere…
      </p>
    </div>
  );
}
