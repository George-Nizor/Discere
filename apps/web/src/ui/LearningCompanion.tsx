import { Bonehead, type BoneheadExpression } from "../mascot/Bonehead.js";

/**
 * The companion wherever the interface shows one: Bonehead, the Bonehead Labs bone. Size comes
 * from the caller's CSS class, as it did for the earlier companion.
 */
export function LearningCompanion({
  className = "",
  expression = "idle",
  glow = false,
}: {
  className?: string;
  expression?: BoneheadExpression;
  glow?: boolean;
}) {
  return (
    <Bonehead
      className={`learning-companion ${className}`}
      expression={expression}
      glow={glow}
      live
      quiet
      size="100%"
    />
  );
}
