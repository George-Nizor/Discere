import { BookOpen, Flame, House, Layers, Settings, UserRound } from "../brand/icon-set.js";
import { NavLink } from "react-router";
import { useHome, useStudy } from "../api/queries.js";
import { HudXp } from "../game/HudXp.js";
import { LeagueGem } from "../game/LeagueCard.js";
import { paths } from "../lib/paths.js";
import { DiscereLogo } from "../ui/DiscereLogo.js";

const destinations = [
  { to: paths.home, label: "Home", icon: House, end: true },
  { to: paths.courses, label: "Courses", icon: BookOpen, end: false },
  { to: paths.you, label: "You", icon: UserRound, end: false },
];
export function NavRail() {
  const home = useHome();
  const study = useStudy();
  const league = study.data?.league;
  const lit = Boolean(study.data?.streak.activeToday);
  const freezes = study.data?.inventory?.streakFreezes ?? 0;
  const statsMissing = (!home.data && home.isError) || (!study.data && study.isError);
  return (
    <nav aria-label="Discere" className="nav-rail site-nav">
      <NavLink
        aria-label="Discere home"
        className="nav-rail-mark"
        end
        to={paths.home}
        viewTransition
      >
        <DiscereLogo size={34} />
        <span>Discere</span>
      </NavLink>
      <ul className="nav-rail-list">
        {destinations.map((destination) => (
          <li key={destination.to}>
            <NavLink
              aria-label={destination.label}
              className="nav-rail-link"
              end={destination.end}
              to={destination.to}
              viewTransition
            >
              {({ isActive }) => (
                <>
                  <destination.icon aria-hidden="true" size={24} />
                  <span className="nav-rail-tip">{destination.label}</span>
                  {isActive ? <span className="nav-active-marker" aria-hidden="true" /> : null}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="site-nav-stats">
        {home.data?.learnerName ? (
          <span className="sr-only">Signed in locally as {home.data.learnerName}</span>
        ) : null}
        {/* Never a zero standing in for a number that did not load. */}
        {statsMissing ? (
          <span className="site-stat-pill site-stats-missing" title="Progress unavailable">
            <span aria-hidden="true">–</span>
            <span className="sr-only">Your streak and XP are unavailable right now.</span>
          </span>
        ) : null}
        {home.data ? (
          <NavLink
            className={`site-stat-pill site-streak${lit ? " is-lit" : ""}`}
            to={paths.home}
            aria-label={`${home.data.streakDays} day study streak${lit ? ", today counts" : ", not yet today"}${
              freezes ? `, ${freezes} streak ${freezes === 1 ? "freeze" : "freezes"} held` : ""
            }. Open Home`}
          >
            <Flame aria-hidden="true" size={24} />
            <span aria-hidden="true">{home.data.streakDays}</span>
            <span className="stat-tip" aria-hidden="true">
              Study streak{lit ? " · today counts" : " · study today to keep it"}
            </span>
          </NavLink>
        ) : null}
        {league && !study.data?.firstRun ? (
          <NavLink
            className="site-stat-pill site-league"
            to={`${paths.you}#league`}
            aria-label={`${league.tier.name} league, ${league.weekXp} XP this week. Open your league`}
          >
            <LeagueGem tier={league.tier.id} size={22} />
            <span aria-hidden="true">{league.weekXp}</span>
            <span className="stat-tip" aria-hidden="true">
              {league.tier.name} league · XP this week
            </span>
          </NavLink>
        ) : null}
        {study.data ? <HudXp /> : null}
        <NavLink
          aria-label="Review"
          title="Review"
          className="site-review"
          to={paths.review}
          viewTransition
        >
          <Layers aria-hidden="true" size={26} />
          {(home.data?.dueReviews ?? 0) > 0 ? (
            <span className="site-review-count" aria-hidden="true">
              {home.data?.dueReviews}
            </span>
          ) : null}
        </NavLink>
        <NavLink
          aria-label="Settings"
          title="Settings"
          className="site-settings"
          to={paths.settings}
        >
          <Settings aria-hidden="true" size={24} />
        </NavLink>
      </div>
    </nav>
  );
}
