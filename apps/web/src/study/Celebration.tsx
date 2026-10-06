import { useEffect, useState, type CSSProperties } from "react";
import { useExperience } from "./experience.js";

const seen = new Set<string>();
const storageKey = "discere:celebrations:v1";
function claim(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    const keys = Array.isArray(stored)
      ? stored.filter((item): item is string => typeof item === "string")
      : [];
    if (keys.includes(key)) return false;
    localStorage.setItem(storageKey, JSON.stringify([...keys.slice(-199), key]));
  } catch {
    /* The in-memory set still prevents duplicates in this visit. */
  }
  return true;
}

/** Only a newly earned result can animate. Reloads and revisits show the same static award. */
export function Celebration({
  eventKey,
  fresh,
  onCelebrate,
}: {
  eventKey: string;
  fresh: boolean;
  onCelebrate?: () => void;
}) {
  const { reduced, celebrations, play } = useExperience();
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (!fresh || !claim(eventKey)) return;
    setAnimate(!reduced && celebrations);
    onCelebrate?.();
    play("complete");
    // Claiming is deliberately not undone during StrictMode's effect cleanup.
  }, [eventKey, fresh]); // Preferences affect this event at the moment it is earned.
  useEffect(() => {
    if (!animate) return;
    const timer = window.setTimeout(() => setAnimate(false), 1_000);
    return () => window.clearTimeout(timer);
  }, [animate]);
  const animated = animate && !reduced && celebrations;
  return (
    <div aria-hidden="true" className={`lesson-award${animated ? " is-celebrating" : ""}`}>
      {animated ? (
        <div className="award-particles">
          {Array.from({ length: 14 }, (_, index) => {
            const angle = (index / 14) * Math.PI * 2;
            return (
              <i
                key={`particle:${angle}`}
                style={
                  {
                    "--particle-x": `${Math.cos(angle) * (90 + (index % 3) * 15)}px`,
                    "--particle-y": `${Math.sin(angle) * 80}px`,
                    "--particle-turn": `${index * 37}deg`,
                    "--particle-delay": `${(index % 3) * 35}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      ) : null}
      <svg aria-hidden="true" className="award-medallion" viewBox="0 0 180 180">
        <path
          className="award-ribbon"
          d="M58 113 49 163 76 148 90 166 103 148 130 163 121 113"
          fill="#10131c"
        />
        <circle cx="90" cy="78" r="60" fill="#dcfce7" />
        <circle cx="90" cy="78" r="48" fill="#16a34a" />
        <path
          className="award-check"
          d="m68 78 16 16 30-33"
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
        />
        <path
          d="M35 27h10m-5-5v10M135 126h10m-5-5v10"
          fill="none"
          stroke="#10131c"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
