import { Outlet, useLocation } from "react-router";
import { isRomanReferencePath, RomanReferenceNav } from "../recovery/RomanReference.js";
import { NavRail } from "./NavRail.js";
import { WelcomeScreen } from "./WelcomeScreen.js";

export function AppShell() {
  const location = useLocation();
  const isReference = isRomanReferencePath(location.pathname);
  return (
    <div className={isReference ? "app-shell app-shell--recovery" : "app-shell"}>
      <a className="skip-link" href="#stage">
        Skip to the main content
      </a>
      {/* Only over the home screen: arriving straight at a lesson should start the lesson. */}
      {location.pathname === "/" ? <WelcomeScreen /> : null}
      {isReference ? <RomanReferenceNav /> : <NavRail />}
      <div className="app-body">
        <Outlet />
      </div>
    </div>
  );
}
