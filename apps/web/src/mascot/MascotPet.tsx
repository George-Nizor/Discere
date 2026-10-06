import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { updateStudyPreferences } from "../api/endpoints.js";
import { queryKeys, useStudyPreferences } from "../api/queries.js";
import { cacheExperience, useExperience } from "../study/experience.js";
import { Bonehead, type BoneheadAction, type BoneheadExpression, type BoneheadProp } from "./Bonehead.js";
import { onMascot } from "./bus.js";
import { toFractions, usePetPosition } from "./pet-position.js";

/** Long enough that a learner reading a passage is not sent to sleep mid-paragraph. */
const SLEEP_AFTER_MS = 60_000;

const LINES = {
  pet: ["Hello.", "Oh, hello.", "Hm?", "Still here."],
  lots: ["All right, all right.", "That tickles."],
  wake: ["Oh, I'm here.", "Back again."],
  wrong: ["Not quite. Try another way in.", "Close. Look again.", "Mistakes are how this sticks."],
  combo: ["That's a run.", "Keep it going.", "On a roll."],
  levelup: ["New level.", "Level up."],
  chest: ["Ooh, a chest."],
  finish: ["Lesson done.", "Nicely done."],
};
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;

/**
 * Bonehead, docked in the corner. It reacts to what the learner does (answers, a level, a chest,
 * read-aloud), watches the pointer, dozes when nothing happens and wakes on the next input. It
 * never awards anything and speaks only at moments worth a word. Hidden from Settings or its own
 * close button.
 */
