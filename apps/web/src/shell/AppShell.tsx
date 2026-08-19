import { Outlet } from "react-router";
import { NavRail } from "./NavRail.js";

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#stage">
        Skip to the main content
      </a>
      <NavRail />
      <div className="app-body">
        <Outlet />
      </div>
    </div>
  );
}
