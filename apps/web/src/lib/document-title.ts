import { useEffect } from "react";
import { useLocation } from "react-router";

/** The browser tab's title for a screen: "Discere: Settings", or plain "Discere". */
export function documentTitle(screen: string | null | undefined): string {
  const name = screen?.trim();
  return name ? `Discere: ${name}` : "Discere";
}

/**
 * Names the screen in the browser tab and in the history list, and gives a screen reader the
 * new page's name. The shell resets the title on every route change, so the path is a
 * dependency here: a screen that stays mounted across routes (one lesson stage to the next)
 * sets its title again.
 */
export function useDocumentTitle(screen: string | null | undefined): void {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = documentTitle(screen);
  }, [screen, pathname]);
}
