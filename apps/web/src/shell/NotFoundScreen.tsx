import { Link } from "react-router";
import { paths } from "../lib/paths.js";

export function NotFoundScreen() {
  return (
    <main className="page" id="stage">
      <p className="eyebrow">Nothing here</p>
      <h1>That address is not part of Discere</h1>
      <p className="deck page-deck">The link may be from an older version of the prototype.</p>
      <Link className="button button-primary" to={paths.home}>
        Go to home
      </Link>
    </main>
  );
}
