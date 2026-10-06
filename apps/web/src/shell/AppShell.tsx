import {
  Outlet,
  useLocation,
  useNavigation,
  useNavigationType,
  useViewTransitionState,
} from "react-router";
import { useLayoutEffect, useRef } from "react";
import { AmbientBackdrop } from "../fx/AmbientBackdrop.js";
import { FxLayer } from "../fx/FxLayer.js";
import { GameWatcher } from "../game/GameWatcher.js";
import { MascotPet } from "../mascot/MascotPet.js";
import { useExperience } from "../study/experience.js";
import { isRomanReferencePath, RomanReferenceNav } from "../recovery/RomanReference.js";
import { ArchivedNotice } from "./ArchivedNotice.js";
import { EngineBanner } from "./EngineBanner.js";
import { NavRail } from "./NavRail.js";
import { savedNavigationScroll } from "./navigation.js";

export function AppShell() {
  const location = useLocation();
  const navigation = useNavigation();
  const routeTransition = useViewTransitionState(location.pathname);
  const navigationType = useNavigationType();
  const { reduced } = useExperience();
  const body = useRef<HTMLDivElement>(null);
  const previous = useRef(location.pathname);
  useLayoutEffect(() => {
    let entrance: Animation | undefined;
    if (previous.current !== location.pathname) {
      window.scrollTo?.({
        top: navigationType === "POP" ? savedNavigationScroll(location.key) : 0,
        behavior: "instant",
      });
      if (!reduced && typeof document.startViewTransition !== "function") {
        entrance = body.current?.animate?.(
          [
            { opacity: 0, translate: "0 16px" },
            { opacity: 1, translate: "0 0" },
          ],
          { duration: 440, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
    }
    previous.current = location.pathname;
    return () => entrance?.cancel();
  }, [location.pathname, location.key, navigationType, reduced]);
  const isReference = isRomanReferencePath(location.pathname);
  const lessonPath = location.pathname.match(/^(\/courses\/[^/]+\/lessons\/[^/]+)/)?.[1];
  const recoveredShell = isReference;
  const focusedLesson =
    (Boolean(lessonPath) && !location.pathname.endsWith("/notebook")) ||
    location.pathname.startsWith("/course-checks/") ||
    location.pathname.startsWith("/sql-projects/") ||
    location.pathname.startsWith("/python-projects/");
  return (
    <div
      className={
        recoveredShell
          ? "app-shell app-shell--recovery"
          : "app-shell app-shell--learning" + (focusedLesson ? " app-shell--lesson" : "")
      }
    >
      <AmbientBackdrop intensity={focusedLesson ? 0.55 : 1} />
      <a className="skip-link" href="#stage">
        Skip to the main content
      </a>
      {recoveredShell ? (
        <RomanReferenceNav {...(lessonPath ? { notebookPath: `${lessonPath}/notebook` } : {})} />
      ) : focusedLesson ? null : (
        <NavRail />
      )}
      <div
        className="navigation-progress"
        data-pending={navigation.state !== "idle"}
        aria-hidden="true"
      />
      <EngineBanner />
      <ArchivedNotice />
      <div className="app-body" ref={body} data-route-transition={routeTransition}>
        <Outlet />
      </div>
      <GameWatcher />
      {recoveredShell ||
      location.pathname === "/" ||
      /completion$/.test(decodeURIComponent(location.pathname)) ? null : (
        <MascotPet inLesson={focusedLesson} />
      )}
      <FxLayer />
    </div>
  );
}
