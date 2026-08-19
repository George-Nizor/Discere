import { Outlet, useLocation } from "react-router";
import { NavRail } from "./NavRail.js";
import { WelcomeScreen } from "./WelcomeScreen.js";

export function AppShell() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#stage">
        Skip to the main content
      </a>
      {/* Only over the home screen: arriving straight at a lesson should start the lesson. */}
      {location.pathname === "/" ? <WelcomeScreen /> : null}
      <NavRail />
      <div className="app-body">
        <Outlet />
      </div>
    </div>
  );
}
