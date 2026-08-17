import type { Source, TutoringMode } from "@discere/contracts";
import { useState, type ChangeEvent } from "react";
import {
  createTutorReplyPacket,
  importTutorReply,
  type CompanionPacket,
  type TutorReplyImportResult,
} from "../api";
import "./TutorCompanion.css";

type BusyState = "prepare" | "validate" | undefined;

export function TutorCompanion({ mode, sources }: { mode: TutoringMode; sources: Source[] }) {
  const [question, setQuestion] = useState("");
  const [packet, setPacket] = useState<CompanionPacket>();
  const [responseText, setResponseText] = useState("");
  const [validation, setValidation] = useState<TutorReplyImportResult>();
  const [busy, setBusy] = useState<BusyState>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (mode === "exam") {
    return (
      <section className="tutor-companion unavailable" aria-labelledby="tutor-companion-title">
        <p className="eyebrow">ChatGPT companion</p>
        <h2 id="tutor-companion-title">Unavailable during Exam mode</h2>
        <p>Finish or leave the exam before opening external tutoring help.</p>
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
      const nextPacket = await createTutorReplyPacket({ question, mode });
      setPacket(nextPacket);
      try {
        await copyText(nextPacket.text, "Tutor prompt copied. Paste it into ChatGPT.");
      } catch (clipboardError) {
        setMessage(
          clipboardError instanceof Error ? clipboardError.message : "Tutor prompt prepared.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The tutor prompt could not be prepared.");
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
      const result = await importTutorReply(responseText, mode, packet.requestId);
      setValidation(result);
      setMessage(
        result.accepted
          ? "Tutor reply accepted by the writing and accountability checks."
          : "The reply was rejected. Review the listed issues and ask ChatGPT to correct them.",
      );
    } catch (cause) {
      setValidation(undefined);
      setError(
        cause instanceof Error ? cause.message : "The ChatGPT response could not be validated.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  const citedSources =
    validation?.reply.sourceIds
      .map((sourceId) => sources.find((source) => source.id === sourceId))
      .filter((source): source is Source => source !== undefined) ?? [];

  return (
    <details className="tutor-companion">
      <summary>
        <span>
          <span className="eyebrow">ChatGPT companion</span>
          <strong>Ask a question using your ChatGPT subscription</strong>
        </span>
        <small>Manual handoff with validation</small>
      </summary>
      <div className="tutor-companion-body">
        <p className="tutor-companion-intro">
          Discere prepares the lesson context and tutoring rules. You send the prompt through your
          normal ChatGPT account, then paste the JSON reply back here for checking.
        </p>

        <label className="tutor-question">
          <span>What do you want help with?</span>
          <textarea
            rows={3}
            maxLength={2_000}
            value={question}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              setQuestion(event.currentTarget.value);
              setPacket(undefined);
              setValidation(undefined);
              setMessage("");
            }}
            placeholder="Why does increasing resistance reduce current?"
          />
        </label>
        <div className="tutor-actions">
          <button
            type="button"
            className="primary-button"
            disabled={question.trim().length < 2 || busy !== undefined}
            onClick={() => void prepare()}
          >
            {busy === "prepare"
              ? "Preparing…"
              : packet
                ? "Prepare a new prompt"
                : "Prepare tutor prompt"}
          </button>
          {packet ? (
            <button
              type="button"
              disabled={busy !== undefined}
              onClick={() =>
                void copyText(packet.text, "Tutor prompt copied.").catch((cause) =>
                  setError(cause instanceof Error ? cause.message : "The prompt could not be copied."),
                )
              }
            >
              Copy prompt
            </button>
          ) : null}
          {packet ? (
            <a
              className="tutor-open-link"
              href="https://chatgpt.com/"
              target="_blank"
              rel="noreferrer"
            >
              Open ChatGPT
            </a>
          ) : null}
        </div>

        {packet ? (
          <div className="tutor-handoff">
            <div className="tutor-handoff-heading">
              <strong>Return the response</strong>
              <span>{packet.filename}</span>
            </div>
            <p>Paste the entire JSON object from ChatGPT. Markdown fences and extra commentary are rejected.</p>
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
                placeholder={'{"protocolVersion":"0.2", ...}'}
              />
            </label>
            <div className="tutor-actions">
              <button
                type="button"
                className="primary-button"
                disabled={responseText.trim().length < 2 || busy !== undefined}
                onClick={() => void validate()}
              >
                {busy === "validate" ? "Checking…" : "Validate tutor reply"}
              </button>
              <details className="packet-preview">
                <summary>View prepared prompt</summary>
                <pre>{packet.text}</pre>
              </details>
            </div>
          </div>
        ) : null}

        {validation ? (
          <div
            className={validation.accepted ? "tutor-validation accepted" : "tutor-validation rejected"}
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
              <p>The reply passed the prose, source, and answer-boundary checks.</p>
            )}
          </div>
        ) : null}

        {validation?.accepted ? (
          <section className="tutor-reply" aria-labelledby="tutor-reply-title">
            <p className="eyebrow">Validated tutor reply</p>
            <h3 id="tutor-reply-title">Response</h3>
            <div className="tutor-answer">
              {validation.reply.answer.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="tutor-follow-up">
              <strong>Continue from here</strong>
              <p>{validation.reply.followUpQuestion}</p>
            </div>
            {validation.reply.uncertainty.length > 0 ? (
              <div>
                <strong>Uncertainty noted</strong>
                <ul>
                  {validation.reply.uncertainty.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {citedSources.length > 0 ? (
              <div className="tutor-sources">
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
          <p className="tutor-message" role="status">
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
