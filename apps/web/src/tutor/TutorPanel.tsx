import type { TutorIssue, TutoringMode, TutorReplyDraft } from "@discere/contracts";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorCode, errorDetail, errorMessage } from "../api/client.js";
import { askTutor, importTutorReply } from "../api/endpoints.js";
import { CopyButton } from "../ui/CopyButton.js";
import { Notice } from "../ui/Feedback.js";
import { InlineRichText } from "../ui/RichText.js";
import { tutorErrorMessage } from "./tutor-messages.js";

interface Exchange {
  question: string;
  reply: TutorReplyDraft;
  issues: TutorIssue[];
  accepted: boolean;
}

interface PendingPacket {
  requestId: string;
  filename: string;
  text: string;
  message: string;
  question: string;
}

function ReplyView({ exchange }: { exchange: Exchange }) {
  return (
    <li className="tutor-exchange">
      <p className="tutor-question">{exchange.question}</p>
      <div className="tutor-answer">
        <p>
          <InlineRichText text={exchange.reply.answer} />
        </p>
        <p className="tutor-follow-up">
          <strong>Back to you.</strong> {exchange.reply.followUpQuestion}
        </p>
        {exchange.reply.uncertainty.length > 0 ? (
          <div>
            <p className="eyebrow">Stated uncertainty</p>
            <ul className="plain-list">
              {exchange.reply.uncertainty.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {exchange.reply.sourceIds.length > 0 ? (
          <p className="muted">Sources: {exchange.reply.sourceIds.join(", ")}</p>
        ) : null}
        {exchange.accepted ? null : (
          <Notice tone="warning" title="This reply failed an accountability check">
            <ul className="plain-list">
              {exchange.issues.map((issue) => (
                <li key={`${issue.field}-${issue.code}`}>{issue.message}</li>
              ))}
            </ul>
          </Notice>
        )}
      </div>
    </li>
  );
}

/**
 * The tutor lives in a drawer beside the stage, never inside it. Long generations are stated
 * plainly, and a provider that cannot answer in place hands back its packet instead.
 */
export function TutorPanel({
  lessonId,
  conceptIds,
  mode,
  attemptId,
  onClose,
}: {
  lessonId: string;
  conceptIds: string[];
  mode: TutoringMode;
  attemptId?: string;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [packet, setPacket] = useState<PendingPacket | null>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [failureDetail, setFailureDetail] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    input.current?.focus();
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function ask(): Promise<void> {
    const asked = question.trim();
    if (asked.length < 2) return;
    setBusy(true);
    setFailure(null);
    setFailureDetail(null);
    try {
      const result = await askTutor({
        lessonId,
        mode,
        question: asked,
        conceptIds,
        ...(sessionId === null ? {} : { sessionId }),
        ...(attemptId === undefined ? {} : { attemptId }),
      });
      if (result.status === "answered") {
        setThread((current) => [
          ...current,
          {
            question: asked,
            reply: result.reply,
            issues: result.issues,
            accepted: result.accepted,
          },
        ]);
        setSessionId(result.sessionId);
        setQuestion("");
        setPacket(null);
      } else {
        setPacket({
          requestId: result.requestId,
          filename: result.packet.filename,
          text: result.packet.text,
          message: result.message,
          question: asked,
        });
      }
    } catch (error) {
      setFailure(tutorErrorMessage(errorCode(error), errorMessage(error, "The tutor failed.")));
      setFailureDetail(errorDetail(error));
    } finally {
      setBusy(false);
    }
  }

  async function importReply(): Promise<void> {
    if (!packet) return;
    setBusy(true);
    setFailure(null);
    setFailureDetail(null);
    try {
      const result = await importTutorReply({
        text: pasted,
        mode,
        expectedRequestId: packet.requestId,
      });
      setThread((current) => [
        ...current,
        {
          question: packet.question,
          reply: result.reply,
          issues: result.issues,
          accepted: result.accepted,
        },
      ]);
      setPacket(null);
      setPasted("");
      setQuestion("");
    } catch (error) {
      setFailure(errorMessage(error, "The pasted reply could not be read."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="tutor-scrim" />
      <aside aria-label="Ask the tutor" aria-modal="true" className="tutor-panel" role="dialog">
        <header className="tutor-header">
          <h2>Ask the tutor</h2>
          <button
            aria-label="Close the tutor"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.6} />
          </button>
        </header>

        <div className="tutor-body">
          {thread.length === 0 && !packet ? (
            <p className="muted">
              The tutor sees this lesson and the concepts it teaches. It answers within the rules of
              your current learning mode.
            </p>
          ) : null}

          <ul className="tutor-thread">
            {thread.map((exchange) => (
              <ReplyView
                exchange={exchange}
                key={`${exchange.question}-${exchange.reply.answer}`}
              />
            ))}
          </ul>

          {busy ? (
            <p aria-live="polite" className="tutor-thinking">
              <Loader2 aria-hidden="true" className="spin" size={16} />
              The tutor is thinking. Replies usually take 10 to 45 seconds.
            </p>
          ) : null}

          {packet ? (
            <div className="packet">
              <Notice tone="info" title="This provider answers outside Discere">
                <p>{packet.message}</p>
              </Notice>
              <CopyButton label={`Copy ${packet.filename}`} text={packet.text} />
              <pre className="packet-text">{packet.text}</pre>
              <label className="field-label" htmlFor="tutor-import">
                Paste the reply here
              </label>
              <textarea
                className="textarea textarea-short"
                id="tutor-import"
                onChange={(event) => setPasted(event.currentTarget.value)}
                value={pasted}
              />
              {pasted.trim().length > 1 ? (
                <button
                  aria-busy={busy}
                  className="button button-secondary"
                  onClick={() => void importReply()}
                  type="button"
                >
                  Import the reply
                </button>
              ) : null}
            </div>
          ) : null}

          {failure ? (
            <Notice live tone="error" title="No reply was produced">
              <p>{failure}</p>
              {failureDetail ? <p className="tutor-failure-detail">{failureDetail}</p> : null}
            </Notice>
          ) : null}
        </div>

        <footer className="tutor-footer">
          <label className="sr-only" htmlFor="tutor-question">
            Your question
          </label>
          <textarea
            className="textarea textarea-short"
            id="tutor-question"
            onChange={(event) => setQuestion(event.currentTarget.value)}
            placeholder="Ask about this stage."
            ref={input}
            value={question}
          />
          {question.trim().length > 1 ? (
            <button
              aria-busy={busy}
              className="button button-primary"
              onClick={() => void ask()}
              type="button"
            >
              {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
              {thread.length > 0 ? "Ask a follow-up" : "Ask the tutor"}
            </button>
          ) : null}
        </footer>
      </aside>
    </>
  );
}
