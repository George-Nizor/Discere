import type { LearnerQuestion, LessonFeedbackRequest } from "@discere/contracts";
import { Loader2 } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
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
  | { kind: "code"; code: string };

/**
 * A prompt can hold lines of code, each written as one code span on a line of its own:
 * "A file contains these lines. Where does tsc stop?\n\n`let n = 5;`\n`n = \"five\";`".
 * Those lines become one code block, kept in place, and the prose around them is split as
 * {@link splitPrompt} does, so the question still stands apart in bold.
 */
export function promptParts(prompt: string): PromptPart[] {
  const isCodeLine = (line: string) => /^`[^`]+`$/.test(line);
  const raw = prompt.trim().split("\n");
  if (!raw.some((line) => isCodeLine(line.trim())))
    return [{ kind: "text", ...splitPrompt(prompt) }];
  const blocks: ({ kind: "text"; text: string } | { kind: "code"; lines: string[] })[] = [];
  for (const rawLine of raw) {
    const line = rawLine.trim();
    if (!line) continue;
    const last = blocks.at(-1);
    if (isCodeLine(line)) {
      // Indentation is written outside the backticks, and Python needs it kept.
      const code = `${/^\s*/.exec(rawLine)?.[0] ?? ""}${line.slice(1, -1)}`;
      if (last?.kind === "code") last.lines.push(code);
      else blocks.push({ kind: "code", lines: [code] });
    } else if (last?.kind === "text") last.text = `${last.text} ${line}`;
    else blocks.push({ kind: "text", text: line });
  }
  const askAt = blocks.findLastIndex((block) => block.kind === "text" && block.text.includes("?"));
  return blocks.map((block, index) =>
    block.kind === "code"
      ? { kind: "code", code: block.lines.join("\n") }
      : index === askAt
        ? { kind: "text", ...splitPrompt(block.text) }
        : { kind: "text", setup: block.text, ask: "" },
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
  useEffect(() => {
    if (attempt.ready && !announced.current) {
      announced.current = true;
      onReady?.();
    }
  }, [attempt.ready, onReady]);
  const started = attempt.attemptId !== null;
  useEffect(() => {
    if (started) onStarted?.();
  }, [started, onStarted]);
  const Heading = heading;
  const prompt = promptParts(question.prompt);
  const formId = `check-${question.id}`;
  const actions = !attempt.ready ? (
    <div className={"button-row check-actions" + (inline ? "" : " footer-primary")}>
      <button
        aria-busy={attempt.busy}
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
  const marks = attemptMarksDraft(attempt);
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
          {prompt.map((part) =>
            part.kind === "code" ? (
              // A heading holds phrasing content only, so the code block is a span set as a block.
              <span className="prompt-code" key={`code:${part.code}`}>
                <code>{part.code}</code>
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
        </Heading>
      )}
      {figure ? figure(attempt) : null}
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
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
      <QuestionFeedback
        attempt={attempt}
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
