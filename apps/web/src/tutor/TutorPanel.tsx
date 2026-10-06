import type {
  RomanReferenceEssayId,
  RomanReferenceQuestionId,
  TutoringMode,
} from "@discere/contracts";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorCode, errorDetail, errorMessage } from "../api/client.js";
import { askTutor, importTutorReply } from "../api/endpoints.js";
import { CopyButton } from "../ui/CopyButton.js";
import { humaniseId } from "../lib/format.js";
import { Notice } from "../ui/Feedback.js";
import { Illustration } from "../ui/Illustration.js";
import { InlineRichText } from "../ui/RichText.js";
import {
  loadTutorConversation,
  saveTutorConversation,
  type TutorExchange,
} from "./tutor-conversation.js";
import { tutorErrorMessage } from "./tutor-messages.js";

interface PendingPacket {
  requestId: string;
  filename: string;
  text: string;
  message: string;
  question: string;
}

interface TutorPanelProps {
  lessonId: string;
  conceptIds: string[];
  mode: TutoringMode;
  attemptId?: string;
  questionId?: string;
  /** The course's colour, so an illustration matches the lesson it was drawn for. */
  accent?: string;
  onClose: () => void;
  /** Docked in the lesson workbench: a side pane beside the lesson, not a modal drawer. */
  docked?: boolean;
  referenceQuestionId?: RomanReferenceQuestionId;
  /** Set on the essay beat, where the server holds the mode and the draft the tutor answers about. */
  referenceEssayId?: RomanReferenceEssayId;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && !element.hasAttribute("hidden"),
  );
}

function ReplyView({ exchange, accent }: { exchange: TutorExchange; accent: string }) {
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
          <p className="muted">Sources: {exchange.reply.sourceIds.map(humaniseId).join(", ")}</p>
        ) : null}
        {/*
          The tutor can show as well as tell. The subject is the tutor's own answer rather than
          anything the learner typed: what gets drawn should be the explanation, and a prompt
          assembled from learner input is a prompt someone else is writing.
        */}
        <Illustration accent={accent} alt={exchange.reply.answer} subject={exchange.reply.answer} />
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
export function TutorPanel(props: TutorPanelProps) {
  return <TutorPanelConversation key={props.lessonId} {...props} />;
}

function TutorPanelConversation({
  lessonId,
  conceptIds,
  mode,
  attemptId,
  questionId,
  accent = "#16a34a",
  onClose,
  docked = false,
  referenceQuestionId,
  referenceEssayId,
}: TutorPanelProps) {
  // A conversation about a question and one about the essay are different threads, so a resumed
  // provider session must not carry across the boundary between them.
  const providerSessionContext = `${referenceQuestionId ?? (referenceEssayId ? `essay:${referenceEssayId}` : (questionId ?? "lesson"))}:${mode}`;
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState(() => {
    const loaded = loadTutorConversation(lessonId);
    return loaded.sessionContext === providerSessionContext
      ? loaded
      : { ...loaded, sessionId: null, sessionContext: providerSessionContext };
  });
  const [packet, setPacket] = useState<PendingPacket | null>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [failureDetail, setFailureDetail] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const { exchanges: thread, sessionId } = conversation;
  const resumableSessionId =
    conversation.sessionContext === providerSessionContext ? sessionId : null;

  useEffect(() => {
    setConversation((current) =>
      current.sessionContext === providerSessionContext
        ? current
        : { ...current, sessionId: null, sessionContext: providerSessionContext },
    );
  }, [providerSessionContext]);
  useEffect(() => {
    saveTutorConversation(lessonId, conversation);
  }, [conversation, lessonId]);

  useEffect(() => {
    if (docked) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = panel.current;
      if (!dialog) return;
      const focusable = focusableElements(dialog);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const active = document.activeElement;
      const activeIsFocusable = active instanceof HTMLElement && focusable.includes(active);
      if (event.shiftKey && (active === first || !activeIsFocusable)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !activeIsFocusable)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, docked]);

  async function ask(): Promise<void> {
    const asked = question.trim();
    if (asked.length < 2 || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailure(null);
    setFailureDetail(null);
    try {
      const result = await askTutor({
        lessonId,
        mode,
        question: asked,
        conceptIds,
        ...(resumableSessionId === null ? {} : { sessionId: resumableSessionId }),
        ...(attemptId === undefined ? {} : { attemptId }),
        ...(questionId === undefined ? {} : { questionId }),
        ...(referenceQuestionId === undefined ? {} : { referenceQuestionId }),
        ...(referenceEssayId === undefined ? {} : { referenceEssayId }),
      });
      if (result.status === "answered") {
        setConversation((current) => ({
          exchanges: [
            ...current.exchanges,
            {
              question: asked,
              reply: result.reply,
              issues: result.issues,
              accepted: result.accepted,
            },
          ],
          sessionId: result.sessionId,
          sessionContext: providerSessionContext,
        }));
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
      const code = errorCode(error);
      if (code === "TUTOR_SESSION_INVALID") {
        setConversation((current) => ({ ...current, sessionId: null }));
      }
      setFailure(tutorErrorMessage(code, errorMessage(error, "The tutor failed.")));
      setFailureDetail(errorDetail(error));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function importReply(): Promise<void> {
    if (!packet || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailure(null);
    setFailureDetail(null);
    try {
      const result = await importTutorReply({
        text: pasted,
        mode,
        expectedRequestId: packet.requestId,
        lessonId,
        ...(questionId === undefined ? {} : { questionId }),
        ...(attemptId === undefined ? {} : { attemptId }),
        ...(referenceQuestionId === undefined ? {} : { referenceQuestionId }),
        ...(referenceEssayId === undefined ? {} : { referenceEssayId }),
      });
      setConversation((current) => ({
        ...current,
        exchanges: [
          ...current.exchanges,
          {
            question: packet.question,
            reply: result.reply,
            issues: result.issues,
            accepted: result.accepted,
          },
        ],
      }));
      setPacket(null);
      setPasted("");
      setQuestion("");
    } catch (error) {
      setFailure(errorMessage(error, "The pasted reply could not be read."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      {docked ? null : (
        <button
          aria-label="Close the tutor backdrop"
          className="tutor-scrim"
          onClick={onClose}
          tabIndex={-1}
          type="button"
        />
      )}
      <aside
        aria-label="Ask the tutor"
        aria-modal={docked ? undefined : "true"}
        className={docked ? "tutor-panel tutor-panel--docked" : "tutor-panel"}
        ref={panel}
        role={docked ? "region" : "dialog"}
        tabIndex={-1}
      >
        {docked ? null : (
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
        )}

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
                accent={accent}
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
              <Notice tone="info" title="Continue in ChatGPT">
                <p>Copy the request into ChatGPT, then paste its reply below.</p>
              </Notice>
              <CopyButton label="Copy the tutoring request" text={packet.text} />
              <details className="tutor-request-preview">
                <summary>Preview the request</summary>
                <pre className="packet-text">{packet.text}</pre>
              </details>
              <label className="field-label" htmlFor="tutor-import">
                Paste the reply here
              </label>
              <textarea
                className="textarea textarea-short"
                id="tutor-import"
                disabled={busy}
                onChange={(event) => setPasted(event.currentTarget.value)}
                value={pasted}
              />
              {pasted.trim().length > 1 ? (
                <button
                  aria-busy={busy}
                  className="button button-secondary"
                  disabled={busy}
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
            disabled={busy}
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
              disabled={busy}
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
