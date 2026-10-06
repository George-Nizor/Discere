import { useEffect, useState } from "react";
import { useExperience } from "./experience.js";
export function useCountUp(value: number, animate: boolean): number {
  const { reduced, celebrations } = useExperience();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!animate || reduced || !celebrations) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const fraction = Math.min(1, (now - start) / 520);
      setShown(Math.round(value * (1 - (1 - fraction) ** 3)));
      if (fraction < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value, animate, reduced, celebrations]);
  return !animate || reduced || !celebrations ? value : shown;
}
