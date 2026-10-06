import type { PointerEvent } from "react";
import { reducedMotionEnabled } from "../study/experience.js";

/** Pointer handlers that lean an element toward the cursor and move its glare. */
export const tiltHandlers = {
  onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || reducedMotionEnabled()) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty("--tilt-x", `${(0.5 - y) * 9}deg`);
    element.style.setProperty("--tilt-y", `${(x - 0.5) * 11}deg`);
    element.style.setProperty("--glare-x", `${x * 100}%`);
    element.style.setProperty("--glare-y", `${y * 100}%`);
  },
  onPointerLeave(event: PointerEvent<HTMLElement>) {
    const element = event.currentTarget;
    element.style.removeProperty("--tilt-x");
    element.style.removeProperty("--tilt-y");
  },
};
