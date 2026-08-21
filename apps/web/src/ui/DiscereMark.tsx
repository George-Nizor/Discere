/** The approved Discere mark, shared by navigation, welcome, and favicon surfaces. */
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
    <img
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      className={className}
      height={size}
      src="/discere-mark.png"
      width={size}
    />
  );
}