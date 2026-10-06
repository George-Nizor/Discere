import { useMemo } from "react";
import { type DiscereIconHue, type DiscereIconName, renderDiscereIcon } from "./discere-icons.js";

/**
 * A Discere icon in the Instrumenta v2 style. Decorative unless `label` is given. Size picks the
 * level of detail (16, 24, or 32 and up), as the brand library does.
 */
export function Icon({
  name,
  size = 24,
  hue,
  label,
  className = "",
}: {
  name: DiscereIconName;
  size?: number;
  hue?: DiscereIconHue;
  label?: string;
  className?: string;
}) {
  const markup = useMemo(
    () => renderDiscereIcon(name, { size, ...(hue ? { hue } : {}), ...(label ? { label } : {}) }),
    [name, size, hue, label],
  );
  return (
    <span
      className={`di-icon ${className}`}
      style={{ width: size, height: size }}
      // The markup is generated from the fixed glyph table above, never from user input.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: generated from a fixed table.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
