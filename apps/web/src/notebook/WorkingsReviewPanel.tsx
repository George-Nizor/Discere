import type { TutoringMode, WorkingsReviewResponse } from "@discere/contracts";
import { Loader2, ScanEye } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { reviewWorkings } from "../api/endpoints.js";
import { CopyButton } from "../ui/CopyButton.js";
import { Notice } from "../ui/Feedback.js";
import type { NotebookDraft } from "./notebook-page.js";
import { hasWorkings } from "./notebook-page.js";
import { blobToBase64, exportCanvasPng } from "./png-export.js";

const ASSESSMENT_TONE = {
  correct: "correct",
  partly_correct: "info",
  incorrect: "info",
  unclear: "info",
} as const;

const ASSESSMENT_LABEL = {
  correct: "Correct",
  partly_correct: "Partly correct",
  incorrect: "Incorrect",
  unclear: "Could not read the page",
} as const;

/**
 * Sends the exported page to the configured tutor provider and shows what came back, including
 * anything the accountability gate objected to. A review the server did not accept is shown as
 * a rejected review rather than presented as advice.
 */
export function WorkingsReviewPanel({
  lessonId,
  mode,
  draft,
  saved,
  svg,
}: {
  lessonId: string;
  mode: TutoringMode;
  draft: NotebookDraft;
  /** False while the page holds changes the server has not stored. */
  saved: boolean;
  svg: SVGSVGElement | null;
}) {
  const [question, setQuestion] = useState("Check my working and name the first real mistake.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WorkingsReviewResponse | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function send(): Promise<void> {
    setBusy(true);
    setFailure(null);
    setResult(null);
    try {
      const png = await exportCanvasPng(svg);
      const response = await reviewWorkings({
        lessonId,
        reviewQuestion: question.trim(),
        mode,
        image: { filename: `discere-${lessonId}-workings.png`, base64: await blobToBase64(png) },
      });
      setResult(response);
    } catch (error) {
      setFailure(errorMessage(error, "The review could not be produced."));
    } finally {
      setBusy(false);
    }
  }

  if (mode === "exam") {
    return (
      <section aria-labelledby="workings-review-title" className="workings-review">
        <h2 id="workings-review-title">Review my workings</h2>
        <p className="muted">Exam mode keeps the workings review closed for this lesson.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="workings-review-title" className="workings-review">
      <h2 id="workings-review-title">Review my workings</h2>
      <p className="muted">
        The page is exported as an image and read by the tutor on this machine. It is not sent
        anywhere else.
      </p>

      <label className="field">
        <span>What should the tutor look at?</span>
        <input
          maxLength={2000}
          onChange={(event) => setQuestion(event.currentTarget.value)}
          type="text"
          value={question}
        />
      </label>

      <div className="button-row">
        {hasWorkings(draft) && saved && question.trim().length > 1 ? (
          <button
            aria-busy={busy}
            className="button button-primary"
            onClick={() => void send()}
            type="button"
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="spin" size={16} />
            ) : (
              <ScanEye aria-hidden="true" size={16} strokeWidth={1.8} />
            )}
            Review my workings
          </button>
        ) : (
          <p className="muted">
            {hasWorkings(draft)
              ? "Save the page before asking for a review."
              : "Draw or write your working first."}
          </p>
        )}
      </div>

      {result?.status === "packet_required" ? (
        <Notice tone="info" title="This provider cannot look at an image">
          <p>{result.message}</p>
          <p className="muted">
            Export the page as <strong>{result.expectedFilename}</strong> and attach it to the
            pasted request.
          </p>
          <CopyButton label="Copy the review request" text={result.packet.text} />
        </Notice>
      ) : null}

      {result?.status === "answered" ? (
        <div className="workings-result">
          <Notice
            live
            tone={result.accepted ? ASSESSMENT_TONE[result.review.assessment] : "error"}
            title={
              result.accepted
                ? ASSESSMENT_LABEL[result.review.assessment]
                : "This review was not accepted"
            }
          >
            {result.accepted ? (
              <>
                <p>{result.review.feedback}</p>
                {result.review.firstMeaningfulError ? (
                  <p>
                    <strong>First thing to fix:</strong> {result.review.firstMeaningfulError}
                  </p>
                ) : null}
                <p>
                  <strong>Next step:</strong> {result.review.nextStep}
                </p>
              </>
            ) : (
              <p>
                Discere refused this review rather than showing it, because it broke the rules a
                tutor reply must follow.
              </p>
            )}
          </Notice>

          {result.accepted ? (
            <section className="workings-transcription">
              <p className="eyebrow">What the tutor read from your page</p>
              <p>{result.review.transcription || "Nothing legible."}</p>
              <p className="muted">
                Read with {Math.round(result.review.transcriptionConfidence * 100)}% confidence.
                Check it against your own page before trusting the feedback.
              </p>
            </section>
          ) : null}

          {result.review.uncertainty.length > 0 ? (
            <section className="workings-uncertainty">
              <p className="eyebrow">The tutor was unsure about</p>
              <ul>
                {result.review.uncertainty.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.issues.length > 0 ? (
            <section className="workings-issues">
              <p className="eyebrow">Accountability findings</p>
              <ul>
                {result.issues.map((issue) => (
                  <li key={`${issue.field}:${issue.code}`}>
                    <strong>{issue.severity === "hard" ? "Refused" : "Noted"}:</strong>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {failure ? (
        <Notice live tone="error" title="The review could not be produced">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </section>
  );
}
