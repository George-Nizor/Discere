import { errorMessage } from "../api/client.js";
import { useHome } from "../api/queries.js";
import { formatPercent, humaniseId } from "../lib/format.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";

/**
 * Concept mastery straight from the server. Current success and retained performance are held
 * apart by the concept state, and assisted work is never counted as independent evidence.
 */
export function ProgressScreen() {
  const home = useHome();
  if (home.isPending) return <LoadingScreen message="Loading your progress…" />;
  if (home.error || !home.data) {
    return (
      <ErrorScreen
        message={errorMessage(home.error, "Progress did not load.")}
        title="Progress unavailable"
      />
    );
  }

  const rows = [...home.data.progress].sort((left, right) => right.mastery - left.mastery);

  return (
    <main className="page" id="stage">
      <p className="eyebrow">Progress</p>
      <h1>Concept mastery</h1>
      <p className="deck page-deck">
        {home.data.xp} XP · {home.data.streakDays} {home.data.streakDays === 1 ? "day" : "days"} in
        a row
      </p>

      <table className="mastery-table">
        <caption className="sr-only">Mastery, state and evidence for every concept</caption>
        <thead>
          <tr>
            <th scope="col">Concept</th>
            <th scope="col">State</th>
            <th scope="col">Mastery</th>
            <th scope="col">Independent</th>
            <th scope="col">Assisted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.conceptId}>
              <th scope="row">{humaniseId(row.conceptId)}</th>
              <td>{humaniseId(row.state)}</td>
              <td>
                <span className="mastery-meter">
                  <span
                    className="mastery-meter-fill"
                    style={{ width: `${Math.round(row.mastery * 100)}%` }}
                  />
                </span>
                <span className="mastery-value">{formatPercent(row.mastery)}</span>
              </td>
              <td>{row.independentAttempts}</td>
              <td>{row.assistedAttempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
