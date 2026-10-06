import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { paths } from "../lib/paths.js";

/** An address that leads nowhere: say so, show it, and offer the ways on. */
export function NotFoundScreen() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const q = query.trim();
    void navigate(q ? `${paths.courses}?q=${encodeURIComponent(q)}` : paths.courses);
  }
  return (
    <main className="page page-centred not-found" id="stage">
      <h1>This page doesn’t exist</h1>
      <p className="not-found-lead">
        Nothing in Discere lives at <code>{pathname}</code>. The link may be old, or a course may
        have moved. Search for what you were looking for, or start from Home.
      </p>
      <form className="not-found-search" onSubmit={search} role="search">
        <label className="sr-only" htmlFor="not-found-search">
          Search courses, lessons and ideas
        </label>
        <input
          id="not-found-search"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search a course, lesson or idea"
          type="search"
          value={query}
        />
        <button className="button button-primary" type="submit">
          <Search aria-hidden="true" size={16} />
          Search
        </button>
      </form>
      <div className="button-row">
        <Link className="button button-quiet" to={paths.home}>
          Go to Home
        </Link>
        <Link className="button button-quiet" to={paths.courses}>
          Browse courses
        </Link>
      </div>
    </main>
  );
}
