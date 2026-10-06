import type { CSSProperties } from "react";

/** A circular progress ring with the level number at its centre. */
export function LevelRing({
  level,
  fraction,
  size = 44,
  stroke = 4,
  label = true,
}: {
  level: number;
  fraction: number;
  size?: number;
  stroke?: number;
  label?: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span
      className="level-ring"
      style={{ "--ring-size": `${size}px` } as CSSProperties}
      aria-label={label ? `Level ${level}, ${Math.round(fraction * 100)}% to the next` : undefined}
      role={label ? "img" : undefined}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={`level-ring-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#add3ff" />
            <stop offset="0.55" stopColor="#5e9efd" />
            <stop offset="1" stopColor="#7c6ff4" />
          </linearGradient>
        </defs>
        <circle
          className="level-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="level-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          stroke={`url(#level-ring-${size})`}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, fraction)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="level-ring-number" aria-hidden="true">
        {level}
      </span>
    </span>
  );
}
