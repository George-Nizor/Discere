import { BookOpen, ChartNoAxesColumn, House, Layers, Settings } from "lucide-react";
import { NavLink } from "react-router";
import { useHome } from "../api/queries.js";
import { initialsOf } from "../lib/format.js";
import { paths } from "../lib/paths.js";

const DESTINATIONS = [
  { to: paths.home, label: "Home", icon: House, end: true },
  { to: paths.courses, label: "Courses", icon: BookOpen, end: false },
  { to: paths.review, label: "Review", icon: Layers, end: false },
  { to: paths.progress, label: "Progress", icon: ChartNoAxesColumn, end: false },
  { to: paths.settings, label: "Settings", icon: Settings, end: false },
];

/**
 * The single navigation surface. Icons carry accessible names and a hover label; the rail
 * never expands, so the learning stage keeps the width.
 */
export function NavRail() {
  const home = useHome();
  const learnerName = home.data?.learnerName ?? null;

  return (
    <nav aria-label="Discere" className="nav-rail">
      <NavLink aria-label="Discere home" className="nav-rail-mark" end to={paths.home}>
        <svg aria-hidden="true" height="20" viewBox="0 0 20 20" width="20">
          <title>Discere</title>
          <circle cx="10" cy="10" fill="none" r="8.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6.4 10.2h7.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        </svg>
      </NavLink>
      <ul className="nav-rail-list">
        {DESTINATIONS.map((destination) => (
          <li key={destination.to}>
            <NavLink
              aria-label={destination.label}
              className="nav-rail-link"
              end={destination.end}
              to={destination.to}
            >
              <destination.icon aria-hidden="true" size={20} strokeWidth={1.6} />
              <span className="nav-rail-tip">{destination.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      {learnerName ? (
        <p className="nav-rail-learner" title={learnerName}>
          <span aria-hidden="true">{initialsOf(learnerName)}</span>
          <span className="sr-only">Signed in locally as {learnerName}</span>
        </p>
      ) : null}
    </nav>
  );
}
