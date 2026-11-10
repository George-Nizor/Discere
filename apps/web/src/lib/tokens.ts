/**
 * The current value of a colour token as a six-digit hex, for places that must hand a plain
 * colour on (the tutor's illustration requests accept `#rrggbb` only). Falls back to the dark
 * theme's value when the token is missing or is not a plain hex, as in a test environment.
 */
export function colourToken(name: `--${string}`, fallback: string): string {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

/** The interface accent, used where a course has no accent of its own. */
export function defaultAccent(): string {
  return colourToken("--accent", "#5e9efd");
}
