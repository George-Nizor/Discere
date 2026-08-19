import { blendVisualParams, type VisualState } from "@discere/contracts";
import { useEffect, useRef, useState } from "react";

/** Long enough to be followed, short enough not to hold up the lesson. */
const TRANSITION_MS = 480;

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function easeOutCubic(fraction: number): number {
  return 1 - (1 - fraction) ** 3;
}

/**
 * Moves a diagram from whichever state it was showing to the one the current step names.
 *
 * The frames in between are presentation, not content: every one is a straight-line blend of two
 * authored, reviewed configurations, and the diagram settles exactly on the target. Watching a
 * resistance climb is what teaches that the current falls; cutting between two pictures leaves
 * the learner to infer the change happened at all.
 *
 * Reduced motion cuts straight to the target, which loses nothing but the transition.
 */
export function useVisualState(
  states: readonly VisualState[],
  activeStateId: string,
): { params: Record<string, number>; caption: string } {
  const target =
    states.find((state) => state.id === activeStateId) ?? states[0] ?? undefined;
  const targetParams = target?.params ?? {};

  const [params, setParams] = useState<Record<string, number>>(targetParams);
  // Where the current animation started, so a change mid-flight blends from what is on screen
  // rather than snapping back to the previous state first.
  const from = useRef<Record<string, number>>(targetParams);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!target) return undefined;
    if (prefersReducedMotion()) {
      from.current = target.params;
      setParams(target.params);
      return undefined;
    }

    const start = performance.now();
    const origin = from.current;
    const step = (now: number): void => {
      const fraction = Math.min(1, (now - start) / TRANSITION_MS);
      const blended = blendVisualParams(origin, target.params, easeOutCubic(fraction));
      setParams(blended);
      if (fraction < 1) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      // Land exactly on the authored values rather than on a rounding of them.
      from.current = target.params;
      setParams(target.params);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);

  return { params, caption: target?.caption ?? "" };
}
