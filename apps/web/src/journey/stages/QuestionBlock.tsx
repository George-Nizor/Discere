import type { LearnerQuestion, LessonFeedbackRequest } from "@discere/contracts";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { requestJson } from "../../api/client.js";
import { useCodeRuntime } from "../../code-runtimes/RuntimeSetup.js";
import { Notice } from "../../ui/Feedback.js";
import { InlineRichText } from "../../ui/RichText.js";
import { PlayerFooterSlot } from "../player-footer.js";
import { AnswerInput } from "../quiz/AnswerInput.js";
import { QuestionFeedback } from "../quiz-shared/QuestionFeedback.js";
import { type Attempt, type AttemptPolicy, useAttempt } from "../quiz-shared/use-attempt.js";

/**
 * Splits a prompt into its setup and the question itself, so the screen can set the question
 * apart: "A function takes … on its value. Which kind of coupling …?" becomes the setup and the
 * last sentence. A prompt that is one sentence, or whose last sentence holds a full stop (a
 * decimal, an abbreviation), comes back whole as the question. Code spans are masked first, so
 * the `)` in `` `SUM(amount) >= 40` `` or the `.` in `` `df.head(2)` `` never decides the split.
 */
export function splitPrompt(prompt: string): { setup: string; ask: string } {
  const text = prompt.trim();
  const masked = text.replace(/`[^`\n]+`/g, (span) => `\`${"x".repeat(span.length - 2)}\``);
  const match = /^([\s\S]*[.!:)])\s+([^.!?\n]*\?)\s*$/.exec(masked);
  if (!match?.[1] || !match[2]) return { setup: "", ask: text };
  // The masked text has the same length as the original, so its offsets cut the original.
  const end = match[1].length;
  const askStart = end + (/^\s+/.exec(masked.slice(end))?.[0].length ?? 0);
  return {
    setup: text.slice(0, end).trim(),
    ask: text.slice(askStart, askStart + match[2].length).trim(),
  };
}

export type PromptPart =
  | { kind: "text"; setup: string; ask: string }
  | { kind: "code"; code: string }
  | { kind: "quote"; text: string };

/**
 * A prompt can hold lines of code, each written as one code span on a line of its own:
 * "A file contains these lines. Where does tsc stop?\n\n`let n = 5;`\n`n = \"five\";`".
 * Those lines become one code block, kept in place, and the prose around them is split as
 * {@link splitPrompt} does, so the question still stands apart in bold.
 *
 * A prompt can also hold a quoted extract, written as a paragraph whose lines begin with "> ":
 * "A chronicler describes the survey.\n\n> So very narrowly did he commission them…\n\nWhat
 * does the chronicler think of it?". The extract becomes a quotation set apart from the prose,
 * so a source of a hundred words is read as a source and the question after it stays short.
 */
