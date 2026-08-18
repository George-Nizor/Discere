import type { EssayAssessmentResponse, TutoringMode } from "@discere/contracts";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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

function AssessmentBody({ assessment }: { assessment: EssayAssessmentResponse }) {
  const detail = assessment.assessment;
  if (!detail) return null;
  return (
    <div className="assessment-body">
      <p className="eyebrow">Judgement: {detail.assessment.replaceAll("_", " ")}</p>
      <p>{detail.summary}</p>
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
          <p className="eyebrow">Stated uncertainty</p>
          <ul className="plain-list">
            {detail.uncertainty.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {assessment.issues.length > 0 ? (
        <div>
          <p className="eyebrow">Accountability findings</p>
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

/** Requests, polls, and renders the provider-neutral assessment of a submitted teach-back. */
export function AssessmentPanel({ essayId, mode }: { essayId: string; mode: TutoringMode }) {
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

  return (
    <section aria-label="Assessment" className="assessment">
      <h2>Assessment</h2>
      {!current ? (
        <p className="muted">
          The submitted teach-back can be assessed by the configured tutor provider.
        </p>
      ) : null}

      {current === null || current.status === "failed" ? (
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
        <Notice live tone="info" title="The assessor is reading your teach-back">
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
          <p>{current.error?.message ?? "The provider gave no reason."}</p>
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
