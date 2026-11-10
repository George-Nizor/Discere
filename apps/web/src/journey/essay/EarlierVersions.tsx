import type { EssayDraftResponse } from "@discere/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "../../api/client.js";
import { getEssayVersion } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queries.js";
import { Notice } from "../../ui/Feedback.js";
import { AssessmentBody } from "./AssessmentPanel.js";

type EarlierVersion = EssayDraftResponse["earlierVersions"][number];

function submittedOn(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "";
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "";
  return `, submitted ${date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}`;
}

function VersionDetail({ essayId, version }: { essayId: string; version: number }) {
  const detail = useQuery({
    queryKey: queryKeys.essayVersion(essayId, version),
    queryFn: () => getEssayVersion(essayId, version),
    // A submitted version never changes.
    staleTime: Number.POSITIVE_INFINITY,
  });
  if (detail.isPending) return <p className="muted">Opening version {version}…</p>;
  if (detail.error || !detail.data) {
    return (
      <Notice tone="error" title={`Version ${version} could not be opened`}>
        <p>{errorMessage(detail.error, "Try opening it again.")}</p>
      </Notice>
    );
  }
  const assessment = detail.data.assessment;
  return (
    <div className="essay-version-detail" id={`essay-version-${version}`}>
      <h3 className="panel-subhead">What you wrote</h3>
      <p className="essay-version-text">{detail.data.content}</p>
      <h3 className="panel-subhead">Feedback on version {version}</h3>
      {assessment?.status === "ready" ? (
        <AssessmentBody assessment={assessment} />
      ) : (
        <p className="muted">
          {assessment?.status === "failed"
            ? "The assessment of this version did not complete."
            : "This version was not assessed."}
        </p>
      )}
    </div>
  );
}

/**
 * The versions submitted before the current one, each with the feedback it received. They are
 * read-only. While the learner revises, the latest one starts open, because its feedback is what
 * the revision answers.
 */
export function EarlierVersions({
  essayId,
  versions,
  openLatest,
}: {
  essayId: string;
  versions: readonly EarlierVersion[];
  openLatest: boolean;
}) {
  const latest = versions.at(-1)?.version ?? null;
  const [open, setOpen] = useState<number | null>(openLatest ? latest : null);
  if (versions.length === 0) return null;
  return (
    <section aria-label="Earlier versions" className="essay-versions">
      <h2>Earlier versions</h2>
      <ul className="essay-version-list">
        {versions.map((entry) => {
          const shown = open === entry.version;
          return (
            <li key={entry.version}>
              <div className="essay-version-row">
                <span>
                  Version {entry.version}
                  {submittedOn(entry.submittedAt)}. {entry.wordCount}{" "}
                  {entry.wordCount === 1 ? "word" : "words"},{" "}
                  {entry.assessed ? "assessed" : "not assessed"}.
                </span>
                <button
                  aria-controls={`essay-version-${entry.version}`}
                  aria-expanded={shown}
                  className="button button-quiet"
                  onClick={() => setOpen(shown ? null : entry.version)}
                  type="button"
                >
                  {shown ? `Close version ${entry.version}` : `Open version ${entry.version}`}
                </button>
              </div>
              {shown ? <VersionDetail essayId={essayId} version={entry.version} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