export function MascotPet({ inLesson }: { inLesson: boolean }) {
  const preferences = useStudyPreferences();
  const queryClient = useQueryClient();
  const { reduced } = useExperience();
  const [expression, setExpression] = useState<BoneheadExpression>("idle");
  const [glow, setGlow] = useState(false);
  const [listening, setListening] = useState(false);
  const [props, setProps] = useState<BoneheadProp[]>([]);
  const [action, setAction] = useState<{ name: BoneheadAction; key: number } | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [hearts, setHearts] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const lastInput = useRef(Date.now());
  const asleep = useRef(false);
  const clicks = useRef<number[]>([]);
  const answers = useRef(0);
  const { position, save, preview } = usePetPosition();
  const drag = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clear = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };
  const sequence = useCallback((steps: Array<[BoneheadExpression, number]>, end: BoneheadExpression = "idle") => {
    clear();
    let at = 0;
    for (const [state, ms] of steps) {
      later(at, () => setExpression(state));
      at += ms;
    }
    later(at, () => setExpression(end));
  }, []);
  const play = (name: BoneheadAction) => setAction({ name, key: Date.now() });
  const say = (text: string) => {
    setBubble(text);
    later(2400, () => setBubble(null));
  };
  const wake = useCallback(() => {
    lastInput.current = Date.now();
    if (asleep.current) {
      asleep.current = false;
      setExpression("idle");
    }
  }, []);

  useEffect(
    () =>
      onMascot((event) => {
        wake();
        if (event.type === "answer") {
          answers.current += 1;
          if (event.correct) {
            play("celebrate");
            setGlow(true);
            later(2200, () => setGlow(false));
            sequence([
              ["delighted", 1400],
              ["proud", 1500],
            ]);
            if (event.combo === 5 || event.combo === 10 || event.combo === 20) say(pick(LINES.combo));
          } else {
            play("shake");
            setProps((current) => [...new Set([...current, "sweat" as const])]);
            later(1800, () => setProps((current) => current.filter((prop) => prop !== "sweat")));
            sequence([
              ["curious", 450],
              ["encouraging", 2600],
            ]);
            // One in three misses gets a word; every miss would nag.
            if (answers.current % 3 === 1) say(pick(LINES.wrong));
          }
        } else if (event.type === "levelup") {
          play("celebrate");
          setGlow(true);
          setProps((current) => [...new Set([...current, "cap" as const])]);
          later(2400, () => setGlow(false));
          later(8000, () => setProps((current) => current.filter((prop) => prop !== "cap")));
          sequence([
            ["delighted", 1200],
            ["proud", 2600],
          ]);
          say(pick(LINES.levelup));
        } else if (event.type === "chest") {
          play("bob");
          sequence([["delighted", 1800]]);
          say(pick(LINES.chest));
        } else if (event.type === "finish") {
          if (event.stars >= 2) play("celebrate");
          sequence([
            [event.stars >= 2 ? "delighted" : "encouraging", 1600],
            ["proud", 1600],
          ]);
          say(pick(LINES.finish));
        } else if (event.type === "listening") {
          setListening(event.on);
        }
      }),
    [sequence, wake],
  );

  // Watch the pointer, wake on any input, and doze after a long quiet spell.
  useEffect(() => {
    let frame = 0;
    let target = { x: 0, y: 0 };
    const onMove = (event: PointerEvent) => {
      wake();
      const rect = button.current?.getBoundingClientRect();
      if (!rect || reduced) return;
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height * 0.42);
      const distance = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, distance / 260);
      target = { x: (dx / distance) * k, y: (dy / distance) * k };
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          setLook(target);
        });
    };
    const onKey = () => wake();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    const idle = window.setInterval(() => {
      if (!asleep.current && timers.current.length === 0 && Date.now() - lastInput.current > SLEEP_AFTER_MS) {
        asleep.current = true;
        setExpression("sleepy");
        setLook({ x: 0, y: 0 });
      }
    }, 5_000);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      window.clearInterval(idle);
      cancelAnimationFrame(frame);
    };
  }, [reduced, wake]);

  useEffect(() => () => clear(), []);

  const visible = preferences.data?.companion ?? true;
  const setVisible = async (companion: boolean) => {
    try {
      const next = await updateStudyPreferences({ companion });
      cacheExperience(next);
      queryClient.setQueryData(queryKeys.studyPreferences, next);
    } catch {
      /* The pet keeps its state if the preference cannot be saved; nothing else depends on it. */
    }
  };
  if (!visible)
    return inLesson ? null : (
      <button type="button" className="pet-peek" aria-label="Bring Bonehead back" title="Bring Bonehead back" onClick={() => void setVisible(true)}>
        <Bonehead expression="curious" size={56} quiet />
      </button>
    );

  const pet = () => {
    const now = Date.now();
    const wasAsleep = asleep.current;
    wake();
    clicks.current = clicks.current.filter((at) => now - at < 1600);
    clicks.current.push(now);
    setHearts((count) => count + 1);
    if (clicks.current.length >= 4) {
      clicks.current = [];
      play("celebrate");
      say(pick(LINES.lots));
      sequence([["delighted", 1500]]);
      return;
    }
    play("react");
    say(wasAsleep ? pick(LINES.wake) : pick(LINES.pet));
    sequence([["delighted", 1100]]);
  };

  const hide = () => void setVisible(false);

  // Press and move to carry the pet; a press without movement is still a pat.
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state) return;
    if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 6) return;
    state.moved = true;
    const size = event.currentTarget.offsetWidth;
    preview(toFractions(event.clientX - state.offsetX, event.clientY - state.offsetY, size));
  };
  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved) return;
    suppressClick.current = true;
    const size = event.currentTarget.offsetWidth;
    save(toFractions(event.clientX - state.offsetX, event.clientY - state.offsetY, size));
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.2 : 0.05;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (event.key === "Home") {
      event.preventDefault();
      save(null);
      return;
    }
    if (!move) return;
    event.preventDefault();
    const from = position ?? { fx: 0, fy: 0.5 };
    save({ fx: from.fx + move[0], fy: from.fy + move[1] });
  };
  const placed = position
    ? ({ "--pet-fx": position.fx, "--pet-fy": position.fy } as React.CSSProperties)
    : undefined;
  const onRight = (position?.fx ?? 0) > 0.5;

  return (
    <div
      className={`pet-dock${inLesson ? " is-in-lesson" : ""}${position ? " is-placed" : " is-default"}${onRight ? " is-right" : ""}`}
      style={placed}
    >
      {bubble ? (
        <p className="pet-bubble" role="status">
          {bubble}
        </p>
      ) : null}
      <button
        ref={button}
        type="button"
        className="pet-button"
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          pet();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={onKeyDown}
        aria-label="Bonehead. Click to pet; drag or use the arrow keys to move; Home to reset"
        title="Click to pet · drag to move"
      >
        <Bonehead
          expression={expression}
          glow={glow}
          listening={listening}
          props={props}
          action={action}
          look={look}
          live
          size="100%"
        />
        {hearts > 0 ? (
          <span className="pet-hearts" key={hearts} aria-hidden="true">
            <i>♥</i>
            <i>♥</i>
            <i>♥</i>
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="pet-hide"
        aria-label="Hide Bonehead"
        title="Hide Bonehead (click the corner to bring him back)"
        onClick={hide}
      >
        <X size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
