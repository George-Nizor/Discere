import type { NotebookPage, Source, TutoringMode } from "@discere/contracts";
import { useState, type ChangeEvent } from "react";
import {
  createWorkingsReviewPacket,
  importWorkingsReview,
  type WorkingsReviewImportResult,
  type WorkingsReviewPacket,
} from "../api";
import "./WorkingsReview.css";

type BusyState = "prepare" | "validate" | undefined;

export function WorkingsReview({
  page,
  mode,
  sources,
}: {
  page: NotebookPage;
  mode: TutoringMode;
  sources: Source[];
}) {
  const [reviewQuestion, setReviewQuestion] = useState(
    "Check my workings and identify the first important step I should fix.",
  );
  const [packet, setPacket] = useState<WorkingsReviewPacket>();
  const [responseText, setResponseText] = useState("");
  const [validation, setValidation] = useState<WorkingsReviewImportResult>();
  const [busy, setBusy] = useState<BusyState>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasSavedWorkings =
    page.updatedAt !== null && (page.strokes.length > 0 || page.note.trim().length > 0);

  if (mode === "exam") {
    return (
      <section className="workings-review unavailable">
        <p className="eyebrow">Workings review</p>
        <h3>Unavailable during Exam mode</h3>
        <p>Finish or leave the exam before sending the page to an external tutor.</p>
      </section>
    );
  }

  if (!hasSavedWorkings) {
    return (
      <section className="workings-review unavailable">
        <p className="eyebrow">Workings review</p>
        <h3>Save a page before requesting feedback</h3>
        <p>Draw or type your working, select Save workings, then export the PNG for ChatGPT.</p>
      </section>
    );
  }

  async function copyText(text: string, successMessage: string): Promise<void> {
    if (!navigator.clipboard) {
      throw new Error(
        "Clipboard access is unavailable in this browser. Copy the prompt from the preview instead.",
      );
    }
    await navigator.clipboard.writeText(text);
    setMessage(successMessage);
  }

  async function prepare(): Promise<void> {
    try {
      setBusy("prepare");
      setError("");
      setMessage("");
      setValidation(undefined);
      setResponseText("");
      const nextPacket = await createWorkingsReviewPacket({
        lessonId: page.lessonId,
        reviewQuestion,
        mode,
      });
      setPacket(nextPacket);
      try {
        await copyText(
          nextPacket.text,
          `Review prompt copied. Attach ${nextPacket.expectedFilename} in ChatGPT.`,
        );
      } catch (clipboardError) {
        setMessage(
          clipboardError instanceof Error ? clipboardError.message : "Review prompt prepared.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The workings review could not be prepared.");
    } finally {
      setBusy(undefined);
    }
  }

  async function validate(): Promise<void> {
    if (!packet) return;
    try {
      setBusy("validate");
      setError("");
      setMessage("");
      const result = await importWorkingsReview({
        text: responseText,
        mode,
        lessonId: page.lessonId,
        expectedRequestId: packet.requestId,
      });
      setValidation(result);
      setMessage(
        result.accepted
          ? "The review passed the image, writing, source, and answer-boundary checks."
          : "The review was rejected. Ask ChatGPT to correct the listed issues.",
      );
    } catch (cause) {
      setValidation(undefined);
      setError(
        cause instanceof Error ? cause.message : "The workings review could not be validated.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  const citedSources =
    validation?.review.sourceIds
      .map((sourceId) => sources.find((source) => source.id === sourceId))
      .filter((source): source is Source => source !== undefined) ?? [];

  return (
    <details className="workings-review">
      <summary>
        <span>
          <span className="eyebrow">Workings review</span>
          <strong>Have ChatGPT inspect the saved page</strong>
        </span>
        <small>Attach the exported PNG manually</small>
      </summary>
      <div className="workings-review-body">
        <ol className="review-steps">
          <li>Save the page and select Download PNG above.</li>
          <li>Prepare the review prompt, open ChatGPT, and attach the PNG.</li>
          <li>Paste ChatGPT's JSON response back into Discere for checking.</li>
        </ol>

        <label className="review-question">
          <span>What should the reviewer focus on?</span>
          <textarea
            rows={2}
            maxLength={2_000}
            value={reviewQuestion}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              setReviewQuestion(event.currentTarget.value);
              setPacket(undefined);
              setValidation(undefined);
              setMessage("");
            }}
          />
        </label>
        <div className="review-actions">
          <button
            type="button"
            className="primary-button"
            disabled={reviewQuestion.trim().length < 2 || busy !== undefined}
            onClick={() => void prepare()}
          >
            {busy === "prepare"
              ? "Preparing…"
              : packet
                ? "Prepare a new review"
                : "Prepare review prompt"}
          </button>
          {packet ? (
            <button
              type="button"
              disabled={busy !== undefined}
              onClick={() =>
                void copyText(packet.text, "Review prompt copied.").catch((cause) =>
                  setError(cause instanceof Error ? cause.message : "The prompt could not be copied."),
                )
              }
            >
              Copy prompt
            </button>
          ) : null}
          {packet ? (
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
              Open ChatGPT
            </a>
          ) : null}
        </div>

        {packet ? (
          <div className="review-return">
            <div className="review-file">
              <strong>Attach this file</strong>
              <code>{packet.expectedFilename}</code>
            </div>
            <label>
              <span>ChatGPT JSON response</span>
              <textarea
                rows={9}
                value={responseText}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                  setResponseText(event.currentTarget.value);
                  setValidation(undefined);
                  setMessage("");
                }}
                placeholder={'{"protocolVersion":"0.2","operation":"workings_review", ...}'}
              />
            </label>
            <div className="review-actions">
              <button
                type="button"
                className="primary-button"
                disabled={responseText.trim().length < 2 || busy !== undefined}
                onClick={() => void validate()}
              >
                {busy === "validate" ? "Checking…" : "Validate review"}
              </button>
              <details className="review-prompt-preview">
                <summary>View prepared prompt</summary>
                <pre>{packet.text}</pre>
              </details>
            </div>
          </div>
        ) : null}

        {validation ? (
          <div
            className={
              validation.accepted ? "review-validation accepted" : "review-validation rejected"
            }
          >
            <strong>{validation.accepted ? "Accepted" : "Needs correction"}</strong>
            {validation.issues.length > 0 ? (
              <ul>
                {validation.issues.map((issue) => (
                  <li key={`${issue.code}-${issue.field}-${issue.message}`}>
                    <code>{issue.code}</code> {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p>The response passed every review check.</p>
            )}
          </div>
        ) : null}

        {validation?.accepted ? (
          <section className="review-result" aria-labelledby="review-result-title">
            <div className="review-result-heading">
              <div>
                <p className="eyebrow">Validated review</p>
                <h3 id="review-result-title">
                  {validation.review.assessment.replaceAll("_", " ")}
                </h3>
              </div>
              <span>{Math.round(validation.review.transcriptionConfidence * 100)}% reading confidence</span>
            </div>
            <div className="review-transcription">
              <strong>Visible working</strong>
              <p>{validation.review.transcription || "No reliable transcription was available."}</p>
            </div>
            <div className="review-feedback">
              <strong>Feedback</strong>
              <p>{validation.review.feedback}</p>
            </div>
            {validation.review.firstMeaningfulError ? (
              <div className="review-first-error">
                <strong>First important error</strong>
                <p>{validation.review.firstMeaningfulError}</p>
              </div>
            ) : null}
            <div className="review-next-step">
              <strong>Next step</strong>
              <p>{validation.review.nextStep}</p>
            </div>
            {validation.review.uncertainty.length > 0 ? (
              <div>
                <strong>Unreadable or uncertain</strong>
                <ul>
                  {validation.review.uncertainty.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {citedSources.length > 0 ? (
              <div className="review-sources">
                <strong>Sources used</strong>
                {citedSources.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {message ? (
          <p className="review-message" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </details>
  );
}
