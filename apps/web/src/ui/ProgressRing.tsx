/**
 * A ring that reads as a fraction at a glance and still states the number in words for anyone
 * who cannot see it. The stroke is drawn once on mount so the eye follows it round; after that
 * it is a static figure, because a progress indicator that keeps moving is a spinner.
 */
export function ProgressRing({
  completed,
  total,
  size = 44,
  label,
  caption,
}: {
  completed: number;
  total: number;
  size?: number;
  /** Names what is being counted, e.g. "lessons". Used for the accessible description. */
  label: string;
  /**
   * What to print inside the ring. A bare count reads as a number with no denominator, so a
   * caller either passes something self-describing ("2/6", "40%") or leaves the ring wordless
   * and states the fraction in adjacent text.
   */
  caption?: string;
}) {
  const safeTotal = Math.max(1, total);
  const fraction = Math.max(0, Math.min(1, completed / safeTotal));
  const stroke = size <= 32 ? 3 : 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      className="progress-ring"
      role="img"
      aria-label={`${completed} of ${total} ${label} complete`}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        {fraction > 0 ? (
          <circle
            className="ring-draw"
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke="var(--course-accent, var(--green))"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
            strokeLinecap="round"
            strokeWidth={stroke}
            // Starts at twelve o'clock rather than three, which is where a reader expects zero.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ "--ring-circumference": `${circumference}` } as React.CSSProperties}
          />
        ) : null}
      </svg>
      {caption ? (
        <span aria-hidden="true" className="progress-ring-value">
          {caption}
        </span>
      ) : null}
    </span>
  );
}
