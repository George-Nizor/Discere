import { Bonehead } from "../mascot/Bonehead.js";

/**
 * The face of the app in navigation and other small places: Bonehead, the companion. The
 * Discere book logo appears on the title card only (`DiscereLogo`).
 */
export function DiscereMark({
  size = 24,
  className,
  title,
}: {
  size?: number;
  className?: string;
  /** Supply only where the mark is the sole label; otherwise it stays decorative. */
  title?: string;
}) {
  return (
    <Bonehead
      mark={size <= 48}
      size={size}
      quiet
      {...(className ? { className } : {})}
      {...(title ? { title } : {})}
    />
  );
}
