/**
 * Moves keyboard focus to the start of `container`: its first `h1`, or the container itself when
 * it has no heading. Either is made programmatically focusable (tabIndex -1), so it never joins
 * the Tab order. The page is not scrolled; each screen manages its own scroll position.
 */
export function focusHeadingIn(container: HTMLElement): boolean {
  const target = container.querySelector<HTMLElement>("h1") ?? container;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  return document.activeElement === target;
}

/**
 * Moves focus to the start of the screen in `main#stage`. Returns false while the screen is
 * still a loading placeholder, or when there is no stage at all.
 */
export function focusStageHeading(): boolean {
  const stage = document.getElementById("stage");
  if (!stage || stage.dataset["loading"] === "true") return false;
  return focusHeadingIn(stage);
}

/** Whether focus already sits somewhere on the current screen. */
export function focusIsInsideStage(): boolean {
  const active = document.activeElement;
  if (!active || active === document.body) return false;
  return document.getElementById("stage")?.contains(active) ?? false;
}
