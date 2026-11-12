import type {
  EssayAssessmentResponse,
  EssayCriterionVerdict,
  TutoringMode,
} from "@discere/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, errorMessage } from "../../api/client.js";
import { getEssayAssessment, requestEssayAssessment } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queries.js";
import { CopyButton } from "../../ui/CopyButton.js";
import { Notice } from "../../ui/Feedback.js";

async function loadAssessment(essayId: string): Promise<EssayAssessmentResponse | null> {
  try {
    return await getEssayAssessment(essayId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

const RESULT_LABELS: Record<EssayCriterionVerdict, string> = {
  met: "Met",
  partly_met: "Partly met",
  not_met: "Not met",
};

/**
 * What the tutor said about one version. The per-criterion list is absent on assessments stored
 * before it existed, and the summary stands alone then.
 */
export function AssessmentBody({ assessment }: { assessment: EssayAssessmentResponse }) {
  const detail = assessment.assessment;
  if (!detail) return null;
  return (
    <div className="assessment-body">
      <p>{detail.summary}</p>
      {detail.criteria && detail.criteria.length > 0 ? (
        <div>
          <h3 className="panel-subhead">Result for each criterion</h3>
          <ul className="criteria-results">
            {detail.criteria.map((entry) => (
              <li data-result={entry.result} key={entry.criterion}>
                <span className="criterion-text">{entry.criterion}</span>
                <span className="criterion-result">{RESULT_LABELS[entry.result]}</span>
                <span className="criterion-evidence">{entry.evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {detail.firstMeaningfulError ? (
        <p>
          <strong>First thing to fix.</strong> {detail.firstMeaningfulError}
        </p>
      ) : null}
      <p>
        <strong>Next step.</strong> {detail.nextStep}
      </p>
      {detail.uncertainty.length > 0 ? (
        <div>
          <h3 className="panel-subhead">The tutor wasn’t sure about</h3>
          <ul className="plain-list">
            {detail.uncertainty.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {assessment.issues.length > 0 ? (
        <div>
          <h3 className="panel-subhead">Worth checking</h3>
          <ul className="plain-list">
            {assessment.issues.map((issue) => (
              <li key={`${issue.field}-${issue.code}`}>
                {issue.severity === "hard" ? "Blocking" : "Note"}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Requests, polls, and renders the provider-neutral assessment of submitted writing. With
 * `unavailableReason` the tutor cannot answer, so the panel says so and asks for nothing.
 */
export function AssessmentPanel({
  essayId,
  mode,
  unavailableReason,
  onPendingChange,
}: {
  essayId: string;
  mode: TutoringMode;
  unavailableReason?: string;
  /** Told while the tutor is reading, so the page can hold back Revise until it has answered. */
  onPendingChange?: (pending: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const assessment = useQuery({
    queryKey: queryKeys.essayAssessment(essayId),
    queryFn: () => loadAssessment(essayId),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 2000 : false),
    retry: false,
  });

  async function ask(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      await requestEssayAssessment(essayId, mode);
      setRequested(true);
      await assessment.refetch();
    } catch (error) {
      setFailure(errorMessage(error, "The assessment could not be requested."));
    } finally {
      setBusy(false);
    }
  }

  const current = assessment.data ?? null;
  const status = current?.status;
  useEffect(() => {
    onPendingChange?.(status === "pending");
    // A failure may mean the tutor's sign-in has expired, which the server now reports up front.
    if (status === "failed")
      void queryClient.invalidateQueries({ queryKey: queryKeys.capabilities });
  }, [status, onPendingChange, queryClient]);

  return (
    <section aria-label="Assessment" className="assessment">
      <h2>
        {current && current.version > 1 ? `Assessment of version ${current.version}` : "Assessment"}
      </h2>
      {unavailableReason !== undefined && current?.status !== "ready" ? (
        <Notice tone="info" title="The tutor is not available">
          <p>
            {unavailableReason} Your writing is saved. Read it against each line under “What a
            strong answer does” and note which ones it meets.
          </p>
        </Notice>
      ) : null}

      {!current && unavailableReason === undefined ? (
        <p className="muted">
          The tutor can read what you submitted against the list above and say what to change.
        </p>
      ) : null}

      {unavailableReason === undefined && (current === null || current.status === "failed") ? (
        <button
          aria-busy={busy}
          className="button button-secondary"
          onClick={() => void ask()}
          type="button"
        >
          {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
          {current === null ? "Ask for an assessment" : "Try the assessment again"}
        </button>
      ) : null}

      {current?.status === "pending" ? (
        <Notice live tone="info" title="The tutor is reading your writing">
          <p>
            This runs on your machine and can take up to two minutes. The page updates by itself.
          </p>
        </Notice>
      ) : null}

      {current?.status === "ready" ? (
        <>
          {current.accepted ? null : (
            <Notice tone="warning" title="Provisional">
              <p>This assessment did not pass every accountability check. Read it with care.</p>
            </Notice>
          )}
          <AssessmentBody assessment={current} />
        </>
      ) : null}

      {current?.status === "failed" ? (
        <Notice tone="error" title="The assessment did not complete">
          <p>
            {current.error?.message ?? "The provider gave no reason."} Your writing is saved.{" "}
            {unavailableReason === undefined
              ? "You can try again, or check it yourself against the list under “What a strong answer does”."
              : "Check it yourself against the list under “What a strong answer does”."}
          </p>
        </Notice>
      ) : null}

      {current?.status === "packet_required" ? (
        <div className="packet">
          <Notice tone="info" title="This provider cannot assess in place">
            <p>
              {current.error?.message ?? "Copy the packet into ChatGPT to read the assessment."}
            </p>
          </Notice>
          {current.packet ? (
            <>
              <CopyButton label="Copy the assessment packet" text={current.packet.text} />
              <pre className="packet-text">{current.packet.text}</pre>
            </>
          ) : (
            <p className="muted">
              Ask for the assessment again to regenerate the packet; it is not stored between
              requests.
            </p>
          )}
        </div>
      ) : null}

      {requested && !current ? <p className="muted">Waiting for the first status…</p> : null}

      {failure ? (
        <Notice live tone="error" title="The request failed">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </section>
  );
}
