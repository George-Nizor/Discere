import { Link } from "react-router";
import { paths } from "../lib/paths.js";

export function NotFoundScreen() {
  return (
    <main className="page page-centred" id="stage">
      <h1>Nothing here</h1>
      <Link className="button button-primary" to={paths.home}>
        Go to home
      </Link>
    </main>
  );
}
