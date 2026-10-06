import { useEffect } from "react";

/** Tints the aurora with a course's accent while its pages are open. */
export function useAmbientAccent(accent: string | undefined) {
  useEffect(() => {
    if (!accent || !/^#[0-9a-f]{6}$/i.test(accent)) return;
    const root = document.documentElement;
    root.style.setProperty("--ambient-accent", accent);
    return () => {
      root.style.removeProperty("--ambient-accent");
    };
  }, [accent]);
}