export function promptParts(prompt: string): PromptPart[] {
  const isCodeLine = (line: string) => /^`[^`]+`$/.test(line);
  const isQuoteLine = (line: string) => /^>\s/.test(line);
  const raw = prompt.trim().split("\n");
  if (!raw.some((line) => isCodeLine(line.trim()) || isQuoteLine(line.trim())))
    return [{ kind: "text", ...splitPrompt(prompt) }];
  const blocks: (
    | { kind: "text"; text: string }
    | { kind: "code"; lines: string[] }
    | { kind: "quote"; text: string }
  )[] = [];
  // A blank line ends a quotation, so two extracts set one after the other stay two.
  let afterBlank = false;
  for (const rawLine of raw) {
    const line = rawLine.trim();
    if (!line) {
      afterBlank = true;
      continue;
    }
    const last = blocks.at(-1);
    if (isCodeLine(line)) {
      // Indentation is written outside the backticks, and Python needs it kept.
      const code = `${/^\s*/.exec(rawLine)?.[0] ?? ""}${line.slice(1, -1)}`;
      if (last?.kind === "code") last.lines.push(code);
      else blocks.push({ kind: "code", lines: [code] });
    } else if (isQuoteLine(line)) {
      const text = line.replace(/^>\s+/, "");
      if (last?.kind === "quote" && !afterBlank) last.text = `${last.text} ${text}`;
      else blocks.push({ kind: "quote", text });
    } else if (last?.kind === "text") last.text = `${last.text} ${line}`;
    else blocks.push({ kind: "text", text: line });
    afterBlank = false;
  }
  const askAt = blocks.findLastIndex((block) => block.kind === "text" && block.text.includes("?"));
  return blocks.map((block, index) =>
    block.kind === "code"
      ? { kind: "code", code: block.lines.join("\n") }
      : block.kind === "quote"
        ? { kind: "quote", text: block.text }
        : index === askAt
          ? { kind: "text", ...splitPrompt(block.text) }
          : { kind: "text", setup: block.text, ask: "" },
  );
}

/** A prompt as it is read aloud or shown on one line: the extract's "> " marks removed. */
export function promptPlainText(prompt: string): string {
  return prompt.replace(/^>\s+/gm, "");
}

/** Whether a prompt holds a quoted extract, which a heading sets apart from its question. */
export function promptHasQuote(prompt: string): boolean {
  return /^>\s/m.test(prompt);
}

/**
 * The parts of a prompt as phrasing content, so they can sit inside a heading: code and quoted
 * extracts are spans set as blocks, the setup is body text and the question itself is bold.
 */
export function PromptText({ prompt }: { prompt: string }) {
  return (
    <>
      {promptParts(prompt).map((part) =>
        part.kind === "code" ? (
          <span className="prompt-code" key={`code:${part.code}`}>
            <code>{part.code}</code>
          </span>
        ) : part.kind === "quote" ? (
          <span className="prompt-quote" key={`quote:${part.text}`}>
            <InlineRichText text={part.text} />
          </span>
        ) : (
          <Fragment key={`text:${part.setup}|${part.ask}`}>
            {part.setup ? (
              <span className="prompt-setup">
                <InlineRichText text={part.setup} />
              </span>
            ) : null}
            {part.ask ? (
              <span className="prompt-ask">
                <InlineRichText text={part.ask} />
              </span>
            ) : null}
          </Fragment>
        ),
      )}
    </>
  );
}

/** Whether the last marked response is still the one on screen. */
export function attemptMarksDraft(attempt: Attempt): boolean {
  return attempt.result !== null && attempt.markedResponse === attempt.response;
}

/**
 * One question inside a lesson screen: its prompt, an optional figure that sees the attempt,
 * the one answer input, the Check action and the verdict. Every lesson question — a step's
 * check, a faded example's blank, a self-explanation, the opener's hook — goes through here,
 * so they all follow the same attempt policy.
 *
 * `inline` keeps the action and verdict beside the question instead of in the player's footer,
 * for screens that ask more than one thing (a faded example's blanks).
 */
/**
 * Shown under a Python exercise while Python cannot run here. It says so and lets the learner
 * carry on; the server does not require the exercise on such a computer either.
 */
function PythonUnavailable({ left, onLeave }: { left: boolean; onLeave: () => void }) {
  const runtime = useCodeRuntime("python");
  if (!runtime || runtime.state === "ready") return null;
  return (
    <Notice tone="warning" title="Python can't run on this computer yet">
      <p>
        Your code can't be run or checked until Python is set up, so this exercise is optional for
        now. The rest of the lesson works without it, and you can come back to the exercise later.
      </p>
      {left ? (
        <p>This exercise is set aside. Continue when you're ready.</p>
      ) : (
        <button className="button button-secondary" type="button" onClick={onLeave}>
          Continue without this exercise
        </button>
      )}
    </Notice>
  );
}

/**
 * The same for an SQL exercise. SQL runs on the SQLite inside Python, which a checkout takes
 * from the system and an installed app downloads once, so the server is asked directly.
 */
function SqlUnavailable({ left, onLeave }: { left: boolean; onLeave: () => void }) {
  const runtime = useQuery({
    queryKey: ["sql-runtime"],
    queryFn: async () => (await requestJson("/api/sql-runtime")) as { ready: boolean },
  });
  if (!runtime.data || runtime.data.ready) return null;
  return (
    <Notice tone="warning" title="SQL can't run on this computer yet">
      <p>
        Your query can't be run or checked until SQL practice is set up, so this exercise is
        optional for now. The rest of the lesson works without it, and you can come back to the
        exercise later.
      </p>
      {left ? (
        <p>This exercise is set aside. Continue when you're ready.</p>
      ) : (
        <button className="button button-secondary" type="button" onClick={onLeave}>
          Continue without this exercise
        </button>
      )}
    </Notice>
  );
}

export function QuestionBlock({
  question,
  context,
  policy,
  heading = "h1",
  promptClassName = "step-question",
  hidePrompt = false,
  label,
  inline = false,
  figure,
  onReady,
  onStarted,
  hideInput = false,
}: {
  question: LearnerQuestion;
  context: LessonFeedbackRequest | undefined;
  policy?: AttemptPolicy;
  /** The prompt is the screen's headline unless something else holds that place. */
  heading?: "h1" | "h2" | "h3";
  promptClassName?: string;
  hidePrompt?: boolean;
  label?: string;
  inline?: boolean;
  figure?: (attempt: Attempt) => ReactNode;
  onReady?: () => void;
  /**
   * True when the figure's control is the answer (an explore step's slider): one input per
   * answer, so no box is drawn beside it (spec §3.2 rule 5).
   */
  hideInput?: boolean;
  /** Called once the first response is recorded (the tutoring mode then locks). */
  onStarted?: () => void;
}) {
  const attempt = useAttempt(question, context, policy);
  const announced = useRef(false);
  // A Python or SQL exercise on a computer where it cannot run may be left, so the lesson goes on.
  const [left, setLeft] = useState(false);
  useEffect(() => {
    if ((attempt.ready || left) && !announced.current) {
      announced.current = true;
      onReady?.();
    }
  }, [attempt.ready, left, onReady]);
  const started = attempt.attemptId !== null;
  useEffect(() => {
    if (started) onStarted?.();
  }, [started, onStarted]);
  const Heading = heading;
  const formId = `check-${question.id}`;
  const marks = attemptMarksDraft(attempt);
  // Checking the same marked answer again would only spend the retry. The button stays
  // focusable (aria-disabled, not disabled) so focus can rest on it after the verdict.
  const unchanged = marks && !attempt.ready;
  const checkButton = useRef<HTMLButtonElement>(null);
  // After a verdict that leaves the question open, focus returns to the Check button rather
  // than falling to the page when the button re-renders; a learner who is ready to move on
  // is taken to Continue by the screen around this block.
  const focusedResult = useRef(attempt.result);
  useEffect(() => {
    if (attempt.busy || attempt.result === focusedResult.current) return;
    focusedResult.current = attempt.result;
    if (attempt.result && !attempt.ready) checkButton.current?.focus();
  }, [attempt.result, attempt.busy, attempt.ready]);
  const actions = !attempt.ready ? (
    <div className={"button-row check-actions" + (inline ? "" : " footer-primary")}>
      <button
        ref={checkButton}
        aria-busy={attempt.busy}
        aria-disabled={unchanged || undefined}
        disabled={attempt.busy || !attempt.response}
        className={inline ? "button button-secondary" : "button button-primary"}
        form={formId}
        type="submit"
      >
        {attempt.busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
        {attempt.result === null ? "Check answer" : "Check again"}
      </button>
    </div>
  ) : null;
  return (
    <div
      className={"step-check question-beat" + (inline ? " is-inline" : "")}
      data-result={
        attempt.phase === "correct"
          ? "correct"
          : attempt.phase === "retry" || attempt.phase === "revealed" || attempt.phase === "closed"
            ? "incorrect"
            : undefined
      }
    >
      {hidePrompt ? null : (
        <Heading className={promptClassName}>
          <PromptText prompt={question.prompt} />
        </Heading>
      )}
      {figure ? figure(attempt) : null}
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          if (unchanged) return;
          void attempt.send();
        }}
      >
        {hideInput ? (
          <p className="figure-answer-note" aria-live="polite">
            {attempt.response ? `Your answer: ${attempt.response}` : "Use the slider to answer."}
          </p>
        ) : (
          <AnswerInput
            answered={marks}
            correct={attempt.solved}
            readOnly={attempt.ready || attempt.busy}
            draft={attempt.draft}
            onChange={attempt.setDraft}
            question={question}
            idPrefix={`answer-${question.id}`}
            codeRun={attempt.result?.codeRun}
            {...(label ? { label } : {})}
            correctChoiceId={
              attempt.phase === "revealed" ? attempt.lessonFeedback?.correctChoiceId : undefined
            }
          />
        )}
        {inline ? actions : <PlayerFooterSlot kind="actions">{actions}</PlayerFooterSlot>}
      </form>
      {question.code?.language === "python" && !attempt.ready ? (
        <PythonUnavailable left={left} onLeave={() => setLeft(true)} />
      ) : null}
      {question.code?.language === "sql" && !attempt.ready ? (
        <SqlUnavailable left={left} onLeave={() => setLeft(true)} />
      ) : null}
      <QuestionFeedback
        attempt={attempt}
        query={question.code?.language === "sql"}
        hints={policy?.hints !== false}
        placement={inline ? "inline" : "footer"}
      />
      {attempt.failure ? (
        <Notice live tone="error" title="Try again">
          <p>{attempt.failure}</p>
        </Notice>
      ) : null}
    </div>
  );
}
